export function mulDiv(a: bigint, b: bigint, d: bigint): bigint {
    // Exact 256-bit style mulDiv with flooring (fits JS BigInt as it's arbitrary precision)
    return (a * b) / d;
}
