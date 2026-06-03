import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const daoPath = path.resolve(process.cwd(), "contracts/DisputeDAO.sol");
  const daoSource = fs.readFileSync(daoPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "DisputeDAO.sol": { content: daoSource },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  console.log("Compiling DisputeDAO...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => console.error(err.formattedMessage));
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation failed with errors.");
      process.exit(1);
    }
  }

  const daoContract = output.contracts["DisputeDAO.sol"]["DisputeDAO"];

  // Save ABI for frontend
  const daoAbiPath = path.resolve(process.cwd(), "../web/src/components/DisputeDAOABI.json");
  fs.writeFileSync(daoAbiPath, JSON.stringify(daoContract.abi, null, 2));
  console.log("DisputeDAO ABI saved to:", daoAbiPath);

  // Connect to Arc Testnet
  console.log("Connecting to Arc Testnet...");
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying from:", wallet.address);

  // Owners: Deployer, agent2, agent3
  const owners = [
    wallet.address,
    ethers.getAddress("0xe6a13b821a58d28e7522eada51bf891e1087e71c"),
    ethers.getAddress("0x9ce7a5b39a6e7d0816759bbe0b075fa0b39fc72d")
  ];
  const threshold = 2;

  console.log("Deploying DisputeDAO with owners:", owners, "threshold:", threshold);
  const daoFactory = new ethers.ContractFactory(daoContract.abi, daoContract.evm.bytecode.object, wallet);
  const disputeDao = await daoFactory.deploy(owners, threshold);
  await disputeDao.waitForDeployment();
  const daoAddress = await disputeDao.getAddress();
  
  console.log("\n=== Deployment Summary ===");
  console.log("Contract: DisputeDAO");
  console.log("Address:", daoAddress);

  // Update web config or constants file
  const configPath = path.resolve(process.cwd(), "../web/src/lib/constants.ts");
  let configContent = fs.readFileSync(configPath, "utf8");

  // Check if DISPUTE_DAO_ADDRESS exists, if not, append it
  if (configContent.includes("DISPUTE_DAO_ADDRESS")) {
    configContent = configContent.replace(/export const DISPUTE_DAO_ADDRESS = "0x[a-fA-F0-9]{40}";/, `export const DISPUTE_DAO_ADDRESS = "${daoAddress}";`);
  } else {
    configContent += `\nexport const DISPUTE_DAO_ADDRESS = "${daoAddress}";\n`;
  }
  fs.writeFileSync(configPath, configContent, "utf8");
  console.log("Updated DISPUTE_DAO_ADDRESS in constants.ts");
}

main().catch(console.error);
