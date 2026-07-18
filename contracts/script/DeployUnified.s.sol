// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IeumEarn, IPriceOracle} from "../src/IeumEarn.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";

/// 통합 배포 — IeumEarn v2(브리지 포함)를 단일 유동성 풀로, JeonseFactory 는 이를 브리지 풀로 지정.
/// MockKRW / MockETH / PriceOracle 은 기존 배포분 재사용.
contract DeployUnified is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;
    address constant METH = 0x9AaB1E96a0E800beA9E1dC2aBc0378067b375296;
    address constant ORACLE = 0x5473209D28849b78262455988a609c0bDA0332B5;

    uint256 constant BASE_RATE = 0;
    uint256 constant SLOPE1 = 0.04e27;
    uint256 constant SLOPE2 = 0.60e27;
    uint256 constant OPTIMAL_U = 0.80e27;
    uint256 constant RESERVE_FACTOR = 1000;
    uint256 constant LTV = 7000;
    uint256 constant LIQ_THRESHOLD = 8000;
    uint256 constant LIQ_BONUS = 700;
    uint256 constant JEONSE_SETTLE_FEE_BPS = 5;

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        IeumEarn earn = new IeumEarn(
            IERC20(MOCKKRW),
            IERC20(METH),
            IPriceOracle(ORACLE),
            treasury,
            BASE_RATE,
            SLOPE1,
            SLOPE2,
            OPTIMAL_U,
            RESERVE_FACTOR,
            LTV,
            LIQ_THRESHOLD,
            LIQ_BONUS
        );
        JeonseFactory jeonseFactory =
            new JeonseFactory(IERC20(MOCKKRW), address(earn), treasury, JEONSE_SETTLE_FEE_BPS);
        vm.stopBroadcast();
        console.log("IeumEarn v2:  ", address(earn));
        console.log("JeonseFactory:", address(jeonseFactory));
    }
}
