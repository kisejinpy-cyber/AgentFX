import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

// Contract ABI and Address
const abiPath = path.resolve(process.cwd(), "../web/src/components/TreasuryVaultABI.json");
const TREASURY_VAULT_ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

const constantsPath = path.resolve(process.cwd(), "../web/src/lib/constants.ts");
const constantsContent = fs.readFileSync(constantsPath, "utf8");
const match = constantsContent.match(/export const TREASURY_VAULT_ADDRESS = '(0x[a-fA-F0-9]+)'/);
const TREASURY_VAULT_ADDRESS = match[1];

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  console.log("🏦 Seeding Treasury Vault...");
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const vault = new ethers.Contract(TREASURY_VAULT_ADDRESS, TREASURY_VAULT_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  
  const amount = ethers.parseUnits("0.25", 6);
  
  console.log("Approving USDC...");
  const approveTx = await usdc.approve(TREASURY_VAULT_ADDRESS, amount);
  await approveTx.wait();
  
  console.log("Depositing into Vault...");
  const depositTx = await vault.deposit(amount);
  await depositTx.wait();
  
  console.log("✅ Successfully seeded 0.25 USDC to Treasury Vault!");
}

main().catch(console.error);
