import * as _ from "lodash";
import { ethers } from "ethers";

import BytesLike = ethers.BytesLike;
import BigNumber = ethers.BigNumber;
const { keccak256, arrayify } = ethers.utils;

export const xor = (xs: BytesLike, ys: BytesLike) =>
    _.zip(arrayify(xs), arrayify(ys)).map(([x, y]) => x! ^ y!);

export const flip = (xs: BytesLike) =>
    arrayify(xs).map(x => ~x);

export const scoreSolution =
    (address: BytesLike) =>
        (task: BytesLike, solution: BytesLike) =>
            BigNumber.from(flip(xor(keccak256(solution), xor(task, keccak256(address)))));