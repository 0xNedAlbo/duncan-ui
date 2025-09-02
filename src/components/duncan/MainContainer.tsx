import { Grid } from "@mui/material";
import { UniswapPositionContainer } from "./UniswapPositionContainer";
import { UniswapV3Position } from "@/hooks/duncan/useUniswapV3Position";
import { useState } from "react";
import { PositionAssistent } from "./PositionAssistent/PositionAssistent";

export function MainContainer() {
    const [position, setPosition] = useState<UniswapV3Position | undefined>();

    function onPositionChange(newPosition?: UniswapV3Position) {
        setPosition(newPosition);
    }

    return (
        <Grid container mt={"1em"} marginTop={"3em"}>
            <Grid item xs={1}></Grid>
            <Grid item xs={10} textAlign={"left"}>
                {!position && (
                    <PositionAssistent
                        onPositionChange={onPositionChange}
                    ></PositionAssistent>
                )}
                {position && (
                    <UniswapPositionContainer></UniswapPositionContainer>
                )}
            </Grid>
            <Grid item xs={1}></Grid>
        </Grid>
    );
}
