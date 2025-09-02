import {
    Box,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Alert,
    IconButton,
    Tooltip,
} from "@mui/material";
import { ContentCopy, OpenInNew } from "@mui/icons-material";
import { useState } from "react";
import { EvmBlockchain, evmChainlist } from "@/utils/evmBlockchain";
import { Erc20Token } from "@/utils/erc20Token";
import { UniswapV3Pool, poolName } from "@/utils/uniswapV3/uniswapV3Pool";

export type PoolStepProps = {
    chain?: EvmBlockchain;
    quoteToken?: Erc20Token;
    baseToken?: Erc20Token;
    isLoading: boolean;
    pools: UniswapV3Pool[];
    error: string | null;
    onPoolSelect: (pool: UniswapV3Pool) => void;
    selectedPool?: UniswapV3Pool;
};

export function PoolStep(props: PoolStepProps) {
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        // Auto-hide tooltip after 1.5 seconds
        setTimeout(() => setCopiedAddress(null), 1500);
    };

    const handleOpenExplorer = (address: string) => {
        if (!props.chain) return;

        const blockchain = evmChainlist.find(
            (chain) => chain.id === props.chain!.id
        );
        if (blockchain) {
            const explorerUrl = `${blockchain.explorerUrl}/address/${address}`;
            window.open(explorerUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <Box display="flex" justifyContent="flex-start">
            <Box maxWidth="600px" textAlign="left">
                {props.isLoading ? (
                    <>
                        <Box
                            display="flex"
                            alignItems="center"
                            marginBottom="1em"
                            gap={2}
                        >
                            <CircularProgress size={24} />
                            <Typography
                                variant="subtitle1"
                                color="text.primary"
                            >
                                Finding available pools with your selected
                                assets.
                            </Typography>
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            marginBottom="0.5em"
                        >
                            We are currently searching for available liquidity
                            pools with your selected assets:
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ fontWeight: 500 }}
                        >
                            {props.baseToken?.symbol} /{" "}
                            {props.quoteToken?.symbol} on {props.chain?.name}
                        </Typography>
                    </>
                ) : props.error ? (
                    <Alert severity="error" sx={{ marginBottom: "1em" }}>
                        <Typography variant="body2">{props.error}</Typography>
                    </Alert>
                ) : props.pools.length === 0 ? (
                    <>
                        <Typography
                            variant="subtitle1"
                            color="text.primary"
                            marginBottom="1em"
                        >
                            No pools found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            No liquidity pools were found for{" "}
                            {props.baseToken?.symbol} /{" "}
                            {props.quoteToken?.symbol} on {props.chain?.name}.
                            This token pair may not have any active pools on
                            this network.
                        </Typography>
                    </>
                ) : (
                    <>
                        <Typography
                            variant="subtitle1"
                            color="text.primary"
                            marginBottom="1em"
                        >
                            Please select a pool for your liquidity position
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            marginBottom="1em"
                            textAlign="left"
                        >
                            Found {props.pools.length} pool
                            {props.pools.length !== 1 ? "s" : ""} for{" "}
                            {props.baseToken?.symbol} /{" "}
                            {props.quoteToken?.symbol} (sorted by TVL):
                        </Typography>

                        <List>
                            {props.pools.length > 0
                                ? props.pools.map((pool) => (
                                      <ListItem
                                          key={pool.address}
                                          disablePadding
                                          sx={{
                                              border: 1,
                                              borderColor: "divider",
                                              borderRadius: 2,
                                              mb: 1,
                                              overflow: "hidden",
                                          }}
                                      >
                                          <ListItemButton
                                              onClick={() =>
                                                  props.onPoolSelect(pool)
                                              }
                                              selected={
                                                  props.selectedPool
                                                      ?.address === pool.address
                                              }
                                          >
                                              <ListItemText
                                                  primary={poolName(pool)}
                                                  secondary={
                                                      <Box
                                                          display="flex"
                                                          alignItems="center"
                                                          gap={0.5}
                                                      >
                                                          <span>
                                                              • Address:{" "}
                                                              {pool.address.slice(
                                                                  0,
                                                                  6
                                                              )}
                                                              ...
                                                              {pool.address.slice(
                                                                  -4
                                                              )}
                                                          </span>
                                                          <Tooltip
                                                              title={
                                                                  copiedAddress ===
                                                                  pool.address
                                                                      ? "Copied!"
                                                                      : "Copy address"
                                                              }
                                                              open={
                                                                  copiedAddress ===
                                                                      pool.address ||
                                                                  undefined
                                                              }
                                                              placement="top"
                                                              arrow
                                                          >
                                                              <IconButton
                                                                  size="small"
                                                                  onClick={(
                                                                      e
                                                                  ) => {
                                                                      e.stopPropagation();
                                                                      handleCopyAddress(
                                                                          pool.address
                                                                      );
                                                                  }}
                                                                  sx={{
                                                                      p: 0.25,
                                                                      minWidth:
                                                                          "auto",
                                                                  }}
                                                              >
                                                                  <ContentCopy
                                                                      sx={{
                                                                          fontSize: 14,
                                                                      }}
                                                                  />
                                                              </IconButton>
                                                          </Tooltip>
                                                          <Tooltip
                                                              title="View in explorer"
                                                              placement="top"
                                                              arrow
                                                          >
                                                              <IconButton
                                                                  size="small"
                                                                  onClick={(
                                                                      e
                                                                  ) => {
                                                                      e.stopPropagation();
                                                                      handleOpenExplorer(
                                                                          pool.address
                                                                      );
                                                                  }}
                                                                  sx={{
                                                                      p: 0.25,
                                                                      minWidth:
                                                                          "auto",
                                                                  }}
                                                              >
                                                                  <OpenInNew
                                                                      sx={{
                                                                          fontSize: 14,
                                                                      }}
                                                                  />
                                                              </IconButton>
                                                          </Tooltip>
                                                      </Box>
                                                  }
                                              />
                                          </ListItemButton>
                                      </ListItem>
                                  ))
                                : props.pools
                                      .sort(
                                          (poolA, poolB) =>
                                              poolA.fee - poolB.fee
                                      )
                                      .map((pool) => (
                                          <ListItem
                                              key={pool.address}
                                              disablePadding
                                              sx={{
                                                  border: 1,
                                                  borderColor: "divider",
                                                  borderRadius: 2,
                                                  mb: 1,
                                                  overflow: "hidden",
                                              }}
                                          >
                                              <ListItemButton
                                                  onClick={() =>
                                                      props.onPoolSelect(pool)
                                                  }
                                                  selected={
                                                      props.selectedPool
                                                          ?.address ===
                                                      pool.address
                                                  }
                                              >
                                                  <ListItemText
                                                      primary={poolName(pool)}
                                                      secondary={
                                                          <Box
                                                              display="flex"
                                                              alignItems="center"
                                                              gap={0.5}
                                                          >
                                                              <span>
                                                                  TVL:
                                                                  Loading... •
                                                                  Address:{" "}
                                                                  {pool.address.slice(
                                                                      0,
                                                                      6
                                                                  )}
                                                                  ...
                                                                  {pool.address.slice(
                                                                      -4
                                                                  )}
                                                              </span>
                                                              <Tooltip
                                                                  title={
                                                                      copiedAddress ===
                                                                      pool.address
                                                                          ? "Copied!"
                                                                          : "Copy address"
                                                                  }
                                                                  open={
                                                                      copiedAddress ===
                                                                          pool.address ||
                                                                      undefined
                                                                  }
                                                                  placement="top"
                                                                  arrow
                                                              >
                                                                  <IconButton
                                                                      size="small"
                                                                      onClick={(
                                                                          e
                                                                      ) => {
                                                                          e.stopPropagation();
                                                                          handleCopyAddress(
                                                                              pool.address
                                                                          );
                                                                      }}
                                                                      sx={{
                                                                          p: 0.25,
                                                                          minWidth:
                                                                              "auto",
                                                                      }}
                                                                  >
                                                                      <ContentCopy
                                                                          sx={{
                                                                              fontSize: 14,
                                                                          }}
                                                                      />
                                                                  </IconButton>
                                                              </Tooltip>
                                                              <Tooltip
                                                                  title="View in explorer"
                                                                  placement="top"
                                                                  arrow
                                                              >
                                                                  <IconButton
                                                                      size="small"
                                                                      onClick={(
                                                                          e
                                                                      ) => {
                                                                          e.stopPropagation();
                                                                          handleOpenExplorer(
                                                                              pool.address
                                                                          );
                                                                      }}
                                                                      sx={{
                                                                          p: 0.25,
                                                                          minWidth:
                                                                              "auto",
                                                                      }}
                                                                  >
                                                                      <OpenInNew
                                                                          sx={{
                                                                              fontSize: 14,
                                                                          }}
                                                                      />
                                                                  </IconButton>
                                                              </Tooltip>
                                                          </Box>
                                                      }
                                                  />
                                              </ListItemButton>
                                          </ListItem>
                                      ))}
                        </List>
                    </>
                )}
            </Box>
        </Box>
    );
}
