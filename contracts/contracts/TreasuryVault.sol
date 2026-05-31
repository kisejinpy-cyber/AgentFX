// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title TreasuryVault
 * @dev An enterprise vault that holds idle USDC and allows the designated AI agent
 * to execute policy engine rules (e.g., sweep excess to yield, scheduled payouts).
 */
contract TreasuryVault {
    IERC20 public immutable usdc;
    address public owner;
    address public agent; // The AI agent authorized to execute sweeps

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event SweptToYield(address indexed targetVault, uint256 amount);

    modifier onlyOwnerOrAgent() {
        require(msg.sender == owner || msg.sender == agent, "Not authorized");
        _;
    }

    constructor(address _usdc, address _agent) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
        agent = _agent;
    }

    /**
     * @dev Deposit idle USDC into the treasury
     */
    function deposit(uint256 amount) external {
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Withdraw from the treasury
     */
    function withdraw(uint256 amount, address to) external onlyOwnerOrAgent {
        require(usdc.transfer(to, amount), "Transfer failed");
        emit Withdrawn(to, amount);
    }

    /**
     * @dev Sweep excess idle USDC above a threshold into a yield-bearing vault (e.g., USYC)
     */
    function sweepExcessToYield(uint256 threshold, address yieldVault) external onlyOwnerOrAgent {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > threshold) {
            uint256 excess = balance - threshold;
            require(usdc.transfer(yieldVault, excess), "Transfer failed");
            emit SweptToYield(yieldVault, excess);
        }
    }

    /**
     * @dev Set the authorized AI agent
     */
    function setAgent(address _agent) external {
        require(msg.sender == owner, "Only owner");
        agent = _agent;
    }
}
