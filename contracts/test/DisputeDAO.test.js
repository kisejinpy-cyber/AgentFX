import { expect } from "chai";
import { network } from "hardhat";

describe("AutoEscrowv3 Multi-Agent Consensus & DisputeDAO", function () {
    let ethers;
    let deployer, buyer, seller, agent1, agent2, agent3, arbiter;
    let usdc, escrow, disputeDao;

    before(async function () {
        const client = await network.create();
        ethers = client.ethers;
    });

    beforeEach(async function () {
        [deployer, buyer, seller, agent1, agent2, agent3, arbiter] = await ethers.getSigners();

        // 1. Deploy Mock USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.waitForDeployment();

        // 2. Deploy AutoEscrowv3
        const AutoEscrowv3 = await ethers.getContractFactory("AutoEscrowv3");
        escrow = await AutoEscrowv3.deploy(await usdc.getAddress());
        await escrow.waitForDeployment();

        // 3. Deploy DisputeDAO (with 3 signers: deployer, agent1, arbiter, threshold = 2)
        const DisputeDAO = await ethers.getContractFactory("DisputeDAO");
        disputeDao = await DisputeDAO.deploy([deployer.address, agent1.address, arbiter.address], 2);
        await disputeDao.waitForDeployment();

        // Fund Buyer with USDC
        await usdc.transfer(buyer.address, ethers.parseUnits("10000", 6));
    });

    it("should successfully resolve a dispute via agent consensus (Release)", async function () {
        const amountUSDC = ethers.parseUnits("1000", 6);
        await usdc.connect(buyer).approve(await escrow.getAddress(), amountUSDC);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        // Create job with 3 agents
        const tx = await escrow.connect(buyer).createEscrowWithMultiAgent(
            seller.address,
            [agent1.address, agent2.address, agent3.address],
            deadline,
            "PO-Consensus-Release",
            ["Milestone 1"],
            [amountUSDC],
            await usdc.getAddress(),
            await disputeDao.getAddress()
        );
        await tx.wait();

        const jobId = 0;

        // Verify agents are correctly assigned
        const agents = await escrow.getJobAgents(jobId);
        expect(agents.length).to.equal(3);
        expect(agents[0]).to.equal(agent1.address);

        // Raise a dispute (either employer or worker can raise it)
        await escrow.connect(buyer).disputeJob(jobId, "Deliverable is incorrect");

        // Verify it is disputed
        let job = await escrow.getJob(jobId);
        expect(job.isDisputed).to.equal(true);

        // Agent 1 votes RELEASE (VoteDecision.Release = 1)
        await escrow.connect(agent1).submitVote(jobId, 1);
        
        // Dispute shouldn't be resolved yet (requires threshold 2)
        job = await escrow.getJob(jobId);
        expect(job.isDisputed).to.equal(true);

        // Agent 2 votes RELEASE (threshold met)
        const sellerPrevBalance = await usdc.balanceOf(seller.address);
        await escrow.connect(agent2).submitVote(jobId, 1);
        const sellerNewBalance = await usdc.balanceOf(seller.address);

        // Verify the dispute is resolved and funds were released
        job = await escrow.getJob(jobId);
        expect(job.isDisputed).to.equal(false);
        expect(sellerNewBalance - sellerPrevBalance).to.equal(amountUSDC);
    });

    it("should successfully resolve a dispute via agent consensus (Refund)", async function () {
        const amountUSDC = ethers.parseUnits("1000", 6);
        await usdc.connect(buyer).approve(await escrow.getAddress(), amountUSDC);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        await escrow.connect(buyer).createEscrowWithMultiAgent(
            seller.address,
            [agent1.address, agent2.address, agent3.address],
            deadline,
            "PO-Consensus-Refund",
            ["Milestone 1"],
            [amountUSDC],
            await usdc.getAddress(),
            await disputeDao.getAddress()
        );

        const jobId = 0;

        await escrow.connect(seller).disputeJob(jobId, "Buyer did not pay");

        // Agent 1 votes REFUND (VoteDecision.Refund = 2)
        await escrow.connect(agent1).submitVote(jobId, 2);

        // Agent 3 votes REFUND
        const buyerPrevBalance = await usdc.balanceOf(buyer.address);
        await escrow.connect(agent3).submitVote(jobId, 2);
        const buyerNewBalance = await usdc.balanceOf(buyer.address);

        // Verify buyer got refunded
        const job = await escrow.getJob(jobId);
        expect(job.isDisputed).to.equal(false);
        expect(buyerNewBalance - buyerPrevBalance).to.equal(amountUSDC);
    });

    it("should allow fallback human arbitration if agents deadlock or fail to reach consensus", async function () {
        const amountUSDC = ethers.parseUnits("1000", 6);
        await usdc.connect(buyer).approve(await escrow.getAddress(), amountUSDC);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        await escrow.connect(buyer).createEscrowWithMultiAgent(
            seller.address,
            [agent1.address, agent2.address, agent3.address],
            deadline,
            "PO-Deadlock-Arbitration",
            ["Milestone 1"],
            [amountUSDC],
            await usdc.getAddress(),
            arbiter.address // Direct human arbiter
        );

        const jobId = 0;

        await escrow.connect(buyer).disputeJob(jobId, "Agents split");

        // Agent 1 votes Release
        await escrow.connect(agent1).submitVote(jobId, 1);

        // Agent 2 votes Refund
        await escrow.connect(agent2).submitVote(jobId, 2);

        // Split voting, no resolution. Arbiter overrides 50/50
        const buyerPrevBalance = await usdc.balanceOf(buyer.address);
        const sellerPrevBalance = await usdc.balanceOf(seller.address);

        await escrow.connect(arbiter).humanResolveDispute(jobId, 50);

        const buyerNewBalance = await usdc.balanceOf(buyer.address);
        const sellerNewBalance = await usdc.balanceOf(seller.address);

        expect(buyerNewBalance - buyerPrevBalance).to.equal(ethers.parseUnits("500", 6));
        expect(sellerNewBalance - sellerPrevBalance).to.equal(ethers.parseUnits("500", 6));

        const job = await escrow.getJob(jobId);
        expect(job.isDisputed).to.equal(false);
    });

    it("should allow DisputeDAO multisig fallback to resolve disputes", async function () {
        const amountUSDC = ethers.parseUnits("1000", 6);
        await usdc.connect(buyer).approve(await escrow.getAddress(), amountUSDC);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        await escrow.connect(buyer).createEscrowWithMultiAgent(
            seller.address,
            [agent1.address, agent2.address, agent3.address],
            deadline,
            "PO-Multisig-Arbitration",
            ["Milestone 1"],
            [amountUSDC],
            await usdc.getAddress(),
            await disputeDao.getAddress() // DisputeDAO multisig is humanArbiter
        );

        const jobId = 0;

        await escrow.connect(buyer).disputeJob(jobId, "DAO intervention needed");

        // Propose resolution via DisputeDAO: 100% to buyer (Refund)
        // Owner 1 (deployer) proposes
        const propId = 0;
        await disputeDao.connect(deployer).proposeResolution(jobId, 100);

        // Owner 2 (agent1) approves (threshold of 2 is met -> triggers resolve)
        const buyerPrevBalance = await usdc.balanceOf(buyer.address);
        await disputeDao.connect(agent1).approveProposal(propId, await escrow.getAddress());
        const buyerNewBalance = await usdc.balanceOf(buyer.address);

        expect(buyerNewBalance - buyerPrevBalance).to.equal(amountUSDC);

        const job = await escrow.getJob(jobId);
        expect(job.isDisputed).to.equal(false);
    });
});
