import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import factoryAbi from "@/abis/uniswapv3/factory.abi.json";
import nonfungiblePositionManagerAbi from "@/abis/nonfungiblePositionManager.abi.json";
import poolAbi from "@/abis/uniswapv3/pool.abi.json";

import { Abi } from "viem";

export default defineConfig({
    out: "src/generated/wagmi.ts",
    contracts: [
        {
            address: { 42161: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
            name: "UniswapV3Factory",
            abi: factoryAbi as Abi,
        },
        {
            address: { 42161: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88" },
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
