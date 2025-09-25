#!/usr/bin/env bash
set -euo pipefail

# --- Config aus ENV lesen ---
RPC="${NEXT_PUBLIC_ARBITRUM_RPC_URL:-${RPC_URL:-}}"
if [[ -z "${RPC}" ]]; then
  echo "ERROR: RPC URL missing. Set NEXT_PUBLIC_ARBITRUM_RPC_URL or RPC_URL." >&2
  exit 1
fi

PORT="${PORT:-8545}"
HOST="${HOST:-0.0.0.0}"
CHAIN_ID="${CHAIN_ID:-31337}"
ACCOUNTS="${ACCOUNTS:-10}"
BALANCE="${BALANCE:-1000}"
FORK_BLOCK="${FORK_BLOCK:-}"

# Funding-Flags (optional)
FUND_ON_START="${FUND_ON_START:-0}"
TEST_ACCOUNT="${TEST_ACCOUNT:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
WETH_ADDRESS="${WETH_ADDRESS:-0x82aF49447D8a07e3bd95BD0d56f35241523fBab1}"
USDC_ADDRESS="${USDC_ADDRESS:-0xaf88d065e77c8cC2239327C5EDb3A432268e5831}"
USDC_WHALE="${USDC_WHALE:-0x47c031236e19d024b42f8AE6780E44A573170703}"
USDC_AMOUNT_6D="${USDC_AMOUNT_6D:-100000000000}"      # 100,000 USDC (6 decimals)
WETH_AMOUNT_ETH="${WETH_AMOUNT_ETH:-30}"              # 30 WETH
READY_TIMEOUT="${READY_TIMEOUT:-120}"                 # Sekunden bis wir aufgeben

echo "RPC_URL set              : ${RPC:0:40}…"
echo "CHAIN_ID                 : ${CHAIN_ID}"
echo "FORK_BLOCK               : ${FORK_BLOCK:-<none>}"
echo "ACCOUNTS (auto)          : ${ACCOUNTS}"
echo "Custom PRIVKEYS provided : $([[ -n "${PRIVKEYS:-}" ]] && echo yes || echo no)"
echo "FUND_ON_START            : ${FUND_ON_START}"

# --- anvil-Kommando bauen ---
cmd=(anvil --fork-url "${RPC}" --host "${HOST}" --port "${PORT}")
[[ -n "${CHAIN_ID}"   ]] && cmd+=(--chain-id "${CHAIN_ID}")
[[ -n "${FORK_BLOCK}" ]] && cmd+=(--fork-block-number "${FORK_BLOCK}")

if [[ "${ACCOUNTS}" != "0" ]]; then
  cmd+=(--accounts "${ACCOUNTS}" --balance "${BALANCE}")
fi

if [[ -n "${PRIVKEYS:-}" ]]; then
  IFS=',' read -r -a keys <<< "${PRIVKEYS}"
  for k in "${keys[@]}"; do
    k_trim="$(echo -n "${k}" | tr -d '[:space:]')"
    [[ -n "${k_trim}" ]] && cmd+=(--account "${k_trim}")
  done
fi

echo "Starting anvil…"
echo "CMD: ${cmd[*]//${RPC}/<REDACTED>}"

# --- anvil im Hintergrund starten ---
"${cmd[@]}" &
ANVIL_PID=$!

# --- auf RPC-Readiness warten ---
echo "Waiting for RPC readiness at http://127.0.0.1:${PORT} (timeout: ${READY_TIMEOUT}s)…"
ready=0
for i in $(seq 1 "${READY_TIMEOUT}"); do
  if printf '{"jsonrpc":"2.0","id":1,"method":"web3_clientVersion","params":[]}' \
    | curl -fsS -H 'Content-Type: application/json' --data @- "http://127.0.0.1:${PORT}" > /dev/null; then
    ready=1; break
  fi
  sleep 1
done

if [[ "${ready}" != "1" ]]; then
  echo "WARN: RPC not ready after ${READY_TIMEOUT}s – continuing anyway."
fi

# --- optionales Funding im selben Container ---
if [[ "${FUND_ON_START}" == "1" ]]; then
  echo "Funding start: WETH=${WETH_AMOUNT_ETH}, USDC(6d)=${USDC_AMOUNT_6D} to ${TEST_ACCOUNT}"

  (
    set -euo pipefail

    # 1) WETH: deposit() vom TEST_ACCOUNT über PRIVATE_KEY
    echo "WETH deposit ${WETH_AMOUNT_ETH} ETH to WETH(${WETH_ADDRESS})"
    cast send "${WETH_ADDRESS}" 'deposit()' \
      --value "${WETH_AMOUNT_ETH}ether" \
      --private-key "${PRIVATE_KEY}" \
      --rpc-url "http://127.0.0.1:${PORT}"

    # 2) USDC: Whale impersonieren, ETH für Gas geben, transfer zu TEST_ACCOUNT
    echo "Impersonate USDC whale ${USDC_WHALE}"
    cast rpc anvil_impersonateAccount "${USDC_WHALE}" --rpc-url "http://127.0.0.1:${PORT}"

    echo "Top up whale with 100 ETH for gas"
    cast rpc anvil_setBalance "${USDC_WHALE}" 0x56BC75E2D63100000 --rpc-url "http://127.0.0.1:${PORT}"

    echo "USDC transfer ${USDC_AMOUNT_6D} (6d) to ${TEST_ACCOUNT}"
    cast send "${USDC_ADDRESS}" 'transfer(address,uint256)' \
      "${TEST_ACCOUNT}" "${USDC_AMOUNT_6D}" \
      --from "${USDC_WHALE}" \
      --unlocked \
      --rpc-url "http://127.0.0.1:${PORT}"

    echo "Stop impersonation"
    cast rpc anvil_stopImpersonatingAccount "${USDC_WHALE}" --rpc-url "http://127.0.0.1:${PORT}"

    echo "Funding complete."
  ) || echo "WARN: Funding failed (see messages above). Anvil keeps running."
fi

# --- im Vordergrund warten, damit Container lebt ---
wait "${ANVIL_PID}"
