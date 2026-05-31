// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title AutoEscrow v2
 * @notice Agent-verified programmable escrow for B2B commerce on Arc
 * @dev Milestone-gated releases, deadline auto-refund, dispute resolution, event logging
 */
contract AutoEscrow {
    IERC20 public immutable usdc;

    // ─── State Machine ───
    enum EscrowState { ACTIVE, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    struct Milestone {
        string description;
        uint256 amount;
        bool completed;
        bool released;
    }

    struct Escrow {
        address buyer;
        address seller;
        address agent;       // AI agent that verifies delivery
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 deadline;    // Auto-refund after this timestamp
        EscrowState state;
        uint256 createdAt;
        string invoiceRef;    // Invoice/PO invoiceRef
        uint256 milestoneCount;
    }

    // ─── Storage ───
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    uint256 public nextEscrowId;
    
    // Track user activity
    mapping(address => uint256[]) public userEscrows;

    // ─── Reentrancy lock ───
    bool private _locked;
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ─── Events ───
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        address agent,
        uint256 totalAmount,
        uint256 deadline
    );
    event MilestoneCompleted(uint256 indexed escrowId, uint256 indexed milestoneIndex, address completedBy);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed milestoneIndex, uint256 amount);
    event EscrowFullyReleased(uint256 indexed escrowId, uint256 totalAmount);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    event DisputeRaised(uint256 indexed escrowId, address raisedBy, string reason);
    event DisputeResolved(uint256 indexed escrowId, uint256 buyerAmount, uint256 sellerAmount);

    constructor(address _usdcAddress) {
        usdc = IERC20(_usdcAddress);
    }

    // ─── Core: Create Escrow with Milestones ───
    
    /**
     * @notice Create a new escrow deal with milestone-based releases
     * @param _seller Recipient of funds upon delivery
     * @param _agent AI agent address authorized to verify and release
     * @param _deadline Unix timestamp — auto-refund available after this
     * @param _invoiceRef Invoice/PO number for off-chain tracking
     * @param _milestoneDescs Description for each milestone
     * @param _milestoneAmounts USDC amount for each milestone (must sum to total)
     */
    function createEscrow(
        address _seller,
        address _agent,
        uint256 _deadline,
        string calldata _invoiceRef,
        string[] calldata _milestoneDescs,
        uint256[] calldata _milestoneAmounts
    ) external nonReentrant returns (uint256) {
        require(_seller != address(0) && _seller != msg.sender, "Invalid seller");
        require(_agent != address(0), "Invalid agent");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_milestoneDescs.length > 0, "Need at least 1 milestone");
        require(_milestoneDescs.length == _milestoneAmounts.length, "Milestone arrays mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            totalAmount += _milestoneAmounts[i];
        }

        // Transfer USDC from buyer to contract
        require(usdc.transferFrom(msg.sender, address(this), totalAmount), "USDC transfer failed");

        uint256 escrowId = nextEscrowId++;
        Escrow storage e = escrows[escrowId];
        e.buyer = msg.sender;
        e.seller = _seller;
        e.agent = _agent;
        e.totalAmount = totalAmount;
        e.deadline = _deadline;
        e.state = EscrowState.ACTIVE;
        e.createdAt = block.timestamp;
        e.invoiceRef = _invoiceRef;
        e.milestoneCount = _milestoneDescs.length;

        for (uint256 i = 0; i < _milestoneDescs.length; i++) {
            milestones[escrowId][i] = Milestone({
                description: _milestoneDescs[i],
                amount: _milestoneAmounts[i],
                completed: false,
                released: false
            });
        }

        userEscrows[msg.sender].push(escrowId);
        userEscrows[_seller].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, _seller, _agent, totalAmount, _deadline);
        return escrowId;
    }

    /**
     * @notice Simple escrow creation (single milestone, 30-day deadline)
     * @dev Convenience wrapper for quick escrow creation
     */
    function createSimpleEscrow(address _seller, address _agent, uint256 _amount) external nonReentrant returns (uint256) {
        require(_seller != address(0) && _seller != msg.sender, "Invalid seller");
        require(_agent != address(0), "Invalid agent");
        require(_amount > 0, "Amount must be > 0");

        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        uint256 escrowId = nextEscrowId++;
        Escrow storage e = escrows[escrowId];
        e.buyer = msg.sender;
        e.seller = _seller;
        e.agent = _agent;
        e.totalAmount = _amount;
        e.deadline = block.timestamp + 30 days;
        e.state = EscrowState.ACTIVE;
        e.createdAt = block.timestamp;
        e.invoiceRef = "";
        e.milestoneCount = 1;

        milestones[escrowId][0] = Milestone({
            description: "Full delivery",
            amount: _amount,
            completed: false,
            released: false
        });

        userEscrows[msg.sender].push(escrowId);
        userEscrows[_seller].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, _seller, _agent, _amount, block.timestamp + 30 days);
        return escrowId;
    }

    // ─── Milestone Management ───

    /**
     * @notice Mark a milestone as completed (by agent or seller)
     */
    function completeMilestone(uint256 _escrowId, uint256 _milestoneIndex) external {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.ACTIVE, "Escrow not active");
        require(msg.sender == e.agent || msg.sender == e.seller, "Only agent or seller");
        require(_milestoneIndex < e.milestoneCount, "Invalid milestone");
        require(!milestones[_escrowId][_milestoneIndex].completed, "Already completed");

        milestones[_escrowId][_milestoneIndex].completed = true;
        emit MilestoneCompleted(_escrowId, _milestoneIndex, msg.sender);
    }

    /**
     * @notice Release funds for a completed milestone (by agent or buyer)
     */
    function releaseMilestone(uint256 _escrowId, uint256 _milestoneIndex) external nonReentrant {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.ACTIVE, "Escrow not active");
        require(msg.sender == e.agent || msg.sender == e.buyer, "Only agent or buyer");
        require(_milestoneIndex < e.milestoneCount, "Invalid milestone");
        
        Milestone storage m = milestones[_escrowId][_milestoneIndex];
        require(m.completed, "Milestone not completed yet");
        require(!m.released, "Already released");

        m.released = true;
        e.releasedAmount += m.amount;
        require(usdc.transfer(e.seller, m.amount), "Transfer failed");

        emit MilestoneReleased(_escrowId, _milestoneIndex, m.amount);

        // Check if all milestones released
        if (e.releasedAmount >= e.totalAmount) {
            e.state = EscrowState.RELEASED;
            emit EscrowFullyReleased(_escrowId, e.totalAmount);
        }
    }

    /**
     * @notice Release all remaining funds at once (by agent or buyer)
     */
    function releaseAll(uint256 _escrowId) external nonReentrant {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.ACTIVE, "Escrow not active");
        require(msg.sender == e.agent || msg.sender == e.buyer, "Only agent or buyer");

        uint256 remaining = e.totalAmount - e.releasedAmount;
        require(remaining > 0, "Nothing to release");

        e.releasedAmount = e.totalAmount;
        e.state = EscrowState.RELEASED;
        require(usdc.transfer(e.seller, remaining), "Transfer failed");

        emit EscrowFullyReleased(_escrowId, e.totalAmount);
    }

    // ─── Refund ───

    /**
     * @notice Refund remaining funds to buyer (by agent or seller)
     */
    function refundEscrow(uint256 _escrowId) external nonReentrant {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.ACTIVE, "Escrow not active");
        require(msg.sender == e.agent || msg.sender == e.seller, "Only agent or seller");

        uint256 remaining = e.totalAmount - e.releasedAmount;
        require(remaining > 0, "Nothing to refund");

        e.releasedAmount = e.totalAmount;
        e.state = EscrowState.REFUNDED;
        require(usdc.transfer(e.buyer, remaining), "Transfer failed");

        emit EscrowRefunded(_escrowId, remaining);
    }

    /**
     * @notice Auto-refund if deadline has passed — anyone can call
     */
    function claimTimeoutRefund(uint256 _escrowId) external nonReentrant {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.ACTIVE, "Escrow not active");
        require(block.timestamp > e.deadline, "Deadline not passed yet");

        uint256 remaining = e.totalAmount - e.releasedAmount;
        require(remaining > 0, "Nothing to refund");

        e.releasedAmount = e.totalAmount;
        e.state = EscrowState.REFUNDED;
        require(usdc.transfer(e.buyer, remaining), "Transfer failed");

        emit EscrowRefunded(_escrowId, remaining);
    }

    // ─── Dispute Resolution ───

    /**
     * @notice Raise a dispute — freezes the escrow
     */
    function raiseDispute(uint256 _escrowId, string calldata _reason) external {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.ACTIVE, "Cannot dispute");
        require(msg.sender == e.buyer || msg.sender == e.seller, "Only buyer or seller");

        e.state = EscrowState.DISPUTED;
        emit DisputeRaised(_escrowId, msg.sender, _reason);
    }

    /**
     * @notice Agent resolves dispute by splitting remaining funds
     */
    function resolveDispute(uint256 _escrowId, uint256 _buyerPercent) external nonReentrant {
        Escrow storage e = escrows[_escrowId];
        require(e.state == EscrowState.DISPUTED, "Not disputed");
        require(msg.sender == e.agent, "Only agent can resolve");
        require(_buyerPercent <= 100, "Invalid percentage");

        uint256 remaining = e.totalAmount - e.releasedAmount;
        uint256 buyerAmount = (remaining * _buyerPercent) / 100;
        uint256 sellerAmount = remaining - buyerAmount;

        e.releasedAmount = e.totalAmount;
        e.state = EscrowState.RESOLVED;

        if (buyerAmount > 0) {
            require(usdc.transfer(e.buyer, buyerAmount), "Buyer transfer failed");
        }
        if (sellerAmount > 0) {
            require(usdc.transfer(e.seller, sellerAmount), "Seller transfer failed");
        }

        emit DisputeResolved(_escrowId, buyerAmount, sellerAmount);
    }

    // ─── View Functions ───

    function getEscrowMilestone(uint256 _escrowId, uint256 _index) external view returns (
        string memory description,
        uint256 amount,
        bool completed,
        bool released
    ) {
        Milestone storage m = milestones[_escrowId][_index];
        return (m.description, m.amount, m.completed, m.released);
    }

    function getUserEscrowIds(address _user) external view returns (uint256[] memory) {
        return userEscrows[_user];
    }
}
