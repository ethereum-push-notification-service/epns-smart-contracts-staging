// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require('dotenv').config()

const moment = require('moment')
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

const {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO,
  STAKING_INFO
} = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  verifyTokensAmount();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying Contracts \n-----------------------\n`));
  const deployedContracts = await setupAllContracts(versionDetails);
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Deployed \n\t\t\t\n`));

  // Try to verify
  console.log(chalk.bgBlack.bold.green(`\n📡 Verifying Contracts \n-----------------------\n`));
  await verifyAllContracts(deployedContracts, versionDetails);
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

  // Next Deploy Vesting Factory Contracts
  // Deploy and Setup Foundation
  deployedContracts = await setupFoundation(PushToken, deployedContracts, signer)

  return deployedContracts;
}

// Module Deploy - Foundation
async function setupFoundation(PushToken, deployedContracts, signer) {
  // Deploying Foundation Reserves A
  const foundationAParams = VESTING_INFO.foundation.depositA
  const foundationAArgs = [META_INFO.multisigOwnerEventual, foundationAParams.start, foundationAParams.cliff, foundationAParams.duration, true, "FoundationAReserves"]
  const FoundationAReserves = await deployContract("VestedReserves", foundationAArgs, "FoundationAReserves")
  deployedContracts.push(FoundationAReserves)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, FoundationAReserves, VESTING_INFO.foundation.depositA.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing FoundationAReserves ownership to eventual owner`))

  const txFoundationAReservoir = await FoundationAReserves.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txFoundationAReservoir.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txFoundationAReservoir.hash}`))

  // Deploying Foundation Reserves B
  const foundationBParams = VESTING_INFO.foundation.depositB
  const foundationBArgs = [META_INFO.multisigOwnerEventual, foundationBParams.start, foundationBParams.cliff, foundationBParams.duration, true, "FoundationBReserves"]
  const FoundationBReserves = await deployContract("VestedReserves", foundationBArgs, "FoundationBReserves")
  deployedContracts.push(FoundationBReserves)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, FoundationBReserves, VESTING_INFO.foundation.depositB.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing FoundationAReserves ownership to eventual owner`))

  const txFoundationBReservior = await FoundationBReserves.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txFoundationBReservior.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txFoundationBReservior.hash}`))

  return deployedContracts
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
