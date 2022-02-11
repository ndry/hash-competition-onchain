import * as _ from "lodash";
import { ethers } from "ethers";

import BytesLike = ethers.BytesLike;
const { keccak256, arrayify, hexlify } = ethers.utils;

export const xorBytes = (xs: BytesLike, ys: BytesLike) => 
    _.zip(arrayify(xs), arrayify(ys))
        .map(([x, y]) => x! ^ y!);

export const countFirstZeroBits = (bs: BytesLike) => {
    const x = arrayify(bs);
    let count = 0;
    for (let i = 0; i < 32; i++) {
        let b = x[i];
        if (b == 0) {
            count += 8;
        } else {
            while (b < 0x80) {
                count += 1;
                b = (b << 1) + 1;
            }
            break;
        }
    }
    return count;
}

export const scoreSolution =
    (address: BytesLike) =>
        (task: BytesLike, solution: BytesLike) => 
            countFirstZeroBits(
                xorBytes(keccak256(solution), 
                xorBytes(task, keccak256(address)))
            ) + 1;