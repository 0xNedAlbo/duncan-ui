import { EvmBlockchain, EvmBlockchainList } from "@/utils/evmBlockchain";
import { CheckCircle } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";

export type EvmBlockchainSelectProps = {
    onChange?: (newChain: EvmBlockchain | undefined) => void;
    chains: EvmBlockchainList;
    selectedChain?: EvmBlockchain;
};

export function EvmBlockchainSelect(props?: EvmBlockchainSelectProps) {
    function onSelect(newChain: EvmBlockchain | undefined) {
        props?.onChange?.(newChain);
    }

    return (
        <Stack
            direction="row"
            spacing={3}
            justifyContent="center"
            flexWrap="wrap"
        >
            {props &&
                props.chains.map((c) => (
                    <Button
                        key={c.id}
                        variant="outlined"
                        startIcon={
                            c.id === props?.selectedChain?.id ? (
                                <CheckCircle />
                            ) : undefined
                        }
                        onClick={() => onSelect(c)}
                        sx={{ borderRadius: "16px" }}
                    >
                        {c.name}
                    </Button>
                ))}
        </Stack>
    );
}
