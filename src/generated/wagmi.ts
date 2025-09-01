import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NonfungiblePositionManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const nonfungiblePositionManagerAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_factory', internalType: 'address', type: 'address' },
      { name: '_WETH9', internalType: 'address', type: 'address' },
      { name: '_tokenDescriptor_', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount0',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Collect',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'liquidity',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      {
        name: 'amount0',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DecreaseLiquidity',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'liquidity',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      {
        name: 'amount0',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'IncreaseLiquidity',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMIT_TYPEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'WETH9',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'baseURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'params',
        internalType: 'struct INonfungiblePositionManager.CollectParams',
        type: 'tuple',
        components: [
          { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
          { name: 'recipient', internalType: 'address', type: 'address' },
          { name: 'amount0Max', internalType: 'uint128', type: 'uint128' },
          { name: 'amount1Max', internalType: 'uint128', type: 'uint128' },
        ],
      },
    ],
    name: 'collect',
    outputs: [
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token0', internalType: 'address', type: 'address' },
      { name: 'token1', internalType: 'address', type: 'address' },
      { name: 'fee', internalType: 'uint24', type: 'uint24' },
      { name: 'sqrtPriceX96', internalType: 'uint160', type: 'uint160' },
    ],
    name: 'createAndInitializePoolIfNecessary',
    outputs: [{ name: 'pool', internalType: 'address', type: 'address' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'params',
        internalType:
          'struct INonfungiblePositionManager.DecreaseLiquidityParams',
        type: 'tuple',
        components: [
          { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
          { name: 'liquidity', internalType: 'uint128', type: 'uint128' },
          { name: 'amount0Min', internalType: 'uint256', type: 'uint256' },
          { name: 'amount1Min', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'decreaseLiquidity',
    outputs: [
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'params',
        internalType:
          'struct INonfungiblePositionManager.IncreaseLiquidityParams',
        type: 'tuple',
        components: [
          { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
          { name: 'amount0Desired', internalType: 'uint256', type: 'uint256' },
          { name: 'amount1Desired', internalType: 'uint256', type: 'uint256' },
          { name: 'amount0Min', internalType: 'uint256', type: 'uint256' },
          { name: 'amount1Min', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'increaseLiquidity',
    outputs: [
      { name: 'liquidity', internalType: 'uint128', type: 'uint128' },
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'params',
        internalType: 'struct INonfungiblePositionManager.MintParams',
        type: 'tuple',
        components: [
          { name: 'token0', internalType: 'address', type: 'address' },
          { name: 'token1', internalType: 'address', type: 'address' },
          { name: 'fee', internalType: 'uint24', type: 'uint24' },
          { name: 'tickLower', internalType: 'int24', type: 'int24' },
          { name: 'tickUpper', internalType: 'int24', type: 'int24' },
          { name: 'amount0Desired', internalType: 'uint256', type: 'uint256' },
          { name: 'amount1Desired', internalType: 'uint256', type: 'uint256' },
          { name: 'amount0Min', internalType: 'uint256', type: 'uint256' },
          { name: 'amount1Min', internalType: 'uint256', type: 'uint256' },
          { name: 'recipient', internalType: 'address', type: 'address' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'mint',
    outputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'liquidity', internalType: 'uint128', type: 'uint128' },
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'data', internalType: 'bytes[]', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ name: 'results', internalType: 'bytes[]', type: 'bytes[]' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { name: 'nonce', internalType: 'uint96', type: 'uint96' },
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'token0', internalType: 'address', type: 'address' },
      { name: 'token1', internalType: 'address', type: 'address' },
      { name: 'fee', internalType: 'uint24', type: 'uint24' },
      { name: 'tickLower', internalType: 'int24', type: 'int24' },
      { name: 'tickUpper', internalType: 'int24', type: 'int24' },
      { name: 'liquidity', internalType: 'uint128', type: 'uint128' },
      {
        name: 'feeGrowthInside0LastX128',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'feeGrowthInside1LastX128',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'tokensOwed0', internalType: 'uint128', type: 'uint128' },
      { name: 'tokensOwed1', internalType: 'uint128', type: 'uint128' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'refundETH',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: '_data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'selfPermit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'selfPermitAllowed',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'selfPermitAllowedIfNecessary',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'selfPermitIfNecessary',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amountMinimum', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'sweepToken',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'index', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenByIndex',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount0Owed', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1Owed', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'uniswapV3MintCallback',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountMinimum', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'unwrapWETH9',
    outputs: [],
    stateMutability: 'payable',
  },
  { type: 'receive', stateMutability: 'payable' },
] as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const nonfungiblePositionManagerAddress = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  8453: '0x03A520B32c04bf3BEEF7BF5D48c6C4Ec1B7cEAc1',
  42161: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
} as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const nonfungiblePositionManagerConfig = {
  address: nonfungiblePositionManagerAddress,
  abi: nonfungiblePositionManagerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pool
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const poolAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', internalType: 'uint160', type: 'uint160' },
      { name: 'tick', internalType: 'int24', type: 'int24' },
      { name: 'observationIndex', internalType: 'uint16', type: 'uint16' },
      {
        name: 'observationCardinality',
        internalType: 'uint16',
        type: 'uint16',
      },
      {
        name: 'observationCardinalityNext',
        internalType: 'uint16',
        type: 'uint16',
      },
      { name: 'feeProtocol', internalType: 'uint8', type: 'uint8' },
      { name: 'unlocked', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'tickSpacing',
    outputs: [{ name: '', internalType: 'int24', type: 'int24' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UniswapV3Factory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x33128a8fC17869897dcE68Ed026d694621f6FDfD)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 */
export const uniswapV3FactoryAbi = [
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint24', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x33128a8fC17869897dcE68Ed026d694621f6FDfD)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 */
export const uniswapV3FactoryAddress = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  8453: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
} as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x33128a8fC17869897dcE68Ed026d694621f6FDfD)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 */
export const uniswapV3FactoryConfig = {
  address: uniswapV3FactoryAddress,
  abi: uniswapV3FactoryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManager =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"DOMAIN_SEPARATOR"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerDomainSeparator =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'DOMAIN_SEPARATOR',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"PERMIT_TYPEHASH"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerPermitTypehash =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'PERMIT_TYPEHASH',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"WETH9"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerWeth9 =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'WETH9',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"baseURI"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerBaseUri =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'baseURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"factory"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerFactory =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'factory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerName =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'name',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'ownerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"positions"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerPositions =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'positions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerSymbol =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'symbol',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"tokenByIndex"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerTokenByIndex =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'tokenByIndex',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"tokenOfOwnerByIndex"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerTokenOfOwnerByIndex =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'tokenOfOwnerByIndex',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"totalSupply"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useReadNonfungiblePositionManagerTotalSupply =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'totalSupply',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManager =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"burn"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerBurn =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'burn',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"collect"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerCollect =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'collect',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"createAndInitializePoolIfNecessary"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerCreateAndInitializePoolIfNecessary =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'createAndInitializePoolIfNecessary',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"decreaseLiquidity"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerDecreaseLiquidity =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'decreaseLiquidity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"increaseLiquidity"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerIncreaseLiquidity =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'increaseLiquidity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"mint"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerMint =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'mint',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"multicall"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerMulticall =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'multicall',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"permit"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerPermit =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'permit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"refundETH"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerRefundEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'refundETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermit"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSelfPermit =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowed"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSelfPermitAllowed =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowed',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowedIfNecessary"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSelfPermitAllowedIfNecessary =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowedIfNecessary',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitIfNecessary"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSelfPermitIfNecessary =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitIfNecessary',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"sweepToken"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerSweepToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'sweepToken',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"uniswapV3MintCallback"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerUniswapV3MintCallback =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'uniswapV3MintCallback',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"unwrapWETH9"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWriteNonfungiblePositionManagerUnwrapWeth9 =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'unwrapWETH9',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManager =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"burn"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerBurn =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'burn',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"collect"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerCollect =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'collect',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"createAndInitializePoolIfNecessary"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerCreateAndInitializePoolIfNecessary =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'createAndInitializePoolIfNecessary',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"decreaseLiquidity"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerDecreaseLiquidity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'decreaseLiquidity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"increaseLiquidity"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerIncreaseLiquidity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'increaseLiquidity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"mint"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerMint =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'mint',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"multicall"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerMulticall =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'multicall',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"permit"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'permit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"refundETH"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerRefundEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'refundETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermit"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSelfPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowed"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSelfPermitAllowed =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowed',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowedIfNecessary"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSelfPermitAllowedIfNecessary =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowedIfNecessary',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitIfNecessary"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSelfPermitIfNecessary =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitIfNecessary',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"sweepToken"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerSweepToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'sweepToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"uniswapV3MintCallback"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerUniswapV3MintCallback =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'uniswapV3MintCallback',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"unwrapWETH9"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useSimulateNonfungiblePositionManagerUnwrapWeth9 =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'unwrapWETH9',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"Approval"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"Collect"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerCollectEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'Collect',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"DecreaseLiquidity"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerDecreaseLiquidityEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'DecreaseLiquidity',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"IncreaseLiquidity"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerIncreaseLiquidityEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'IncreaseLiquidity',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03a520b32C04BF3bEEf7BF5d48c6c4EC1B7Ceac1)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88)
 */
export const useWatchNonfungiblePositionManagerTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__
 */
export const useReadPool = /*#__PURE__*/ createUseReadContract({ abi: poolAbi })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"liquidity"`
 */
export const useReadPoolLiquidity = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'liquidity',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"slot0"`
 */
export const useReadPoolSlot0 = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'slot0',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"tickSpacing"`
 */
export const useReadPoolTickSpacing = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'tickSpacing',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV3FactoryAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x33128a8fC17869897dcE68Ed026d694621f6FDfD)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 */
export const useReadUniswapV3Factory = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV3FactoryAbi,
  address: uniswapV3FactoryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV3FactoryAbi}__ and `functionName` set to `"getPool"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x33128a8fC17869897dcE68Ed026d694621f6FDfD)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984)
 */
export const useReadUniswapV3FactoryGetPool =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV3FactoryAbi,
    address: uniswapV3FactoryAddress,
    functionName: 'getPool',
  })
