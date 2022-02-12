import * as _ from "lodash";
import { assert, expect } from "chai";
import { ethers as ethersPlugin } from "hardhat";
import { ethers } from "ethers";
import { HashCompetition__factory } from "../typechain-types/factories/HashCompetition__factory";
import { scoreSolution, xor } from "../scripts/utils";
import { HashCompetition } from "../typechain-types";

import BigNumber = ethers.BigNumber;
const { keccak256 } = ethers.utils;

describe("HashCompetition contract", () => {
    const provider = ethersPlugin.provider;

    const generateBlocks = async (count: number) => {
        const signer0 = await provider.getSigner(0);
        const signer0Adress = await signer0.getAddress();
        for (let i = 0; i < count; i++) {
            await (await signer0.sendTransaction({ to: signer0Adress })).wait();
        }
    }


    const blockhashRel =
        async (i: number) =>
            (await provider.getBlock(await provider.getBlockNumber() - i)).hash;

    const betterWorseSolution = (task: string) => {
        const _scoreSolution = scoreSolution(hashCompetition.address);

        const solution1 = "0x0000000000000000000000000000000000000000000000000000000000000001";
        const solution2 = "0x0000000000000000000000000000000000000000000000000000000000000002";

        return _scoreSolution(task, solution1).gt(_scoreSolution(task, solution2))
            ? [solution1, solution2]
            : [solution2, solution1];
    }

    let hashCompetition: HashCompetition;
    let BLOCKS_TO_CREATE_TASK: number;
    let BET_SIZE: number;
    before(async () => {
        const hashCompetitionFactory = await ethersPlugin.getContractFactory("HashCompetition") as HashCompetition__factory;
        hashCompetition = await (await hashCompetitionFactory.deploy()).deployed();

        BLOCKS_TO_CREATE_TASK = (await hashCompetition.BLOCKS_TO_CREATE_TASK()).toNumber();
        BET_SIZE = (await hashCompetition.BET_SIZE()).toNumber();

        await generateBlocks(20);
    });

    it("scores ideal solution", async () => {
        const zeros = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const address = hashCompetition.address;

        const score = (await hashCompetition.scoreSolution(
            xor(keccak256(zeros), keccak256(address)),
            zeros));

        expect(score).eq(BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
    });

    it("scores solution correctly", async () => {
        const task = "0x0000000000000000000000000000000000000000000000000000000000000001";
        const solution = "0x0000000000000000000000000000000000000000000000000000000000000002";

        expect((await hashCompetition.scoreSolution(task, solution)))
            .equals(scoreSolution(hashCompetition.address)(task, solution));
    });

    it("finds block by hash", async () => {
        expect(await hashCompetition.findBlockByHash(await blockhashRel(5), 10))
            .equals(5);
    });

    it("fails to find (returns 0) old block by hash", async () => {
        expect(await hashCompetition.findBlockByHash(await blockhashRel(15), 10))
            .equals(0);
    });

    it("fails to find (returns 0) block by unrelated hash", async () => {
        expect(await hashCompetition.findBlockByHash("0x0000000000000000000000000000000000000000000000000000000000000001", 10))
            .equals(0);
    });

    it("reverts solution claim with insufficient bet", async () => {
        await expect(hashCompetition.claimSoluton(
            await blockhashRel(BLOCKS_TO_CREATE_TASK + 2),
            "0x0000000000000000000000000000000000000000000000000000000000000000", {
            value: BET_SIZE - 1,
        })
        ).revertedWith("Bet is too small");
    });

    it("reverts solution claim for outdated task", async () => {
        await expect(hashCompetition.claimSoluton(
            await blockhashRel(BLOCKS_TO_CREATE_TASK + 2),
            "0x0000000000000000000000000000000000000000000000000000000000000000", {
            value: BET_SIZE,
        })
        ).revertedWith("Task is not ongoing");
    });

    it("reverts solution claim for unrelated task", async () => {
        await expect(hashCompetition.claimSoluton(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000", {
            value: BET_SIZE,
        })
        ).revertedWith("Task is not ongoing");
    });

    it("accepts solution claim", async () => {
        await generateBlocks(3);

        const task = await blockhashRel(1);

        await expect(await hashCompetition.claimSoluton(
            task,
            "0x0000000000000000000000000000000000000000000000000000000000000000", {
            value: BET_SIZE,
        })).changeEtherBalances(
            [hashCompetition, await provider.getSigner(0)],
            [BET_SIZE, -BET_SIZE]
        );

        const activeTask = await hashCompetition.activeTasks(task);
        expect(activeTask.bank).eq(BET_SIZE);
    });

    it("reverts solution if already claimed", async () => {
        await generateBlocks(3);

        const task = await blockhashRel(1);

        await hashCompetition.claimSoluton(
            task,
            "0x0000000000000000000000000000000000000000000000000000000000000000", {
            value: BET_SIZE,
        });
        await expect(hashCompetition.connect(await provider.getSigner(1)).claimSoluton(
            task,
            "0x0000000000000000000000000000000000000000000000000000000000000000", {
            value: BET_SIZE,
        })
        ).revertedWith("Solution is already claimed");
    });

    it("reverts solution submission for outdated task", async () => {
        await expect(hashCompetition.submitSolution(
            await blockhashRel(BLOCKS_TO_CREATE_TASK + 2),
            "0x0000000000000000000000000000000000000000000000000000000000000000")
        ).revertedWith("Task is not ongoing");
    });

    it("reverts solution submission for unrelated task", async () => {
        await expect(hashCompetition.submitSolution(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000")
        ).revertedWith("Task is not ongoing");
    });

    it("accepts solution submission", async () => {
        const _scoreSolution = scoreSolution(hashCompetition.address);

        await generateBlocks(3);

        const task = await blockhashRel(1);
        const solution = "0x0000000000000000000000000000000000000000000000000000000000000000";
        await hashCompetition.claimSoluton(
            task,
            keccak256(solution), {
            value: BET_SIZE,
        });
        await hashCompetition.submitSolution(
            task,
            solution);

        const activeTask = await hashCompetition.activeTasks(task);
        expect(activeTask.bank)
            .equals(BET_SIZE);
        expect(activeTask.score)
            .equals(_scoreSolution(task, solution));
        expect(activeTask.sender)
            .equals(await provider.getSigner(0).getAddress());
    });

    it("accepts better solution submission", async () => {
        const _scoreSolution = scoreSolution(hashCompetition.address);
        const hashCompetition1 = hashCompetition.connect(await provider.getSigner(1));

        await generateBlocks(3);

        const task = await blockhashRel(1);
        const [betterSolution, worseSolution] = betterWorseSolution(task);

        await hashCompetition.claimSoluton(task, keccak256(worseSolution), { value: BET_SIZE });
        await hashCompetition1.claimSoluton(task, keccak256(betterSolution), { value: BET_SIZE });
        await hashCompetition.submitSolution(task, worseSolution);
        await hashCompetition1.submitSolution(task, betterSolution);

        const activeTask = await hashCompetition.activeTasks(task);
        expect(activeTask.bank).eq(2 * BET_SIZE);
        expect(activeTask.score).eq(_scoreSolution(task, betterSolution));
        expect(activeTask.sender).eq(await provider.getSigner(1).getAddress());
    });

    it("reverts worse solution submission", async () => {
        const _scoreSolution = scoreSolution(hashCompetition.address);
        const hashCompetition1 = hashCompetition.connect(await provider.getSigner(1));

        await generateBlocks(3);

        const task = await blockhashRel(1);
        const [betterSolution, worseSolution] = betterWorseSolution(task);

        await hashCompetition.claimSoluton(task, keccak256(worseSolution), { value: BET_SIZE });
        await hashCompetition1.claimSoluton(task, keccak256(betterSolution), { value: BET_SIZE });
        await hashCompetition1.submitSolution(task, betterSolution);

        await expect(hashCompetition.submitSolution(task, worseSolution))
            .revertedWith("Better solution for the task already exists");

        const activeTask = await hashCompetition.activeTasks(task);
        expect(activeTask.bank).eq(2 * BET_SIZE);
        expect(activeTask.score).eq(_scoreSolution(task, betterSolution));
        expect(activeTask.sender).eq(await provider.getSigner(1).getAddress());
    });

    it("reverts reward claim for ongoing task", async () => {
        const task = await blockhashRel(1);
        await expect(hashCompetition.claimReward(task))
            .revertedWith("Task is still ongoing");
    });

    it("fulfills reward claim (1 submission) and deletes task", async () => {

        await generateBlocks(3);

        const task = await blockhashRel(1);
        const solution = "0x0000000000000000000000000000000000000000000000000000000000000000";
        await hashCompetition.claimSoluton(task, keccak256(solution), { value: BET_SIZE });
        await hashCompetition.submitSolution(task, solution);

        await generateBlocks(BLOCKS_TO_CREATE_TASK);

        await expect(await hashCompetition.claimReward(task)).changeEtherBalances(
            [hashCompetition, await provider.getSigner(0)],
            [-BET_SIZE, BET_SIZE]
        );

        const activeTask = await hashCompetition.activeTasks(task);
        expect(activeTask.bank).eq(0);
        expect(activeTask.score).eq(0);
        expect(activeTask.sender).eq("0x0000000000000000000000000000000000000000");
    });

    it("fulfills reward claim (2 submissions)", async () => {
        const hashCompetition1 = hashCompetition.connect(await provider.getSigner(1));

        await generateBlocks(3);

        const task = await blockhashRel(1);
        const [betterSolution, worseSolution] = betterWorseSolution(task);

        await hashCompetition.claimSoluton(task, keccak256(worseSolution), { value: BET_SIZE });
        await hashCompetition1.claimSoluton(task, keccak256(betterSolution), { value: BET_SIZE });
        await hashCompetition.submitSolution(task, worseSolution);
        await hashCompetition1.submitSolution(task, betterSolution);

        await generateBlocks(BLOCKS_TO_CREATE_TASK);

        await expect(await hashCompetition.claimReward(task)).changeEtherBalances(
            [hashCompetition, await provider.getSigner(1)],
            [-2 * BET_SIZE, 2 * BET_SIZE]
        );
    });
})