import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/app-shared/providers/web3-provider";
import { AuthProvider } from "@/app-shared/providers/auth-provider";
import { QueryProvider } from "@/app-shared/providers/query-provider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Midcurve - Uniswap V3 Risk Manager",
    description:
        "Advanced risk management and position planning for Uniswap V3 liquidity providers",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AuthProvider>
                    <QueryProvider>
                        <Web3Provider>{children}</Web3Provider>
                    </QueryProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
