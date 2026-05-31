import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractPath = path.resolve(process.cwd(), "contracts/AutoEscrow.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "AutoEscrow.sol": {
        content: source,
      },
    },
    settings: {
      viaIR: true,
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

  console.log("Compiling AutoEscrow v2...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => console.error(err.formattedMessage));
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation failed with errors.");
      process.exit(1);
    }
  }

  const contract = output.contracts["AutoEscrow.sol"]["AutoEscrow"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log(`ABI has ${abi.length} entries`);
  console.log(`Bytecode length: ${bytecode.length / 2} bytes`);

  // Save ABI for frontend
  const abiPath = path.resolve(process.cwd(), "../web/src/components/AutoEscrowABI.json");
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("ABI saved to:", abiPath);

  // Deploy
  console.log("Connecting to Arc Testnet...");
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "USDC (native)");

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Arc Testnet USDC address
  const usdcAddress = "0x3600000000000000000000000000000000000000";
  
  const autoEscrow = await factory.deploy(usdcAddress);
  console.log("Waiting for deployment confirmation...");
  await autoEscrow.waitForDeployment();
  
  const deployedAddress = await autoEscrow.getAddress();
  console.log("AutoEscrow v2 deployed to:", deployedAddress);

  // Save address for frontend (in lib/constants.ts format)
  const constantsPath = path.resolve(process.cwd(), "../web/src/lib/constants.ts");
  let constantsContent = fs.readFileSync(constantsPath, "utf8");
  constantsContent = constantsContent.replace(
    /export const AUTO_ESCROW_ADDRESS = '0x[a-fA-F0-9]+' as const;/,
    `export const AUTO_ESCROW_ADDRESS = '${deployedAddress}' as const;`
  );
  fs.writeFileSync(constantsPath, constantsContent);
  console.log("Updated constants.ts with new address:", deployedAddress);

  // Also update legacy contractAddress.js for backward compat
  const legacyPath = path.resolve(process.cwd(), "../web/src/components/contractAddress.js");
  if (fs.existsSync(legacyPath)) {
    fs.writeFileSync(legacyPath, `export const AUTO_ESCROW_ADDRESS = "${deployedAddress}";`);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Contract: AutoEscrow v2");
  console.log("Address:", deployedAddress);
  console.log("Network: Arc Testnet (5042002)");
  console.log("USDC:", usdcAddress);
  console.log("Explorer: https://testnet.arcscan.app/address/" + deployedAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
