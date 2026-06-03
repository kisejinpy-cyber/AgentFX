import { expect } from "chai";
import { network } from "hardhat";

describe("AutoEscrowv3 (ERC-8183 Compliant)", function () {
  let ethers;
  let mockUSDC;
  let autoEscrow;
  let owner;
  let employer;
  let worker;
  let agent;
  let other;

  before(async function () {
    const client = await network.create();
    ethers = client.ethers;
  });

  beforeEach(async function () {
    [owner, employer, worker, agent, other] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy AutoEscrowv3
    const AutoEscrowv3 = await ethers.getContractFactory("AutoEscrowv3");
    autoEscrow = await AutoEscrowv3.deploy(await mockUSDC.getAddress());
    await autoEscrow.waitForDeployment();

    // Mint USDC to employer and approve AutoEscrowv3
    await mockUSDC.transfer(employer.address, ethers.parseUnits("1000", 6));
    await mockUSDC.connect(employer).approve(await autoEscrow.getAddress(), ethers.MaxUint256);
  });

  describe("ERC-8183 Core Flow", function () {
    it("Should create, set budget, fund, submit, and settle a job", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600; // 1 hour from now

      // 1. Create Job (Employer -> Open)
      const tx = await autoEscrow.connect(employer).createJob(
        worker.address,
        agent.address,
        deadline,
        "Web Development Job",
        ethers.ZeroAddress
      );
      const receipt = await tx.wait();

      const jobId = 0; // First job index
      const job = await autoEscrow.getJob(jobId);
      expect(job.employer).to.equal(employer.address);
      expect(job.worker).to.equal(worker.address);
      expect(job.agent).to.equal(agent.address);
      expect(job.status).to.equal(0n); // JobStatus.Open

      // 2. Set Budget (Employer -> Open)
      await autoEscrow.connect(employer).setBudget(jobId, ethers.parseUnits("500", 6), "0x");
      const jobWithBudget = await autoEscrow.getJob(jobId);
      expect(jobWithBudget.budget).to.equal(ethers.parseUnits("500", 6));

      // 3. Fund Job (Employer -> Funded)
      await autoEscrow.connect(employer).fund(jobId, "0x");
      const fundedJob = await autoEscrow.getJob(jobId);
      expect(fundedJob.status).to.equal(1n); // JobStatus.Funded
      expect(await mockUSDC.balanceOf(await autoEscrow.getAddress())).to.equal(ethers.parseUnits("500", 6));

      // 4. Submit Job (Worker -> Submitted)
      await autoEscrow.connect(worker).submit(jobId, ethers.zeroPadValue("0x1234", 32), "0x");
      const submittedJob = await autoEscrow.getJob(jobId);
      expect(submittedJob.status).to.equal(2n); // JobStatus.Submitted

      // 5. Settle Job (Agent -> Completed)
      const initialWorkerBalance = await mockUSDC.balanceOf(worker.address);
      await autoEscrow.connect(agent).settleJob(jobId);

      const completedJob = await autoEscrow.getJob(jobId);
      expect(completedJob.status).to.equal(3n); // JobStatus.Completed
      expect(completedJob.releasedAmount).to.equal(ethers.parseUnits("500", 6));

      const finalWorkerBalance = await mockUSDC.balanceOf(worker.address);
      expect(finalWorkerBalance - initialWorkerBalance).to.equal(ethers.parseUnits("500", 6));
    });

    it("Should allow refunding a job if rejected by the agent", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      // Create & budget & fund
      await autoEscrow.connect(employer).createJob(worker.address, agent.address, deadline, "Web Development", ethers.ZeroAddress);
      await autoEscrow.connect(employer).setBudget(0, ethers.parseUnits("300", 6), "0x");
      await autoEscrow.connect(employer).fund(0, "0x");

      // Agent rejects / refunds job
      const initialEmployerBalance = await mockUSDC.balanceOf(employer.address);
      await autoEscrow.connect(agent).refundJob(0);

      const job = await autoEscrow.getJob(0);
      expect(job.status).to.equal(4n); // JobStatus.Rejected
      expect(await mockUSDC.balanceOf(employer.address)).to.equal(initialEmployerBalance + ethers.parseUnits("300", 6));
    });

    it("Should allow claiming timeout refund after expiration", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 320; // expires in 320 seconds (5m 20s)

      await autoEscrow.connect(employer).createJob(worker.address, agent.address, deadline, "Short Job", ethers.ZeroAddress);
      await autoEscrow.connect(employer).setBudget(0, ethers.parseUnits("100", 6), "0x");
      await autoEscrow.connect(employer).fund(0, "0x");

      // Wait for expiration (330 seconds)
      await ethers.provider.send("evm_increaseTime", [330]);
      await ethers.provider.send("evm_mine", []);

      const initialEmployerBalance = await mockUSDC.balanceOf(employer.address);
      await autoEscrow.connect(employer).claimRefund(0);

      const job = await autoEscrow.getJob(0);
      expect(job.status).to.equal(5n); // JobStatus.Expired
      expect(await mockUSDC.balanceOf(employer.address)).to.equal(initialEmployerBalance + ethers.parseUnits("100", 6));
    });

    it("Should handle disputes and resolve them with a split payout", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      await autoEscrow.connect(employer).createJob(worker.address, agent.address, deadline, "Disputed Job", ethers.ZeroAddress);
      await autoEscrow.connect(employer).setBudget(0, ethers.parseUnits("400", 6), "0x");
      await autoEscrow.connect(employer).fund(0, "0x");

      // Raise dispute
      await autoEscrow.connect(employer).disputeJob(0, "Substandard work");
      const job = await autoEscrow.getJob(0);
      expect(job.isDisputed).to.be.true;

      // Agent resolves dispute: 75% to buyer (employer), 25% to seller (worker)
      const initialEmployerBalance = await mockUSDC.balanceOf(employer.address);
      const initialWorkerBalance = await mockUSDC.balanceOf(worker.address);

      await autoEscrow.connect(agent).resolveJobDispute(0, 75);

      const resolvedJob = await autoEscrow.getJob(0);
      expect(resolvedJob.isDisputed).to.be.false;

      expect(await mockUSDC.balanceOf(employer.address)).to.equal(initialEmployerBalance + ethers.parseUnits("300", 6));
      expect(await mockUSDC.balanceOf(worker.address)).to.equal(initialWorkerBalance + ethers.parseUnits("100", 6));
    });
  });

  describe("Legacy Compatibility Layer", function () {
    it("Should create, complete, and release a milestone-based escrow", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const descs = ["Milestone 1", "Milestone 2"];
      const amounts = [ethers.parseUnits("100", 6), ethers.parseUnits("200", 6)];

      await autoEscrow.connect(employer).createEscrow(
        worker.address,
        agent.address,
        deadline,
        "Custom Milestones",
        descs,
        amounts
      );

      const escrow = await autoEscrow.escrows(0);
      expect(escrow.buyer).to.equal(employer.address);
      expect(escrow.seller).to.equal(worker.address);
      expect(escrow.agent).to.equal(agent.address);
      expect(escrow.totalAmount).to.equal(ethers.parseUnits("300", 6));
      expect(escrow.milestoneCount).to.equal(2n);

      // Complete milestone 0
      await autoEscrow.connect(worker).completeMilestone(0, 0);
      let m0 = await autoEscrow.milestones(0, 0);
      expect(m0.completed).to.be.true;
      expect(m0.released).to.be.false;

      // Release milestone 0 (by Agent)
      const initialWorkerBalance = await mockUSDC.balanceOf(worker.address);
      await autoEscrow.connect(agent).releaseMilestone(0, 0);
      m0 = await autoEscrow.milestones(0, 0);
      expect(m0.released).to.be.true;
      expect((await mockUSDC.balanceOf(worker.address)) - initialWorkerBalance).to.equal(ethers.parseUnits("100", 6));

      // Release all remaining (milestone 1)
      await autoEscrow.connect(agent).releaseAll(0);
      const finalEscrow = await autoEscrow.escrows(0);
      expect(finalEscrow.state).to.equal(1n); // RELEASED (Completed)
      expect(await mockUSDC.balanceOf(worker.address) - initialWorkerBalance).to.equal(ethers.parseUnits("300", 6));
    });
  });

  describe("AgentRegistry & ERC-8004 Verification", function () {
    let agentRegistry;

    beforeEach(async function () {
      const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
      agentRegistry = await AgentRegistry.deploy();
      await agentRegistry.waitForDeployment();
      await autoEscrow.setAgentRegistry(await agentRegistry.getAddress());
    });

    it("Should reject creating a job if agent is not registered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      try {
        await autoEscrow.connect(employer).createJob(
          worker.address,
          agent.address,
          deadline,
          "Unregistered Agent Test",
          ethers.ZeroAddress
        );
        expect.fail("Transaction did not revert");
      } catch (err) {
        expect(err.message).to.include("Agent is not active in Registry");
      }
    });

    it("Should allow creating a job if agent is registered and active", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      // Register the agent
      await agentRegistry.registerAgent(agent.address, "AlphaAgent", "ipfs://agent-meta", "Verification");

      // Now createJob should succeed
      await autoEscrow.connect(employer).createJob(
        worker.address,
        agent.address,
        deadline,
        "Registered Agent Test",
        ethers.ZeroAddress
      );

      const profile = await agentRegistry.getAgent(agent.address);
      expect(profile.name).to.equal("AlphaAgent");
      expect(profile.active).to.be.true;
      expect(profile.trustScore).to.equal(100n);
    });

    it("Should allow owner/reporters to update agent reputation score", async function () {
      await agentRegistry.registerAgent(agent.address, "AlphaAgent", "ipfs://agent-meta", "Verification");
      
      // Update reputation
      await agentRegistry.updateReputation(agent.address, 95);
      const profile = await agentRegistry.getAgent(agent.address);
      expect(profile.trustScore).to.equal(95n);

      // Other signers cannot update reputation
      try {
        await agentRegistry.connect(other).updateReputation(agent.address, 50);
        expect.fail("Transaction did not revert");
      } catch (err) {
        expect(err.message).to.include("Unauthorized to report reputation");
      }
    });
  });
});
