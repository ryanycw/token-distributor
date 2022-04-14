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
    address public BFFtoken;
    bytes32 public merkleRoot;
    IERC20Upgradeable public BFFToken;
}

contract BFFDistributor is BFFDistributorStorage, IBFFDistributor, Ownable {

    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMath for uint256;

    constructor(IERC20Upgradeable token) {
        BFFToken = token;
    }

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
        console.log("This is leaf: ");
        console.logBytes32(leaf);
        console.log("This is root: ");
        console.logBytes32(merkleRoot);
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }

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

    function withdrawTokens(address to, uint256 amount) 
        external
        override
        onlyOwner
    {
        BFFToken.safeTransfer(to, amount);
        emit WithdrawFund(to, amount);
    }
}