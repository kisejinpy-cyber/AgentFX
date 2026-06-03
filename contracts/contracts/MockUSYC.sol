// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MockUSYC {
    string public name = "Anemoy Yield USYC";
    string public symbol = "USYC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    IERC20 public immutable asset;

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(asset.transferFrom(msg.sender, address(this), assets), "Transfer failed");
        shares = assets; // 1-to-1 exchange rate for testing simplicity
        balanceOf[receiver] += shares;
        totalSupply += shares;
        emit Transfer(address(0), receiver, shares);
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(balanceOf[owner] >= shares, "Insufficient shares");
        balanceOf[owner] -= shares;
        totalSupply -= shares;
        
        assets = shares; // 1-to-1 exchange rate
        require(asset.transfer(receiver, assets), "Transfer failed");
        
        emit Transfer(owner, address(0), shares);
        return assets;
    }
}
