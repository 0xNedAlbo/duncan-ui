import { Address, getAddress, isAddress } from "viem";

export type EvmAddress = Address;

export function sortEvmAddresses(
    a: EvmAddress,
    b: EvmAddress
): [token0: EvmAddress, token1: EvmAddress] {
    if (!isAddress(a) || !isAddress(b)) throw new Error("Invalid address");
    const A = getAddress(a) as EvmAddress; // checksummed
    const B = getAddress(b) as EvmAddress;
    if (A.toLowerCase() === B.toLowerCase())
        throw new Error("Addresses must differ");

    return BigInt(A) < BigInt(B) ? [A, B] : [B, A];
}

// example:
// const { token0, token1 } = sortTokens("0x82af...bab1" /* WETH */, "0xaf88...e5831" /* USDC */);
