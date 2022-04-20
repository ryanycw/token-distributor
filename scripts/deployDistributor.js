async function main() {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", addr1.address);
  
    console.log("Account balance:", (await addr1.getBalance()).toString());

    const distributor = await ethers.getContractFactory("BFFDistributor", addr1);
    const BFFDistributor = await distributor.deploy("0xb9FEf9F02DFBC2c7Ae8d2299e44Fa9821C7b0ac4");
    await BFFDistributor.deployed();
    console.log("Token address:", BFFDistributor.address);
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
});