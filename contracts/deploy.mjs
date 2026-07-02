import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const hookPath = path.resolve(process.cwd(), "contracts/IACPHook.sol");
  const escrowPath = path.resolve(process.cwd(), "contracts/AutoEscrowv3.sol");
  const registryPath = path.resolve(process.cwd(), "contracts/AgentRegistry.sol");
  const stableFXPath = path.resolve(process.cwd(), "contracts/interfaces/IStableFX.sol");

  const hookSource = fs.readFileSync(hookPath, "utf8");
  const escrowSource = fs.readFileSync(escrowPath, "utf8");
  const registrySource = fs.readFileSync(registryPath, "utf8");
  const stableFXSource = fs.readFileSync(stableFXPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "IACPHook.sol": { content: hookSource },
      "AutoEscrowv3.sol": { content: escrowSource },
      "AgentRegistry.sol": { content: registrySource },
      "interfaces/IStableFX.sol": { content: stableFXSource },
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

  console.log("Compiling smart contracts...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => console.error(err.formattedMessage));
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation failed with errors.");
      process.exit(1);
    }
  }

  const escrowContract = output.contracts["AutoEscrowv3.sol"]["AutoEscrowv3"];
  const registryContract = output.contracts["AgentRegistry.sol"]["AgentRegistry"];

  // Save ABIs for frontend
  const escrowAbiPath = path.resolve(process.cwd(), "../web/src/components/AutoEscrowABI.json");
  fs.writeFileSync(escrowAbiPath, JSON.stringify(escrowContract.abi, null, 2));
  console.log("AutoEscrow ABI saved to:", escrowAbiPath);

  const registryAbiPath = path.resolve(process.cwd(), "../web/src/components/AgentRegistryABI.json");
  fs.writeFileSync(registryAbiPath, JSON.stringify(registryContract.abi, null, 2));
  console.log("AgentRegistry ABI saved to:", registryAbiPath);

  // Connect to Arc Testnet
  console.log("Connecting to Arc Testnet...");
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "USDC (native)");

  // 1. Deploy AgentRegistry
  console.log("Deploying AgentRegistry...");
  const registryFactory = new ethers.ContractFactory(registryContract.abi, registryContract.evm.bytecode.object, wallet);
  const agentRegistry = await registryFactory.deploy();
  await agentRegistry.waitForDeployment();
  const registryAddress = await agentRegistry.getAddress();
  console.log("AgentRegistry deployed to:", registryAddress);

  // 2. Deploy AutoEscrowv3
  console.log("Deploying AutoEscrow v3...");
  const escrowFactory = new ethers.ContractFactory(escrowContract.abi, escrowContract.evm.bytecode.object, wallet);
  const usdcAddress = "0x3600000000000000000000000000000000000000";
  const autoEscrow = await escrowFactory.deploy(usdcAddress);
  await autoEscrow.waitForDeployment();
  const escrowAddress = await autoEscrow.getAddress();
  console.log("AutoEscrow v3 deployed to:", escrowAddress);

  // 3. Link AgentRegistry in AutoEscrowv3
  console.log("Setting AgentRegistry address in AutoEscrow...");
  const linkTx = await autoEscrow.setAgentRegistry(registryAddress);
  await linkTx.wait();
  console.log("AgentRegistry linked successfully!");

  // 4. Register Initial Agents
  console.log("Registering default agents inside AgentRegistry...");
  const agentsToRegister = [
    {
      address: "0x1087E71CD83101adF154d8215522EadA51Bf891E",
      name: "Meridian Core Agent",
      uri: "ipfs://QmMeridianCoreAgentMetadata",
      capability: "Automated Milestone Settlement & Financial Audits",
    },
    {
      address: "0xe6A13B821A58d28e7522EadA51Bf891E1087E71C",
      name: "TrustyEval Agent",
      uri: "ipfs://QmTrustyEvalAgentMetadata",
      capability: "Web Development Deliverables Code Evaluation",
    },
    {
      address: "0x9cE7a5b39a6E7D0816759bBe0b075Fa0B39Fc72d",
      name: "FastTrack Validator",
      uri: "ipfs://QmFastTrackValidatorMetadata",
      capability: "Sub-Second Low-Latency Milestone Verification",
    }
  ];

  for (const agentInfo of agentsToRegister) {
    console.log(`Registering agent: ${agentInfo.name} (${agentInfo.address})`);
    const regTx = await agentRegistry.registerAgent(
      ethers.getAddress(agentInfo.address.toLowerCase()),
      agentInfo.name,
      agentInfo.uri,
      agentInfo.capability
    );
    await regTx.wait();
  }
  console.log("Default agents registered successfully!");

  // 5. Update constants.ts
  const constantsPath = path.resolve(process.cwd(), "../web/src/lib/constants.ts");
  let constantsContent = fs.readFileSync(constantsPath, "utf8");
  
  constantsContent = constantsContent.replace(
    /export const AUTO_ESCROW_ADDRESS = '0x[a-fA-F0-9]+' as const;/,
    `export const AUTO_ESCROW_ADDRESS = '${escrowAddress}' as const;`
  );

  constantsContent = constantsContent.replace(
    /export const AGENT_REGISTRY_ADDRESS = '0x[a-fA-F0-9]+' as const;/,
    `export const AGENT_REGISTRY_ADDRESS = '${registryAddress}' as const;`
  );

  fs.writeFileSync(constantsPath, constantsContent);
  console.log("Updated constants.ts with new contract addresses!");

  // Legacy compatibility update
  const legacyPath = path.resolve(process.cwd(), "../web/src/components/contractAddress.js");
  if (fs.existsSync(legacyPath)) {
    fs.writeFileSync(legacyPath, `export const AUTO_ESCROW_ADDRESS = "${escrowAddress}";`);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("AutoEscrow v3 Address:", escrowAddress);
  console.log("AgentRegistry Address:", registryAddress);
  console.log("Network: Arc Testnet (5042002)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
