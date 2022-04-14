const fs = require("fs");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const SHA256 = require('crypto-js/sha256');
const utils = require("../helpers/utils");
const dot = require("dotenv/config");
const {ethers, upgrades} = require("hardhat");
const {BN, constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

describe("BFFCoin Distributor", function() {
    before(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
        chainId = await ethers.provider.getNetwork();
        gasPrice = ethers.BigNumber.from("90")
        oneGwei = ethers.BigNumber.from("1000000000");

        erc20 = await ethers.getContractFactory("BFFCoin");
        BFFCoin = await upgrades.deployProxy(erc20, ["BFFCoin", "BFFC", ethers.utils.parseEther('1000')]);
        distributor = await ethers.getContractFactory("BFFDistributor");
        BFFDistributor = await distributor.deploy(BFFCoin.address);
    });

    describe("Test MerkleTree Construction", function() {
        it("verify merkle root and merkle tree", async function() {
            inputFileName = './test/record.csv';
            outputFileName = './test/record.json';
            await utils.convertCsvToJson(inputFileName, outputFileName);
            let rawdata = fs.readFileSync(outputFileName);
            let airdrop = JSON.parse(rawdata);
            abiCoder = new ethers.utils.AbiCoder();
            const leaves = airdrop.record.map(x => keccak256(abiCoder.encode([ "address", "uint256" ], [x[0], x[1]])));
            const tree = new MerkleTree(leaves, keccak256);
            const root = tree.getRoot().toString('hex');

            res = await BFFCoin.approve(BFFDistributor.address, ethers.utils.parseEther('100'));
            res = await BFFDistributor.newMerkleAllocations(`0x${root}`, ethers.utils.parseEther('100'));
            ownerBalance = await BFFCoin.balanceOf(owner.address);
            contractBalance = await BFFCoin.balanceOf(BFFDistributor.address);
            expect(ownerBalance.toString()).to.be.equal(ethers.utils.parseEther('900').toString());
            expect(contractBalance.toString()).to.be.equal(ethers.utils.parseEther('100').toString());

            for (let i=0; i<airdrop.record.length; i++) {
                recordRow = airdrop.record[i];
                const leaf = keccak256(abiCoder.encode([ "address", "uint256" ], [recordRow[0], recordRow[1]]));
                const proof = tree.getProof(leaf);
                console.log(tree.verify(proof, leaf, root));
            }
        });
    });
})