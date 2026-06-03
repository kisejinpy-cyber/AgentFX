// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStableFX {
    /**
     * @dev Swaps tokenIn for tokenOut on-chain with slippage bounds.
     * @param tokenIn The address of the token being sold.
     * @param tokenOut The address of the token being bought.
     * @param amountIn The amount of tokenIn to swap.
     * @param minAmountOut The minimum acceptable amount of tokenOut.
     * @param recipient The address receiving the output tokenOut.
     * @return amountOut The actual amount of tokenOut received.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut);

    /**
     * @dev Retrieves a quote for the output amount of tokenOut.
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);
}
