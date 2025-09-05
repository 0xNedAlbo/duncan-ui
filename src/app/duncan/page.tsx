"use client";

import { NavigationMenu } from "@/components/duncan/NavigationMenu";
import { CssBaseline } from "@mui/material";
import { useState } from "react";
import { MainContainer } from "@/components/duncan/MainContainer";

function App() {
    const [isChainConnected, setChainConnected] = useState<boolean>(false);

    return (
        <>
            <CssBaseline />
            <NavigationMenu></NavigationMenu>
            <MainContainer></MainContainer>
        </>
    );
}
export default App;
