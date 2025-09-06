"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthTranslations } from "@/lib/auth-translations";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { t } = useAuthTranslations();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t("auth.signIn.errorGeneral"));
            }

            // Registration successful, redirect to signin
            router.push("/auth/signin?message=registration-success");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                        {t("auth.signUp.title")}
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-400">
                        {t("auth.signUp.orText")}{" "}
                        <Link
                            href="/auth/signin"
                            className="font-medium text-blue-500 hover:text-blue-400"
                        >
                            {t("auth.signUp.signInLink")}
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="name" className="sr-only">
                                {t("auth.signUp.namePlaceholder")}
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                className="relative block w-full rounded-md border-0 py-1.5 px-3 text-white placeholder-slate-400 bg-slate-800 ring-1 ring-inset ring-slate-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                                placeholder={t("auth.signUp.namePlaceholder")}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="sr-only">
                                {t("auth.signUp.emailPlaceholder")}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-md border-0 py-1.5 px-3 text-white placeholder-slate-400 bg-slate-800 ring-1 ring-inset ring-slate-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                                placeholder={t("auth.signUp.emailPlaceholder")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                {t("auth.signUp.passwordPlaceholder")}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="relative block w-full rounded-md border-0 py-1.5 px-3 text-white placeholder-slate-400 bg-slate-800 ring-1 ring-inset ring-slate-700 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                                placeholder={t(
                                    "auth.signUp.passwordPlaceholder"
                                )}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-900/20 border border-red-500/20 p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading || password.length < 6}
                            className="group relative flex w-full justify-center rounded-md bg-blue-600 py-2 px-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading
                                ? t("auth.signUp.loading")
                                : t("auth.signUp.submitButton")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
