"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { useAuthTranslations } from "@/app-shared/lib/auth-translations";

export default function SignInPage() {
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { t } = useAuthTranslations();
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const handleSiweSignIn = async () => {
        if (!address || !isConnected) return;

        setIsLoading(true);
        setError("");

        try {
            // Create SIWE message
            const domain = window.location.host;
            const origin = window.location.origin;
            const statement = "Sign in to Midcurve to manage your DeFi positions";

            const message = new SiweMessage({
                domain,
                address,
                statement,
                uri: origin,
                version: "1",
                chainId: 1, // Ethereum mainnet for now
                nonce: Math.random().toString(36).substring(2),
            });

            const messageBody = message.prepareMessage();

            // Sign the message
            const signature = await signMessageAsync({
                message: messageBody,
            });

            // Submit to NextAuth
            const result = await signIn("credentials", {
                message: messageBody,
                signature,
                redirect: false,
            });

            if (result?.error) {
                setError(t("auth.signIn.errorInvalidCredentials"));
            } else {
                router.push("/");
                router.refresh();
            }
        } catch (error) {
            console.error("SIWE sign-in error:", error);
            setError(t("auth.signIn.errorGeneral"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                        {t("auth.signIn.title")}
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-400">
                        Connect your wallet to access Midcurve
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>

                    {isConnected && address && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-slate-400">
                                    Connected: {address.slice(0, 6)}...{address.slice(-4)}
                                </p>
                            </div>

                            <button
                                onClick={handleSiweSignIn}
                                disabled={isLoading}
                                className="group relative flex w-full justify-center rounded-md bg-blue-600 py-2 px-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading
                                    ? t("auth.signIn.loading")
                                    : "Sign Message to Continue"}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-md bg-red-900/20 border border-red-500/20 p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
