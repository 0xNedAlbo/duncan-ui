import { Section } from "@/components/common/Section";
import { Erc20Token } from "@/utils/erc20Token";
import { CheckCircle } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useChains } from "wagmi";
import { tokenList, quoteTokenSymbols } from "@/utils/tokenLists";

export function PositionLoaderByPool() {
    const chains = useChains();
    const [baseTokenList, setBaseTokenList] = useState<
        Erc20Token[] | undefined
    >();
    const [quoteTokenList, setQuoteTokenList] = useState<
        Erc20Token[] | undefined
    >();
    const [baseToken, setBaseToken] = useState<Erc20Token | undefined>();
    const [quoteToken, setQuoteToken] = useState<Erc20Token | undefined>();
    const [chainId, setChainId] = useState<number | undefined>();

    function onBlockchainSelect(newChainId: number | undefined) {
        if (newChainId !== chainId) {
            setQuoteToken(undefined);
            setBaseToken(undefined);
        }
        setChainId(newChainId);
    }

    useEffect(() => {
        if (!chainId) {
            setQuoteToken(undefined);
        } else {
            const qTokens = tokenList[chainId]
                .filter((token) =>
                    quoteTokenSymbols.find((symbol) => symbol === token.symbol)
                )
                .sort((tokenA, tokenB) =>
                    tokenA.symbol.localeCompare(tokenB.symbol)
                );
            const bTokens = tokenList[chainId]
                .filter(
                    (token) =>
                        !quoteTokenSymbols.find(
                            (symbol) => symbol === token.symbol
                        )
                )
                .sort((tokenA, tokenB) =>
                    tokenA.symbol.localeCompare(tokenB.symbol)
                );
            setQuoteTokenList(qTokens);
            setBaseTokenList(bTokens);
        }
    }, [chainId]);

    function onQuoteTokenSelect(newQuoteToken: Erc20Token) {
        setQuoteToken(newQuoteToken);
    }
    function onBaseTokenSelect(newBaseToken: Erc20Token) {
        setBaseToken(newBaseToken);
    }

    return (
        <Section heading="Simulate Position">
            <Stack direction="column" spacing={4}>
                <Box display="flex" justifyContent="center">
                    <Box maxWidth="600px" textAlign="left" width="100%">
                        <Typography
                            marginBottom="1em"
                            variant="subtitle1"
                            color={"text.primary"}
                        >
                            On which blockchain do you want to manage your
                            liquidity position?
                        </Typography>
                        <Box textAlign="center">
                            <Stack
                                direction="row"
                                spacing={3}
                                justifyContent="center"
                                flexWrap="wrap"
                            >
                                {chains.map((chain) => (
                                    <Button
                                        key={chain.id}
                                        variant="outlined"
                                        startIcon={
                                            chain.id === chainId ? (
                                                <CheckCircle />
                                            ) : undefined
                                        }
                                        onClick={() =>
                                            onBlockchainSelect(chain.id)
                                        }
                                        sx={{ borderRadius: "16px" }}
                                    >
                                        {chain.name}
                                    </Button>
                                ))}
                            </Stack>
                        </Box>
                    </Box>
                </Box>{" "}
                {chainId && (
                    <Box display="flex" justifyContent="center">
                        <Box maxWidth="600px" textAlign="left">
                            <Typography
                                variant="subtitle1"
                                color={"text.primary"}
                                marginBottom="1em"
                            >
                                Please select a Quote Token for your liquidity
                                position.
                            </Typography>
                            <Box textAlign="center" marginBottom={"1em"}>
                                <Stack
                                    direction="row"
                                    spacing={3}
                                    justifyContent="center"
                                    flexWrap="wrap"
                                >
                                    {quoteTokenList &&
                                        quoteTokenList.map((token) => (
                                            <Button
                                                key={token.address}
                                                variant="outlined"
                                                startIcon={
                                                    token.address ===
                                                    quoteToken?.address ? (
                                                        <CheckCircle />
                                                    ) : undefined
                                                }
                                                onClick={() =>
                                                    onQuoteTokenSelect(token)
                                                }
                                                sx={{ borderRadius: "16px" }}
                                            >
                                                {token.symbol}
                                            </Button>
                                        ))}
                                </Stack>
                            </Box>

                            <Typography
                                variant="inherit"
                                fontSize={"0.875rem"}
                                marginBottom="1em"
                                textAlign={"justify"}
                            >
                                <i>
                                    The quote token represents the asset in
                                    which the value of the base token is
                                    expressed. In most trading pairs, the quote
                                    token is a stablecoin — for example, in the
                                    pair WETH/USDC, the quote token is USDC, and
                                    sometimes it could also be USDT.
                                </i>
                            </Typography>
                        </Box>
                    </Box>
                )}
                {chainId && quoteToken && (
                    <Box display="flex" justifyContent="center">
                        <Box maxWidth="600px" textAlign="left">
                            <Typography
                                variant="subtitle1"
                                color={"text.primary"}
                                marginBottom="1em"
                            >
                                Please select a Base Token for your liquidity
                                position.
                            </Typography>
                            <Box textAlign="center" marginBottom={"1em"}>
                                <Stack
                                    direction="row"
                                    spacing={3}
                                    justifyContent="center"
                                    flexWrap="wrap"
                                >
                                    {baseTokenList &&
                                        baseTokenList.map((token) => (
                                            <Button
                                                key={token.address}
                                                variant="outlined"
                                                startIcon={
                                                    token.address ===
                                                    baseToken?.address ? (
                                                        <CheckCircle />
                                                    ) : undefined
                                                }
                                                onClick={() =>
                                                    onBaseTokenSelect(token)
                                                }
                                                sx={{ borderRadius: "16px" }}
                                            >
                                                {token.symbol}
                                            </Button>
                                        ))}
                                </Stack>
                            </Box>

                            <Typography
                                variant="inherit"
                                fontSize={"0.875rem"}
                                marginBottom="1em"
                                textAlign={"justify"}
                            >
                                <i>
                                    The quote token represents the asset in
                                    which the value of the base token is
                                    expressed. In most trading pairs, the quote
                                    token is a stablecoin — for example, in the
                                    pair WETH/USDC, the quote token is USDC, and
                                    sometimes it could also be USDT.
                                </i>
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Stack>
        </Section>
    );
}
