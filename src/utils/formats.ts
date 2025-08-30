import { BN_1E } from "./constants";

export type BigIntLike = string | number | bigint | boolean;

export function numberFormat(
    value?: BigIntLike,
    currency?: string,
    precision = 2,
    decimals = 18
): string {
    value = typeof value == "bigint" ? value : BigInt(value ?? 0);
    currency = currency ?? "Unknown";
    let right = (value % BN_1E(decimals)).toString();
    right = right.padStart(decimals, "0").substring(0, 2);
    let left = (value / BN_1E(decimals)).toString();
    const currencyValue = Number.parseFloat(left + "." + right);
    return (
        Intl.NumberFormat("en-US", { minimumFractionDigits: precision }).format(
            currencyValue
        ) +
        " " +
        currency
    );
}
