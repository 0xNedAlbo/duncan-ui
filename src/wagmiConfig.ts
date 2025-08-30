import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export function getConfig() {
    return createConfig({
        chains:
            process.env.NODE_ENV == "production"
                ? [mainnet, arbitrum]
                : [mainnet, arbitrum],
        connectors: [
            injected(),
            walletConnect({
                projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID as string,
                showQrModal: false,
            }),
        ],
        storage: createStorage({
            storage: cookieStorage,
        }),
        ssr: true,
        transports: {
            [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_ENDPOINT!),
            [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_ENDPOINT!),
        },
    });
}

declare module "wagmi" {
    interface Register {
        config: ReturnType<typeof getConfig>;
    }
}
