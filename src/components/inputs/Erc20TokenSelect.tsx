import { Erc20Token } from "@/utils/erc20Token";
import { CheckCircle } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";

export type Erc20TokenSelectProps = {
    tokenList?: Erc20Token[];
    onChange?: (newToken: Erc20Token) => void;
    selectedToken?: Erc20Token;
};

export function Erc20TokenSelect(props: Erc20TokenSelectProps) {
    const tokenList: Erc20Token[] = props.tokenList || [];

    function onTokenSelect(newToken: Erc20Token) {
        props?.onChange?.(newToken);
    }

    return (
        <Stack
            direction="row"
            spacing={3}
            justifyContent="center"
            flexWrap="wrap"
        >
            {tokenList &&
                tokenList.map((t) => (
                    <Button
                        key={t.address}
                        variant="outlined"
                        startIcon={
                            t.address === props.selectedToken?.address ? (
                                <CheckCircle />
                            ) : undefined
                        }
                        onClick={() => onTokenSelect(t)}
                        sx={{ borderRadius: "16px" }}
                    >
                        {t.symbol}
                    </Button>
                ))}
        </Stack>
    );
}
