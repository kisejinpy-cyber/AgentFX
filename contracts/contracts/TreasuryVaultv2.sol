// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function balanceOf(address account) external view returns (uint256);
    function asset() external view returns (address);
}

/**
 * @title TreasuryVaultv2
 * @dev An upgraded enterprise vault that holds idle USDC and automatically routes 
 * excess capital into an ERC-4626 yield-bearing vault (e.g. USYC on Arc).
 */
contract TreasuryVaultv2 {
    IERC20 public immutable usdc;
    address public owner;
    address public agent; // Authorized AI node for triggering sweeps

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event SweptToYield(address indexed yieldVault, uint256 assetsDeposited, uint256 sharesReceived);
    event RedeemedFromYield(address indexed yieldVault, uint256 sharesRedeemed, uint256 assetsReceived);

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
        uint256 currentBalance = usdc.balanceOf(address(this));
        if (currentBalance < amount) {
            revert("Insufficient liquidity, withdraw from yield first");
        }
        require(usdc.transfer(to, amount), "Transfer failed");
        emit Withdrawn(to, amount);
    }

    /**
     * @dev Sweep excess idle USDC above a threshold into an ERC-4626 yield-bearing vault (e.g., USYC)
     */
    function sweepExcessToYield(uint256 threshold, address yieldVault) external onlyOwnerOrAgent {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > threshold, "Balance below threshold");
        
        uint256 excess = balance - threshold;
        require(usdc.approve(yieldVault, excess), "Approve failed");
        
        uint256 shares = IERC4626(yieldVault).deposit(excess, address(this));
        require(shares > 0, "Zero shares minted");
        
        emit SweptToYield(yieldVault, excess, shares);
    }

    /**
     * @dev Redeems shares from the USYC ERC-4626 vault back to USDC
     */
    function redeemFromYield(uint256 shares, address yieldVault) external onlyOwnerOrAgent {
        uint256 assets = IERC4626(yieldVault).redeem(shares, address(this), address(this));
        require(assets > 0, "Zero assets redeemed");
        
        emit RedeemedFromYield(yieldVault, shares, assets);
    }

    /**
     * @dev Set the authorized AI agent
     */
    function setAgent(address _agent) external {
        require(msg.sender == owner, "Only owner");
        agent = _agent;
    }
}
