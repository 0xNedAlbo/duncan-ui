import type { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";

// load .env.local first, fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const THE_GRAPH_API_KEY = process.env.THE_GRAPH_API_KEY;

if (!THE_GRAPH_API_KEY) {
    console.warn(
        "⚠️  GRAPH_API_KEY is missing. Make sure it’s set in .env.local"
    );
}

const config: CodegenConfig = {
    overwrite: true,
    schema: [
        `https://gateway.thegraph.com/api/${THE_GRAPH_API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`,
    ],
    documents: "src/**/*.graphql",
    generates: {
        "src/graphql/types.generated.ts": {
            plugins: ["typescript", "typescript-operations"],
            config: {
                scalars: {
                    BigInt: "string", // or 'bigint'
                    BigDecimal: "string",
                    Bytes: "string",
                },
            },
        },
    },
};

export default config;
