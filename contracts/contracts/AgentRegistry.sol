// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry (ERC-8004 Compliant)
 * @notice On-chain directory mapping AI Agent addresses to identity metadata and trust reputation.
 */
contract AgentRegistry {
    address public owner;

    struct AgentProfile {
        string name;
        string metadataUri;
        string capability;
        uint8 trustScore; // 0 to 100
        bool active;
    }

    mapping(address => AgentProfile) private agents;
    mapping(address => bool) public authorizedReporters;

    event AgentRegistered(address indexed agentAddress, string name, string metadataUri, string capability);
    event ReputationUpdated(address indexed agentAddress, uint8 newScore);
    event AgentStatusChanged(address indexed agentAddress, bool active);
    event ReporterStatusChanged(address indexed reporter, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedReporters[msg.sender], "Unauthorized to report reputation");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setReporter(address reporter, bool status) external onlyOwner {
        authorizedReporters[reporter] = status;
        emit ReporterStatusChanged(reporter, status);
    }

    function registerAgent(
        address agentAddress,
        string calldata name,
        string calldata metadataUri,
        string calldata capability
    ) external onlyOwner {
        require(agentAddress != address(0), "Invalid agent address");
        agents[agentAddress] = AgentProfile({
            name: name,
            metadataUri: metadataUri,
            capability: capability,
            trustScore: 100, // Starts with full trust score
            active: true
        });

        emit AgentRegistered(agentAddress, name, metadataUri, capability);
    }

    function updateReputation(address agentAddress, uint8 newScore) external onlyAuthorized {
        require(agents[agentAddress].active, "Agent is not active");
        require(newScore <= 100, "Trust score cannot exceed 100");
        agents[agentAddress].trustScore = newScore;

        emit ReputationUpdated(agentAddress, newScore);
    }

    function setAgentStatus(address agentAddress, bool active) external onlyOwner {
        require(bytes(agents[agentAddress].name).length > 0, "Agent not registered");
        agents[agentAddress].active = active;

        emit AgentStatusChanged(agentAddress, active);
    }

    function getAgent(address agentAddress) external view returns (
        string memory name,
        string memory metadataUri,
        string memory capability,
        uint8 trustScore,
        bool active
    ) {
        AgentProfile memory profile = agents[agentAddress];
        return (profile.name, profile.metadataUri, profile.capability, profile.trustScore, profile.active);
    }

    function isAgentActive(address agentAddress) external view returns (bool) {
        return agents[agentAddress].active;
    }
}
