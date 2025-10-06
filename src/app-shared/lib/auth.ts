import { getServerSession, type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { SiweMessage } from "siwe"
import { prisma } from "@/lib/prisma"
import { normalizeAddress } from "@/lib/utils/evm"
import { isAddressWhitelisted } from "@/lib/utils/whitelist"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      address: string
      name?: string
    }
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            return null
          }

          const siwe = new SiweMessage(credentials.message)

          // Use the domain from the SIWE message itself for verification
          const result = await siwe.verify({
            signature: credentials.signature,
            domain: siwe.domain,
          })

          if (!result.success) {
            return null
          }

          const address = normalizeAddress(siwe.address)

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { address }
          })

          if (!user) {
            // Check whitelist before creating new user
            if (!isAddressWhitelisted(address)) {
              console.error('Registration blocked: Address not whitelisted:', address)
              return null
            }

            // Auto-create user on first SIWE login
            user = await prisma.user.create({
              data: {
                address,
                name: null,
              }
            })
          }

          return {
            id: user.id,
            address: user.address,
            name: user.name,
          }
        } catch (error) {
          console.error('SIWE authentication error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        id: token.uid as string,
        address: token.address as string,
        name: token.name as string,
      },
    }),
    jwt: ({ user, token }) => {
      if (user) {
        token.uid = user.id
        token.address = (user as any).address
        token.name = user.name
      }
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

export const getSession = () => getServerSession(authOptions)