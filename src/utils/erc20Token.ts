import { EvmAddress } from "./evmAddress";

export type Erc20Token = {
    address: EvmAddress;
    name: string;
    symbol: string;
    decimals: number;
};
