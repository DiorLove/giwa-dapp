// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockKRW} from "../src/MockKRW.sol";
import {JeonseEscrow} from "../src/JeonseEscrow.sol";
import {BridgePool} from "../src/BridgePool.sol";

contract JeonseEscrowTest is Test {
    MockKRW krw;
    BridgePool pool;
    JeonseEscrow esc;

    address landlord = makeAddr("landlord");   // 집주인 L
    address tenantIn = makeAddr("tenantIn");   // 신규 세입자 B
    address tenantOut = makeAddr("tenantOut"); // 기존 세입자 A
    address lp = makeAddr("lp");               // 브리지 풀 예치자

    uint256 constant JEONSE = 300_000_000e18;  // ₩3억
    uint256 constant REFUND = 280_000_000e18;  // ₩2.8억 (구 전세금)
    uint256 constant SETTLE_DELAY = 7 days;

    function setUp() public {
        krw = new MockKRW();
        pool = new BridgePool(IERC20(address(krw)));
        esc = new JeonseEscrow(
            IERC20(address(krw)),
            address(pool),
            landlord,
            tenantIn,
            tenantOut,
            JEONSE,
            REFUND,
            block.timestamp + SETTLE_DELAY
        );

        // B에게 전세금 마련 (파우셋 여러 번)
        vm.startPrank(tenantIn);
        for (uint256 i = 0; i < 30; i++) krw.faucet();
        krw.approve(address(esc), type(uint256).max);
        vm.stopPrank();

        // LP에게 풀 예치금 마련
        vm.startPrank(lp);
        for (uint256 i = 0; i < 30; i++) krw.faucet();
        krw.approve(address(pool), type(uint256).max);
        vm.stopPrank();
    }

    // ---- 생성/자금 락 ----

    function test_ConstructorValidation() public {
        vm.expectRevert(bytes("refund > jeonse"));
        new JeonseEscrow(
            IERC20(address(krw)), address(pool), landlord, tenantIn, tenantOut,
            100e18, 200e18, block.timestamp + 1 days
        );
    }

    function test_FundLocksJeonse() public {
        vm.prank(tenantIn);
        esc.fund();
        assertEq(uint8(esc.state()), uint8(JeonseEscrow.State.Funded));
        assertEq(krw.balanceOf(address(esc)), JEONSE);
    }

    function test_OnlyTenantInCanFund() public {
        vm.prank(landlord);
        vm.expectRevert(bytes("not tenantIn"));
        esc.fund();
    }

    // ---- 문서 앵커링 ----

    function test_PartiesCanAnchorDocuments() public {
        bytes32 h = keccak256(unicode"전세계약서 PDF");
        vm.prank(landlord);
        esc.anchorDocument(h, unicode"전세계약서");
        (bytes32 hash, string memory label, address by,) = esc.documents(0);
        assertEq(hash, h);
        assertEq(label, unicode"전세계약서");
        assertEq(by, landlord);
        assertEq(esc.documentCount(), 1);
    }

    function test_StrangerCannotAnchor() public {
        vm.prank(lp);
        vm.expectRevert(bytes("not a party"));
        esc.anchorDocument(keccak256("x"), "x");
    }

    // ---- 원자적 연쇄 정산 ----

    function test_AtomicSettlementSplitsFunds() public {
        vm.prank(tenantIn);
        esc.fund();
        vm.warp(esc.settleDate());

        esc.settle();

        assertEq(uint8(esc.state()), uint8(JeonseEscrow.State.Settled));
        // A는 구 전세금, L은 차액을 claim으로 수령
        assertEq(esc.claimable(tenantOut), REFUND);
        assertEq(esc.claimable(landlord), JEONSE - REFUND);

        vm.prank(tenantOut);
        esc.claim();
        vm.prank(landlord);
        esc.claim();
        assertEq(krw.balanceOf(tenantOut), REFUND);
        assertEq(krw.balanceOf(landlord), JEONSE - REFUND);
        assertEq(krw.balanceOf(address(esc)), 0);
    }

    function test_CannotSettleBeforeDateOrUnfunded() public {
        vm.expectRevert(bytes("not funded"));
        esc.settle();

        vm.prank(tenantIn);
        esc.fund();
        vm.expectRevert(bytes("too early"));
        esc.settle();
    }

    // ---- 취소 ----

    function test_LandlordCanCancelBeforeFunding() public {
        vm.prank(landlord);
        esc.cancel();
        assertEq(uint8(esc.state()), uint8(JeonseEscrow.State.Cancelled));
    }

    function test_MutualCancelAfterFundingRefundsTenantIn() public {
        vm.prank(tenantIn);
        esc.fund();

        vm.prank(landlord);
        esc.cancel(); // 1/2 동의
        assertEq(uint8(esc.state()), uint8(JeonseEscrow.State.Funded));

        vm.prank(tenantIn);
        esc.cancel(); // 2/2 동의 → 취소 확정
        assertEq(uint8(esc.state()), uint8(JeonseEscrow.State.Cancelled));
        assertEq(esc.claimable(tenantIn), JEONSE);
    }

    // ---- 브리지 연동 ----

    function test_BridgeAdvancesToTenantOutAndRepaysOnSettle() public {
        // 풀에 유동성 공급
        vm.prank(lp);
        pool.deposit(290_000_000e18);

        // B 자금 락
        vm.prank(tenantIn);
        esc.fund();

        // A가 브리지 선지급 요청 (수수료 0.5% 할인 지급)
        uint256 fee = (REFUND * pool.FEE_BPS()) / 10000;
        vm.prank(tenantOut);
        pool.bridge(address(esc));

        assertEq(krw.balanceOf(tenantOut), REFUND - fee); // 선지급 수령
        assertTrue(esc.bridged());

        // 정산: A 몫은 풀로 상환, L은 차액
        vm.warp(esc.settleDate());
        esc.settle();
        assertEq(esc.claimable(tenantOut), 0);           // 이미 선지급 받음
        assertEq(esc.claimable(landlord), JEONSE - REFUND);
        assertEq(krw.balanceOf(address(pool)), 290_000_000e18 - (REFUND - fee) + REFUND);
        // 풀 수익 = fee → 예치자 자산 증가
        assertEq(pool.totalAssets(), 290_000_000e18 + fee);
    }

    function test_OnlyTenantOutOfValidEscrowCanBridge() public {
        vm.prank(lp);
        pool.deposit(290_000_000e18);

        // 미펀딩 상태에서는 불가
        vm.prank(tenantOut);
        vm.expectRevert(bytes("escrow not funded"));
        pool.bridge(address(esc));

        vm.prank(tenantIn);
        esc.fund();

        // 제3자는 불가
        vm.prank(lp);
        vm.expectRevert(bytes("not tenantOut"));
        pool.bridge(address(esc));

        // 중복 브리지 불가
        vm.prank(tenantOut);
        pool.bridge(address(esc));
        vm.prank(tenantOut);
        vm.expectRevert(bytes("already bridged"));
        pool.bridge(address(esc));
    }

    function test_LpSharesEarnFee() public {
        vm.prank(lp);
        pool.deposit(290_000_000e18);
        uint256 shares = pool.shares(lp);

        vm.prank(tenantIn);
        esc.fund();
        vm.prank(tenantOut);
        pool.bridge(address(esc));
        vm.warp(esc.settleDate());
        esc.settle();

        // 전액 출금 시 원금 + 수수료 수익
        uint256 fee = (REFUND * pool.FEE_BPS()) / 10000;
        vm.prank(lp);
        pool.withdraw(shares);
        assertEq(krw.balanceOf(lp), 30 * 10_000_000e18 - 290_000_000e18 + 290_000_000e18 + fee);
    }
}
