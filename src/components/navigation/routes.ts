// All route metadata in one place to keep nav consistent across the app.
export type AppRoute = {
    label: string;
    href: string;
    exact?: boolean;
    hidden?: boolean;
};

export const appRoutes: AppRoute[] = [
    { label: "Home", href: "/", exact: true },
    { label: "Pools", href: "/pools" },
    { label: "Positions", href: "/positions" },
    { label: "Backtest", href: "/backtest" },
    { label: "Settings", href: "/settings" },
];
