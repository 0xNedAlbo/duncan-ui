"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Box, Button } from "@mui/material";

type StepNavProps = {
    total: number;
};

export function StepNav({ total }: StepNavProps) {
    const params = useSearchParams();
    const router = useRouter();
    const current = Math.max(
        1,
        Math.min(Number(params.get("step") ?? "1"), total)
    );

    const go = (n: number) => {
        const next = Math.max(1, Math.min(n, total));
        const q = new URLSearchParams(params);
        q.set("step", String(next));
        router.push(`?${q.toString()}`);
    };

    return (
        <Box display="flex" gap={1} justifyContent="space-between" mt={2}>
            <Button
                disabled={current <= 1}
                onClick={() => go(current - 1)}
                variant="outlined"
            >
                Back
            </Button>
            <Button
                disabled={current >= total}
                onClick={() => go(current + 1)}
                variant="contained"
            >
                Next
            </Button>
        </Box>
    );
}
