async function main() {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", addr1.address);
  
    console.log("Account balance:", (await addr1.getBalance()).toString());

    const erc20 = await ethers.getContractFactory("BFFCoin", addr1);
    const BFFCoin = await upgrades.deployProxy(erc20, ["BFFCoin", "BFFC", ethers.utils.parseEther('10000000')]);
    await BFFCoin.deployed();
    console.log("Token address:", BFFCoin.address);
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
});