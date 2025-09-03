import { Box, Typography, Paper, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { EvmBlockchain } from "@/utils/evmBlockchain";
import { Erc20Token } from "@/utils/erc20Token";
import { PoolUtils, UniswapV3Pool } from "@/utils/uniswapV3/uniswapV3Pool";
import { formatHumanWithDecimals } from "@/utils/fractionFormat";
import { useConfig } from "wagmi";
import TickPriceInput from "@/components/inputs/TickPriceInput";
import { TickMath } from "@uniswap/v3-sdk";

export type PriceRangeStepProps = {
    chain?: EvmBlockchain;
    quoteToken?: Erc20Token;
    baseToken?: Erc20Token;
    pool?: UniswapV3Pool;
    priceRange: { min?: bigint; max?: bigint };
    onPriceRangeChange: (priceRange: { min?: bigint; max?: bigint }) => void;
};

export function PriceRangeStep(props: PriceRangeStepProps) {
    const [lowerTick, setLowerTick] = useState<number>(0);
    const [upperTick, setUpperTick] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        if (!props.pool) return;
        const tick = PoolUtils.tickFromPrice(props.pool);
        setLowerTick(
            PoolUtils.tickFromPrice(
                props.pool,
                (props.pool.price * 9000n) / 10000n
            )
        );
        setUpperTick(
            PoolUtils.tickFromPrice(
                props.pool,
                (props.pool.price * 11000n) / 10000n
            )
        );
    }, [props.pool]);

    function handleLowerTickChange(nextTick: number) {
        setLowerTick(nextTick);
        //        props.onPriceRangeChange({ min: nextTick, max: upperTick });
    }
    function handleUpperTickChange(nextTick: number) {
        setUpperTick(nextTick);
        //      props.onPriceRangeChange({ min: lowerTick, max: nextTick });
    }

    function formatPrice(tick: number) {
        if (!props.pool) return "0";
        const price = PoolUtils.priceFromTick(props.pool, tick);
        return formatHumanWithDecimals(price, props.quoteToken?.decimals);
    }

    return (
        <Box display="flex" justifyContent="flex-start">
            <Stack direction="column" spacing={3}>
                <Box maxWidth="600px" textAlign="left">
                    <Typography
                        variant="subtitle1"
                        color="text.primary"
                        marginBottom="1em"
                    >
                        Set Price Range
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        marginBottom="2em"
                    >
                        Define the price range for your liquidity position. The
                        price is expressed in {props.quoteToken?.symbol} per{" "}
                        {props.baseToken?.symbol}.
                    </Typography>

                    {props.pool?.price && (
                        <Paper
                            elevation={1}
                            sx={{
                                padding: 2,
                                marginBottom: 3,
                                backgroundColor: "background.default",
                                border: "1px solid",
                                borderColor: "divider",
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                marginBottom={1}
                            >
                                Current Pool Price
                            </Typography>
                            <Typography
                                variant="h6"
                                color="success.main"
                                component="span"
                            >
                                {formatHumanWithDecimals(
                                    props.pool?.price || 0n,
                                    props.quoteToken?.decimals
                                )}
                            </Typography>
                            <Typography
                                variant="h6"
                                color="inherit"
                                component="span"
                            >
                                {" "}
                                per {props.baseToken?.symbol}
                            </Typography>
                        </Paper>
                    )}
                </Box>
                {props.pool?.tickSpacing && (
                    <Box maxWidth="600px" textAlign="left">
                        <TickPriceInput
                            label="Min Price"
                            tick={lowerTick}
                            onTickChange={setLowerTick}
                            tickSpacing={props.pool?.tickSpacing || 1}
                            minTick={TickMath.MIN_TICK}
                            maxTick={upperTick - props.pool?.tickSpacing}
                            displayValue={formatPrice(lowerTick)}
                        />
                    </Box>
                )}
                {props.pool?.tickSpacing && (
                    <Box maxWidth="600px" textAlign="left">
                        <TickPriceInput
                            label="Max Price"
                            tick={upperTick}
                            onTickChange={setUpperTick}
                            tickSpacing={props.pool?.tickSpacing || 1}
                            minTick={lowerTick + props.pool?.tickSpacing}
                            maxTick={TickMath.MAX_TICK}
                            displayValue={formatPrice(upperTick)}
                        />
                    </Box>
                )}
            </Stack>
        </Box>
    );
}
