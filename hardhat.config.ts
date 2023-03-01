import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

import dotenv from "dotenv";
dotenv.config();

// For reference on querying onchain data using hardhat SDK: https://hackmd.io/@fvictorio/hardhat-networks-and-providers
// ethersjs cheatsheet: https://dev.to/hideckies/ethers-js-cheat-sheet-1h5j

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    frame: {
      url: "http://127.0.0.1:1248",
      timeout: 300000,
    },
    deployOptimismGoerli: {
      url: "http://127.0.0.1:1248",
      timeout: 300000,
    },
    deployOptimism: {
      url: "http://127.0.0.1:1248",
      timeout: 300000,
    },
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 1337,
    },
    optimism: {
      url: "https://rpc.ankr.com/optimism",
    },
    optimismGoerli: {
      url: "https://goerli.optimism.io",
    },
  },
  etherscan: {
    apiKey: {
      optimisticEthereum: process.env.OPTIMISM_ETHERSCAN_API_KEY as string, // https://optimistic.etherscan.io/
      optimisticGoerli: process.env.OPTIMISM_ETHERSCAN_API_KEY as string, // https://goerli-optimism.etherscan.io/
    },
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
