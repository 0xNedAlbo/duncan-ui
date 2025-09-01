import { Box, Typography } from "@mui/material";
import { Erc20Token } from "@/utils/erc20Token";
import { Erc20TokenSelect } from "@/components/inputs/Erc20TokenSelect";

export type QuoteTokenStepProps = {
    tokenList: Erc20Token[] | undefined;
    onQuoteTokenChange: (newQuoteToken: Erc20Token) => void;
    selectedToken?: Erc20Token;
};

export function QuoteTokenStep(props: QuoteTokenStepProps) {
    return (
        <Box display="flex" justifyContent="center">
            <Box maxWidth="600px" textAlign="left">
                <Typography
                    variant="subtitle1"
                    color={"text.primary"}
                    marginBottom="1em"
                >
                    Please select a Quote Token for your liquidity position.
                </Typography>
                <Box textAlign="center" marginBottom={"1em"}>
                    <Erc20TokenSelect
                        tokenList={props.tokenList}
                        onChange={props.onQuoteTokenChange}
                        selectedToken={props.selectedToken}
                    />
                </Box>

                <Typography
                    variant="inherit"
                    fontSize={"0.875rem"}
                    marginBottom="1em"
                    textAlign={"justify"}
                >
                    <i>
                        The quote token represents the asset in which the value
                        of the base token is expressed. In most trading pairs,
                        the quote token is a stablecoin — for example, in the
                        pair WETH/USDC, the quote token is USDC, and sometimes
                        it could also be USDT.
                    </i>
                </Typography>
            </Box>
        </Box>
    );
}
