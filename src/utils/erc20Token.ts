import { EvmAddress } from "./evmAddress";

export type Erc20Token = {
    chainId: number;
    address: EvmAddress;
    name: string;
    symbol: string;
    decimals: number;
};
