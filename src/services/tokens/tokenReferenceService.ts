import { PrismaClient, TokenReference, Token, UserToken } from "@prisma/client";
import { TokenResolutionService } from "./tokenResolutionService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";

export interface TokenReferenceWithToken extends TokenReference {
    globalToken?: Token | null;
    userToken?: UserToken | null;
}

export interface UnifiedTokenData {
    id: string;
    chain: string;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoUrl?: string | null;
    type: "global" | "user";
    isVerified: boolean;
    userLabel?: string | null;
    notes?: string | null;
    userId?: string;
}

/**
 * Service for managing polymorphic token references
 * Provides unified interface for both global and user tokens
 */
export class TokenReferenceService {
    private prisma: PrismaClient;
    private tokenResolver: TokenResolutionService;

    constructor(
        requiredClients: Pick<Clients, 'prisma'>,
        requiredServices: Pick<Services, 'tokenResolutionService'>
    ) {
        this.prisma = requiredClients.prisma;
        this.tokenResolver = requiredServices.tokenResolutionService;
    }

    /**
     * Find or create a token reference for the given token address
     * This is the main entry point for the polymorphic token system
     */
    async findOrCreateReference(
        chain: string,
        address: string,
        userId: string
    ): Promise<TokenReferenceWithToken> {
        // First check if a reference already exists
        const existingRef = await this.prisma.tokenReference.findFirst({
            where: {
                chain,
                address: address.toLowerCase(),
            },
            include: {
                globalToken: true,
                userToken: true,
            },
        });

        if (existingRef) {
            return existingRef;
        }

        // Use TokenResolutionService to determine which type of token this should be
        const tokenInfo = await this.tokenResolver.resolveToken(
            chain,
            address,
            userId
        );

        if (tokenInfo.isGlobal) {
            // Create reference to global token
            return await this.createGlobalTokenReference(
                tokenInfo.id,
                chain,
                address,
                tokenInfo.symbol
            );
        } else {
            // Create reference to user token
            return await this.createUserTokenReference(
                tokenInfo.id,
                chain,
                address,
                tokenInfo.symbol
            );
        }
    }

    /**
     * Create a reference to a global token
     */
    private async createGlobalTokenReference(
        globalTokenId: string,
        chain: string,
        address: string,
        symbol: string
    ): Promise<TokenReferenceWithToken> {
        return await this.prisma.tokenReference.create({
            data: {
                tokenType: "global",
                globalTokenId,
                chain,
                address: address.toLowerCase(),
                symbol,
            },
            include: {
                globalToken: true,
                userToken: true,
            },
        });
    }

    /**
     * Create a reference to a user token
     */
    private async createUserTokenReference(
        userTokenId: string,
        chain: string,
        address: string,
        symbol: string
    ): Promise<TokenReferenceWithToken> {
        return await this.prisma.tokenReference.create({
            data: {
                tokenType: "user",
                userTokenId,
                chain,
                address: address.toLowerCase(),
                symbol,
            },
            include: {
                globalToken: true,
                userToken: true,
            },
        });
    }

    /**
     * Get a token reference by ID with included token data
     */
    async getReferenceById(
        referenceId: string
    ): Promise<TokenReferenceWithToken | null> {
        return await this.prisma.tokenReference.findUnique({
            where: { id: referenceId },
            include: {
                globalToken: true,
                userToken: true,
            },
        });
    }

    /**
     * Find existing reference by chain and address
     */
    async findReference(
        chain: string,
        address: string
    ): Promise<TokenReferenceWithToken | null> {
        return await this.prisma.tokenReference.findFirst({
            where: {
                chain,
                address: address.toLowerCase(),
            },
            include: {
                globalToken: true,
                userToken: true,
            },
        });
    }

    /**
     * Get unified token data from a token reference
     */
    getUnifiedTokenData(reference: TokenReferenceWithToken): UnifiedTokenData {
        if (reference.tokenType === "global" && reference.globalToken) {
            const token = reference.globalToken;
            return {
                id: token.id,
                chain: token.chain,
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoUrl: token.logoUrl,
                type: "global",
                isVerified: token.verified,
            };
        }

        if (reference.tokenType === "user" && reference.userToken) {
            const token = reference.userToken;
            return {
                id: token.id,
                chain: token.chain,
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoUrl: token.logoUrl,
                type: "user",
                isVerified: false,
                userLabel: token.userLabel,
                notes: token.notes,
                userId: token.userId,
            };
        }

        throw new Error(
            "Invalid token reference: neither global nor user token is set"
        );
    }

    /**
     * Type guard: check if reference points to a global token
     */
    isGlobalReference(reference: TokenReferenceWithToken): boolean {
        return (
            reference.tokenType === "global" && reference.globalToken !== null
        );
    }

    /**
     * Type guard: check if reference points to a user token
     */
    isUserReference(reference: TokenReferenceWithToken): boolean {
        return reference.tokenType === "user" && reference.userToken !== null;
    }

    /**
     * Get the actual token object from a reference (polymorphic)
     */
    getTokenFromReference(
        reference: TokenReferenceWithToken
    ): Token | UserToken {
        if (this.isGlobalReference(reference)) {
            return reference.globalToken!;
        }
        if (this.isUserReference(reference)) {
            return reference.userToken!;
        }
        throw new Error("Invalid token reference");
    }

    /**
     * Update the cached symbol in a token reference
     * Called when the underlying token data changes
     */
    async updateReferenceCache(
        referenceId: string,
        symbol: string
    ): Promise<void> {
        await this.prisma.tokenReference.update({
            where: { id: referenceId },
            data: {
                symbol,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Clean up orphaned references (references whose tokens have been deleted)
     */
    async cleanupOrphanedReferences(): Promise<number> {
        const orphanedGlobal = await this.prisma.tokenReference.findMany({
            where: {
                tokenType: "global",
                globalToken: null,
            },
        });

        const orphanedUser = await this.prisma.tokenReference.findMany({
            where: {
                tokenType: "user",
                userToken: null,
            },
        });

        const orphanedIds = [
            ...orphanedGlobal.map((ref) => ref.id),
            ...orphanedUser.map((ref) => ref.id),
        ];

        if (orphanedIds.length > 0) {
            await this.prisma.tokenReference.deleteMany({
                where: {
                    id: {
                        in: orphanedIds,
                    },
                },
            });
        }

        return orphanedIds.length;
    }

    /**
     * Close database connection (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.tokenResolver.disconnect();
        await this.prisma.$disconnect();
    }
}
