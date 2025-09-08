import { prisma } from '@/lib/prisma';
import { getSubgraphService } from '@/services/subgraph';
import type { InitialValueData } from '@/types/subgraph';

export interface InitialValueResult {
  value: string;           // Gesamtwert in Quote Asset
  token0Amount: string;    // Menge Token0
  token1Amount: string;    // Menge Token1
  timestamp: Date;         // Erstellungs- oder Import-Zeitpunkt
  source: 'subgraph' | 'snapshot';
  confidence: 'exact' | 'estimated';
  updated?: boolean;       // True wenn von Snapshot zu Subgraph upgraded
}

export class InitialValueService {
  private readonly subgraphService = getSubgraphService();

  /**
   * Holt oder aktualisiert Initial Value für eine Position
   * Auto-Upgrade Mechanismus: Snapshot → Subgraph
   */
  async getOrUpdateInitialValue(positionId: string): Promise<InitialValueResult> {
    // 1. Position aus DB laden
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        pool: {
          include: {
            token0Ref: {
              include: {
                globalToken: true,
                userToken: true,
              },
            },
            token1Ref: {
              include: {
                globalToken: true,
                userToken: true,
              },
            },
          }
        }
      }
    });

    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    // 2. Wenn bereits Subgraph-Daten vorhanden, nutze diese
    if (position.initialSource === 'subgraph' && position.initialValue) {
      return {
        value: position.initialValue,
        token0Amount: position.initialToken0Amount!,
        token1Amount: position.initialToken1Amount!,
        timestamp: position.initialTimestamp!,
        source: 'subgraph',
        confidence: 'exact'
      };
    }

    // 3. Versuche Subgraph-Update (nur bei NFT Positionen)
    if (position.nftId && position.initialSource !== 'subgraph') {
      try {
        const subgraphData = await this.subgraphService.fetchPositionHistory(
          position.nftId,
          position.pool.chain
        );

        if (subgraphData) {
          // Update Position mit Subgraph-Daten
          await prisma.position.update({
            where: { id: positionId },
            data: {
              initialValue: subgraphData.value,
              initialToken0Amount: subgraphData.token0Amount,
              initialToken1Amount: subgraphData.token1Amount,
              initialTimestamp: subgraphData.timestamp,
              initialSource: 'subgraph'
            }
          });

          return {
            value: subgraphData.value,
            token0Amount: subgraphData.token0Amount,
            token1Amount: subgraphData.token1Amount,
            timestamp: subgraphData.timestamp,
            source: 'subgraph',
            confidence: 'exact',
            updated: true // Signal für UI
          };
        }
      } catch (error) {
        console.error(`Subgraph update failed for position ${positionId}:`, error);
        // Fallback zu Snapshot - kein Fehler werfen
      }
    }

    // 4. Nutze Snapshot-Daten
    if (position.initialValue) {
      return {
        value: position.initialValue,
        token0Amount: position.initialToken0Amount!,
        token1Amount: position.initialToken1Amount!,
        timestamp: position.initialTimestamp || position.createdAt,
        source: 'snapshot',
        confidence: 'estimated'
      };
    }

    // 5. Fallback: Erstelle neuen Snapshot
    return await this.createSnapshot(positionId);
  }

  /**
   * Erstellt Snapshot für Position ohne Initial Value
   */
  async createSnapshot(positionId: string): Promise<InitialValueResult> {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        pool: {
          include: {
            token0Ref: {
              include: {
                globalToken: true,
                userToken: true,
              },
            },
            token1Ref: {
              include: {
                globalToken: true,
                userToken: true,
              },
            },
          }
        }
      }
    });

    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    // Berechne aktuellen Wert als Snapshot
    const currentValue = await this.calculateCurrentPositionValue(position);
    const now = new Date();

    // Speichere Snapshot in DB
    await prisma.position.update({
      where: { id: positionId },
      data: {
        initialValue: currentValue.totalValue,
        initialToken0Amount: currentValue.token0Amount,
        initialToken1Amount: currentValue.token1Amount,
        initialTimestamp: now,
        initialSource: 'snapshot'
      }
    });

    return {
      value: currentValue.totalValue,
      token0Amount: currentValue.token0Amount,
      token1Amount: currentValue.token1Amount,
      timestamp: now,
      source: 'snapshot',
      confidence: 'estimated'
    };
  }

  /**
   * Berechnet aktuellen Position Value
   * TODO: Implementierung mit Uniswap V3 SDK oder eigene Math
   */
  private async calculateCurrentPositionValue(position: any): Promise<{
    totalValue: string;
    token0Amount: string;
    token1Amount: string;
  }> {
    // Vereinfachte Implementierung - wird später mit Uniswap V3 SDK ersetzt
    const liquidity = BigInt(position.liquidity);
    
    // Für jetzt: Dummy-Werte basierend auf Liquidity
    // In echter Implementation: Position value basierend auf current price
    const token0Amount = (Number(liquidity) / 1e18 * 0.5).toString();
    const token1Amount = (Number(liquidity) / 1e6 * 1000).toString();
    const totalValue = (Number(token0Amount) * 2000 + Number(token1Amount)).toString();

    return {
      totalValue,
      token0Amount,
      token1Amount
    };
  }

  /**
   * Batch-Update für mehrere Positionen
   */
  async batchUpdateInitialValues(positionIds: string[]): Promise<{
    updated: number;
    errors: Array<{ positionId: string; error: string }>;
  }> {
    let updated = 0;
    const errors: Array<{ positionId: string; error: string }> = [];

    for (const positionId of positionIds) {
      try {
        const result = await this.getOrUpdateInitialValue(positionId);
        if (result.updated) {
          updated++;
        }
      } catch (error) {
        errors.push({
          positionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { updated, errors };
  }
}

// Singleton Instance
let initialValueServiceInstance: InitialValueService | null = null;

export function getInitialValueService(): InitialValueService {
  if (!initialValueServiceInstance) {
    initialValueServiceInstance = new InitialValueService();
  }
  return initialValueServiceInstance;
}