import { ethers as ethersPlugin } from "hardhat";
import { HashCompetition__factory } from "../typechain-types/factories/HashCompetition__factory";

async function main() {
    const hashCompetitionFactory = await ethersPlugin.getContractFactory("HashCompetition") as HashCompetition__factory;
    const hashCompetition = await (await hashCompetitionFactory.deploy()).deployed();
    console.log("Deployed at address", hashCompetition.address);
}

main();