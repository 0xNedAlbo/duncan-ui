import { FormControl, InputLabel, OutlinedInput } from "@mui/material";
import { useMemo, useState } from "react";
import { getAddress } from "viem";

export type AddressTextFieldProps = {
    label: string;
    defaultValue?: string;
    id?: string;
    disabled?: boolean;
    onValueChange?: (newValue: string | null) => void;
};

export function AddressTextField(props: AddressTextFieldProps) {
    const [value, setValue] = useState<string>(props.defaultValue ?? "");

    const id = useMemo(() => {
        if (props.id && props.id.length > 0) return props.id;
        return "asset-amount-input-field-" + Math.floor(Math.random() * 1000);
    }, [props.id]);

    function onValueChange(newValue: string) {
        setValue(newValue);
        props.onValueChange?.(parseValue(newValue));
    }

    function parseValue(input?: string): string | null {
        if (!input) return null;
        try {
            return getAddress(input);
        } catch (e) {
            return null;
        }
    }

    return (
        <FormControl fullWidth>
            <InputLabel htmlFor={id}>{props.label}</InputLabel>
            <OutlinedInput
                id={id}
                size="small"
                label={props.label}
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                color={!!parseValue(value) ? "info" : "error"}
                disabled={!!props.disabled}
            ></OutlinedInput>
        </FormControl>
    );
}
