import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

// Contract ABI and Address
const abiPath = path.resolve(process.cwd(), "../web/src/components/AutoEscrowABI.json");
const AUTO_ESCROW_ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// Read address from constants
const constantsPath = path.resolve(process.cwd(), "../web/src/lib/constants.ts");
const constantsContent = fs.readFileSync(constantsPath, "utf8");
const match = constantsContent.match(/export const AUTO_ESCROW_ADDRESS = '(0x[a-fA-F0-9]+)'/);
if (!match) throw new Error("Could not find AUTO_ESCROW_ADDRESS in constants.ts");
const AUTO_ESCROW_ADDRESS = match[1];

// USDC ABI and Address
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  console.log("🌱 Seeding Test Data for Meridian Treasury OS...");
  console.log(`Contract: ${AUTO_ESCROW_ADDRESS}`);
  
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
  
  // Create wallets for different roles (using the main key + derivations if needed, 
  // but for hackathon demo we can use the main wallet as buyer and arbitrary addresses for others)
  const buyerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Demo addresses (checksummed)
  const DEMO_SELLER = "0x2C4D2B273872f4EB18B3303CB5D6f6580F1fFa19"; 
  const DEMO_AGENT = buyerWallet.address;  
  
  const escrowContract = new ethers.Contract(AUTO_ESCROW_ADDRESS, AUTO_ESCROW_ABI, buyerWallet);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, buyerWallet);
  
  // Total amount we need to approve (approx 1 USDC)
  const totalAmountNeeded = ethers.parseUnits("1.0", 6);
  
  // 1. Check & Approve USDC
  const balance = await usdcContract.balanceOf(buyerWallet.address);
  console.log(`Buyer USDC Balance: ${ethers.formatUnits(balance, 6)}`);
  
  if (balance < totalAmountNeeded) {
    console.warn("⚠️ Not enough USDC for full seeding. Will try partial seeding.");
  }

  const currentAllowance = await usdcContract.allowance(buyerWallet.address, AUTO_ESCROW_ADDRESS);
  if (currentAllowance < totalAmountNeeded) {
    console.log("Approving USDC...");
    const approveTx = await usdcContract.approve(AUTO_ESCROW_ADDRESS, ethers.MaxUint256);
    await approveTx.wait();
    console.log("USDC Approved.");
  }

  // --- Seed Escrow 1: Simple Supply Order ---
  console.log("\n1️⃣ Creating Simple Escrow (Active)...");
  try {
    const tx1 = await escrowContract.createSimpleEscrow(
      DEMO_SELLER,
      DEMO_AGENT,
      ethers.parseUnits("0.1", 6)
    );
    await tx1.wait();
    console.log("✅ Created: 0.1 USDC (Active)");
  } catch (e) {
    console.error("Failed:", e.message);
  }

  // --- Seed Escrow 2: Milestone-based Software Dev ---
  console.log("\n2️⃣ Creating Milestone Escrow...");
  try {
    const tx2 = await escrowContract.createEscrow(
      DEMO_SELLER,
      DEMO_AGENT,
      Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60), // 14 days
      "DEV-9942",
      ["Design Phase", "Frontend UI", "Smart Contracts"],
      [
        ethers.parseUnits("0.2", 6),
        ethers.parseUnits("0.3", 6),
        ethers.parseUnits("0.3", 6)
      ]
    );
    await tx2.wait();
    console.log("✅ Created: 0.8 USDC (3 Milestones)");
    
    // Get the ID
    const nextId = await escrowContract.nextEscrowId();
    const escrowId = nextId - 1n;
    
    // Complete milestone 0
    console.log("   Completing Milestone 0...");
    const tx2a = await escrowContract.completeMilestone(escrowId, 0);
    await tx2a.wait();
    
    // Release milestone 0 to show progress bar in UI
    console.log("   Releasing Milestone 0...");
    const tx2b = await escrowContract.releaseMilestone(escrowId, 0);
    await tx2b.wait();
    console.log("✅ Released 0.2 USDC");
    
  } catch (e) {
    console.error("Failed:", e.message);
  }
  
  // --- Seed Escrow 3: Disputed Trade ---
  console.log("\n3️⃣ Creating Disputed Escrow...");
  try {
    const tx3 = await escrowContract.createSimpleEscrow(
      DEMO_SELLER,
      DEMO_AGENT,
      ethers.parseUnits("0.1", 6)
    );
    await tx3.wait();
    
    const nextId = await escrowContract.nextEscrowId();
    const escrowId = nextId - 1n;
    
    console.log("   Raising Dispute...");
    const tx3a = await escrowContract.raiseDispute(escrowId, "Items damaged during shipping");
    await tx3a.wait();
    console.log("✅ Disputed: 0.1 USDC");
  } catch (e) {
    console.error("Failed:", e.message);
  }

  console.log("\n🎉 Seeding Complete! Check the frontend Activity Log.");
}

main().catch(console.error);
