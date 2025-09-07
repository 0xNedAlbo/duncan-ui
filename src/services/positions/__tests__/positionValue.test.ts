import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculatePositionValue } from "@/lib/utils/uniswap-v3/liquidity";
import { priceToTick, tickToPrice } from "@/lib/utils/uniswap-v3/price";

describe("Position Value Calculation", () => {
    it("should calculate position value correctly for WETH/USDC", async () => {
        // Test data from our database position
        const liquidity = BigInt("13402252572561950");
        const tickLower = -193420;
        const tickUpper = -191820;
        const currentTick = -192702;
        
        // WETH/USDC pool data
        const baseTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH
        const quoteTokenAddress = "0xA0b86a33E6827E2c65A00000000000000000000000"; // USDC
        const baseTokenDecimals = 18;
        const quoteTokenDecimals = 6;
        
        // Price from tick
        const currentPrice = tickToPrice(
            currentTick,
            baseTokenAddress,
            quoteTokenAddress,
            baseTokenDecimals
        );
        
        console.log("Current price from tick:", currentPrice.toString());
        
        // Base token is token0 (WETH address < USDC address)
        const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);
        
        // Calculate position value
        const positionValue = calculatePositionValue(
            liquidity,
            currentTick,
            tickLower,
            tickUpper,
            currentPrice,
            baseIsToken0,
            baseTokenDecimals
        );
        
        console.log("Position value (raw):", positionValue.toString());
        
        // Convert to human readable
        const valueInQuoteDecimals = Number(positionValue) / (10 ** quoteTokenDecimals);
        console.log("Position value (USDC):", valueInQuoteDecimals.toFixed(6));
        
        // Should be reasonable value (few thousand USDC for this liquidity amount)
        expect(valueInQuoteDecimals).toBeGreaterThan(0);
        expect(valueInQuoteDecimals).toBeLessThan(100000); // Sanity check
    });
    
    it("should handle price conversion correctly", () => {
        const tick = -192702;
        const baseTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH  
        const quoteTokenAddress = "0xA0b86a33E6827E2c65A00000000000000000000000"; // USDC
        const baseTokenDecimals = 18;
        
        // Convert tick to price
        const price = tickToPrice(tick, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
        console.log("Price from tick -192702:", price.toString());
        
        // Should be around 4280 USDC per WETH (from our DB)
        const priceDecimal = Number(price) / (10 ** 6); // USDC has 6 decimals
        console.log("Price in human terms:", priceDecimal);
        
        expect(priceDecimal).toBeGreaterThan(4000);
        expect(priceDecimal).toBeLessThan(5000);
    });
});