import {
    Box,
    Typography,
    TextField,
    Stack,
    Button,
    Paper,
    Chip,
    Link,
} from "@mui/material";
import { useState, useEffect } from "react";
import { EvmBlockchain } from "@/utils/evmBlockchain";
import { Erc20Token } from "@/utils/erc20Token";
import {
    UniswapV3Pool,
    getToken0PriceInToken1,
    getToken1PriceInToken0,
    formatPrice,
} from "@/utils/uniswapV3/uniswapV3Pool";

export type PriceRangeStepProps = {
    chain?: EvmBlockchain;
    quoteToken?: Erc20Token;
    baseToken?: Erc20Token;
    pool?: UniswapV3Pool;
    priceRange: { min?: number; max?: number };
    onPriceRangeChange: (priceRange: { min?: number; max?: number }) => void;
};

export function PriceRangeStep(props: PriceRangeStepProps) {
    const [localMinPrice, setLocalMinPrice] = useState<string>(
        props.priceRange.min?.toString() || ""
    );
    const [localMaxPrice, setLocalMaxPrice] = useState<string>(
        props.priceRange.max?.toString() || ""
    );
    const [errorMessage, setErrorMessage] = useState<string>("");

    const handleMinPriceChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setLocalMinPrice(event.target.value);
        setErrorMessage(""); // Clear error when user starts typing
    };

    const handleMaxPriceChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setLocalMaxPrice(event.target.value);
        setErrorMessage(""); // Clear error when user starts typing
    };

    const handleSubmit = () => {
        const minValue =
            localMinPrice === "" ? undefined : parseFloat(localMinPrice);
        const maxValue =
            localMaxPrice === "" ? undefined : parseFloat(localMaxPrice);

        // Clear previous error
        setErrorMessage("");

        // Basic validation
        if (minValue && maxValue && minValue >= maxValue) {
            setErrorMessage("Minimum price must be less than maximum price");
            return;
        }

        if (minValue && isNaN(minValue)) {
            setErrorMessage("Please enter a valid minimum price");
            return;
        }

        if (maxValue && isNaN(maxValue)) {
            setErrorMessage("Please enter a valid maximum price");
            return;
        }

        // Get price bounds and clamp values if they're outside reasonable range
        const bounds = getPriceBounds();
        let finalMinValue = minValue;
        let finalMaxValue = maxValue;
        let pricesWereClamped = false;

        if (minValue && (minValue < bounds.min || minValue > bounds.max)) {
            finalMinValue = clampPrice(minValue, bounds);
            setLocalMinPrice(finalMinValue.toFixed(6));
            pricesWereClamped = true;
        }

        if (maxValue && (maxValue < bounds.min || maxValue > bounds.max)) {
            finalMaxValue = clampPrice(maxValue, bounds);
            setLocalMaxPrice(finalMaxValue.toFixed(6));
            pricesWereClamped = true;
        }

        props.onPriceRangeChange({
            min: finalMinValue,
            max: finalMaxValue,
        });
    };

    const canSubmit =
        localMinPrice !== "" &&
        localMaxPrice !== "" &&
        !isNaN(parseFloat(localMinPrice)) &&
        !isNaN(parseFloat(localMaxPrice));

    const hasChanges =
        localMinPrice !== (props.priceRange.min?.toString() || "") ||
        localMaxPrice !== (props.priceRange.max?.toString() || "");

    // Sync local state when props change (e.g., when step is reset)
    useEffect(() => {
        setLocalMinPrice(props.priceRange.min?.toString() || "");
        setLocalMaxPrice(props.priceRange.max?.toString() || "");
    }, [props.priceRange.min, props.priceRange.max]);

    // Get current price in quote token terms
    const getCurrentPrice = (): string | null => {
        if (!props.pool || !props.quoteToken || !props.baseToken) return null;

        // Determine if quoteToken is token0 or token1 in the pool
        const isQuoteToken0 =
            props.quoteToken.address.toLowerCase() ===
            props.pool.token0.address.toLowerCase();

        if (isQuoteToken0) {
            // Quote token is token0, so we want token1 price in token0 terms
            const price = getToken1PriceInToken0(props.pool);
            return formatPrice(price, 6);
        } else {
            // Quote token is token1, so we want token0 price in token1 terms
            const price = getToken0PriceInToken1(props.pool);
            return formatPrice(price, 6);
        }
    };

    // Preset range functions
    const setPresetRange = (percentage: number) => {
        const currentPrice = getCurrentPrice();
        if (!currentPrice) return;

        const price = parseFloat(currentPrice);
        const minPrice = price * (1 - percentage / 100);
        const maxPrice = price * (1 + percentage / 100);

        setLocalMinPrice(minPrice.toFixed(6));
        setLocalMaxPrice(maxPrice.toFixed(6));
        setErrorMessage(""); // Clear any existing error
    };

    const setFullRange = () => {
        // For full range, we use very wide values
        // In a real implementation, you might want to use actual tick bounds
        const currentPrice = getCurrentPrice();
        if (!currentPrice) return;

        const price = parseFloat(currentPrice);
        setLocalMinPrice((price * 0.01).toFixed(6)); // 1% of current price
        setLocalMaxPrice((price * 100).toFixed(6)); // 100x current price
        setErrorMessage(""); // Clear any existing error
    };

    const presetButtons = [
        { label: "±1%", percentage: 1 },
        { label: "±3%", percentage: 3 },
        { label: "±5%", percentage: 5 },
        { label: "±10%", percentage: 10 },
        { label: "±20%", percentage: 20 },
    ];

    const flipPrices = () => {
        const temp = localMinPrice;
        setLocalMinPrice(localMaxPrice);
        setLocalMaxPrice(temp);
        setErrorMessage(""); // Clear error after flipping
    };

    const isMinMaxError =
        errorMessage === "Minimum price must be less than maximum price";

    // Get reasonable price bounds (e.g., 0.1% to 1000% of current price)
    const getPriceBounds = () => {
        const currentPrice = getCurrentPrice();
        if (!currentPrice) return { min: 0, max: Number.MAX_SAFE_INTEGER };

        const price = parseFloat(currentPrice);
        return {
            min: price * 0.001, // 0.1% of current price
            max: price * 1000, // 1000x current price
        };
    };

    const clampPrice = (
        value: number,
        bounds: { min: number; max: number }
    ): number => {
        return Math.max(bounds.min, Math.min(bounds.max, value));
    };

    return (
        <Box display="flex" justifyContent="flex-start">
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

                {getCurrentPrice() && (
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
                        <Typography variant="h6" color="success.main">
                            {getCurrentPrice()} {props.quoteToken?.symbol}
                        </Typography>
                    </Paper>
                )}

                {getCurrentPrice() && (
                    <Box marginBottom={3}>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            marginBottom={1}
                        >
                            Quick Range Presets
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {presetButtons.map((preset) => (
                                <Chip
                                    key={preset.label}
                                    label={preset.label}
                                    onClick={() =>
                                        setPresetRange(preset.percentage)
                                    }
                                    size="small"
                                    variant="outlined"
                                    clickable
                                    sx={{
                                        fontSize: "0.75rem",
                                        height: "24px",
                                        "&:hover": {
                                            backgroundColor: "action.hover",
                                        },
                                    }}
                                />
                            ))}
                            <Chip
                                label="Full Range"
                                onClick={setFullRange}
                                size="small"
                                variant="outlined"
                                clickable
                                sx={{
                                    fontSize: "0.75rem",
                                    height: "24px",
                                    "&:hover": {
                                        backgroundColor: "action.hover",
                                    },
                                }}
                            />
                        </Box>
                    </Box>
                )}

                <Stack spacing={3} direction="column">
                    <TextField
                        label={`Minimum Price (${props.quoteToken?.symbol} per ${props.baseToken?.symbol})`}
                        type="number"
                        value={localMinPrice}
                        onChange={handleMinPriceChange}
                        variant="outlined"
                        fullWidth
                        placeholder="Enter minimum price"
                        helperText="The lower bound of your price range"
                    />

                    <TextField
                        label={`Maximum Price (${props.quoteToken?.symbol} per ${props.baseToken?.symbol})`}
                        type="number"
                        value={localMaxPrice}
                        onChange={handleMaxPriceChange}
                        variant="outlined"
                        fullWidth
                        placeholder="Enter maximum price"
                        helperText="The upper bound of your price range"
                    />

                    {errorMessage && (
                        <Box sx={{ marginTop: 1 }}>
                            <Typography
                                variant="body2"
                                color="error"
                                component="span"
                            >
                                {errorMessage}
                            </Typography>
                            {isMinMaxError && (
                                <>
                                    {" • "}
                                    <Link
                                        component="button"
                                        variant="body2"
                                        onClick={flipPrices}
                                        sx={{
                                            textDecoration: "underline",
                                            cursor: "pointer",
                                            color: "primary.main",
                                        }}
                                    >
                                        Flip prices
                                    </Link>
                                </>
                            )}
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        sx={{ alignSelf: "flex-start" }}
                    >
                        {hasChanges ? "Set Price Range" : "Update Price Range"}
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}
