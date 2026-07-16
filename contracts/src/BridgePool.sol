// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {JeonseEscrow} from "./JeonseEscrow.sol";

/// @title 이음 브리지 풀 — 이사 날짜 사이의 며칠을 잇는 초단기 유동성.
/// 다음 세입자의 전세금이 이미 온체인에 락된 것을 확인한 뒤에만
/// 기존 세입자에게 보증금을 선지급한다. 담보가 눈에 보이는 대출.
contract BridgePool {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public constant FEE_BPS = 50; // 선지급 수수료 0.5% (할인 지급 방식)

    uint256 public totalShares;
    uint256 public totalOutstanding; // 상환 예정 원금 합계
    mapping(address => uint256) public shares;
    mapping(address => uint256) public debtOf; // escrow => 상환 예정액

    event Deposited(address indexed lp, uint256 amount, uint256 minted);
    event Withdrawn(address indexed lp, uint256 amount, uint256 burned);
    event BridgeAdvanced(address indexed escrow, address indexed tenantOut, uint256 advanced, uint256 fee);
    event Repaid(address indexed escrow, uint256 amount);

    constructor(IERC20 _token) {
        token = _token;
    }

    /// 풀 총자산 = 보유 현금 + 상환 예정 채권
    function totalAssets() public view returns (uint256) {
        return token.balanceOf(address(this)) + totalOutstanding;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "amount=0");
        uint256 minted = totalShares == 0 ? amount : (amount * totalShares) / totalAssets();
        totalShares += minted;
        shares[msg.sender] += minted;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, minted);
    }

    function withdraw(uint256 shareAmount) external {
        require(shareAmount > 0 && shares[msg.sender] >= shareAmount, "bad shares");
        uint256 amount = (shareAmount * totalAssets()) / totalShares;
        require(token.balanceOf(address(this)) >= amount, "liquidity in use");
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, shareAmount);
    }

    /// 기존 세입자(A)가 선지급 요청. 조건은 전부 온체인으로 검증된다:
    /// 해당 에스크로에 다음 세입자의 전세금이 실제로 락되어 있어야 한다.
    function bridge(address escrowAddr) external {
        JeonseEscrow esc = JeonseEscrow(escrowAddr);
        require(esc.bridgePool() == address(this), "wrong pool");
        require(esc.state() == JeonseEscrow.State.Funded, "escrow not funded");
        require(msg.sender == esc.tenantOut(), "not tenantOut");
        require(!esc.bridged(), "already bridged");

        uint256 refund = esc.refundAmount();
        uint256 fee = (refund * FEE_BPS) / 10000;
        uint256 advance = refund - fee;
        require(token.balanceOf(address(this)) >= advance, "insufficient liquidity");

        esc.registerBridge();
        debtOf[escrowAddr] = refund;
        totalOutstanding += refund;
        token.safeTransfer(msg.sender, advance);
        emit BridgeAdvanced(escrowAddr, msg.sender, advance, fee);
    }

    /// 에스크로 정산 시 콜백 — 상환 예정 채권을 소멸시킨다 (토큰은 settle이 직접 전송)
    function onRepaid() external {
        uint256 debt = debtOf[msg.sender];
        require(debt > 0, "no debt");
        debtOf[msg.sender] = 0;
        totalOutstanding -= debt;
        emit Repaid(msg.sender, debt);
    }
}
