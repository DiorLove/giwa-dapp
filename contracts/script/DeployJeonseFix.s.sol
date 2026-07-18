// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";

/// 역전세 부족분 톱업(coverShortfall)을 지원하는 JeonseEscrow 로 재배포.
/// 기존 IeumEarn v2 를 브리지 풀로 그대로 사용 — Earn/토큰/오라클은 재배포하지 않는다.
contract DeployJeonseFix is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;
    address constant EARN = 0x9B0363Ea96b39749f17e95FB99Eb3730338A3875; // 통합 유동성 풀 = 브리지 풀
    uint256 constant JEONSE_SETTLE_FEE_BPS = 5;

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        JeonseFactory jeonseFactory =
            new JeonseFactory(IERC20(MOCKKRW), EARN, treasury, JEONSE_SETTLE_FEE_BPS);
        vm.stopBroadcast();
        console.log("JeonseFactory (reverse-jeonse):", address(jeonseFactory));
    }
}
