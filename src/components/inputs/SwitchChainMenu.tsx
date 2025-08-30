import { Button, Menu, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import { Chain } from "viem";
import { useChainId, useSwitchChain } from "wagmi";

export function SwitchChainMenu() {
    const currentChainId = useChainId();
    const { chains, switchChain } = useSwitchChain();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [currentChain, setCurrentChain] = useState<Chain>();

    useEffect(() => {
        const _currentChain = chains.find(
            (chain) => chain.id === currentChainId
        );
        setCurrentChain(_currentChain);
    }, [currentChainId, chains]);

    function handleMenuOpen(event: React.MouseEvent<HTMLButtonElement>) {
        setAnchorEl(event.currentTarget);
    }

    function handleChainSelect(
        event: React.MouseEvent<HTMLElement>,
        _chainId: number
    ) {
        const targetEl = event.currentTarget;
        //const _chainId = (targetEl as any as { key: number }).key;
        switchChain({ chainId: _chainId as any });
        handleMenuClose();
    }

    function handleMenuClose() {
        setAnchorEl(null);
    }

    return (
        <>
            <Button
                onClick={handleMenuOpen}
                style={{ whiteSpace: "nowrap" }}
                variant="text"
                color="inherit"
                disableElevation
            >
                {currentChain?.name}
            </Button>
            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                MenuListProps={{
                    "aria-labelledby": "basic-button",
                }}
            >
                {chains.map((chain) => (
                    <MenuItem
                        key={chain.id}
                        onClick={(event) => handleChainSelect(event, chain.id)}
                    >
                        {chain.name}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
