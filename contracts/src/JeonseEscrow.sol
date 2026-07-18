// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBridgePoolCallback {
    function onRepaid() external;
}

/// @title 이음 전세 에스크로 — 원자적 연쇄 정산.
/// 신규 세입자(B)의 전세금을 락하고, 정산일에 단 한 번의 트랜잭션으로
/// 기존 세입자(A)의 보증금 반환과 집주인(L)의 차액 수령을 동시에 실행한다.
/// 돈이 사람 손을 거치지 않으므로 이사 타이밍 리스크가 구조적으로 사라진다.
contract JeonseEscrow {
    using SafeERC20 for IERC20;

    enum State { Created, Funded, Settled, Cancelled }

    IERC20 public immutable token;
    address public immutable bridgePool;
    address public immutable landlord;   // 집주인 L
    address public immutable tenantIn;   // 신규 세입자 B (전세금 납입)
    address public immutable tenantOut;  // 기존 세입자 A (보증금 수령)
    uint256 public immutable jeonseAmount; // B가 락하는 신규 전세금
    uint256 public immutable refundAmount; // A가 돌려받을 기존 보증금
    uint256 public immutable settleDate;
    address public immutable treasury;      // 프로토콜 수수료 수취처
    uint256 public immutable settleFeeBps;  // 정산 수수료 (전세금 대비 bps, 집주인 차액에서만 차감)

    uint256 public immutable shortfall;     // 역전세 부족분 = refund > jeonse 일 때 집주인이 채워야 하는 금액

    State public state;
    bool public bridged; // A가 브리지 풀에서 선지급을 받았는가
    bool public shortfallCovered; // 집주인이 역전세 부족분을 채웠는가
    mapping(address => uint256) public claimable;
    mapping(address => bool) public cancelApproved;

    struct Doc {
        bytes32 hash;
        string label;
        address by;
        uint256 timestamp;
    }
    Doc[] public documents;

    event Funded(address indexed tenantIn, uint256 amount);
    event ShortfallCovered(address indexed landlord, uint256 amount);
    event DocumentAnchored(bytes32 indexed hash, string label, address indexed by);
    event Bridged();
    event Settled(uint256 toTenantOut, uint256 toLandlord, bool viaBridge);
    event Cancelled();
    event Claimed(address indexed to, uint256 amount);

    modifier onlyParty() {
        require(
            msg.sender == landlord || msg.sender == tenantIn || msg.sender == tenantOut,
            "not a party"
        );
        _;
    }

    constructor(
        IERC20 _token,
        address _bridgePool,
        address _landlord,
        address _tenantIn,
        address _tenantOut,
        uint256 _jeonseAmount,
        uint256 _refundAmount,
        uint256 _settleDate,
        address _treasury,
        uint256 _settleFeeBps
    ) {
        require(_jeonseAmount > 0, "jeonse=0");
        require(_settleDate > block.timestamp, "settle in past");
        require(_settleFeeBps <= 100, "fee too high"); // 최대 1%
        require(
            _landlord != address(0) && _tenantIn != address(0) && _tenantOut != address(0),
            "zero party"
        );
        token = _token;
        bridgePool = _bridgePool;
        landlord = _landlord;
        tenantIn = _tenantIn;
        tenantOut = _tenantOut;
        jeonseAmount = _jeonseAmount;
        refundAmount = _refundAmount;
        settleDate = _settleDate;
        treasury = _treasury;
        settleFeeBps = _settleFeeBps;
        // 역전세: 반환할 보증금이 신규 전세금보다 크면 그 차액을 집주인이 채워야 한다
        shortfall = _refundAmount > _jeonseAmount ? _refundAmount - _jeonseAmount : 0;
    }

    /// 집주인 L: 역전세 부족분을 자기 지갑에서 에스크로에 채운다.
    /// 이 금액과 신규 전세금(B의 락)을 합쳐야 정산 시 A에게 보증금을 전액 반환할 수 있다.
    function coverShortfall() external {
        require(shortfall > 0, "no shortfall");
        require(!shortfallCovered, "already covered");
        require(msg.sender == landlord, "not landlord");
        require(state == State.Created || state == State.Funded, "not open");
        shortfallCovered = true;
        token.safeTransferFrom(msg.sender, address(this), shortfall);
        emit ShortfallCovered(msg.sender, shortfall);
    }

    /// B: 전세금 락 — 이 순간부터 "돈이 준비되어 있음"이 온체인 사실이 된다
    function fund() external {
        require(state == State.Created, "not created");
        require(msg.sender == tenantIn, "not tenantIn");
        state = State.Funded;
        token.safeTransferFrom(msg.sender, address(this), jeonseAmount);
        emit Funded(msg.sender, jeonseAmount);
    }

    /// 계약서·대출승인서 등 문서 해시 앵커링 (서류 하이패스)
    function anchorDocument(bytes32 hash, string calldata label) external onlyParty {
        documents.push(Doc(hash, label, msg.sender, block.timestamp));
        emit DocumentAnchored(hash, label, msg.sender);
    }

    function documentCount() external view returns (uint256) {
        return documents.length;
    }

    /// 브리지 풀 전용: A에게 선지급이 나갔음을 기록
    function registerBridge() external {
        require(msg.sender == bridgePool, "not pool");
        require(state == State.Funded, "not funded");
        require(shortfall == 0 || shortfallCovered, "shortfall not covered");
        require(!bridged, "already bridged");
        bridged = true;
        emit Bridged();
    }

    /// 원자적 연쇄 정산 — 정산일 이후 누구나 호출 가능.
    /// 한 트랜잭션 안에서 A의 보증금(또는 브리지 상환)과 L의 차액이 동시에 확정된다.
    function settle() external {
        require(state == State.Funded, "not funded");
        require(block.timestamp >= settleDate, "too early");
        require(shortfall == 0 || shortfallCovered, "shortfall not covered");
        state = State.Settled;

        // 정산 재원 = 신규 전세금(B 락) + 집주인이 채운 부족분. 역전세면 집주인 차액은 0.
        uint256 toLandlord = jeonseAmount + (shortfallCovered ? shortfall : 0) - refundAmount;
        // 프로토콜 정산 수수료: 집주인 차액에서만 차감 (반환 보증금은 건드리지 않음)
        uint256 fee = (jeonseAmount * settleFeeBps) / 10000;
        if (fee > toLandlord) fee = toLandlord;
        if (fee > 0) {
            toLandlord -= fee;
            token.safeTransfer(treasury, fee);
        }
        if (toLandlord > 0) {
            claimable[landlord] += toLandlord;
        }
        if (bridged) {
            // A는 이미 선지급을 받았으므로 A 몫은 풀로 상환
            token.safeTransfer(bridgePool, refundAmount);
            IBridgePoolCallback(bridgePool).onRepaid();
        } else {
            claimable[tenantOut] += refundAmount;
        }
        emit Settled(refundAmount, toLandlord, bridged);
    }

    /// 취소: 펀딩 전엔 집주인 단독, 펀딩 후엔 집주인+신규 세입자 상호 동의
    function cancel() external {
        if (state == State.Created) {
            require(msg.sender == landlord, "not landlord");
            state = State.Cancelled;
            // 펀딩 전 채워둔 부족분이 있으면 집주인에게 반환
            if (shortfallCovered) claimable[landlord] += shortfall;
            emit Cancelled();
            return;
        }
        require(state == State.Funded, "not cancellable");
        require(!bridged, "bridged: cannot cancel");
        require(msg.sender == landlord || msg.sender == tenantIn, "not a canceller");
        cancelApproved[msg.sender] = true;
        if (cancelApproved[landlord] && cancelApproved[tenantIn]) {
            state = State.Cancelled;
            claimable[tenantIn] += jeonseAmount;
            // 집주인이 채운 부족분도 함께 반환
            if (shortfallCovered) claimable[landlord] += shortfall;
            emit Cancelled();
        }
    }

    function claim() external {
        uint256 amt = claimable[msg.sender];
        require(amt > 0, "nothing to claim");
        claimable[msg.sender] = 0;
        token.safeTransfer(msg.sender, amt);
        emit Claimed(msg.sender, amt);
    }
}
