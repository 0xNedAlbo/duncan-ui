"use client";

import { Suspense, useState } from "react";
import { UserDropdown } from "@/app-shared/components/auth/user-dropdown";
import { SettingsModal } from "@/app-shared/components/settings-modal";
import { useTranslations } from "@/app-shared/i18n/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiKeyInfo } from "@/services/auth/apiKeyService";
import {
    Copy,
    Plus,
    Key,
    MoreHorizontal,
    Trash2,
    ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// API hooks
function useApiKeys() {
    return useQuery<{ apiKeys: ApiKeyInfo[] }, Error>({
        queryKey: ["api-keys"],
        queryFn: async () => {
            const response = await fetch("/api/auth/api-keys");
            if (!response.ok) {
                throw new Error("Failed to fetch API keys");
            }
            return response.json();
        },
    });
}

function useCreateApiKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            name,
            scopes = [],
        }: {
            name: string;
            scopes?: string[];
        }) => {
            const response = await fetch("/api/auth/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, scopes }),
            });
            if (!response.ok) {
                throw new Error("Failed to create API key");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        },
    });
}

function useRevokeApiKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (keyId: string) => {
            const response = await fetch(`/api/auth/api-keys?keyId=${keyId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error("Failed to revoke API key");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        },
    });
}

// Components
function ApiKeyCard({ apiKey }: { apiKey: ApiKeyInfo }) {
    const t = useTranslations();
    const [showDropdown, setShowDropdown] = useState(false);
    const revokeApiKey = useRevokeApiKey();

    const handleRevoke = () => {
        if (confirm(t("apiKeys.revoke.confirmMessage"))) {
            revokeApiKey.mutate(apiKey.id);
        }
        setShowDropdown(false);
    };

    const isActive = !apiKey.revokedAt;
    const createdDate = new Date(apiKey.createdAt);

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                        className={`p-2 rounded-lg ${
                            isActive
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                        }`}
                    >
                        <Key size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="font-semibold text-white">
                                    {apiKey.name}
                                </h3>
                                <p className="text-sm text-slate-400 font-mono">
                                    ak_live_{apiKey.prefix}...
                                </p>
                            </div>
                            <div className="text-sm text-slate-400">
                                {formatDistanceToNow(createdDate, {
                                    addSuffix: true,
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                    {showDropdown && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
                            <button
                                onClick={handleRevoke}
                                disabled={!isActive || revokeApiKey.isPending}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                {revokeApiKey.isPending
                                    ? t("apiKeys.actions.revoking")
                                    : t("apiKeys.actions.revoke")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CreateApiKeyModal({
    isOpen,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line no-unused-vars
    onSuccess: (result: any) => void;
}) {
    const t = useTranslations();
    const [name, setName] = useState("");
    const [copied, setCopied] = useState(false);
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const createApiKey = useCreateApiKey();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        createApiKey.mutate(
            { name: name.trim() },
            {
                onSuccess: (result) => {
                    setCreatedKey(result.key);
                    onSuccess(result);
                },
                onError: (error) => {
                    console.error("Failed to create API key:", error);
                },
            }
        );
    };

    const handleCopy = async () => {
        if (createdKey) {
            await navigator.clipboard.writeText(createdKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setName("");
        setCreatedKey(null);
        setCopied(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={handleClose}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-white mb-2">
                            {createdKey
                                ? t("apiKeys.keyCreated")
                                : t("apiKeys.create.title")}
                        </h2>
                        <p className="text-slate-400 mb-6">
                            {createdKey
                                ? t("apiKeys.keyCreatedDescription")
                                : t("apiKeys.create.description")}
                        </p>

                        {createdKey ? (
                            <div className="space-y-4">
                                <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-white">
                                            {t("apiKeys.copyKey")}
                                        </span>
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                        >
                                            <Copy size={14} />
                                            {copied
                                                ? t("common.copied")
                                                : "Copy"}
                                        </button>
                                    </div>
                                    <code className="text-xs text-slate-300 font-mono break-all">
                                        {createdKey}
                                    </code>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleClose}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        {t("common.done")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        {t("apiKeys.keyName")}
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        placeholder={t(
                                            "apiKeys.keyNamePlaceholder"
                                        )}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            createApiKey.isPending ||
                                            !name.trim()
                                        }
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        {createApiKey.isPending
                                            ? t("apiKeys.create.creating")
                                            : t("apiKeys.createKey")}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function ApiKeysContent() {
    const t = useTranslations();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { data, isLoading, error } = useApiKeys();

    const handleCreateSuccess = () => {
        // Modal handles the success state internally
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="text-slate-400">{t("common.loading")}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="text-red-400">
                    {t("apiKeys.errors.loadFailed")}
                </div>
            </div>
        );
    }

    const apiKeys = data?.apiKeys || [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {t("apiKeys.title")}
                    </h2>
                    <p className="text-slate-300">{t("apiKeys.description")}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    {t("apiKeys.createKey")}
                </button>
            </div>

            {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                    <Key size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                        {t("apiKeys.noKeys")}
                    </h3>
                    <p className="text-slate-400 mb-6">
                        {t("apiKeys.noKeysDescription")}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                    >
                        <Plus size={20} />
                        {t("apiKeys.createKey")}
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {apiKeys.map((apiKey) => (
                        <ApiKeyCard key={apiKey.id} apiKey={apiKey} />
                    ))}
                </div>
            )}

            <CreateApiKeyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}

export default function ApiKeysPage() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (
            status === "unauthenticated" ||
            (!session && status !== "loading")
        ) {
            router.push("/auth/signin");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        );
    }

    if (status === "unauthenticated" || !session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        {t("positionDetails.header.backToDashboard")}
                    </Link>
                    <div className="flex items-center gap-3">
                        <SettingsModal />
                        <UserDropdown />
                    </div>
                </div>

                <Suspense
                    fallback={
                        <div className="flex items-center justify-center min-h-64">
                            <div className="text-white">
                                {t("common.loading")}
                            </div>
                        </div>
                    }
                >
                    <ApiKeysContent />
                </Suspense>
            </div>
        </div>
    );
}
