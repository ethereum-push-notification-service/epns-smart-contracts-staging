// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts, sendFromCommUnlocked, distributeInitialFunds } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

const {
  NFT_INFO,
  DISTRIBUTION_INFO
} = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress", "commUnlockedContract", "rockstarAddress"])
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

  // Get EPNS ($PUSH) instance first
  const PushToken = await ethers.getContractAt("EPNS", versionDetails.deploy.args.pushTokenAddress)

  // Get Comm Unlocked instance
  const CommUnlocked = await ethers.getContractAt("Reserves", versionDetails.deploy.args.commUnlockedContract)

  // Deploy NFTRewards
  const NFTRewardsArgs = [bn(NFT_INFO.nfts.tokens).div(bn(NFT_INFO.nfts.users)), versionDetails.deploy.args.pushTokenAddress, versionDetails.deploy.args.rockstarAddress]
  const NFTRewards = await deployContract("NFTRewards", NFTRewardsArgs, "RockstarNFTRewards")
  deployedContracts.push(NFTRewards)

  // Get tokens / eth requirements
  const reqTokens = bn(DISTRIBUTION_INFO.community.unlocked.gratitude.nfts)

  // Check if wallet has exact push balance to avoid mishaps
  let pushBalance = await PushToken.balanceOf(NFTRewards.address)

  console.log(chalk.bgBlack.white(`Check - Push Balance of ${NFTRewards.address}`), chalk.green(`${bnToInt(pushBalance)} PUSH`), chalk.bgBlack.white(`Required: ${bnToInt(reqTokens)} PUSH`))
  if (pushBalance != reqTokens) {
    console.log(chalk.bgRed.white(`Not enough $PUSH Balance.`), chalk.bgGray.white(`Req bal:`), chalk.green(`${bnToInt(reqTokens)} PUSH tokens`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${bnToInt(pushBalance)} PUSH tokens, sending balance from CommUnlocked\n`))

    // Transfer from Comm Unlocked, doing this again will result in bad things
    await sendFromCommUnlocked(PushToken, CommUnlocked, signer, NFTRewards.address, reqTokens)
    pushBalance = await PushToken.balanceOf(NFTRewards.address)

    console.log(chalk.bgBlack.white(`Receiver PUSH Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(pushBalance)} PUSH Tokens`))
  }
  else {
    console.log(chalk.bgBlack.white(`Check Passed... nothing to do, $PUSH is already set as NFTRewards`))
  }

  // return deployed contracts
  return deployedContracts;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
