import { randomBytes } from "crypto";
import { hash, verify } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

export type GeneratedKey = {
  plaintext: string;
  prefix: string;
  id: string
};

export type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  monthlyUsage: number;
  dailyUsage: number;
};

export type ApiKeyAuthResult = {
  isValid: boolean;
  userId?: string;
  keyId?: string;
};

function base32(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export class ApiKeyService {
  // eslint-disable-next-line no-unused-vars
  constructor(private prisma: PrismaClient) {}

  async createApiKey(
    userId: string,
    name: string,
    scopes: string[] = []
  ): Promise<GeneratedKey> {
    const raw = base32(randomBytes(32));
    const prefix = raw.slice(0, 8);
    const plaintext = `ak_live_${raw}`;

    const hashed = await hash(plaintext, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const rec = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        prefix,
        hash: hashed,
        scopes,
      },
      select: {
        id: true,
        prefix: true,
      },
    });

    return {
      plaintext,
      prefix,
      id: rec.id,
    };
  }

  async verifyApiKey(plaintext: string): Promise<ApiKeyAuthResult> {
    if (!plaintext.startsWith("ak_live_")) {
      return { isValid: false };
    }

    const raw = plaintext.replace("ak_live_", "");
    const prefix = raw.slice(0, 8);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        prefix,
        revokedAt: null,
      },
      select: {
        id: true,
        userId: true,
        hash: true,
      },
    });

    if (!apiKey) {
      return { isValid: false };
    }

    try {
      const isValid = await verify(apiKey.hash, plaintext);

      if (isValid) {
        await this.updateLastUsed(apiKey.id);

        return {
          isValid: true,
          userId: apiKey.userId,
          keyId: apiKey.id,
        };
      }
    } catch {
      return { isValid: false };
    }

    return { isValid: false };
  }

  async listUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
        monthlyUsage: true,
        dailyUsage: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return keys;
  }

  async revokeApiKey(userId: string, keyId: string): Promise<boolean> {
    const result = await this.prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  async getApiKey(userId: string, keyId: string): Promise<ApiKeyInfo | null> {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
        monthlyUsage: true,
        dailyUsage: true,
      },
    });

    return key;
  }

  private async updateLastUsed(keyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }
}