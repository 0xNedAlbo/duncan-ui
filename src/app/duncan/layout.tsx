import { ReactNode } from "react";
import { Providers } from "./providers";
import { cookieToInitialState } from "wagmi";
import { getConfig } from "@/wagmiConfig";
import { headers } from "next/headers";

export default function DuncanLayout(props: { children: ReactNode }) {
    const initialState = cookieToInitialState(
        getConfig(),
        headers().get("cookie")
    );

    return <Providers initialState={initialState}>{props.children}</Providers>;
}
