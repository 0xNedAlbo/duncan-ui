"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { State, WagmiProvider } from "wagmi";
import { ConnectKitProvider } from "connectkit";

import { getConfig } from "@/wagmiConfig";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { ColorModeContext } from "@/components/common/ColorModeContext";

import { useCookies } from "react-cookie";
import { useParams } from "next/navigation";

export function Providers(props: {
    children: ReactNode;
    initialState?: State;
}) {
    const [cookies, setCookie] = useCookies();

    const [mode, setMode] = useState<PaletteMode>("light");
    const [config] = useState(() => getConfig());
    const [queryClient] = useState(() => new QueryClient());
    const params = useParams<{ chain: string }>();

    function toggleColorMode() {
        let expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        setCookie("theme", mode === "dark" ? "light" : "dark", { expires });
    }

    useEffect(() => {
        let cookieMode = cookies.theme;
        if (cookieMode === "light") setMode("light");
        else if (cookieMode === "dark") setMode("dark");
    }, [cookies]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                },
            }),
        [mode]
    );

    return (
        <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
            <ThemeProvider theme={theme}>
                <WagmiProvider
                    config={config}
                    initialState={props.initialState}
                >
                    <QueryClientProvider client={queryClient}>
                        <ConnectKitProvider
                            theme={mode == "light" ? "soft" : "midnight"}
                        >
                            {props.children}
                        </ConnectKitProvider>
                    </QueryClientProvider>
                </WagmiProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
