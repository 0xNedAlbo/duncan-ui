"use client";

import { Grid, IconButton, Typography } from "@mui/material";
import { ConnectButton } from "../common/ConnectButton";
import { DarkModeOutlined, LightModeOutlined } from "@mui/icons-material";
import { useContext } from "react";
import { ColorModeContext } from "../common/ColorModeContext";
import { useAccount } from "wagmi";

export function NavigationMenu() {
    const { mode, toggleColorMode } = useContext(ColorModeContext);
    const { isConnected } = useAccount();

    function changeColorMode() {
        toggleColorMode();
    }

    return (
        <Grid container spacing={1} marginTop={"1em"}>
            <Grid item xs={1}></Grid>
            <Grid item xs={8}>
                <Typography variant="h4">Duncan - The Hedge Manager</Typography>
            </Grid>
            <Grid item xs={2} textAlign={"right"} sx={{ whiteSpace: "nowrap" }}>
                <IconButton
                    onClick={changeColorMode}
                    style={{ marginLeft: "0.2em", marginRight: "0.6em" }}
                >
                    {mode == "dark" ? (
                        <LightModeOutlined />
                    ) : (
                        <DarkModeOutlined />
                    )}
                </IconButton>
                {isConnected && <ConnectButton />}
            </Grid>
            <Grid item xs={1}></Grid>
        </Grid>
    );
}
