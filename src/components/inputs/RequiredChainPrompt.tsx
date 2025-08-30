import { CHAIN_SLUGS } from "@/utils/constants";
import { Box, Button, Grid } from "@mui/material";
import { useParams } from "next/navigation";
import { ReactElement, ReactNode, useEffect } from "react";
import { useAccount, useChains, useSwitchChain } from "wagmi";
import { Section } from "../common/Section";

export type RequiredChainPromptProps = {
    requiredChainId: number;
    onChainConnected?: (connected: boolean) => void;
    heading?: string;
};

export function RequiredChainPrompt(props: RequiredChainPromptProps) {
    const { isConnected, chainId } = useAccount();

    const chains = useChains();
    const { switchChain } = useSwitchChain();

    const requiredChainId = props.requiredChainId;
    const requiredChainName = chains.find(
        (chain) => chain.id == requiredChainId
    )?.name;

    const heading =
        props.heading ?? "You are connected to the wrong network...";
    useEffect(() => {
        if (chainId === undefined || requiredChainId === undefined)
            props.onChainConnected?.(false);
        if (chainId != requiredChainId) props.onChainConnected?.(false);
        else props.onChainConnected?.(true);
    }, [chainId, requiredChainId]);

    function switchNetwork() {
        if (requiredChainId) {
            switchChain({ chainId: requiredChainId as any });
        }
    }

    return (
        isConnected &&
        chainId &&
        requiredChainId &&
        requiredChainId != chainId && (
            <Grid container mt={"1em"} marginTop={"3em"}>
                <Grid item xs={3}></Grid>
                <Grid item xs={6} textAlign={"center"}>
                    <Section heading={heading}>
                        <Box textAlign={"center"}>
                            <Button variant="contained" onClick={switchNetwork}>
                                Switch to {requiredChainName}
                            </Button>
                        </Box>
                    </Section>
                </Grid>
                <Grid item xs={3}></Grid>
            </Grid>
        )
    );
}
