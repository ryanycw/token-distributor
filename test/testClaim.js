const fs = require("fs");
const {MerkleTree} = require('merkletreejs');
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

    describe("Test MerkleTree Claiming", function() {
        it("claim tokens in general case", async function() {
            inputFileName = './test/record.csv';
            outputFileName = './test/record.json';
            await utils.convertCsvToJson(inputFileName, outputFileName);
            let rawdata = fs.readFileSync(outputFileName);
            let airdrop = JSON.parse(rawdata);
            abiCoder = new ethers.utils.AbiCoder();
            const leaves = airdrop.record.map(x => ethers.utils.solidityKeccak256([ "address", "uint256" ], [ x[0], ethers.utils.parseEther(x[1]).toString() ]));
            const tree = new MerkleTree(leaves, keccak256, {sortPairs: true});
            const root = tree.getHexRoot();

            res = await BFFCoin.approve(BFFDistributor.address, ethers.utils.parseEther('100'));
            res = await BFFDistributor.newMerkleAllocations(root, ethers.utils.parseEther('100'));
            ownerBalance = await BFFCoin.balanceOf(owner.address);
            contractBalance = await BFFCoin.balanceOf(BFFDistributor.address);
            expect(ownerBalance.toString()).to.be.equal(ethers.utils.parseEther('900').toString());
            expect(contractBalance.toString()).to.be.equal(ethers.utils.parseEther('100').toString());

            for (let i=1; i<airdrop.record.length; i++) {
                recordRow = airdrop.record[i];
                const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [recordRow[0], ethers.utils.parseEther(recordRow[1]).toString()]).toString('hex');
                const proof = tree.getHexProof(leaf);
                verifyRes = await BFFDistributor.verifyClaim(recordRow[0], ethers.utils.parseEther(recordRow[1]).toString(), proof);
                expect(verifyRes).to.be.true;
                claimRes = await BFFDistributor.claimTokens(recordRow[0], ethers.utils.parseEther(recordRow[1]).toString(), proof);
                const userBalance = await BFFCoin.balanceOf(recordRow[0]);
                expect(userBalance.toString()).to.be.equal(ethers.utils.parseEther(recordRow[1]).toString());
            }

            contractBalance = await BFFCoin.balanceOf(BFFDistributor.address);
            expect(contractBalance.toString()).to.be.equal(ethers.utils.parseEther('10').toString());
        });
        it("claim tokens when amount is zero", async function() {
            inputFileName = './test/record.csv';
            outputFileName = './test/record.json';
            await utils.convertCsvToJson(inputFileName, outputFileName);
            let rawdata = fs.readFileSync(outputFileName);
            let airdrop = JSON.parse(rawdata);
            const leaves = airdrop.record.map(x => ethers.utils.solidityKeccak256([ "address", "uint256" ], [ x[0], x[1] ]));
            const tree = new MerkleTree(leaves, keccak256, {sortPairs: true});
            const root = tree.getHexRoot();

            res = await BFFCoin.approve(BFFDistributor.address, ethers.utils.parseEther('100'));
            res = await BFFDistributor.newMerkleAllocations(root, ethers.utils.parseEther('100'));

            recordRow = airdrop.record[0];
            const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [recordRow[0], ethers.utils.parseEther(recordRow[1]).toString()]).toString('hex');
            const proof = tree.getHexProof(leaf);
            verifyRes = await BFFDistributor.verifyClaim(recordRow[0], ethers.utils.parseEther(recordRow[1]).toString(), proof);
            expect(verifyRes).to.be.true;
            await expectRevert(
                BFFDistributor.claimTokens(recordRow[0], ethers.utils.parseEther(recordRow[1]).toString(), proof),
                "No balance would be transferred - not going to waste your gas"
            );
        });

        it("claim tokens when wrong merkle proofs", async function() {
            inputFileName = './test/record.csv';
            outputFileName = './test/record.json';
            await utils.convertCsvToJson(inputFileName, outputFileName);
            let rawdata = fs.readFileSync(outputFileName);
            let airdrop = JSON.parse(rawdata);
            const leaves = airdrop.record.map(x => ethers.utils.solidityKeccak256([ "address", "uint256" ], [ x[0], x[1] ]));
            const tree = new MerkleTree(leaves, keccak256, {sortPairs: true});
            const root = tree.getHexRoot();

            res = await BFFCoin.approve(BFFDistributor.address, ethers.utils.parseEther('100'));
            res = await BFFDistributor.newMerkleAllocations(root, ethers.utils.parseEther('100'));

            recordRow = airdrop.record[0];
            wrongRecordRow = airdrop.record[1];
            const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [recordRow[0], ethers.utils.parseEther(recordRow[1]).toString()]).toString('hex');
            const proof = tree.getHexProof(leaf);
            verifyRes = await BFFDistributor.verifyClaim(wrongRecordRow[0], ethers.utils.parseEther(wrongRecordRow[1]).toString(), proof);
            expect(verifyRes).to.be.false;
            await expectRevert(
                BFFDistributor.claimTokens(wrongRecordRow[0], ethers.utils.parseEther(wrongRecordRow[1]).toString(), proof),
                "Incorrect merkle proof"
            );
        });
    });
})