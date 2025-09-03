import { Box, Typography, Stepper, Step, StepLabel, Link } from "@mui/material";
import { EvmBlockchain } from "@/utils/evmBlockchain";
import { Erc20Token } from "@/utils/erc20Token";
import { UniswapV3Pool } from "@/utils/uniswapV3/uniswapV3Pool";

export type PositionStepperProps = {
    activeStep: number;
    onResetToStep: (stepIndex: number) => void;
    selectedChain?: EvmBlockchain;
    selectedQuoteToken?: Erc20Token;
    selectedBaseToken?: Erc20Token;
    selectedPool?: UniswapV3Pool;
    selectedPriceRange?: { min?: bigint; max?: bigint };
};

export function PositionStepper(props: PositionStepperProps) {
    const steps = [
        "Select Blockchain",
        "Select Quote Token",
        "Select Base Token",
        "Select Pool",
        "Set Price Range",
    ];

    const getSelectedValue = (stepIndex: number): string | undefined => {
        switch (stepIndex) {
            case 0:
                return props.selectedChain?.name;
            case 1:
                return props.selectedQuoteToken?.symbol;
            case 2:
                return props.selectedBaseToken?.symbol;
            case 3:
                return props.selectedPool
                    ? `${props.selectedPool.quoteToken.symbol}/${props.selectedPool.baseToken.symbol} ${(props.selectedPool.fee / 10000).toFixed(2)}%`
                    : undefined;
            case 4:
                return props.selectedPriceRange?.min &&
                    props.selectedPriceRange?.max
                    ? `${props.selectedPriceRange.min} - ${props.selectedPriceRange.max}`
                    : undefined;
            default:
                return undefined;
        }
    };

    return (
        <Box sx={{ width: "100%", mt: 2 }}>
            <Stepper activeStep={props.activeStep} orientation="vertical">
                {steps.map((label, index) => (
                    <Step key={label} completed={props.activeStep > index}>
                        <StepLabel>
                            <Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography
                                        variant="body2"
                                        color={
                                            props.activeStep >= index
                                                ? "text.primary"
                                                : "text.secondary"
                                        }
                                    >
                                        {label}
                                    </Typography>
                                    {props.activeStep > index && (
                                        <Link
                                            component="button"
                                            variant="caption"
                                            onClick={() =>
                                                props.onResetToStep(index)
                                            }
                                            sx={{
                                                ml: 1,
                                                textDecoration: "underline",
                                                cursor: "pointer",
                                                fontSize: "0.75rem",
                                                color: "primary.main",
                                                "&:hover": {
                                                    color: "primary.dark",
                                                },
                                            }}
                                        >
                                            Reset
                                        </Link>
                                    )}
                                </Box>
                                {getSelectedValue(index) && (
                                    <Typography
                                        variant="caption"
                                        color="success.main"
                                        sx={{
                                            display: "block",
                                            mt: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        ✓ {getSelectedValue(index)}
                                    </Typography>
                                )}
                            </Box>
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
}
