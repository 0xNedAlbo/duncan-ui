import { useMemo } from "react";
import { compareAddresses } from "@/lib/utils/evm";

export interface TokenPairValidation {
    isValid: boolean;
    error?: string;
    canProceed: boolean;
    warnings?: string[];
}

export interface TokenLike {
    address: string;
    symbol?: string;
    name?: string;
}

/**
 * Hook to validate token pairs in real-time
 * Prevents users from selecting the same token for base and quote
 */
export function useTokenPairValidation(
    baseToken: TokenLike | null,
    quoteToken: TokenLike | null
): TokenPairValidation {
    return useMemo(() => {
        // Both tokens must be present to validate
        if (!baseToken || !quoteToken) {
            return {
                isValid: false,
                canProceed: false,
            };
        }

        // Check if tokens are the same by address
        try {
            const addressComparison = compareAddresses(baseToken.address, quoteToken.address);

            if (addressComparison === 0) {
                // Same token selected for both base and quote
                return {
                    isValid: false,
                    error: "Base and quote tokens must be different",
                    canProceed: false,
                };
            }

            // Additional warnings (not blocking)
            const warnings: string[] = [];

            // Check if symbols are suspiciously similar
            if (
                baseToken.symbol &&
                quoteToken.symbol &&
                baseToken.symbol.toLowerCase() === quoteToken.symbol.toLowerCase()
            ) {
                warnings.push(
                    "Both tokens have the same symbol. Please verify you selected the correct tokens."
                );
            }

            // Valid pair
            return {
                isValid: true,
                canProceed: true,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        } catch {
            // Address comparison failed - likely invalid addresses
            return {
                isValid: false,
                error: "Invalid token addresses",
                canProceed: false,
            };
        }
    }, [baseToken, quoteToken]);
}

/**
 * Simple validation function for use outside of React components
 */
export function validateTokenPair(
    baseToken: TokenLike | null,
    quoteToken: TokenLike | null
): TokenPairValidation {
    if (!baseToken || !quoteToken) {
        return {
            isValid: false,
            canProceed: false,
        };
    }

    try {
        const addressComparison = compareAddresses(baseToken.address, quoteToken.address);

        if (addressComparison === 0) {
            return {
                isValid: false,
                error: "Base and quote tokens must be different",
                canProceed: false,
            };
        }

        return {
            isValid: true,
            canProceed: true,
        };
    } catch {
        return {
            isValid: false,
            error: "Invalid token addresses",
            canProceed: false,
        };
    }
}

/**
 * Check if a token would conflict with an existing selection
 * Useful for preventing selection of conflicting tokens
 */
export function wouldTokenConflict(
    candidateToken: TokenLike,
    existingToken: TokenLike | null
): boolean {
    if (!existingToken) {
        return false;
    }

    try {
        return compareAddresses(candidateToken.address, existingToken.address) === 0;
    } catch {
        return false;
    }
}

/**
 * Get validation message for display
 */
export function getValidationMessage(validation: TokenPairValidation): string | null {
    if (validation.error) {
        return validation.error;
    }

    if (validation.warnings && validation.warnings.length > 0) {
        return validation.warnings[0]; // Show first warning
    }

    return null;
}

/**
 * Get validation state for styling purposes
 */
export function getValidationState(
    validation: TokenPairValidation
): 'valid' | 'invalid' | 'warning' | 'neutral' {
    if (validation.error) {
        return 'invalid';
    }

    if (validation.warnings && validation.warnings.length > 0) {
        return 'warning';
    }

    if (validation.isValid && validation.canProceed) {
        return 'valid';
    }

    return 'neutral';
}