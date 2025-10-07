import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type SupportedLocale = "en-US" | "de-DE";

export type SettingsState = {
    locale: SupportedLocale;

    // Actions
    setLocale: (_newLocale: SupportedLocale) => void;
};

export const useSettingsStore = create<SettingsState>()(
    devtools(
        persist(
            (set) => ({
                // Initial state
                locale: "en-US",

                // Actions
                setLocale: (_newLocale) => set({ locale: _newLocale }),
            }),
            {
                name: "midcurve-settings",
                // Only persist certain fields
                partialize: (state) => ({
                    locale: state.locale,
                }),
            }
        ),
        { name: "midcurve-settings-store" }
    )
);
