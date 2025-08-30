import React, { useState } from "react";
import { Section } from "../common/Section";
import { sortEvmAddresses } from "@/utils/evmAddress";
import { useUniswapV3PositionByBaseAmount } from "@/hooks/duncan/useUniswapV3Position";

export function UniswapPositionContainer() {
    const [token0Address, token1Address] = sortEvmAddresses(
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    );
    const currentPrice = "4311";
    const lowerPrice = "3843";
    const upperPrice = "4760";

    const position = useUniswapV3PositionByBaseAmount({
        baseToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        quoteToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        baseAmount: "1.2",
        currentPrice: "4311",
        lowerPrice: "3883",
        upperPrice: "4750",
    });

    return (
        <Section heading={"Your Uniswap V3 Position"}>
            {position ? position.pool.token0.name : ""}
        </Section>
    );
}
