import { expect } from "chai";
import { network } from "hardhat";

describe("TreasuryVaultv2 (ERC-4626 Yield Sweeps)", function () {
  let ethers;
  let mockUSDC;
  let mockUSYC;
  let treasuryVault;
  let owner;
  let agent;
  let other;

  before(async function () {
    const client = await network.create();
    ethers = client.ethers;
  });

  beforeEach(async function () {
    [owner, agent, other] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy Mock USYC
    const MockUSYC = await ethers.getContractFactory("MockUSYC");
    mockUSYC = await MockUSYC.deploy(await mockUSDC.getAddress());
    await mockUSYC.waitForDeployment();

    // Deploy TreasuryVaultv2
    const TreasuryVaultv2 = await ethers.getContractFactory("TreasuryVaultv2");
    treasuryVault = await TreasuryVaultv2.deploy(
      await mockUSDC.getAddress(),
      agent.address
    );
    await treasuryVault.waitForDeployment();

    // Mint USDC to owner is done in constructor of MockUSDC.
    // Approve TreasuryVaultv2 to spend owner's USDC
    await mockUSDC.approve(await treasuryVault.getAddress(), ethers.MaxUint256);
  });

  describe("Core Treasury Operations", function () {
    it("Should deposit USDC into the vault", async function () {
      const amount = ethers.parseUnits("50000", 6);
      await treasuryVault.deposit(amount);

      const balance = await mockUSDC.balanceOf(await treasuryVault.getAddress());
      expect(balance).to.equal(amount);
    });

    it("Should sweep excess USDC into the USYC vault", async function () {
      // 1. Deposit 50,000 USDC into Treasury
      const amount = ethers.parseUnits("50000", 6);
      await treasuryVault.deposit(amount);

      // 2. Execute sweep trigger with a 10,000 threshold
      const threshold = ethers.parseUnits("10000", 6);
      const expectedExcess = ethers.parseUnits("40000", 6);

      await treasuryVault.connect(agent).sweepExcessToYield(
        threshold,
        await mockUSYC.getAddress()
      );

      // 3. Check balances
      // Treasury USDC should now be exactly 10,000 threshold
      const treasuryUsdc = await mockUSDC.balanceOf(await treasuryVault.getAddress());
      expect(treasuryUsdc).to.equal(threshold);

      // Treasury USYC shares should be exactly 40,000
      const treasuryUsyc = await mockUSYC.balanceOf(await treasuryVault.getAddress());
      expect(treasuryUsyc).to.equal(expectedExcess);
    });

    it("Should redeem shares from USYC vault back to USDC", async function () {
      // 1. Setup swept state
      const amount = ethers.parseUnits("50000", 6);
      await treasuryVault.deposit(amount);
      const threshold = ethers.parseUnits("10000", 6);
      await treasuryVault.sweepExcessToYield(threshold, await mockUSYC.getAddress());

      // 2. Redeem 20,000 shares back to USDC
      const sharesToRedeem = ethers.parseUnits("20000", 6);
      await treasuryVault.redeemFromYield(sharesToRedeem, await mockUSYC.getAddress());

      // 3. Treasury USDC balance should increase from 10,000 to 30,000
      const finalUsdc = await mockUSDC.balanceOf(await treasuryVault.getAddress());
      expect(finalUsdc).to.equal(ethers.parseUnits("30000", 6));

      // 4. USYC balance should decrease to 20,000 shares
      const finalUsyc = await mockUSYC.balanceOf(await treasuryVault.getAddress());
      expect(finalUsyc).to.equal(ethers.parseUnits("20000", 6));
    });

    it("Should withdraw USDC from the vault to recipient", async function () {
      const amount = ethers.parseUnits("10000", 6);
      await treasuryVault.deposit(amount);

      const recipient = other.address;
      await treasuryVault.withdraw(amount, recipient);

      const recipientBal = await mockUSDC.balanceOf(recipient);
      expect(recipientBal).to.equal(amount);
    });

    it("Should reject sweeping from unauthorized caller", async function () {
      const amount = ethers.parseUnits("20000", 6);
      await treasuryVault.deposit(amount);

      const threshold = ethers.parseUnits("10000", 6);

      try {
        await treasuryVault.connect(other).sweepExcessToYield(threshold, await mockUSYC.getAddress());
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("Not authorized");
      }
    });
  });
});
