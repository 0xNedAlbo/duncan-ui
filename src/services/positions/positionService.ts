import { prisma } from '@/lib/prisma';
import { getInitialValueService } from './initialValueService';
import { determineQuoteToken, formatTokenPair } from './quoteTokenService';
import type { InitialValueResult } from './initialValueService';

export interface PositionWithPnL {
  // Basic Position Data
  id: string;
  nftId?: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  owner?: string;
  importType: string;
  status: string;
  createdAt: Date;

  // Pool & Token Data
  pool: {
    id: string;
    chain: string;
    poolAddress: string;
    fee: number;
    currentPrice?: string;
    token0: {
      id: string;
      symbol: string;
      name: string;
      decimals: number;
      logoUrl?: string;
    };
    token1: {
      id: string;
      symbol: string;
      name: string;
      decimals: number;
      logoUrl?: string;
    };
  };

  // Quote Token Configuration
  token0IsQuote: boolean;
  tokenPair: string; // "WETH/USDC"
  baseSymbol: string;
  quoteSymbol: string;

  // PnL Data
  initialValue: string;
  currentValue: string;
  pnl: string;
  pnlPercent: number;
  initialSource: 'subgraph' | 'snapshot';
  confidence: 'exact' | 'estimated';

  // Range Status
  rangeStatus: 'in-range' | 'out-of-range' | 'unknown';
  
  // Meta
  lastUpdated: Date;
  dataUpdated?: boolean; // True wenn Initial Value upgraded wurde
}

export interface PositionListOptions {
  userId: string;
  status?: string;
  chain?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'currentValue' | 'pnl' | 'pnlPercent';
  sortOrder?: 'asc' | 'desc';
}

export class PositionService {
  private readonly initialValueService = getInitialValueService();

  /**
   * Holt alle Positionen eines Users mit PnL-Berechnungen
   */
  async getPositionsWithPnL(options: PositionListOptions): Promise<{
    positions: PositionWithPnL[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      userId,
      status = 'active',
      chain,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Build WHERE clause
    const where: any = {
      userId,
      status
    };

    if (chain) {
      where.pool = { chain };
    }

    // Fetch positions from DB
    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        },
        orderBy: this.buildOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset
      }),
      prisma.position.count({ where })
    ]);

    // Calculate PnL for each position
    const positionsWithPnL: PositionWithPnL[] = [];

    for (const position of positions) {
      try {
        const pnlData = await this.calculatePositionPnL(position.id);
        positionsWithPnL.push(pnlData);
      } catch (error) {
        console.error(`Error calculating PnL for position ${position.id}:`, error);
        // Skip positions with errors
      }
    }

    // Client-side sorting wenn nach PnL sortiert (da berechnet)
    if (sortBy === 'pnl' || sortBy === 'pnlPercent') {
      positionsWithPnL.sort((a, b) => {
        const aVal = sortBy === 'pnl' ? parseFloat(a.pnl) : a.pnlPercent;
        const bVal = sortBy === 'pnl' ? parseFloat(b.pnl) : b.pnlPercent;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    return {
      positions: positionsWithPnL,
      total,
      hasMore: offset + positions.length < total
    };
  }

  /**
   * Berechnet PnL für eine einzelne Position
   */
  async calculatePositionPnL(positionId: string): Promise<PositionWithPnL> {
    // 1. Position und Initial Value laden
    const [position, initialValue] = await Promise.all([
      prisma.position.findUnique({
        where: { id: positionId },
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        }
      }),
      this.initialValueService.getOrUpdateInitialValue(positionId)
    ]);

    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    // 2. Quote Token bestimmen
    const quoteConfig = determineQuoteToken(
      position.pool.token0!.symbol,
      position.pool.token0Address,
      position.pool.token1!.symbol,
      position.pool.token1Address,
      position.pool.chain
    );

    // 3. Update token0IsQuote falls noch nicht gesetzt
    if (position.token0IsQuote === null || position.token0IsQuote === undefined) {
      await prisma.position.update({
        where: { id: positionId },
        data: { token0IsQuote: quoteConfig.token0IsQuote }
      });
    }

    // 4. Aktuellen Wert berechnen (Simplified)
    const currentValue = await this.calculateCurrentValue(position);

    // 5. PnL berechnen
    const pnl = parseFloat(currentValue) - parseFloat(initialValue.value);
    const pnlPercent = (pnl / parseFloat(initialValue.value)) * 100;

    // 6. Range Status bestimmen
    const rangeStatus = this.determineRangeStatus(position);

    return {
      // Basic Data
      id: position.id,
      nftId: position.nftId || undefined,
      liquidity: position.liquidity,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      owner: position.owner || undefined,
      importType: position.importType,
      status: position.status,
      createdAt: position.createdAt,

      // Pool & Token Data
      pool: {
        id: position.pool.id,
        chain: position.pool.chain,
        poolAddress: position.pool.poolAddress,
        fee: position.pool.fee,
        currentPrice: position.pool.currentPrice || undefined,
        token0: {
          id: position.pool.token0!.id,
          symbol: position.pool.token0!.symbol,
          name: position.pool.token0!.name,
          decimals: position.pool.token0!.decimals,
          logoUrl: position.pool.token0!.logoUrl || undefined
        },
        token1: {
          id: position.pool.token1!.id,
          symbol: position.pool.token1!.symbol,
          name: position.pool.token1!.name,
          decimals: position.pool.token1!.decimals,
          logoUrl: position.pool.token1!.logoUrl || undefined
        }
      },

      // Quote Token Configuration
      token0IsQuote: quoteConfig.token0IsQuote,
      tokenPair: formatTokenPair(
        position.pool.token0!.symbol,
        position.pool.token1!.symbol,
        quoteConfig.token0IsQuote
      ),
      baseSymbol: quoteConfig.baseSymbol,
      quoteSymbol: quoteConfig.quoteSymbol,

      // PnL Data
      initialValue: initialValue.value,
      currentValue,
      pnl: pnl.toFixed(2),
      pnlPercent: parseFloat(pnlPercent.toFixed(2)),
      initialSource: initialValue.source,
      confidence: initialValue.confidence,

      // Range Status
      rangeStatus,

      // Meta
      lastUpdated: new Date(),
      dataUpdated: initialValue.updated
    };
  }

  /**
   * Berechnet aktuellen Wert der Position
   * TODO: Richtige Implementierung mit Uniswap V3 SDK
   */
  private async calculateCurrentValue(position: any): Promise<string> {
    // Simplified Implementation - wird später durch Uniswap V3 SDK ersetzt
    const liquidity = BigInt(position.liquidity);
    
    // Dummy calculation based on liquidity
    const value = Number(liquidity) / 1e18 * 3000; // ~3000 USD pro "unit"
    
    return value.toFixed(2);
  }

  /**
   * Bestimmt ob Position in Range ist
   * TODO: Implementierung mit Pool Current Tick
   */
  private determineRangeStatus(position: any): 'in-range' | 'out-of-range' | 'unknown' {
    if (!position.pool.currentTick) {
      return 'unknown';
    }

    const currentTick = position.pool.currentTick;
    const { tickLower, tickUpper } = position;

    if (currentTick >= tickLower && currentTick <= tickUpper) {
      return 'in-range';
    } else {
      return 'out-of-range';
    }
  }

  /**
   * Helper für Order By Clause
   */
  private buildOrderBy(sortBy: string, sortOrder: string) {
    switch (sortBy) {
      case 'createdAt':
        return { createdAt: sortOrder };
      case 'currentValue':
        // Note: Actual sorting by calculated values happens client-side
        return { createdAt: sortOrder }; // Fallback
      default:
        return { createdAt: sortOrder };
    }
  }

  /**
   * Refresht Position-Daten (Pool + Initial Value)
   */
  async refreshPosition(positionId: string): Promise<PositionWithPnL> {
    // 1. Pool-Daten refreshen (wenn Pool Service existiert)
    // TODO: Integrate with Pool Service

    // 2. Initial Value updaten
    await this.initialValueService.getOrUpdateInitialValue(positionId);

    // 3. Neue PnL berechnen
    return await this.calculatePositionPnL(positionId);
  }
}

// Singleton Instance
let positionServiceInstance: PositionService | null = null;

export function getPositionService(): PositionService {
  if (!positionServiceInstance) {
    positionServiceInstance = new PositionService();
  }
  return positionServiceInstance;
}