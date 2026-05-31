import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AutoEscrowModule = buildModule("AutoEscrowModule", (m) => {
  const usdcAddress = "0x3600000000000000000000000000000000000000";
  const autoEscrow = m.contract("AutoEscrow", [usdcAddress]);
  return { autoEscrow };
});

export default AutoEscrowModule;
