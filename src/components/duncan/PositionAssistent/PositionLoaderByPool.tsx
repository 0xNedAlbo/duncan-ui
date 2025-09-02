import { Section } from "@/components/common/Section";
import { Erc20Token } from "@/utils/erc20Token";
import { Stack, Grid, Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
    baseTokensForChain,
    defaultTokensByChain,
    findTokenInList,
    quoteTokensForChain,
} from "@/utils/erc20TokenLists";
import { EvmBlockchain, wrappedEthForChain } from "@/utils/evmBlockchain";
import { BlockchainStep } from "./byPool/BlockchainStep";
import { QuoteTokenStep } from "./byPool/QuoteTokenStep";
import { BaseTokenStep } from "./byPool/BaseTokenStep";
import { PoolStep } from "./byPool/PoolStep";
import { PriceRangeStep } from "./byPool/PriceRangeStep";
import { PositionStepper } from "./byPool/PositionStepper";
import { UniswapV3Pool } from "@/utils/uniswapV3/uniswapV3Pool";
import { useFindUniswapV3Pools } from "@/hooks/uniswapv3/useFindUniswapV3Pools";
import { sameAddress } from "@/utils/evmAddress";

export function PositionLoaderByPool() {
    const [baseTokenList, setBaseTokenList] = useState<
        Erc20Token[] | undefined
    >();
    const [quoteTokenList, setQuoteTokenList] = useState<
        Erc20Token[] | undefined
    >();
    const [chain, setChain] = useState<EvmBlockchain | undefined>();
    const [wrappedEth, setWrappedEth] = useState<Erc20Token | undefined>();
    const [baseToken, setBaseToken] = useState<Erc20Token | undefined>();
    const [quoteToken, setQuoteToken] = useState<Erc20Token | undefined>();
    const [pool, setPool] = useState<UniswapV3Pool | undefined>();
    const [priceRange, setPriceRange] = useState<{
        min?: number;
        max?: number;
    }>({});

    const {
        pools,
        isLoading: loadingPools,
        error: poolsError,
    } = useFindUniswapV3Pools({
        chainId: chain?.id,
        quoteToken: quoteToken,
        baseToken: baseToken,
    });

    // Stepper state and logic

    const getActiveStep = () => {
        if (!chain) return 0;
        if (!quoteToken) return 1;
        if (!baseToken) return 2;
        if (!pool) return 3;
        if (!priceRange.min || !priceRange.max) return 4;
        return 5; // All steps completed
    };

    function onBlockchainChange(newChain: EvmBlockchain | undefined) {
        if (!newChain || newChain.id !== chain?.id) {
            setQuoteToken(undefined);
            setBaseToken(undefined);
            setPool(undefined);
            setPriceRange({});
        }
        setChain(newChain);
    }

    useEffect(() => {
        if (!chain) {
            setQuoteToken(undefined);
            setBaseToken(undefined);
            setPool(undefined);
            setWrappedEth(undefined);
            setPriceRange({});
            return;
        }

        let qTokens = quoteTokensForChain(chain.id).sort((tokenA, tokenB) =>
            tokenA.symbol.localeCompare(tokenB.symbol)
        );
        const wrappedEth = findTokenInList(
            defaultTokensByChain(chain.id),
            wrappedEthForChain(chain.id)
        );
        const d = wrappedEthForChain(chain.id);
        setWrappedEth(wrappedEth);

        const bTokens = baseTokensForChain(chain.id).sort((tokenA, tokenB) =>
            tokenA.symbol.localeCompare(tokenB.symbol)
        );
        setQuoteTokenList(qTokens.concat(wrappedEth));
        setBaseTokenList(bTokens);
    }, [chain]);

    // Reset pool and price range when dependencies change
    useEffect(() => {
        setPool(undefined);
        setPriceRange({});
    }, [chain, quoteToken, baseToken]);

    useEffect(() => {
        if (
            quoteToken &&
            wrappedEth &&
            sameAddress(quoteToken.address, wrappedEth.address)
        ) {
            setBaseTokenList(
                baseTokenList?.filter(
                    (token) => !sameAddress(token.address, wrappedEth.address)
                )
            );
        }
    }, [quoteToken, wrappedEth]);

    function onQuoteTokenChange(newQuoteToken: Erc20Token) {
        setQuoteToken(newQuoteToken);
        setPool(undefined); // Reset pool when quote token changes
        setPriceRange({}); // Reset price range when quote token changes
    }
    function onBaseTokenChange(newBaseToken: Erc20Token) {
        setBaseToken(newBaseToken);
        setPool(undefined); // Reset pool when base token changes
        setPriceRange({}); // Reset price range when base token changes
    }

    // Reset functions for stepper navigation
    const resetToStep = (stepIndex: number) => {
        switch (stepIndex) {
            case 0:
                setChain(undefined);
            case 1:
                setQuoteToken(undefined);
            case 2:
                setBaseToken(undefined);
            case 3:
                setPool(undefined);
            case 4:
                setPriceRange({});
        }
    };

    return (
        <Section heading="Simulate Liquidity Position">
            <Grid container spacing={4}>
                {/* Stepper on the left side */}
                <Grid item xs={12} md={3}>
                    <PositionStepper
                        activeStep={getActiveStep()}
                        onResetToStep={resetToStep}
                        selectedChain={chain}
                        selectedQuoteToken={quoteToken}
                        selectedBaseToken={baseToken}
                        selectedPool={pool}
                        selectedPriceRange={priceRange}
                    />
                </Grid>

                {/* Main content on the right side */}
                <Grid item xs={12} md={9}>
                    <Stack direction="column" spacing={4}>
                        {getActiveStep() === 0 && (
                            <BlockchainStep
                                onBlockchainChange={onBlockchainChange}
                                selectedChain={chain}
                            />
                        )}

                        {getActiveStep() === 1 && (
                            <QuoteTokenStep
                                tokenList={quoteTokenList}
                                onQuoteTokenChange={onQuoteTokenChange}
                                selectedToken={quoteToken}
                            />
                        )}

                        {getActiveStep() === 2 && (
                            <BaseTokenStep
                                tokenList={baseTokenList}
                                onBaseTokenChange={onBaseTokenChange}
                                selectedToken={baseToken}
                            />
                        )}

                        {getActiveStep() === 3 && (
                            <PoolStep
                                chain={chain}
                                quoteToken={quoteToken}
                                baseToken={baseToken}
                                isLoading={loadingPools}
                                pools={pools}
                                error={poolsError}
                                onPoolSelect={setPool}
                                selectedPool={pool}
                            />
                        )}

                        {getActiveStep() === 4 && (
                            <PriceRangeStep
                                chain={chain}
                                quoteToken={quoteToken}
                                baseToken={baseToken}
                                pool={pool}
                                priceRange={priceRange}
                                onPriceRangeChange={setPriceRange}
                            />
                        )}

                        {getActiveStep() === 5 && (
                            <Box display="flex" justifyContent="center">
                                <Box maxWidth="600px" textAlign="center">
                                    <Typography
                                        variant="h6"
                                        color="success.main"
                                        marginBottom="1em"
                                    >
                                        ✅ All Steps Completed!
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        color="text.secondary"
                                        marginBottom="1em"
                                    >
                                        You have successfully selected:
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        marginBottom="0.5em"
                                    >
                                        <strong>Blockchain:</strong>{" "}
                                        {chain?.name}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        marginBottom="0.5em"
                                    >
                                        <strong>Quote Token:</strong>{" "}
                                        {quoteToken?.symbol}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        marginBottom="0.5em"
                                    >
                                        <strong>Base Token:</strong>{" "}
                                        {baseToken?.symbol}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        marginBottom="0.5em"
                                    >
                                        <strong>Pool:</strong>{" "}
                                        {pool
                                            ? `${pool.baseToken.symbol}/${pool.quoteToken.symbol} ${(pool.fee / 10000).toFixed(2)}%`
                                            : "Not selected"}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        marginBottom="1em"
                                    >
                                        <strong>Price Range:</strong>{" "}
                                        {priceRange.min && priceRange.max
                                            ? `${priceRange.min} - ${priceRange.max} ${quoteToken?.symbol} per ${baseToken?.symbol}`
                                            : "Not set"}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        You can use the stepper on the left to
                                        modify any selection.
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        </Section>
    );
}
