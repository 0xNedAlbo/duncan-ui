"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumbs, Typography } from "@mui/material";

// Lightweight breadcrumbs derived from the current pathname.
export function BreadcrumbsNav() {
    const pathname = usePathname();

    const crumbs = useMemo(() => {
        const segments = pathname.split("/").filter(Boolean);
        const acc: { label: string; href: string }[] = [];
        let path = "";
        for (const s of segments) {
            path += `/${s}`;
            acc.push({ label: decodeURIComponent(s), href: path });
        }
        return acc;
    }, [pathname]);

    if (crumbs.length === 0) return null;

    return (
        <Breadcrumbs aria-label="breadcrumb" sx={{ px: 2, py: 1 }}>
            <Link href="/">home</Link>
            {crumbs.slice(0, -1).map((c) => (
                <Link key={c.href} href={c.href}>
                    {c.label}
                </Link>
            ))}
            <Typography color="text.primary">{crumbs.at(-1)?.label}</Typography>
        </Breadcrumbs>
    );
}
