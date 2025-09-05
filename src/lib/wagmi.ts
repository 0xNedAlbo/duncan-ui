import { http, createConfig } from 'wagmi'
import { mainnet, arbitrum, base } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [mainnet, arbitrum, base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
})