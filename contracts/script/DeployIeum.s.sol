// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {BridgePool} from "../src/BridgePool.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";
import {MulleFactory} from "../src/MulleFactory.sol";

/// 이음 프로토콜 v2 — 수익 파라미터 포함 전체 스택 배포 (MockKRW 재사용)
contract DeployIeum is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;

    uint256 constant POOL_PROTOCOL_CUT_BPS = 2000; // 브리지 수수료(0.5%)의 20%
    uint256 constant JEONSE_SETTLE_FEE_BPS = 5;    // 전세금의 0.05% (집주인 차액에서)
    uint256 constant GYE_POT_FEE_BPS = 10;         // 곗돈의 0.1%

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        BridgePool pool = new BridgePool(IERC20(MOCKKRW), treasury, POOL_PROTOCOL_CUT_BPS);
        JeonseFactory jeonseFactory =
            new JeonseFactory(IERC20(MOCKKRW), address(pool), treasury, JEONSE_SETTLE_FEE_BPS);
        MulleFactory mulleFactory =
            new MulleFactory(IERC20(MOCKKRW), treasury, GYE_POT_FEE_BPS);
        vm.stopBroadcast();
        console.log("BridgePool:   ", address(pool));
        console.log("JeonseFactory:", address(jeonseFactory));
        console.log("MulleFactory: ", address(mulleFactory));
    }
}
