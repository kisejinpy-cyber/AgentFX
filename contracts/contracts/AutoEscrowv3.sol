// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IACPHook.sol";
import "./interfaces/IStableFX.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IAgentRegistry {
    function getAgent(address agentAddress) external view returns (
        string memory name,
        string memory metadataUri,
        string memory capability,
        uint8 trustScore,
        bool active
    );
}

/**
 * @title AutoEscrow v3 (ERC-8183 Compliant)
 * @notice Standardized job settlement escrow for AI agents on Arc
 * @dev Fully implements ERC-8183 (Agentic Commerce Protocol) with legacy milestone extensions
 */
contract AutoEscrowv3 {
    IERC20 public immutable paymentToken;
    address public owner;
    address public agentRegistry;
    address public stableFXRouter;

    enum JobStatus {
        Open,
        Funded,
        Submitted,
        Completed,
        Rejected,
        Expired
    }

    struct Deliverable {
        string description;
        uint256 amount;
        bool completed;
        bool released;
    }

    struct Job {
        uint256 id;
        address employer;     // buyer (client)
        address worker;       // seller (provider)
        address agent;        // AI agent (evaluator)
        string description;   // invoice reference / PO
        uint256 budget;       // total amount
        uint256 expiredAt;    // deadline
        JobStatus status;
        address hook;
        uint256 releasedAmount;
        uint256 milestoneCount;
        bool isDisputed;
        string disputeReason;
        uint256 createdAt;
        address settlementToken;
    }

    // ─── Storage ───
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Deliverable[]) public jobDeliverables;
    uint256 public jobCounter;

    mapping(address => uint256[]) public userJobs;
    mapping(address => bool) public whitelistedHooks;

    enum VoteDecision { None, Release, Refund }

    struct DisputeState {
        uint256 releaseVotes;
        uint256 refundVotes;
        uint256 threshold;
        bool resolved;
        address humanArbiter;
    }

    mapping(uint256 => DisputeState) public jobDisputeStates;
    mapping(uint256 => address[]) public jobAgents;
    mapping(uint256 => mapping(address => VoteDecision)) public agentVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event AgentVoted(uint256 indexed jobId, address indexed agent, VoteDecision decision);

    // ─── Reentrancy lock ───
    bool private _locked;
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ─── ERC-8183 Events ───
    event JobCreated(
        uint256 indexed jobId,
        address indexed employer,
        address indexed worker,
        address agent,
        uint256 budget,
        uint256 expiredAt
    );
    event JobSettled(uint256 indexed jobId, address indexed worker, uint256 amount);
    event JobDisputed(uint256 indexed jobId, address indexed raisedBy, string reason);
    event JobRefunded(uint256 indexed jobId, address indexed employer, uint256 amount);

    // Legacy/Additional Events
    event ProviderSet(uint256 indexed jobId, address indexed provider);
    event BudgetSet(uint256 indexed jobId, uint256 amount);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason);
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event HookWhitelistUpdated(address indexed hook, bool status);

    // Legacy Events for UI Compatibility
    event MilestoneCompleted(uint256 indexed escrowId, uint256 indexed milestoneIndex, address completedBy);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed milestoneIndex, uint256 amount);
    event DisputeRaised(uint256 indexed escrowId, address raisedBy, string reason);
    event DisputeResolved(uint256 indexed escrowId, uint256 buyerAmount, uint256 sellerAmount);

    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error ZeroAddress();
    error ExpiryTooShort();
    error ZeroBudget();
    error ProviderNotSet();
    error HookNotWhitelisted();
    error Disputed();

    constructor(address _usdcAddress) {
        require(_usdcAddress != address(0), "Invalid token address");
        paymentToken = IERC20(_usdcAddress);
        owner = msg.sender;
        whitelistedHooks[address(0)] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ──────────────────── Admin ────────────────────

    function setHookWhitelist(address hook, bool status) external onlyOwner {
        if (hook == address(0)) revert ZeroAddress();
        whitelistedHooks[hook] = status;
        emit HookWhitelistUpdated(hook, status);
    }

    function setAgentRegistry(address _registry) external onlyOwner {
        agentRegistry = _registry;
    }

    function setStableFXRouter(address _router) external onlyOwner {
        stableFXRouter = _router;
    }

    // ──────────────────── Hook Helpers ────────────────────

    function _beforeHook(address hook, uint256 jobId, bytes4 selector, bytes memory data) internal {
        if (hook != address(0)) {
            IACPHook(hook).beforeAction(jobId, selector, data);
        }
    }

    function _afterHook(address hook, uint256 jobId, bytes4 selector, bytes memory data) internal {
        if (hook != address(0)) {
            IACPHook(hook).afterAction(jobId, selector, data);
        }
    }

    // ──────────────────── ERC-8183 Core Functions ────────────────────

    function createJob(
        address worker,
        address agent,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external nonReentrant returns (uint256) {
        if (agent == address(0)) revert ZeroAddress();
        if (agentRegistry != address(0)) {
            (,,,,bool active) = IAgentRegistry(agentRegistry).getAgent(agent);
            require(active, "Agent is not active in Registry");
        }
        if (expiredAt <= block.timestamp + 5 minutes) revert ExpiryTooShort();
        if (!whitelistedHooks[hook]) revert HookNotWhitelisted();

        uint256 jobId = jobCounter++;
        Job storage job = jobs[jobId];
        job.id = jobId;
        job.employer = msg.sender;
        job.worker = worker;
        job.agent = agent;
        job.description = description;
        job.budget = 0;
        job.expiredAt = expiredAt;
        job.status = JobStatus.Open;
        job.hook = hook;
        job.createdAt = block.timestamp;
        job.settlementToken = address(paymentToken);

        emit JobCreated(jobId, msg.sender, worker, agent, 0, expiredAt);
        _afterHook(hook, jobId, msg.sig, abi.encode(msg.sender, worker, agent));

        userJobs[msg.sender].push(jobId);
        if (worker != address(0)) {
            userJobs[worker].push(jobId);
        }

        return jobId;
    }

    function setProvider(uint256 jobId, address provider) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (msg.sender != job.employer) revert Unauthorized();
        if (job.worker != address(0)) revert WrongStatus();
        if (provider == address(0)) revert ZeroAddress();

        job.worker = provider;
        emit ProviderSet(jobId, provider);
        userJobs[provider].push(jobId);
    }

    function setBudget(uint256 jobId, uint256 amount, bytes calldata optParams) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (msg.sender != job.worker && msg.sender != job.employer) revert Unauthorized();

        bytes memory data = abi.encode(msg.sender, amount, optParams);
        _beforeHook(job.hook, jobId, msg.sig, data);

        job.budget = amount;
        emit BudgetSet(jobId, amount);

        _afterHook(job.hook, jobId, msg.sig, data);
    }

    function fund(uint256 jobId, bytes calldata optParams) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (msg.sender != job.employer) revert Unauthorized();
        if (job.worker == address(0)) revert ProviderNotSet();
        if (job.budget == 0) revert ZeroBudget();
        if (block.timestamp >= job.expiredAt) revert WrongStatus();

        bytes memory data = abi.encode(msg.sender, optParams);
        _beforeHook(job.hook, jobId, msg.sig, data);

        job.status = JobStatus.Funded;
        require(paymentToken.transferFrom(job.employer, address(this), job.budget), "Transfer failed");
        emit JobFunded(jobId, job.employer, job.budget);

        _afterHook(job.hook, jobId, msg.sig, data);
    }

    function submit(uint256 jobId, bytes32 deliverable, bytes calldata optParams) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();
        if (msg.sender != job.worker) revert Unauthorized();
        if (job.isDisputed) revert Disputed();

        bytes memory data = abi.encode(msg.sender, deliverable, optParams);
        _beforeHook(job.hook, jobId, msg.sig, data);

        job.status = JobStatus.Submitted;
        emit JobSubmitted(jobId, job.worker, deliverable);

        _afterHook(job.hook, jobId, msg.sig, data);
    }

    function complete(uint256 jobId, bytes32 reason, bytes calldata optParams) external {
        _settleJob(jobId, reason, optParams);
    }

    function settleJob(uint256 jobId) external {
        _settleJob(jobId, bytes32(0), "");
    }

    function _settleJob(uint256 jobId, bytes32 reason, bytes memory optParams) internal nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (msg.sender != job.agent && msg.sender != job.employer) revert Unauthorized();
        if (job.isDisputed) revert Disputed();

        bytes memory data = abi.encode(msg.sender, reason, optParams);
        _beforeHook(job.hook, jobId, msg.sig, data);

        job.status = JobStatus.Completed;
        uint256 remaining = job.budget - job.releasedAmount;
        job.releasedAmount = job.budget;

        // Set all deliverables completed and released
        for (uint256 i = 0; i < job.milestoneCount; i++) {
            jobDeliverables[jobId][i].completed = true;
            jobDeliverables[jobId][i].released = true;
        }

        if (remaining > 0) {
            _executePayment(job.worker, remaining, job.settlementToken);
            emit PaymentReleased(jobId, job.worker, remaining);
            emit JobSettled(jobId, job.worker, remaining);
        }
        emit JobCompleted(jobId, job.agent, reason);

        _afterHook(job.hook, jobId, msg.sig, data);
    }

    function reject(uint256 jobId, bytes32 reason, bytes calldata optParams) external {
        _refundJob(jobId, reason, optParams);
    }

    function refundJob(uint256 jobId) external {
        _refundJob(jobId, bytes32(0), "");
    }

    function _refundJob(uint256 jobId, bytes32 reason, bytes memory optParams) internal nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();

        if (job.status == JobStatus.Open) {
            if (msg.sender != job.employer) revert Unauthorized();
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted) {
            if (msg.sender != job.agent) revert Unauthorized();
        } else {
            revert WrongStatus();
        }

        bytes memory data = abi.encode(msg.sender, reason, optParams);
        _beforeHook(job.hook, jobId, msg.sig, data);

        JobStatus prev = job.status;
        job.status = JobStatus.Rejected;

        if (prev == JobStatus.Funded || prev == JobStatus.Submitted) {
            uint256 remaining = job.budget - job.releasedAmount;
            job.releasedAmount = job.budget;
            if (remaining > 0) {
                require(paymentToken.transfer(job.employer, remaining), "Transfer failed");
                emit Refunded(jobId, job.employer, remaining);
                emit JobRefunded(jobId, job.employer, remaining);
            }
        }

        emit JobRejected(jobId, msg.sender, reason);
        _afterHook(job.hook, jobId, msg.sig, data);
    }

    function claimRefund(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert WrongStatus();

        job.status = JobStatus.Expired;
        uint256 remaining = job.budget - job.releasedAmount;
        job.releasedAmount = job.budget;

        if (remaining > 0) {
            require(paymentToken.transfer(job.employer, remaining), "Transfer failed");
            emit Refunded(jobId, job.employer, remaining);
            emit JobRefunded(jobId, job.employer, remaining);
        }

        emit JobExpired(jobId);
    }

    function disputeJob(uint256 jobId, string calldata reason) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (msg.sender != job.employer && msg.sender != job.worker) revert Unauthorized();
        if (job.isDisputed) revert Disputed();

        job.isDisputed = true;
        job.disputeReason = reason;
        emit DisputeRaised(jobId, msg.sender, reason);
        emit JobDisputed(jobId, msg.sender, reason);
    }

    function resolveJobDispute(uint256 jobId, uint256 buyerPercent) public nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (!job.isDisputed) revert WrongStatus();
        if (msg.sender != job.agent) revert Unauthorized();
        require(buyerPercent <= 100, "Invalid percentage");

        uint256 remaining = job.budget - job.releasedAmount;
        uint256 buyerAmount = (remaining * buyerPercent) / 100;
        uint256 sellerAmount = remaining - buyerAmount;

        job.releasedAmount = job.budget;
        job.status = buyerPercent == 100 ? JobStatus.Rejected : JobStatus.Completed;
        job.isDisputed = false;

        if (buyerAmount > 0) {
            require(paymentToken.transfer(job.employer, buyerAmount), "Buyer transfer failed");
            emit Refunded(jobId, job.employer, buyerAmount);
            emit JobRefunded(jobId, job.employer, buyerAmount);
        }
        if (sellerAmount > 0) {
            _executePayment(job.worker, sellerAmount, job.settlementToken);
            emit PaymentReleased(jobId, job.worker, sellerAmount);
            emit JobSettled(jobId, job.worker, sellerAmount);
        }

        emit DisputeResolved(jobId, buyerAmount, sellerAmount);
    }

    function submitVote(uint256 jobId, VoteDecision decision) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (!job.isDisputed) revert WrongStatus();
        
        bool isAuthorized = false;
        address[] storage agents = jobAgents[jobId];
        for (uint256 i = 0; i < agents.length; i++) {
            if (agents[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        
        // Security check against agent registry
        if (agentRegistry != address(0)) {
            (,,,,bool active) = IAgentRegistry(agentRegistry).getAgent(msg.sender);
            require(active, "Agent is not active in Registry");
        }
        
        require(isAuthorized, "Not an authorized agent for this job");
        require(!hasVoted[jobId][msg.sender], "Agent already voted");
        require(decision == VoteDecision.Release || decision == VoteDecision.Refund, "Invalid decision");
        
        hasVoted[jobId][msg.sender] = true;
        agentVotes[jobId][msg.sender] = decision;
        DisputeState storage ds = jobDisputeStates[jobId];
        
        if (decision == VoteDecision.Release) {
            ds.releaseVotes++;
        } else {
            ds.refundVotes++;
        }
        
        emit AgentVoted(jobId, msg.sender, decision);
        
        if (ds.releaseVotes >= ds.threshold) {
            _resolveDisputeInternal(jobId, 0); // 0% to buyer -> 100% to seller (Release)
        } else if (ds.refundVotes >= ds.threshold) {
            _resolveDisputeInternal(jobId, 100); // 100% to buyer -> 0% to seller (Refund)
        }
    }

    function humanResolveDispute(uint256 jobId, uint256 buyerPercent) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (!job.isDisputed) revert WrongStatus();
        
        DisputeState storage ds = jobDisputeStates[jobId];
        require(msg.sender == ds.humanArbiter || msg.sender == owner, "Only human arbiter or owner");
        require(buyerPercent <= 100, "Invalid percentage");
        
        _resolveDisputeInternal(jobId, buyerPercent);
    }

    function _resolveDisputeInternal(uint256 jobId, uint256 buyerPercent) internal nonReentrant {
        Job storage job = jobs[jobId];
        uint256 remaining = job.budget - job.releasedAmount;
        uint256 buyerAmount = (remaining * buyerPercent) / 100;
        uint256 sellerAmount = remaining - buyerAmount;

        job.releasedAmount = job.budget;
        job.status = buyerPercent == 100 ? JobStatus.Rejected : JobStatus.Completed;
        job.isDisputed = false;
        jobDisputeStates[jobId].resolved = true;

        if (buyerAmount > 0) {
            require(paymentToken.transfer(job.employer, buyerAmount), "Buyer transfer failed");
            emit Refunded(jobId, job.employer, buyerAmount);
            emit JobRefunded(jobId, job.employer, buyerAmount);
        }
        if (sellerAmount > 0) {
            _executePayment(job.worker, sellerAmount, job.settlementToken);
            emit PaymentReleased(jobId, job.worker, sellerAmount);
            emit JobSettled(jobId, job.worker, sellerAmount);
        }

        emit DisputeResolved(jobId, buyerAmount, sellerAmount);
    }

    function getJobAgents(uint256 jobId) external view returns (address[] memory) {
        return jobAgents[jobId];
    }

    // ──────────────────── Legacy / Milestone Extensions ────────────────────

    function createEscrowWithMultiAgent(
        address _seller,
        address[] calldata _agents,
        uint256 _deadline,
        string calldata _invoiceRef,
        string[] calldata _milestoneDescs,
        uint256[] calldata _milestoneAmounts,
        address _settlementToken,
        address _humanArbiter
    ) external nonReentrant returns (uint256) {
        require(_seller != address(0) && _seller != msg.sender, "Invalid seller");
        require(_agents.length > 0, "Need at least 1 agent");
        require(_deadline > block.timestamp + 5 minutes, "Deadline too short");
        require(_milestoneDescs.length > 0, "Need at least 1 milestone");
        require(_milestoneDescs.length == _milestoneAmounts.length, "Milestone arrays mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            totalAmount += _milestoneAmounts[i];
        }

        uint256 jobId = jobCounter++;
        Job storage job = jobs[jobId];
        job.id = jobId;
        job.employer = msg.sender;
        job.worker = _seller;
        job.agent = _agents[0];
        job.description = _invoiceRef;
        job.budget = totalAmount;
        job.expiredAt = _deadline;
        job.status = JobStatus.Funded;
        job.hook = address(0);
        job.milestoneCount = _milestoneDescs.length;
        job.createdAt = block.timestamp;
        job.settlementToken = _settlementToken == address(0) ? address(paymentToken) : _settlementToken;

        for (uint256 i = 0; i < _agents.length; i++) {
            require(_agents[i] != address(0), "Invalid agent address");
            if (agentRegistry != address(0)) {
                (,,,,bool active) = IAgentRegistry(agentRegistry).getAgent(_agents[i]);
                require(active, "Agent is not active in Registry");
            }
            jobAgents[jobId].push(_agents[i]);
        }

        uint256 quorum = (_agents.length / 2) + 1;
        DisputeState storage ds = jobDisputeStates[jobId];
        ds.threshold = quorum;
        ds.resolved = false;
        ds.humanArbiter = _humanArbiter == address(0) ? owner : _humanArbiter;

        for (uint256 i = 0; i < _milestoneDescs.length; i++) {
            jobDeliverables[jobId].push(Deliverable({
                description: _milestoneDescs[i],
                amount: _milestoneAmounts[i],
                completed: false,
                released: false
            }));
        }

        require(paymentToken.transferFrom(msg.sender, address(this), totalAmount), "USDC transfer failed");

        emit JobCreated(jobId, msg.sender, _seller, _agents[0], totalAmount, _deadline);
        emit BudgetSet(jobId, totalAmount);
        emit JobFunded(jobId, msg.sender, totalAmount);

        userJobs[msg.sender].push(jobId);
        userJobs[_seller].push(jobId);

        return jobId;
    }

    function createEscrow(
        address _seller,
        address _agent,
        uint256 _deadline,
        string calldata _invoiceRef,
        string[] calldata _milestoneDescs,
        uint256[] calldata _milestoneAmounts
    ) external nonReentrant returns (uint256) {
        return _createEscrowInternal(_seller, _agent, _deadline, _invoiceRef, _milestoneDescs, _milestoneAmounts, address(paymentToken));
    }

    function createEscrowWithFX(
        address _seller,
        address _agent,
        uint256 _deadline,
        string calldata _invoiceRef,
        string[] calldata _milestoneDescs,
        uint256[] calldata _milestoneAmounts,
        address _settlementToken
    ) external nonReentrant returns (uint256) {
        return _createEscrowInternal(_seller, _agent, _deadline, _invoiceRef, _milestoneDescs, _milestoneAmounts, _settlementToken);
    }

    function _createEscrowInternal(
        address _seller,
        address _agent,
        uint256 _deadline,
        string memory _invoiceRef,
        string[] memory _milestoneDescs,
        uint256[] memory _milestoneAmounts,
        address _settlementToken
    ) internal returns (uint256) {
        require(_seller != address(0) && _seller != msg.sender, "Invalid seller");
        require(_agent != address(0), "Invalid agent");
        require(_deadline > block.timestamp + 5 minutes, "Deadline too short");
        require(_milestoneDescs.length > 0, "Need at least 1 milestone");
        require(_milestoneDescs.length == _milestoneAmounts.length, "Milestone arrays mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            totalAmount += _milestoneAmounts[i];
        }

        uint256 jobId = jobCounter++;
        Job storage job = jobs[jobId];
        job.id = jobId;
        job.employer = msg.sender;
        job.worker = _seller;
        job.agent = _agent;
        job.description = _invoiceRef;
        job.budget = totalAmount;
        job.expiredAt = _deadline;
        job.status = JobStatus.Funded;
        job.hook = address(0);
        job.milestoneCount = _milestoneDescs.length;
        job.createdAt = block.timestamp;
        job.settlementToken = _settlementToken == address(0) ? address(paymentToken) : _settlementToken;

        for (uint256 i = 0; i < _milestoneDescs.length; i++) {
            jobDeliverables[jobId].push(Deliverable({
                description: _milestoneDescs[i],
                amount: _milestoneAmounts[i],
                completed: false,
                released: false
            }));
        }

        require(paymentToken.transferFrom(msg.sender, address(this), totalAmount), "USDC transfer failed");

        emit JobCreated(jobId, msg.sender, _seller, _agent, totalAmount, _deadline);
        emit BudgetSet(jobId, totalAmount);
        emit JobFunded(jobId, msg.sender, totalAmount);

        userJobs[msg.sender].push(jobId);
        userJobs[_seller].push(jobId);

        return jobId;
    }

    function createSimpleEscrow(address _seller, address _agent, uint256 _amount) external nonReentrant returns (uint256) {
        require(_seller != address(0) && _seller != msg.sender, "Invalid seller");
        require(_agent != address(0), "Invalid agent");
        require(_amount > 0, "Amount must be > 0");

        uint256 jobId = jobCounter++;
        Job storage job = jobs[jobId];
        job.id = jobId;
        job.employer = msg.sender;
        job.worker = _seller;
        job.agent = _agent;
        job.description = "Simple Escrow";
        job.budget = _amount;
        job.expiredAt = block.timestamp + 30 days;
        job.status = JobStatus.Funded;
        job.hook = address(0);
        job.milestoneCount = 1;
        job.createdAt = block.timestamp;
        job.settlementToken = address(paymentToken);

        jobDeliverables[jobId].push(Deliverable({
            description: "Full delivery",
            amount: _amount,
            completed: false,
            released: false
        }));

        require(paymentToken.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        emit JobCreated(jobId, msg.sender, _seller, _agent, _amount, block.timestamp + 30 days);
        emit BudgetSet(jobId, _amount);
        emit JobFunded(jobId, msg.sender, _amount);

        userJobs[msg.sender].push(jobId);
        userJobs[_seller].push(jobId);

        return jobId;
    }

    function completeMilestone(uint256 jobId, uint256 milestoneIndex) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();
        if (msg.sender != job.agent && msg.sender != job.worker) revert Unauthorized();
        if (job.isDisputed) revert Disputed();
        require(milestoneIndex < job.milestoneCount, "Invalid milestone index");
        require(!jobDeliverables[jobId][milestoneIndex].completed, "Already completed");

        jobDeliverables[jobId][milestoneIndex].completed = true;
        emit MilestoneCompleted(jobId, milestoneIndex, msg.sender);
    }

    function releaseMilestone(uint256 jobId, uint256 milestoneIndex) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();
        if (msg.sender != job.agent && msg.sender != job.employer) revert Unauthorized();
        if (job.isDisputed) revert Disputed();
        require(milestoneIndex < job.milestoneCount, "Invalid milestone index");

        Deliverable storage m = jobDeliverables[jobId][milestoneIndex];
        require(m.completed, "Milestone not completed");
        require(!m.released, "Already released");

        m.released = true;
        job.releasedAmount += m.amount;

        _executePayment(job.worker, m.amount, job.settlementToken);
        emit MilestoneReleased(jobId, milestoneIndex, m.amount);
        emit PaymentReleased(jobId, job.worker, m.amount);
        emit JobSettled(jobId, job.worker, m.amount);

        if (job.releasedAmount >= job.budget) {
            job.status = JobStatus.Completed;
            emit JobCompleted(jobId, msg.sender, bytes32(0));
        }
    }

    function releaseAll(uint256 jobId) external {
        _settleJob(jobId, bytes32(0), "");
    }

    function refundEscrow(uint256 jobId) external {
        _refundJob(jobId, bytes32(0), "");
    }

    function claimTimeoutRefund(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (block.timestamp <= job.expiredAt) revert WrongStatus();

        uint256 remaining = job.budget - job.releasedAmount;
        require(remaining > 0, "Nothing to refund");

        job.releasedAmount = job.budget;
        job.status = JobStatus.Expired;

        require(paymentToken.transfer(job.employer, remaining), "Transfer failed");
        emit JobExpired(jobId);
        emit Refunded(jobId, job.employer, remaining);
        emit JobRefunded(jobId, job.employer, remaining);
    }

    function _executePayment(address recipient, uint256 amount, address tokenOut) internal {
        if (tokenOut == address(paymentToken) || tokenOut == address(0)) {
            require(paymentToken.transfer(recipient, amount), "Transfer failed");
        } else {
            if (stableFXRouter != address(0)) {
                require(paymentToken.approve(stableFXRouter, amount), "Approve failed");
                uint256 minAmountOut = 0;
                try IStableFX(stableFXRouter).getQuote(address(paymentToken), tokenOut, amount) returns (uint256 quoteOut) {
                    minAmountOut = (quoteOut * 99) / 100; // 1% slippage limit
                } catch {
                    minAmountOut = (amount * 90) / 100; // fallback to 10% slippage / fixed rate
                }
                uint256 amountOut = IStableFX(stableFXRouter).swap(
                    address(paymentToken),
                    tokenOut,
                    amount,
                    minAmountOut,
                    recipient
                );
                require(amountOut >= minAmountOut, "Slippage tolerance violated");
            } else {
                require(paymentToken.transfer(recipient, amount), "Transfer failed");
            }
        }
    }

    function raiseDispute(uint256 jobId, string calldata reason) external {
        Job storage job = jobs[jobId];
        if (job.employer == address(0)) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (msg.sender != job.employer && msg.sender != job.worker) revert Unauthorized();
        if (job.isDisputed) revert Disputed();

        job.isDisputed = true;
        job.disputeReason = reason;
        emit DisputeRaised(jobId, msg.sender, reason);
        emit JobDisputed(jobId, msg.sender, reason);
    }

    function resolveDispute(uint256 jobId, uint256 buyerPercent) external {
        resolveJobDispute(jobId, buyerPercent);
    }

    // ──────────────────── Compatibility Views ────────────────────

    function escrows(uint256 id) external view returns (
        address buyer,
        address seller,
        address agent,
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 deadline,
        uint256 state,
        uint256 createdAt,
        string memory invoiceRef,
        uint256 milestoneCount
    ) {
        Job storage job = jobs[id];
        buyer = job.employer;
        seller = job.worker;
        agent = job.agent;
        totalAmount = job.budget;
        releasedAmount = job.releasedAmount;
        deadline = job.expiredAt;
        
        // Map JobStatus to EscrowState
        // EscrowState: ACTIVE=0, RELEASED=1, REFUNDED=2, DISPUTED=3, RESOLVED=4
        if (job.isDisputed) {
            state = 3; // DISPUTED
        } else if (job.status == JobStatus.Completed) {
            state = 1; // RELEASED
        } else if (job.status == JobStatus.Rejected) {
            state = 2; // REFUNDED
        } else if (job.status == JobStatus.Expired) {
            state = 2; // REFUNDED (Expired)
        } else {
            state = 0; // ACTIVE (Open, Funded, Submitted)
        }
        
        createdAt = job.createdAt;
        invoiceRef = job.description;
        milestoneCount = job.milestoneCount;
    }

    function milestones(uint256 jobId, uint256 index) external view returns (
        string memory description,
        uint256 amount,
        bool completed,
        bool released
    ) {
        Deliverable storage m = jobDeliverables[jobId][index];
        return (m.description, m.amount, m.completed, m.released);
    }

    function getEscrowMilestone(uint256 jobId, uint256 index) external view returns (
        string memory description,
        uint256 amount,
        bool completed,
        bool released
    ) {
        Deliverable storage m = jobDeliverables[jobId][index];
        return (m.description, m.amount, m.completed, m.released);
    }

    function getUserEscrowIds(address user) external view returns (uint256[] memory) {
        return userJobs[user];
    }

    function nextEscrowId() external view returns (uint256) {
        return jobCounter;
    }

    // ──────────────────── General Views ────────────────────

    function getJobMilestonesCount(uint256 jobId) external view returns (uint256) {
        return jobDeliverables[jobId].length;
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
}
