import { Grid } from "@mui/material";
import { UniswapPositionContainer } from "./UniswapPositionContainer";

export function MainContainer() {
    return (
        <Grid container mt={"1em"} marginTop={"3em"}>
            <Grid item xs={1}></Grid>
            <Grid item xs={10} textAlign={"left"}>
                <UniswapPositionContainer></UniswapPositionContainer>
            </Grid>
            <Grid item xs={1}></Grid>
        </Grid>
    );
}
