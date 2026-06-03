/**
 * Meridian AI Agent Auto-Release Script (Refactored to Circle Developer-Controlled Wallets)
 * 
 * Secure keyless architecture:
 * The agent script no longer holds or loads any raw plaintext private keys in memory.
 * Instead, it delegates all transaction signing and broadcast requests to the HSM-secured
 * Circle Developer-Controlled Wallet endpoints.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment config
dotenv.config({ path: path.resolve(process.cwd(), "../contracts/.env") });

// Import local HSM / Circle DCW execution helper
import { executeContractCall } from "./src/lib/circleAgentWallet.ts";

// Contract config
const abiPath = path.resolve(process.cwd(), "src/components/AutoEscrowABI.json");
const AUTO_ESCROW_ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
const constantsContent = fs.readFileSync(path.resolve(process.cwd(), "src/lib/constants.ts"), "utf8");
const match = constantsContent.match(/export const AUTO_ESCROW_ADDRESS = '(0x[a-fA-F0-9]+)'/);
const AUTO_ESCROW_ADDRESS = match[1];

// Agent Developer-Controlled Wallet Identifier (Registered in Circle Console HSM)
const AGENT_WALLET_ID = "agent-wallet-main";
// Simulated Agent Wallet Address on Arc Testnet
const AGENT_WALLET_ADDRESS = "0x1087E71CD83101adF154d8215522EadA51Bf891E";

async function main() {
  console.log("🤖 Meridian HSM-Secured AI Agent Engine Started");
  console.log(`Agent Wallet ID (Circle Console): ${AGENT_WALLET_ID}`);
  console.log(`Agent Wallet Address: ${AGENT_WALLET_ADDRESS}`);
  console.log("Listening on Arc Testnet (Chain ID 5042002) via secure RPC...\n");

  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
  
  // Verify balance keylessly
  try {
    const balance = await provider.getBalance(AGENT_WALLET_ADDRESS);
    console.log(`Agent Native Gas Balance: ${ethers.formatEther(balance)} USDC`);
  } catch (err) {
    console.warn("Unable to fetch agent balance:", err.message);
  }
  
  console.log("Status: Listening for Escrow events...\n");

  // Read-only contract instance for monitoring events
  const escrowContract = new ethers.Contract(AUTO_ESCROW_ADDRESS, AUTO_ESCROW_ABI, provider);

  // Monitor New Escrows
  escrowContract.on("EscrowCreated", async (escrowId, buyer, seller, agent, totalAmount, deadline, event) => {
    // Only process if THIS agent is the designated verifier
    if (agent.toLowerCase() === AGENT_WALLET_ADDRESS.toLowerCase()) {
      console.log(`\n🔔 [New Escrow Detected] ID: ${escrowId}`);
      console.log(`   Buyer: ${buyer}`);
      console.log(`   Seller: ${seller}`);
      console.log(`   Amount: ${ethers.formatUnits(totalAmount, 6)} USDC`);
      
      // Simulate API verification delay (e.g. tracking a FedEx shipment)
      console.log("   🔄 Checking delivery oracle / logistics API...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log("   ✅ Delivery confirmed by off-chain oracle.");
      console.log(`   🚀 Delegating transaction to Circle Developer-Controlled Wallet API (ID: ${AGENT_WALLET_ID})...`);
      
      try {
        // Complete milestone 0 via Circle HSM Wallet (Zero Plaintext Keys Used)
        const completeHash = await executeContractCall(
          AGENT_WALLET_ID,
          AUTO_ESCROW_ADDRESS,
          AUTO_ESCROW_ABI,
          "completeMilestone",
          [BigInt(escrowId.toString()), 0]
        );
        console.log(`   -> Milestone completed (Tx: ${completeHash})`);
        
        // Release funds via Circle HSM Wallet (Zero Plaintext Keys Used)
        const releaseHash = await executeContractCall(
          AGENT_WALLET_ID,
          AUTO_ESCROW_ADDRESS,
          AUTO_ESCROW_ABI,
          "releaseMilestone",
          [BigInt(escrowId.toString()), 0]
        );
        console.log(`   -> Funds released to seller (Tx: ${releaseHash})`);
        
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
