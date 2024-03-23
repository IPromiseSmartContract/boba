import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();
let SEP_URL = process.env.SEP_URL;
let ETHER_SCAN_API_KEY = process.env.ETHER_SCAN_API_KEY;
let SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-sepolia.g.alchemy.com/v2/zF6xioFDOk1zHKWUGk-bmtRZmxxz4Vjb",
        blockNumber: 5542405,
      },
    },
    sepolia: {
      url: SEP_URL,
      accounts: [SEPOLIA_PRIVATE_KEY!],
    },
  },
};

export default config;
