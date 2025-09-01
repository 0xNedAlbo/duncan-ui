import { Box, Typography } from "@mui/material";
import { EvmBlockchain, evmChainlist } from "@/utils/evmBlockchain";
import { EvmBlockchainSelect } from "@/components/inputs/EvmBlockchainSelect";

export type BlockchainStepProps = {
    onBlockchainChange: (newChain: EvmBlockchain | undefined) => void;
    selectedChain?: EvmBlockchain;
};

export function BlockchainStep(props: BlockchainStepProps) {
    const chains = evmChainlist;

    return (
        <Box display="flex" justifyContent="center">
            <Box maxWidth="600px" textAlign="left" width="100%">
                <Typography
                    marginBottom="1em"
                    variant="subtitle1"
                    color={"text.primary"}
                >
                    On which blockchain do you want to manage your liquidity
                    position?
                </Typography>
                <Box textAlign="center">
                    <EvmBlockchainSelect
                        chains={chains}
                        onChange={props.onBlockchainChange}
                        selectedChain={props.selectedChain}
                    />
                </Box>
            </Box>
        </Box>
    );
}
