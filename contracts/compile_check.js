import fs from "fs";
import path from "path";
import solc from "solc";

async function main() {
  const hookPath = path.resolve("contracts/IACPHook.sol");
  const escrowPath = path.resolve("contracts/AutoEscrowv3.sol");
  
  const hookSource = fs.readFileSync(hookPath, "utf8");
  const escrowSource = fs.readFileSync(escrowPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "IACPHook.sol": {
        content: hookSource,
      },
      "AutoEscrowv3.sol": {
        content: escrowSource,
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

  console.log("Compiling AutoEscrowv3 and IACPHook using solc...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => console.error(err.formattedMessage));
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation failed with errors.");
      process.exit(1);
    }
  }

  console.log("Compilation Successful!");
}

main().catch(console.error);
