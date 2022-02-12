// SPDX-License-Identifier: Unlicense

pragma solidity >=0.8.0 <0.9.0;

contract HashCompetition {
    uint public constant BET_SIZE = 100 wei;
    uint public constant BLOCKS_TO_CREATE_TASK = 10;

    struct Task {
        uint bank;
        uint score;
        address sender;
        mapping (bytes32 => address) solutionClaims;
    }

    mapping (bytes32 => Task) public activeTasks;

    function findBlockByHash(bytes32 h, uint searchDepth) public view returns (uint) {
        for (uint i = 1; i <= searchDepth; i++) {
            if (blockhash(block.number - i) == h) {
                return i;
            }
        }
        return 0;
    }

    function isTaskOngoing(bytes32 task) public view returns (bool) {
        return findBlockByHash(task, BLOCKS_TO_CREATE_TASK) > 0;
    }

    function claimSoluton(bytes32 task, bytes32 solutionClaim) external payable {
        require(msg.value >= BET_SIZE, "Bet is too small");
        require(isTaskOngoing(task), "Task is not ongoing");
        require(
            activeTasks[task].solutionClaims[solutionClaim] == address(0),
            "Solution is already claimed");
        
        activeTasks[task].bank += msg.value;
        activeTasks[task].solutionClaims[solutionClaim] = msg.sender;
    }
    
    function scoreSolution(bytes32 task, bytes32 solution) public view returns (uint) {
        bytes32 solutionHash = keccak256(abi.encode(solution));
        bytes32 contractSpecificTask = task ^ keccak256(abi.encodePacked(address(this)));
        bytes32 diff = (solutionHash ^ contractSpecificTask);
        return uint256(~diff);
    }

    function submitSolution(bytes32 task, bytes32 solution) external {
        require(isTaskOngoing(task), "Task is not ongoing");

        uint score = scoreSolution(task, solution);

        require(
            activeTasks[task].score < score, 
            "Better solution for the task already exists");

        activeTasks[task].score = score; 
        bytes32 solutionClaim = keccak256(abi.encode(solution));
        activeTasks[task].sender = activeTasks[task].solutionClaims[solutionClaim];
    }
    
    function claimReward(bytes32 task) external {
        require(!isTaskOngoing(task), "Task is still ongoing");

        uint bank = activeTasks[task].bank;

        payable(activeTasks[task].sender).transfer(bank);
        delete activeTasks[task];
    }
}