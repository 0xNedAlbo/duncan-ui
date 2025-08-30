import {
    AccountCircle,
    AccountCircleOutlined,
    LoginOutlined,
    NetworkCheck,
    Token,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import { ConnectKitButton } from "connectkit";

export function ConnectButton() {
    return (
        <ConnectKitButton.Custom>
            {({ isConnected, show, truncatedAddress, ensName }) => {
                return (
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={show}
                        color={"inherit"}
                        startIcon={
                            isConnected ? (
                                <AccountCircleOutlined />
                            ) : (
                                <LoginOutlined />
                            )
                        }
                    >
                        {isConnected
                            ? (ensName ?? truncatedAddress)
                            : "Connect Wallet"}
                    </Button>
                );
            }}
        </ConnectKitButton.Custom>
    );
}
