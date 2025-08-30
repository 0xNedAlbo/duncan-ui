import "./globals.css";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { type ReactNode } from "react";

const robotoFont = Roboto({
    weight: ["100", "300", "400", "500", "700", "900"],
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Coinflakes Managed Vault",
    description: "Coinflakes Managed Investment Vault",
    icons: [
        { rel: "icon", url: "/favicon.ico" },
        {
            rel: "apple-touch-icon",
            url: "/apple-touch-icon.png",
            sizes: "180x180",
        },
        {
            rel: "icon",
            type: "image/png",
            sizes: "32x32",
            url: "/favicon-32x32.png",
        },
        {
            rel: "icon",
            type: "image/png",
            sizes: "16x16",
            url: "/favicon-16x16.png",
        },
    ],
};

export default function RootLayout(props: { children: ReactNode }) {
    return (
        <html lang="en">
            <body className={robotoFont.className}>{props.children}</body>
        </html>
    );
}
