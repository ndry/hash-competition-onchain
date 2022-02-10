import * as dotenv from "dotenv";
dotenv.config();

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";

export default {
    solidity: "0.8.0",
    // networks: {
    //     networks: {
    //         hardhat: {

    //         }
    //     }
    // }
};