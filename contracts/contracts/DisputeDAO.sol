// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAutoEscrow {
    function humanResolveDispute(uint256 jobId, uint256 buyerPercent) external;
}

/**
 * @title DisputeDAO
 * @notice Multisig fallback human arbitration for deadlocked agent dispute resolutions
 */
contract DisputeDAO {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    struct Proposal {
        uint256 jobId;
        uint256 buyerPercent;
        uint256 approvals;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    uint256 public proposalCounter;

    event ProposalCreated(uint256 indexed proposalId, uint256 indexed jobId, uint256 buyerPercent);
    event ProposalApproved(uint256 indexed proposalId, address indexed ownerAddress);
    event ProposalExecuted(uint256 indexed proposalId, uint256 indexed jobId);

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "Owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Duplicate owner");
            isOwner[owner] = true;
            owners.push(owner);
        }
        threshold = _threshold;
    }

    function proposeResolution(uint256 jobId, uint256 buyerPercent) external returns (uint256) {
        require(isOwner[msg.sender], "Not an owner");
        uint256 propId = proposalCounter++;
        
        Proposal storage p = proposals[propId];
        p.jobId = jobId;
        p.buyerPercent = buyerPercent;
        p.approvals = 1;
        p.executed = false;

        hasApproved[propId][msg.sender] = true;
        emit ProposalCreated(propId, jobId, buyerPercent);
        emit ProposalApproved(propId, msg.sender);

        return propId;
    }

    function approveProposal(uint256 propId, address escrowContract) external {
        require(isOwner[msg.sender], "Not an owner");
        Proposal storage p = proposals[propId];
        require(!p.executed, "Already executed");
        require(!hasApproved[propId][msg.sender], "Already approved");

        hasApproved[propId][msg.sender] = true;
        p.approvals++;
        emit ProposalApproved(propId, msg.sender);

        if (p.approvals >= threshold) {
            p.executed = true;
            IAutoEscrow(escrowContract).humanResolveDispute(p.jobId, p.buyerPercent);
            emit ProposalExecuted(propId, p.jobId);
        }
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }
}
