import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractPath = path.resolve(process.cwd(), "contracts/TreasuryVaultv2.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "TreasuryVaultv2.sol": {
        content: source,
      },
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

  console.log("Compiling TreasuryVaultv2...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => console.error(err.formattedMessage));
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation failed with errors.");
      process.exit(1);
    }
  }

  const contract = output.contracts["TreasuryVaultv2.sol"]["TreasuryVaultv2"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  // Save ABI for frontend
  const abiPath = path.resolve(process.cwd(), "../web/src/components/TreasuryVaultABI.json");
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("ABI saved to:", abiPath);

  // Deploy
  console.log("Connecting to Arc Testnet...");
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying from:", wallet.address);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Arc Testnet USDC address
  const usdcAddress = "0x3600000000000000000000000000000000000000";
  // The AI Agent address (use the wallet address itself for now so the agent script works)
  const agentAddress = wallet.address;
  
  const vault = await factory.deploy(usdcAddress, agentAddress);
  console.log("Waiting for deployment confirmation...");
  await vault.waitForDeployment();
  
  const deployedAddress = await vault.getAddress();
  console.log("TreasuryVaultv2 deployed to:", deployedAddress);

  // Save address for frontend (in lib/constants.ts format)
  const constantsPath = path.resolve(process.cwd(), "../web/src/lib/constants.ts");
  let constantsContent = fs.readFileSync(constantsPath, "utf8");
  
  // Append or replace
  if (constantsContent.includes('TREASURY_VAULT_ADDRESS')) {
    constantsContent = constantsContent.replace(
      /export const TREASURY_VAULT_ADDRESS = '0x[a-fA-F0-9]+' as const;/,
      `export const TREASURY_VAULT_ADDRESS = '${deployedAddress}' as const;`
    );
  } else {
    constantsContent = constantsContent.replace(
      /export const AUTO_ESCROW_ADDRESS = '0x[a-fA-F0-9]+' as const;/,
      `$&
export const TREASURY_VAULT_ADDRESS = '${deployedAddress}' as const;`
    );
  }
  
  fs.writeFileSync(constantsPath, constantsContent);
  console.log("Updated constants.ts with TreasuryVaultv2 address:", deployedAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
