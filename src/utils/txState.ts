export type TxState = "idle" | "loading" | "error" | "success";
export function isWriteSettled(txState: TxState): boolean {
    return txState === "success" || txState === "error";
}
