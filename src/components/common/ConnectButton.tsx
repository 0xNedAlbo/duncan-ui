"use client";

import { useEffect, useState } from "react";
import {
    AccountCircleOutlined,
    LoginOutlined,
    ExpandMore as ExpandMoreIcon,
    Link as LinkIcon,
    PowerSettingsNew as PowerIcon,
} from "@mui/icons-material";
import {
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
} from "@mui/material";
import { ConnectKitButton } from "connectkit";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
    const { connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const { isConnected, address } = useAccount();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) =>
        setAnchorEl(e.currentTarget);
    const closeMenu = () => setAnchorEl(null);

    return (
        <ConnectKitButton.Custom>
            {({ show, truncatedAddress, ensName }) => {
                const ready = mounted;
                const hasConnector = connectors.length > 0;
                const label = isConnected
                    ? (ensName ?? truncatedAddress)
                    : "Connect Wallet";

                // ✅ Nur noch bei fehlendem Mount oder ohne Connectoren deaktivieren
                const disabled = !ready || (!isConnected && !hasConnector);

                return (
                    <Tooltip
                        title={
                            !hasConnector && !isConnected
                                ? "Kein Wallet erkannt"
                                : ""
                        }
                        disableHoverListener={hasConnector || isConnected}
                    >
                        <span>
                            <Button
                                variant="outlined"
                                size="large"
                                color="inherit"
                                aria-label={
                                    isConnected
                                        ? "Wallet-Details"
                                        : "Wallet verbinden"
                                }
                                startIcon={
                                    isConnected ? (
                                        <AccountCircleOutlined />
                                    ) : (
                                        <LoginOutlined />
                                    )
                                }
                                endIcon={
                                    isConnected ? <ExpandMoreIcon /> : undefined
                                }
                                disabled={disabled}
                                onClick={(e) => {
                                    if (isConnected) openMenu(e);
                                    else show?.();
                                }}
                            >
                                {ready ? label : " "}
                            </Button>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={closeMenu}
                            >
                                <MenuItem
                                    onClick={() => {
                                        closeMenu();
                                        show?.(); // ConnectKit-Modal (Details/Switch)
                                    }}
                                >
                                    <ListItemIcon>
                                        <LinkIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Wallet-Details"
                                        secondary={
                                            address ? address : undefined
                                        }
                                    />
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        closeMenu();
                                        disconnect();
                                    }}
                                >
                                    <ListItemIcon>
                                        <PowerIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary="Disconnect" />
                                </MenuItem>
                            </Menu>
                        </span>
                    </Tooltip>
                );
            }}
        </ConnectKitButton.Custom>
    );
}
