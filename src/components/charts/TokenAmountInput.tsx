"use client";

import { useState, useEffect, useCallback } from "react";
import { DollarSign } from "lucide-react";
import { formatCompactValue } from "@/lib/utils/fraction-format";

interface TokenAmountInputProps {
    value: bigint; // Total quote value in quote token decimals
    quoteTokenSymbol: string;
    quoteTokenDecimals: number;
    onChange: (value: bigint) => void;
    min?: bigint;
    max?: bigint;
    className?: string;
}

export function TokenAmountInput({
    value,
    quoteTokenSymbol,
    quoteTokenDecimals,
    onChange,
    min = 0n,
    max,
    className = "",
}: TokenAmountInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    // Convert BigInt to display string
    const bigintToDisplayString = useCallback((bigintValue: bigint): string => {
        if (bigintValue === 0n) return "";

        const divisor = 10n ** BigInt(quoteTokenDecimals);
        const wholePart = bigintValue / divisor;
        const fractionPart = bigintValue % divisor;

        if (fractionPart === 0n) {
            return wholePart.toString();
        }

        // Convert fraction to string with proper decimals
        const fractionStr = fractionPart.toString().padStart(quoteTokenDecimals, '0');
        const trimmedFraction = fractionStr.replace(/0+$/, '');

        return `${wholePart.toString()}${trimmedFraction ? '.' + trimmedFraction : ''}`;
    }, [quoteTokenDecimals]);

    // Convert display string to BigInt
    const displayStringToBigint = useCallback((displayString: string): bigint => {
        if (!displayString.trim()) return 0n;

        try {
            const [wholePart = "0", fractionPart = ""] = displayString.split(".");
            const wholeValue = BigInt(wholePart || "0");

            if (!fractionPart) {
                return wholeValue * (10n ** BigInt(quoteTokenDecimals));
            }

            // Pad or trim fraction to match token decimals
            const paddedFraction = fractionPart.padEnd(quoteTokenDecimals, '0').slice(0, quoteTokenDecimals);
            const fractionValue = BigInt(paddedFraction);

            return wholeValue * (10n ** BigInt(quoteTokenDecimals)) + fractionValue;
        } catch {
            console.warn("Invalid number format:", displayString);
            return 0n;
        }
    }, [quoteTokenDecimals]);

    // Update input value when prop changes (but not when user is typing)
    useEffect(() => {
        if (!isFocused) {
            setInputValue(bigintToDisplayString(value));
        }
    }, [value, isFocused, bigintToDisplayString]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Allow empty input
        if (newValue === "") {
            setInputValue("");
            onChange(0n);
            return;
        }

        // Basic number validation (allow digits, single decimal point)
        const validNumberRegex = /^\d*\.?\d*$/;
        if (!validNumberRegex.test(newValue)) {
            return; // Don't update if invalid
        }

        setInputValue(newValue);

        const bigintValue = displayStringToBigint(newValue);

        // Apply min/max constraints
        let constrainedValue = bigintValue;
        if (constrainedValue < min) constrainedValue = min;
        if (max && constrainedValue > max) constrainedValue = max;

        onChange(constrainedValue);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Re-format the display value on blur
        setInputValue(bigintToDisplayString(displayStringToBigint(inputValue)));
    };

    // Quick amount buttons
    const quickAmounts = [100n, 1000n, 5000n, 10000n].map(amount =>
        amount * (10n ** BigInt(quoteTokenDecimals))
    );

    return (
        <div className={`space-y-3 ${className}`}>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Total Investment ({quoteTokenSymbol})
                </label>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-slate-400" />
                    </div>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className="w-full pl-12 pr-20 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder={`0.00 ${quoteTokenSymbol}`}
                    />

                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-sm font-medium">{quoteTokenSymbol}</span>
                    </div>
                </div>

                {/* Current value display */}
                {value > 0n && (
                    <div className="mt-2 text-sm text-slate-400">
                        Current Value: {formatCompactValue(value, quoteTokenDecimals)} {quoteTokenSymbol}
                    </div>
                )}
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-slate-400 self-center mr-2">
                    Quick amounts:
                </span>
                {quickAmounts.map((amount) => (
                    <button
                        key={amount.toString()}
                        onClick={() => {
                            onChange(amount);
                            setInputValue(bigintToDisplayString(amount));
                        }}
                        className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-md transition-colors border border-slate-600"
                    >
                        {formatCompactValue(amount, quoteTokenDecimals)}
                    </button>
                ))}
            </div>
        </div>
    );
}