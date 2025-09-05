"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appRoutes } from "./routes";
import { AppBar, Box, Toolbar, Button } from "@mui/material";

// Top navigation bar with active route highlighting.
export function AppNav() {
    const pathname = usePathname();

    return (
        <AppBar position="sticky" color="default" elevation={0}>
            <Toolbar sx={{ gap: 1, justifyContent: "flex-start" }}>
                {appRoutes
                    .filter((r) => !r.hidden)
                    .map((route) => {
                        const isActive = route.exact
                            ? pathname === route.href
                            : pathname === route.href ||
                              pathname.startsWith(route.href + "/");

                        return (
                            <Box key={route.href}>
                                <Button
                                    component={Link}
                                    href={route.href}
                                    variant={isActive ? "contained" : "text"}
                                    size="large"
                                >
                                    {route.label}
                                </Button>
                            </Box>
                        );
                    })}
            </Toolbar>
        </AppBar>
    );
}
