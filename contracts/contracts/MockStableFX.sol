// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IStableFX.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MockStableFX is IStableFX {
    uint256 public constant exchangeRate = 920000; // 1 USDC = 0.92 EURC (6 decimals)
    uint256 public constant exchangePrecision = 1000000;

    address public eurc;

    constructor(address _eurc) {
        eurc = _eurc;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external override returns (uint256 amountOut) {
        require(tokenOut == eurc, "Only support swap to EURC for mock");
        
        // Take tokenIn (USDC) from sender
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "USDC transfer failed");

        // Calculate EURC amount out
        amountOut = (amountIn * exchangeRate) / exchangePrecision;
        require(amountOut >= minAmountOut, "Slippage limit exceeded");

        // Send tokenOut (EURC) to recipient
        require(IERC20(tokenOut).transfer(recipient, amountOut), "EURC transfer failed");

        return amountOut;
    }

    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        require(tokenOut == eurc, "Only EURC quotes supported");
        amountOut = (amountIn * exchangeRate) / exchangePrecision;
        return amountOut;
    }
}
