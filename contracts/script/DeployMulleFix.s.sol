// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MulleFactory} from "../src/MulleFactory.sol";

/// 이음 — start() 개설자 전용 강제 반영. Mulle 바이트코드가 바뀌었으므로
/// MulleFactory 만 재배포한다. MockKRW 재사용.
contract DeployMulleFix is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;
    uint256 constant GYE_POT_FEE_BPS = 10; // 곗돈의 0.1%

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        MulleFactory mulleFactory = new MulleFactory(IERC20(MOCKKRW), treasury, GYE_POT_FEE_BPS);
        vm.stopBroadcast();
        console.log("MulleFactory:", address(mulleFactory));
    }
}
