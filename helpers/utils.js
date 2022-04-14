async function getCurTime() {
    const blockNum = await web3.eth.getBlockNumber();
    const curTime = (await web3.eth.getBlock(blockNum)).timestamp;
    return curTime;
}

async function mineNBlocks(n) {
    for (let index = 0; index < n; index++) {
      await ethers.provider.send('evm_mine');
    }
}

async function convertCsvToJson(inputFileName, outputFileName) {
    const fs = require("fs");
    fs.createReadStream(inputFileName, { encoding: "utf-8" })
    .on("data", (chunk) => {
        let record = [];
        data = chunk.split('\n');
        data.map(x => { record.push(x.split(",")) });
        jsonContent = JSON.stringify({record});
        fs.writeFile(outputFileName, jsonContent, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            //console.log("JSON file has been saved.");
        });
    })
    .on("error", (error) => {
        console.log(error);
    });
}

module.exports = { getCurTime, mineNBlocks, convertCsvToJson };