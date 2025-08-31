import { Section } from "@/components/common/Section";
import {
    Box,
    Button,
    Collapse,
    Grid,
    IconButton,
    Link,
    Stack,
    Typography,
} from "@mui/material";

import { ReactNode, useState } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export type PositionLoaderOptionProps = {
    heading: string;
    helperTexts?: ReactNode[];
    children: ReactNode;
};

export function PositionLoaderOption(props: PositionLoaderOptionProps) {
    const [open, setOpen] = useState(false);

    return (
        <Section heading={props.heading}>
            <Stack spacing={2}>
                {props.helperTexts && (
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                                size="small"
                                onClick={() => setOpen(!open)}
                            >
                                {open ? (
                                    <ExpandLessIcon fontSize="small" />
                                ) : (
                                    <ChevronRightIcon fontSize="small" />
                                )}
                            </IconButton>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                            >
                                <Link onClick={() => setOpen(!open)}>
                                    When to use this method?
                                </Link>
                            </Typography>
                        </Box>
                        <Collapse in={open}>
                            {props.helperTexts.map((text) => (
                                <Typography
                                    textAlign={"left"}
                                    variant="subtitle2"
                                    sx={{
                                        mt: 1,
                                        ml: 4,
                                        color: "text.secondary",
                                    }}
                                >
                                    {text}
                                </Typography>
                            ))}
                        </Collapse>
                    </Box>
                )}
                {props.children}
            </Stack>
        </Section>
    );
}

export type PositionLoaderVariant = "byPool" | undefined;

export type SelectPositionLoaderProps = {
    onLoaderChange: (newLoader: PositionLoaderVariant) => void;
};

export function SelectPositionLoader(props: SelectPositionLoaderProps) {
    return (
        <Grid container spacing={2} marginTop={"2em"}>
            <Grid item xs={3}></Grid>
            <Grid item xs={3}>
                <PositionLoaderOption
                    heading="Simulate Position"
                    helperTexts={[
                        <>
                            If you don’t already have a position on Uniswap,
                            this is a great place to begin.
                        </>,
                        <>
                            Simply pick a pool and map out your position in
                            advance — so you can explore different ranges and
                            outcomes before committing any capital.
                        </>,
                        <>
                            Start by selecting a blockchain and the two tokens
                            you want to trade. This will help you locate the
                            correct pool for your position.
                        </>,
                    ]}
                >
                    <Button onClick={() => props.onLoaderChange("byPool")}>
                        Start
                    </Button>
                </PositionLoaderOption>
            </Grid>
            <Grid item xs={3}>
                <PositionLoaderOption
                    heading={"Load Existing Position"}
                    helperTexts={[<>TBD</>]}
                >
                    <Button>Start</Button>
                </PositionLoaderOption>
            </Grid>
        </Grid>
    );
}
