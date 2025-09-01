import { Box, Typography } from "@mui/material";
import { Erc20Token } from "@/utils/erc20Token";
import { Erc20TokenSelect } from "@/components/inputs/Erc20TokenSelect";

export type BaseTokenStepProps = {
    tokenList: Erc20Token[] | undefined;
    onBaseTokenChange: (newBaseToken: Erc20Token) => void;
    selectedToken?: Erc20Token;
};

export function BaseTokenStep(props: BaseTokenStepProps) {
    return (
        <Box display="flex" justifyContent="center">
            <Box maxWidth="600px" textAlign="left">
                <Typography
                    variant="subtitle1"
                    color={"text.primary"}
                    marginBottom="1em"
                >
                    Please select a Base Token for your liquidity position.
                </Typography>
                <Box textAlign="center" marginBottom={"1em"}>
                    <Erc20TokenSelect
                        tokenList={props.tokenList}
                        onChange={props.onBaseTokenChange}
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
                        The base token is the asset that you are directly
                        providing or trading against. In a trading pair, it
                        represents the quantity being valued in terms of the
                        quote token. For example, in the pair WETH/USDC, the
                        base token is WETH, while the quote token is the
                        stablecoin (USDC). And in the pair cbBTC/WETH, the base
                        token is cbBTC, while the quote token is WETH.
                    </i>
                </Typography>
            </Box>
        </Box>
    );
}
