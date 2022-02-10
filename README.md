# HashCompetition smart contract

HashCompetition smart contract implements a betting game on hash guessing. 
Every solution submission includes some minimum bet. 
The author of the highest scored solution takes the bank.

Every block within last N blocks is a manifestation of a task,
and a hash of that block is a seed for that task.
Task goal is task seed xored with contract address hash.
The task is to find some uint256 whose hash xored against the task goal
gives the highest number of leading zero bits -- the score:

`score = countFirstZeroBits(keccak256(solution) ^ (task ^ keccak256(address(this)))) + 1`

The interaction with the contract consists of three steps:

1. While the task block is within the last N block,
one claims having a solution without revealing it,
by sending the solution hash and the bet amount to `claimSolution`.

2. While the task block is still within the last N block, 
one reveils the solution itself by submitting it to `submitSolution`.
Only better than the current solution would be accepted.

3. When the task block goes out of the last N blocks,
the submitter of the highest scored solution
is eligible to receive the bank on `claimReward` call.

Anyone can claim any amount of any solutions, 
but has to provide bet amount for each claim.

Should one secceed to reclaim others solution claim, 
when the transaction was published, but not included into blockchain yet, 
they would still need to provide the bet amount, 
but will not be able to ever submit a solution.
Unfortunatelly, the original solution finder won't be able to claim that solution.

## Further research and development

HachCompetition alone is nothing more but a proof-of-work type race:
start brutforcing, the more hashing power you own, the better your chances to win are.

The interesting part comes in when scoring algorithm is something like 
"take a seed, unpack it into a round of some single-player game,
then take a sequence of moves as solution, emulate it, score it."
Some games with pretty primitive rulesets exhibit quite complex gameplay. 
A well-known examples are chess and Go (multiplayer, thought), or Game of Life (zero-player).
The thing is one cannot just find the optimal solution by brute force -
the decision tree is exponentially wide and deep - one has to master the game,
to research the solution space mathematically, to develop euristics etc.

So consider taking a single-player primitive but complex game,
and giving individuals economic incentive to research it in permissionless manner,
encouraging automation.
