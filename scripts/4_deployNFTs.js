// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts, distributeInitialFunds } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

const {
  NFT_INFO
} = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["dummyBlock"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  verifyTokensAmount();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying ROCKSTAR NFTs and Minting \n-----------------------\n`));
  const deployedContracts = await setupAllContracts(versionDetails)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Deployed \n\t\t\t\n`));

  // Try to verify
  console.log(chalk.bgBlack.bold.green(`\n📡 Verifying Contracts \n-----------------------\n`));
  await verifyAllContracts(deployedContracts, versionDetails)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Verified \n\t\t\t\n`));

  // Upgrade Version
  console.log(chalk.bgBlack.bold.green(`\n📟 Upgrading Version   \n-----------------------\n`))
  upgradeVersion()
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n ✅ Version upgraded    \n\t\t\t\n`))
}

// Secondary Functions
// Deploy All Contracts
async function setupAllContracts(versionDetails) {
  let deployedContracts = [];
  const signer = await ethers.getSigner(0)

  // // Deploy ROCKSTAR ERC721
  // const Rockstar = await deployContract("Rockstar", [], "$ROCKSTAR")
  // deployedContracts.push(Rockstar)
  //
  // // Deploy MintBatchNFT
  // const BatchMintNFT = await deployContract("BatchMintNFT", [], "RockstarNFTBatchMinter")
  // deployedContracts.push(BatchMintNFT)

  // Hacky cause script crashed
  const Rockstar = await ethers.getContractAt("Rockstar", "0x3f8C2152b79276b78315CAF66cCF951780580A8a")
  const BatchMintNFT = await ethers.getContractAt("BatchMintNFT", "0x6BaeeD93336B277D8949Cb89161269032698f443")

  Rockstar.filename = 'Rockstar'
  Rockstar.deployargs = []
  Rockstar.customid = 'RockstarEPNS'

  BatchMintNFT.filename = 'BatchMintNFT'
  BatchMintNFT.deployargs = []
  BatchMintNFT.customid = 'BatchMintNFT'

  deployedContracts.push(Rockstar)
  deployedContracts.push(BatchMintNFT)

  // Batch Mint NFTs
  // await batchMintNFTs(Rockstar, BatchMintNFT)

  // return deployed contracts
  return deployedContracts;
}

async function batchMintNFTs(rockstar, batchMintNFT) {
  // transfer ownership to allow mint from batch contract
  // console.log(chalk.bgBlue.white(`Transfering ownership to BatchMintNFT to allow for safe mint`))
  //
  // let tx = await rockstar.transferOwnership(batchMintNFT.address)
  //
  // console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  // console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  // get individual nfts array
  console.log(chalk.bgBlue.white(`Minting the artworks`))
  let individualNFTInfos = NFT_INFO.nfts.helpers.convertNFTObjectToIndividualArrays(NFT_INFO.nfts.nftsMapping)

  let increment = 10
  let paged = 40
  let count = 40
  let max = 100

  while (paged != max) {
    if (paged + increment > max) {
      paged = max
    }
    else {
      paged = paged + increment
    }

    tx = await batchMintNFT.produceNFTs(rockstar.address, individualNFTInfos.recipients, individualNFTInfos.metadatas, count, paged, {
      gasPrice: ethers.utils.parseUnits("100", "gwei"),
      gasLimit: 9000000,
    })
    await tx.wait()

    console.log(chalk.bgBlack.white(`Transaction hash [${count} to ${paged}]:`), chalk.gray(`${tx.hash}`))
    console.log(chalk.bgBlack.white(`Transaction etherscan [${count} to ${paged}]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

    count = paged
  }

  // Lastly revoke ownership
  console.log(chalk.bgBlue.white(`Revoking Ownership`))

  tx = await batchMintNFT.revokeOwnership(rockstar.address)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
