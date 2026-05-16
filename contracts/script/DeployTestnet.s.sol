// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SherpaPayScheduler.sol";
import "../src/SherpaPayVault.sol";

contract DeployTestnet is Script {
    function run() external {
        vm.startBroadcast();

        SherpaPayScheduler scheduler = new SherpaPayScheduler();
        SherpaPayVault vault = new SherpaPayVault();

        console.log("SherpaPayScheduler deployed at:", address(scheduler));
        console.log("SherpaPayVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
