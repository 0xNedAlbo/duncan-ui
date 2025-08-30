import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import nonfungiblePositionManagerAbi from "@/abis/nonfungiblePositionManager.abi.json";

import { Abi } from "viem";

export default defineConfig({
    out: "src/generated/wagmi.ts",
    contracts: [
        {
            address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
            name: "NonfungiblePositionManager",
            abi: nonfungiblePositionManagerAbi as Abi,
        },
    ],
    plugins: [react()],
});
