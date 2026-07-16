// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {BridgePool} from "../src/BridgePool.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";

/// 기존 MockKRW를 재사용해 이음 전세 에스크로 스택 배포
contract DeployIeum is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;

    function run() external {
        vm.startBroadcast();
        BridgePool pool = new BridgePool(IERC20(MOCKKRW));
        JeonseFactory factory = new JeonseFactory(IERC20(MOCKKRW), address(pool));
        vm.stopBroadcast();
        console.log("BridgePool:   ", address(pool));
        console.log("JeonseFactory:", address(factory));
    }
}
