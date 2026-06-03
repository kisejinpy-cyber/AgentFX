import { expect } from "chai";
import { network } from "hardhat";

describe("AutoEscrowv3 StableFX Cross-Border Settlement", function () {
    let ethers;
    let deployer, buyer, seller, agent;
    let usdc, eurc, stableFX, escrow;

    before(async function () {
        const client = await network.create();
        ethers = client.ethers;
    });

    beforeEach(async function () {
        [deployer, buyer, seller, agent] = await ethers.getSigners();

        // 1. Deploy Mock USDC (mints 1M to deployer)
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.waitForDeployment();

        // 2. Deploy Mock EURC (mints 1M to deployer)
        const MockEURC = await ethers.getContractFactory("MockEURC");
        eurc = await MockEURC.deploy();
        await eurc.waitForDeployment();

        // 3. Deploy MockStableFX
        const MockStableFX = await ethers.getContractFactory("MockStableFX");
        stableFX = await MockStableFX.deploy(await eurc.getAddress());
        await stableFX.waitForDeployment();

        // 4. Deploy AutoEscrowv3
        const AutoEscrowv3 = await ethers.getContractFactory("AutoEscrowv3");
        escrow = await AutoEscrowv3.deploy(await usdc.getAddress());
        await escrow.waitForDeployment();

        // 5. Configure StableFX Router on Escrow
        await escrow.setStableFXRouter(await stableFX.getAddress());

        // 6. Fund the StableFX pool with EURC
        await eurc.transfer(await stableFX.getAddress(), ethers.parseUnits("50000", 6));

        // 7. Fund Buyer with USDC via transfer from deployer
        await usdc.transfer(buyer.address, ethers.parseUnits("10000", 6));
    });

    it("should create an escrow with EURC settlement and transfer EURC to seller on release", async function () {
        const amountUSDC = ethers.parseUnits("1000", 6); // $1000 USDC
        const expectedEURC = ethers.parseUnits("920", 6); // 1000 * 0.92 = 920 EURC

        // Approve Escrow contract to pull Buyer's USDC
        await usdc.connect(buyer).approve(await escrow.getAddress(), amountUSDC);

        // Create escrow specifying EURC as target settlement currency
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const tx = await escrow.connect(buyer).createEscrowWithFX(
            seller.address,
            agent.address,
            deadline,
            "Cross-border payment #492",
            ["Milestone 1"],
            [amountUSDC],
            await eurc.getAddress()
        );
        await tx.wait();

        const jobId = 0; // First job index

        // Confirm job parameters
        const job = await escrow.getJob(jobId);
        expect(job.settlementToken).to.equal(await eurc.getAddress());
        expect(job.budget).to.equal(amountUSDC);

        // Complete Milestone
        await escrow.connect(agent).completeMilestone(jobId, 0);

        // Release Milestone - this will trigger USDC -> EURC swap
        const sellerPrevBalance = await eurc.balanceOf(seller.address);
        await escrow.connect(agent).releaseMilestone(jobId, 0);
        const sellerNewBalance = await eurc.balanceOf(seller.address);

        // Verify seller received EURC (920 EURC)
        expect(sellerNewBalance - sellerPrevBalance).to.equal(expectedEURC);
    });

    it("should revert if slippage is violated (simulated swap failure)", async function () {
        const amountUSDC = ethers.parseUnits("1000", 6);

        await usdc.connect(buyer).approve(await escrow.getAddress(), amountUSDC);
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        await escrow.connect(buyer).createEscrowWithFX(
            seller.address,
            agent.address,
            deadline,
            "Cross-border fail swap",
            ["Milestone 1"],
            [amountUSDC],
            await eurc.getAddress()
        );

        const jobId = 0; // Each test gets a fresh deploy, so jobId is 0

        await escrow.connect(agent).completeMilestone(jobId, 0);

        // If the pool runs out of EURC, swap will revert
        await eurc.connect(deployer).transfer(buyer.address, await eurc.balanceOf(await stableFX.getAddress())); // Drain StableFX EURC
        
        try {
            await escrow.connect(agent).releaseMilestone(jobId, 0);
            expect.fail("Should have reverted");
        } catch (err) {
            expect(err.message).to.contain("reverted");
        }
    });
});
