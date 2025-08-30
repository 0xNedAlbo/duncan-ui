import { Box, Divider, Paper, Typography } from "@mui/material";

type SectionProps = {
    heading: string;
    headingAlign?: "left" | "center" | "right";
};

export function Section(props: React.PropsWithChildren<SectionProps>) {
    return (
        <Paper variant="elevation" elevation={2}>
            <Typography
                variant="h6"
                p={"0.2em"}
                textAlign={props.headingAlign ?? "center"}
            >
                {props.heading}
            </Typography>
            <Divider />
            <Box textAlign={"center"} p={"1em"}>
                {props.children}
            </Box>
        </Paper>
    );
}
