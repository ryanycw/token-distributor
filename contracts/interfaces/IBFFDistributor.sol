// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// Allows anyone to claim BFF reward token if they exist in the weekly merkle root.
interface IBFFDistributor {
    // Set the merkle root for the weekly reward distribution.
    function newMerkleAllocations(bytes32 merkleRoot, uint256 totalAllocation) external;
    // Return true if the claimer is eligible to claim the given amount reward with the merkleProof.
    function verifyClaim(address claimer, uint256 amount, bytes32[] memory merkleProof) external view returns(bool);
    // Claim the given amount of reward with the merkleProof by the claimer.
    function claimTokens(address claimer, uint256 amount, bytes32[] memory merkleProof) external;
    // Withdraw the given amount of reward tokens in the contract. 
    function withdrawTokens(address to, uint256 amount) external;
    // This event is triggered whenever a call to #newMerkleAllocations succeeds.
    event MerkleAdded(bytes32 merkleRoot, uint256 totalAllocation);
    // This event is triggered whenever a call to #claimTokens succeeds.
    event Claimed(address claimer, uint256 amount);
    // This event is triggered whenever a call to #withdrawTokens succeeds.
    event WithdrawFund(address to, uint256 amount);
}