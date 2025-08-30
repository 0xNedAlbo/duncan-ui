import { PaletteMode } from "@mui/material";
import { createContext } from "react";

export type ColorModeContextType = {
    mode: PaletteMode;
    toggleColorMode: () => void;
};
export const ColorModeContext = createContext<ColorModeContextType>({
    mode: "light",
    toggleColorMode: () => {},
});
