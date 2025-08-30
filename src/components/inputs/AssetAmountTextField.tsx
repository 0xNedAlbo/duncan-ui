import {
    Button,
    FormControl,
    InputAdornment,
    InputLabel,
    OutlinedInput,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";

export type AssetAmountTextFieldProps = {
    symbol: string;
    label: string;
    disabled?: boolean;
    decimals?: number;
    defaultValue?: any;
    maxValue?: any;
    textFieldId?: string;
    onChange?: (newValue: any | null) => void;
};

export function AssetAmountTextField({
    decimals,
    defaultValue,
    disabled,
    label,
    maxValue,
    onChange,
    symbol,
    textFieldId,
}: AssetAmountTextFieldProps) {
    const [value, setValue] = useState<string>(
        defaultValue ? formatValue(defaultValue) : "0"
    );

    const id = useMemo(() => {
        if (textFieldId && textFieldId.length > 0) return textFieldId;
        return "asset-amount-input-field-" + Math.floor(Math.random() * 1000);
    }, [textFieldId]);

    useEffect(() => {
        onChange?.(parseValue(value, decimals));
    }, [value, decimals, onChange]);

    function onValueChange(newValue: string) {
        setValue(newValue);
    }

    function onMaxButtonClick() {
        if (maxValue) setValue(formatValue(maxValue, decimals));
    }

    return (
        <FormControl fullWidth>
            <InputLabel htmlFor={id}>{label}</InputLabel>
            <OutlinedInput
                id={id}
                size="small"
                label={label}
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                color={!!parseValue(value) ? "info" : "error"}
                disabled={!!disabled}
                endAdornment={
                    <InputAdornment position="end">
                        <>
                            {maxValue && (
                                <Button
                                    variant="text"
                                    size="small"
                                    disableRipple
                                    disabled={!!disabled}
                                    onClick={onMaxButtonClick}
                                >
                                    Max
                                </Button>
                            )}
                            {symbol}
                        </>
                    </InputAdornment>
                }
            ></OutlinedInput>
        </FormControl>
    );
}

function formatValue(value?: any | null, decimals?: number): string {
    return formatUnits(value ?? "0", decimals ?? 18);
}

function parseValue(value: string, decimals?: number): bigint | null {
    try {
        return parseUnits(value, decimals ?? 18);
    } catch (e) {
        return null;
    }
}
