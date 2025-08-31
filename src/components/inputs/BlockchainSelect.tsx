import {
    FormControl,
    MenuItem,
    Select,
    SelectChangeEvent,
} from "@mui/material";
import { useState } from "react";

export type BlockchainSelectProps = {
    onChange?: (newChainId: number | undefined) => void;
    chains: { id: number; name: string }[];
};

export function BlockchainSelect(props: BlockchainSelectProps) {
    const [chainId, setChainId] = useState<number | undefined>();

    function onChange(event: SelectChangeEvent) {
        const newChainId = parseInt(event.target.value);
        setChainId(newChainId);
        if (props.onChange) props.onChange(newChainId);
    }

    return (
        <FormControl>
            <Select
                value={chainId ? chainId + "" : ""}
                onChange={onChange}
                displayEmpty
                renderValue={(value) =>
                    chainId ? (
                        <>
                            {
                                props.chains.find(
                                    (chain) => chain.id === parseInt(value)
                                )?.name
                            }
                        </>
                    ) : (
                        <i>-------</i>
                    )
                }
            >
                {props.chains.map((chain) => (
                    <MenuItem value={chain.id}>{chain.name}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
