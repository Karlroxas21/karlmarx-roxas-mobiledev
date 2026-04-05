import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  solidity: "0.8.28",
  plugins: [hardhatToolboxMochaEthers],
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
