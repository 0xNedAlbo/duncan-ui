// TickPriceInput.tsx
import * as React from "react";
import { Box, Stack, TextField, IconButton, Tooltip } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

export type TickPriceInputProps = {
    /** Beschriftung über dem Feld, z. B. "Min price" oder "Max price" */
    label?: string;
    /** Aktueller Tick dieses Rands (muss ein Vielfaches von tickSpacing sein) */
    tick: number;
    /** Wird bei Änderungen (± Buttons) aufgerufen */
    onTickChange: (nextTick: number) => void;
    /** Tick-Abstand des Pools (z. B. 1, 10, 60, 200) */
    tickSpacing: number;
    /** Globale Grenzen des Pools (i. d. R. -887272 / +887272) */
    minTick: number;
    maxTick: number;

    /** Vorformatierter Preis-String für die Anzeige (z. B. aus formatFractionHuman) */
    displayValue: string;

    /** Optional: disabled state */
    disabled?: boolean;

    /** Optional: Schrittweite bei gehaltener Shift-Taste (Default 10) */
    shiftStepMultiplier?: number;

    /** Optional: aria-label für die Buttons */
    ariaLabelDecrement?: string;
    ariaLabelIncrement?: string;

    /** Test-ID */
    "data-testid"?: string;
};

export default function TickPriceInput({
    label,
    tick,
    onTickChange,
    tickSpacing,
    minTick,
    maxTick,
    displayValue,
    disabled = false,
    shiftStepMultiplier = 10,
    ariaLabelDecrement = "Decrease tick",
    ariaLabelIncrement = "Increase tick",
    "data-testid": testId,
}: TickPriceInputProps) {
    // präzise nutzbarer Bereich (Vielfache von tickSpacing)
    const minUsable = React.useMemo(
        () => Math.ceil(minTick / tickSpacing) * tickSpacing,
        [minTick, tickSpacing]
    );
    const maxUsable = React.useMemo(
        () => Math.floor(maxTick / tickSpacing) * tickSpacing,
        [maxTick, tickSpacing]
    );

    const clampSnap = React.useCallback(
        (t: number) => {
            // zuerst auf Vielfaches snappen, dann clampen
            const snapped = Math.round(t / tickSpacing) * tickSpacing;
            return Math.min(maxUsable, Math.max(minUsable, snapped));
        },
        [tickSpacing, minUsable, maxUsable]
    );

    const applyStep = React.useCallback(
        (dir: 1 | -1, e: React.MouseEvent<HTMLButtonElement>) => {
            const mult = e.shiftKey ? shiftStepMultiplier : 1;
            const delta = dir * mult * tickSpacing;
            const next = clampSnap(tick + delta);
            if (next !== tick) onTickChange(next);
        },
        [tick, tickSpacing, shiftStepMultiplier, clampSnap, onTickChange]
    );

    const canDec = tick > minUsable && !disabled;
    const canInc = tick < maxUsable && !disabled;

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            data-testid={testId}
            sx={{ width: "100%" }}
        >
            <Box sx={{ flex: 1 }}>
                <TextField
                    fullWidth
                    label={label}
                    value={displayValue}
                    InputProps={{ readOnly: true }}
                    size="small"
                />
            </Box>

            <Tooltip
                title={`−${tickSpacing} Tick (Shift: ×${shiftStepMultiplier})`}
            >
                <span>
                    <IconButton
                        color="inherit"
                        aria-label={ariaLabelDecrement}
                        onClick={(e) => applyStep(-1, e)}
                        disabled={!canDec}
                        size="small"
                    >
                        <RemoveIcon />
                    </IconButton>
                </span>
            </Tooltip>

            <Tooltip
                title={`+${tickSpacing} Tick (Shift: ×${shiftStepMultiplier})`}
            >
                <span>
                    <IconButton
                        color="inherit"
                        aria-label={ariaLabelIncrement}
                        onClick={(e) => applyStep(1, e)}
                        disabled={!canInc}
                        size="small"
                    >
                        <AddIcon />
                    </IconButton>
                </span>
            </Tooltip>
        </Stack>
    );
}
