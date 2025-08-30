import {
    BlockOutlined,
    Check,
    CloseOutlined,
    LinkOutlined,
} from "@mui/icons-material";
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
    Link,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";

export type TransactionDialogProps = {
    txHash?: string;
    confirmations?: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    onClose?: () => void;
    onSuccess?: () => void;
    onError?: () => void;
};

export function TransactionDialog(
    props: React.PropsWithChildren<TransactionDialogProps>
) {
    const txHash = props.txHash;
    const confirmations = props.confirmations ?? 1;

    const [open, setOpen] = useState(!!txHash);
    const { isLoading, isError, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash as `0x{string}`,
        confirmations: confirmations as number,
    });

    const { chain } = useAccount();

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        setOpen(!!txHash);
    }, [txHash]);

    return (
        <Dialog open={!!open} onClose={handleClose}>
            <DialogTitle>
                <Grid container>
                    <Grid item xs={10} textAlign={"left"}>
                        Transaction in Progress
                    </Grid>
                    <Grid item xs={2} textAlign={"right"}>
                        <IconButton onClick={handleClose}>
                            <CloseOutlined />
                        </IconButton>
                    </Grid>
                </Grid>
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Box>
                    <Grid container>
                        <Grid
                            item
                            xs={12}
                            textAlign={"center"}
                            minWidth={"25em"}
                        >
                            {isLoading && (
                                <>Waiting for transaction confirmation.</>
                            )}
                        </Grid>
                        <Grid item xs={2}></Grid>
                        <Grid
                            item
                            xs={8}
                            mt="1em"
                            textAlign={"center"}
                            minWidth={"40%"}
                        >
                            {isLoading && <LinearProgress />}
                            {isSuccess && (
                                <Chip
                                    label="Transaction confirmed."
                                    color="success"
                                    icon={<Check />}
                                />
                            )}
                            {isError && (
                                <Chip
                                    label="Transaction failed"
                                    color="error"
                                    icon={<BlockOutlined />}
                                />
                            )}
                        </Grid>
                        <Grid item xs={2}></Grid>
                        <Grid item xs={12} textAlign={"center"}>
                            <Link
                                sx={{
                                    verticalAlign: "middle",
                                    display: "inline-flex",
                                    marginTop: "1em",
                                    marginBottom: "0.8em",
                                }}
                                target={"_blank"}
                                rel={"noopener"}
                                href={
                                    ((chain?.blockExplorers?.default
                                        .url as string) +
                                        "/tx/" +
                                        txHash) as string
                                }
                            >
                                <LinkOutlined /> View transaction
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
