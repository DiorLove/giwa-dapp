// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {JeonseEscrow} from "./JeonseEscrow.sol";

/// @title 이음 전세 에스크로 팩토리 — 집주인이 에스크로를 개설한다
contract JeonseFactory {
    IERC20 public immutable token;
    address public immutable bridgePool;
    address public immutable treasury;
    uint256 public immutable settleFeeBps;
    address[] public allEscrows;

    event EscrowCreated(
        address indexed escrow,
        address indexed landlord,
        address indexed tenantIn,
        address tenantOut
    );

    constructor(IERC20 _token, address _bridgePool, address _treasury, uint256 _settleFeeBps) {
        token = _token;
        bridgePool = _bridgePool;
        treasury = _treasury;
        settleFeeBps = _settleFeeBps;
    }

    function createEscrow(
        address tenantIn,
        address tenantOut,
        uint256 jeonseAmount,
        uint256 refundAmount,
        uint256 settleDate
    ) external returns (address) {
        JeonseEscrow esc = new JeonseEscrow(
            token, bridgePool, msg.sender, tenantIn, tenantOut,
            jeonseAmount, refundAmount, settleDate, treasury, settleFeeBps
        );
        allEscrows.push(address(esc));
        emit EscrowCreated(address(esc), msg.sender, tenantIn, tenantOut);
        return address(esc);
    }

    function count() external view returns (uint256) {
        return allEscrows.length;
    }

    function getAll() external view returns (address[] memory) {
        return allEscrows;
    }
}
