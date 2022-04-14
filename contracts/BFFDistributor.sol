//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import "./interfaces/IBFFDistributor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

contract BFFDistributorStorage {
    // Merkle root for verification
    bytes32 public merkleRoot;
    // BFFToken to be the underlying award
    IERC20Upgradeable public BFFToken;
}

contract BFFDistributor is BFFDistributorStorage, IBFFDistributor, Ownable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMath for uint256;

    /** @dev constructor
     *  @param token Set the token to work as reward
     */
    constructor(IERC20Upgradeable token) {
        BFFToken = token;
    }

    /** @dev Set new weekly merkleroot for verification and allocate weekly reward
     *  @param _merkleRoot New merkle root to update
     *  @param totalAllocation New amount of weekly reward
     */
    function newMerkleAllocations(
        bytes32 _merkleRoot, 
        uint256 totalAllocation
    )
        external
        override
        onlyOwner
    {
        BFFToken.safeTransferFrom(msg.sender, address(this), totalAllocation);
        merkleRoot = _merkleRoot;
        emit MerkleAdded(_merkleRoot, totalAllocation);
    }

    /** @dev Verify if a address is eligible to claim a specific amount
     * @param claimer Address to be verified
     * @param amount Amount the address can claim
     * @param merkleProof Merkle proof used to verify the claimer address and amount of reward token
     */
    function verifyClaim(
        address claimer, 
        uint256 amount, 
        bytes32[] memory merkleProof
    ) 
        external 
        override
        view 
        returns(bool valid)
    {
        return _verify(claimer, amount, merkleProof);
    }

    /** @dev Distribute amount of reward token to the claimer address
     * @param claimer Address to be verified
     * @param amount Amount the address can claim
     * @param merkleProof Merkle proof used to verify the claimer address and amount of reward token
     */
    function claimTokens(
        address claimer, 
        uint256 amount, 
        bytes32[] memory merkleProof
    ) 
        external
        override
    {
        _claim(claimer, amount, merkleProof);
        _distribute(claimer, amount);
    }

    /** @dev Internal verification for function verifyClaim(address claimer, uint256 amount, bytes32[] memory merkleProof)
     * @param claimer Address to be verified
     * @param amount Amount the address can claim
     * @param merkleProof Merkle proof used to verify the claimer address and amount of reward token
     */
    function _verify(
        address claimer, 
        uint256 amount, 
        bytes32[] memory merkleProof
    ) 
        private
        view 
        returns(bool valid)
    {
        bytes32 leaf = keccak256(abi.encodePacked(claimer, amount));
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }

    /** @dev Internal claim activation for function claimTokens(address claimer, uint256 amount, bytes32[] memory merkleProof)
     * @param claimer Address to be verified
     * @param amount Amount the address can claim
     * @param merkleProof Merkle proof used to verify the claimer address and amount of reward token
     */
    function _claim(
        address claimer, 
        uint256 amount, 
        bytes32[] memory merkleProof
    ) 
        private
    {
        require(_verify(claimer, amount, merkleProof), "Incorrect merkle proof");
        emit Claimed(claimer, amount);
    }

    /** @dev Internal reward distribution for function function _claim(address claimer, uint256 amount, bytes32[] memory merkleProof)
     * @param claimer Address to be verified
     * @param amount Amount the address can claim
     */
    function _distribute(
        address claimer, 
        uint256 amount
    ) 
        private 
    {
        if (amount > 0) {
            BFFToken.safeTransfer(claimer, amount);
        } 
        else {
            revert("No balance would be transferred - not going to waste your gas");
        }
    }

    /** @dev Withdraw remaining reward in the distributor contract
     * @param to Address to transfer the reward token in the distributor contract
     * @param amount Amount of reward token to withdraw
     */
    function withdrawTokens(
        address to, 
        uint256 amount
    ) 
        external
        override
        onlyOwner
    {
        BFFToken.safeTransfer(to, amount);
        emit WithdrawFund(to, amount);
    }
}