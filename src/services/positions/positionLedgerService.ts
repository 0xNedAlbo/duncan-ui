/**
 * Position Ledger Service
 *
 * Provides unified access to position events with integrated PnL calculations.
 * Fetches events from blockchain via Etherscan and processes them through
 * EventStateCalculator to get calculated states and PnL data.
 */

import type { Clients } from "../ClientsFactory";
import type { Services } from "../ServiceFactory";
import { EtherscanEventService } from "../etherscan/etherscanEventService";
import type { RawPositionEvent } from "../etherscan/etherscanEventService";
import { TokenService } from "../tokens/tokenService";
import { PrismaClient } from "@prisma/client";

export class PositionLedgerService {
    private prisma: PrismaClient;
    private etherscanEventService: EtherscanEventService;
    private tokenService: TokenService;

    constructor(
        requiredClients: Pick<Clients, "prisma" | "etherscanClient">,
        requiredServices: Pick<Services, "tokenService">
    ) {
        this.prisma = requiredClients.prisma;
        this.etherscanEventService = new EtherscanEventService({
            etherscanClient: requiredClients.etherscanClient,
        });
        this.tokenService = requiredServices.tokenService;
    }

    /**
     * Calculate position status based on liquidity events
     */
    calculatePositionStatus(events: RawPositionEvent[]): {
        status: "open" | "closed";
        currentLiquidity: bigint;
    } {
        let netLiquidity = 0n;

        for (const event of events) {
            if (event.eventType === "INCREASE_LIQUIDITY") {
                netLiquidity += BigInt(event.liquidity!);
            } else if (event.eventType === "DECREASE_LIQUIDITY") {
                netLiquidity -= BigInt(event.liquidity!);
            }
            // COLLECT events don't affect liquidity
        }

        return {
            status: netLiquidity === 0n ? "closed" : "open",
            currentLiquidity: netLiquidity,
        };
    }
}
