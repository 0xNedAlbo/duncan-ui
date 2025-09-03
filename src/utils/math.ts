// Generic Fraction type
export type Fraction<
    N extends number | bigint = bigint,
    D extends number | bigint = bigint,
> = {
    num: N;
    den: D;
};

export function mulDiv(a: bigint, b: bigint, d: bigint): bigint {
    // Exact 256-bit style mulDiv with flooring (fits JS BigInt as it's arbitrary precision)
    return (a * b) / d;
}
