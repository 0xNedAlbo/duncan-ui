import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import factoryAbi from "@/abis/uniswapv3/factory.minimal.abi.json";
import nonfungiblePositionManagerAbi from "@/abis/nonfungiblePositionManager.abi.json";
import poolAbi from "@/abis/uniswapv3/pool.minimal.abi.json";

import { Abi } from "viem";

export default defineConfig({
    out: "src/generated/wagmi.ts",
    contracts: [
        {
            address: {
                1: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Ethereum
                42161: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Arbitrum
                8453: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD", // Base
            },
            name: "UniswapV3Factory",
            abi: factoryAbi as Abi,
        },
        {
            address: {
                1: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Ethereum
                42161: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Arbitrum
                8453: "0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1", // Base
            },
            name: "NonfungiblePositionManager",
            abi: nonfungiblePositionManagerAbi as Abi,
        },
        {
            name: "Pool",
            abi: poolAbi as Abi,
        },
    ],

    plugins: [react()],
});
