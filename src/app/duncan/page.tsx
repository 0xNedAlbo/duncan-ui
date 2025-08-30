"use client";

import { RequiredChainPrompt } from "@/components/inputs/RequiredChainPrompt";
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
            <RequiredChainPrompt
                requiredChainId={42161}
                onChainConnected={setChainConnected}
                heading="The Hedge Manager is on Arbitrum!"
            ></RequiredChainPrompt>
            {isChainConnected && (
                <>
                    <MainContainer></MainContainer>
                </>
            )}
        </>
    );
}
export default App;
