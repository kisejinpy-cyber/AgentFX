/**
 * Meridian AI Agent Auto-Release Script
 * 
 * In a real production environment, this script runs in a secure backend environment
 * (e.g., AWS Lambda, Replit, or a decentralized agent network like Ritual).
 * 
 * The agent monitors the blockchain for new EscrowCreated events, simulates 
 * checking a shipping oracle or API for delivery confirmation, and then
 * executes the completeMilestone and releaseMilestone transactions on-chain.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), "../contracts/.env") });

// Contract config
const abiPath = path.resolve(process.cwd(), "src/components/AutoEscrowABI.json");
const AUTO_ESCROW_ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
const constantsContent = fs.readFileSync(path.resolve(process.cwd(), "src/lib/constants.ts"), "utf8");
const match = constantsContent.match(/export const AUTO_ESCROW_ADDRESS = '(0x[a-fA-F0-9]+)'/);
const AUTO_ESCROW_ADDRESS = match[1];

async function main() {
  console.log("🤖 Meridian AI Agent Engine Started");
  console.log("Listening on Arc Testnet (Chain ID 5042002)...\n");

  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
  
  // The agent wallet - in production this would be an embedded wallet (e.g., Circle Programmable Wallet)
  // For demo, we'll use a local private key
  if (!process.env.PRIVATE_KEY) {
    console.error("Missing PRIVATE_KEY in .env");
    process.exit(1);
  }
  const agentWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Agent Address: ${agentWallet.address}`);
  const balance = await provider.getBalance(agentWallet.address);
  console.log(`Agent Native Gas Balance: ${ethers.formatEther(balance)} USDC`);
  console.log("Status: Listening for Escrow events...\n");

  const escrowContract = new ethers.Contract(AUTO_ESCROW_ADDRESS, AUTO_ESCROW_ABI, agentWallet);

  // Monitor New Escrows
  escrowContract.on("EscrowCreated", async (escrowId, buyer, seller, agent, totalAmount, deadline, event) => {
    // Only process if THIS agent is the designated verifier
    if (agent.toLowerCase() === agentWallet.address.toLowerCase()) {
      console.log(`\n🔔 [New Escrow Detected] ID: ${escrowId}`);
      console.log(`   Buyer: ${buyer}`);
      console.log(`   Seller: ${seller}`);
      console.log(`   Amount: ${ethers.formatUnits(totalAmount, 6)} USDC`);
      
      // Simulate API verification delay (e.g. tracking a FedEx shipment)
      console.log("   🔄 Checking delivery oracle / logistics API...");
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      console.log("   ✅ Delivery confirmed by off-chain oracle.");
      console.log("   🚀 Executing on-chain release protocol...");
      
      try {
        // Complete milestone 0
        const completeTx = await escrowContract.completeMilestone(escrowId, 0);
        await completeTx.wait();
        console.log(`   -> Milestone completed (Tx: ${completeTx.hash})`);
        
        // Release funds
        const releaseTx = await escrowContract.releaseMilestone(escrowId, 0);
        await releaseTx.wait();
        console.log(`   -> Funds released to seller (Tx: ${releaseTx.hash})`);
        
        console.log("   🎉 Escrow workflow complete. Continuing to listen...\n");
      } catch (err) {
        console.error(`   ❌ Failed to release escrow: ${err.message}`);
      }
    } else {
      console.log(`[Skipped] Escrow ${escrowId} assigned to different agent: ${agent}`);
    }
  });

  // Keep script running
  process.on('SIGINT', () => {
    console.log("Shutting down Agent Engine...");
    process.exit(0);
  });
}

main().catch(console.error);
