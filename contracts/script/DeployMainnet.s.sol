// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SherpaPayScheduler.sol";
import "../src/SherpaPayVault.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SherpaPayScheduler scheduler = new SherpaPayScheduler();
        SherpaPayVault vault = new SherpaPayVault();

        console.log("SherpaPayScheduler deployed at:", address(scheduler));
        console.log("SherpaPayVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
