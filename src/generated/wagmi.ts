import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NonfungiblePositionManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

export const nonfungiblePositionManagerAddress =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as const

export const nonfungiblePositionManagerConfig = {
  address: nonfungiblePositionManagerAddress,
  abi: nonfungiblePositionManagerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pool
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const poolAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
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
        name: 'tickLower',
        internalType: 'int24',
        type: 'int24',
        indexed: true,
      },
      {
        name: 'tickUpper',
        internalType: 'int24',
        type: 'int24',
        indexed: true,
      },
      {
        name: 'amount',
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
    name: 'Burn',
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
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'tickLower',
        internalType: 'int24',
        type: 'int24',
        indexed: true,
      },
      {
        name: 'tickUpper',
        internalType: 'int24',
        type: 'int24',
        indexed: true,
      },
      {
        name: 'amount0',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint128',
        type: 'uint128',
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
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount0',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
    ],
    name: 'CollectProtocol',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
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
      {
        name: 'paid0',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paid1',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Flash',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'observationCardinalityNextOld',
        internalType: 'uint16',
        type: 'uint16',
        indexed: false,
      },
      {
        name: 'observationCardinalityNextNew',
        internalType: 'uint16',
        type: 'uint16',
        indexed: false,
      },
    ],
    name: 'IncreaseObservationCardinalityNext',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sqrtPriceX96',
        internalType: 'uint160',
        type: 'uint160',
        indexed: false,
      },
      { name: 'tick', internalType: 'int24', type: 'int24', indexed: false },
    ],
    name: 'Initialize',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tickLower',
        internalType: 'int24',
        type: 'int24',
        indexed: true,
      },
      {
        name: 'tickUpper',
        internalType: 'int24',
        type: 'int24',
        indexed: true,
      },
      {
        name: 'amount',
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
    name: 'Mint',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'feeProtocol0Old',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'feeProtocol1Old',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'feeProtocol0New',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'feeProtocol1New',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'SetFeeProtocol',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount0',
        internalType: 'int256',
        type: 'int256',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'int256',
        type: 'int256',
        indexed: false,
      },
      {
        name: 'sqrtPriceX96',
        internalType: 'uint160',
        type: 'uint160',
        indexed: false,
      },
      {
        name: 'liquidity',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      { name: 'tick', internalType: 'int24', type: 'int24', indexed: false },
    ],
    name: 'Swap',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tickLower', internalType: 'int24', type: 'int24' },
      { name: 'tickUpper', internalType: 'int24', type: 'int24' },
      { name: 'amount', internalType: 'uint128', type: 'uint128' },
    ],
    name: 'burn',
    outputs: [
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'tickLower', internalType: 'int24', type: 'int24' },
      { name: 'tickUpper', internalType: 'int24', type: 'int24' },
      { name: 'amount0Requested', internalType: 'uint128', type: 'uint128' },
      { name: 'amount1Requested', internalType: 'uint128', type: 'uint128' },
    ],
    name: 'collect',
    outputs: [
      { name: 'amount0', internalType: 'uint128', type: 'uint128' },
      { name: 'amount1', internalType: 'uint128', type: 'uint128' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'amount0Requested', internalType: 'uint128', type: 'uint128' },
      { name: 'amount1Requested', internalType: 'uint128', type: 'uint128' },
    ],
    name: 'collectProtocol',
    outputs: [
      { name: 'amount0', internalType: 'uint128', type: 'uint128' },
      { name: 'amount1', internalType: 'uint128', type: 'uint128' },
    ],
    stateMutability: 'nonpayable',
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
    inputs: [],
    name: 'fee',
    outputs: [{ name: '', internalType: 'uint24', type: 'uint24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeGrowthGlobal0X128',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeGrowthGlobal1X128',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'flash',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'observationCardinalityNext',
        internalType: 'uint16',
        type: 'uint16',
      },
    ],
    name: 'increaseObservationCardinalityNext',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'sqrtPriceX96', internalType: 'uint160', type: 'uint160' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
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
    name: 'maxLiquidityPerTick',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'tickLower', internalType: 'int24', type: 'int24' },
      { name: 'tickUpper', internalType: 'int24', type: 'int24' },
      { name: 'amount', internalType: 'uint128', type: 'uint128' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'observations',
    outputs: [
      { name: 'blockTimestamp', internalType: 'uint32', type: 'uint32' },
      { name: 'tickCumulative', internalType: 'int56', type: 'int56' },
      {
        name: 'secondsPerLiquidityCumulativeX128',
        internalType: 'uint160',
        type: 'uint160',
      },
      { name: 'initialized', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'secondsAgos', internalType: 'uint32[]', type: 'uint32[]' },
    ],
    name: 'observe',
    outputs: [
      { name: 'tickCumulatives', internalType: 'int56[]', type: 'int56[]' },
      {
        name: 'secondsPerLiquidityCumulativeX128s',
        internalType: 'uint160[]',
        type: 'uint160[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'positions',
    outputs: [
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
    name: 'protocolFees',
    outputs: [
      { name: 'token0', internalType: 'uint128', type: 'uint128' },
      { name: 'token1', internalType: 'uint128', type: 'uint128' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'feeProtocol0', internalType: 'uint8', type: 'uint8' },
      { name: 'feeProtocol1', internalType: 'uint8', type: 'uint8' },
    ],
    name: 'setFeeProtocol',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [
      { name: 'tickLower', internalType: 'int24', type: 'int24' },
      { name: 'tickUpper', internalType: 'int24', type: 'int24' },
    ],
    name: 'snapshotCumulativesInside',
    outputs: [
      { name: 'tickCumulativeInside', internalType: 'int56', type: 'int56' },
      {
        name: 'secondsPerLiquidityInsideX128',
        internalType: 'uint160',
        type: 'uint160',
      },
      { name: 'secondsInside', internalType: 'uint32', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'zeroForOne', internalType: 'bool', type: 'bool' },
      { name: 'amountSpecified', internalType: 'int256', type: 'int256' },
      { name: 'sqrtPriceLimitX96', internalType: 'uint160', type: 'uint160' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'swap',
    outputs: [
      { name: 'amount0', internalType: 'int256', type: 'int256' },
      { name: 'amount1', internalType: 'int256', type: 'int256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'int16', type: 'int16' }],
    name: 'tickBitmap',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'tickSpacing',
    outputs: [{ name: '', internalType: 'int24', type: 'int24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'int24', type: 'int24' }],
    name: 'ticks',
    outputs: [
      { name: 'liquidityGross', internalType: 'uint128', type: 'uint128' },
      { name: 'liquidityNet', internalType: 'int128', type: 'int128' },
      {
        name: 'feeGrowthOutside0X128',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'feeGrowthOutside1X128',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'tickCumulativeOutside', internalType: 'int56', type: 'int56' },
      {
        name: 'secondsPerLiquidityOutsideX128',
        internalType: 'uint160',
        type: 'uint160',
      },
      { name: 'secondsOutside', internalType: 'uint32', type: 'uint32' },
      { name: 'initialized', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 */
export const useReadNonfungiblePositionManager =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"DOMAIN_SEPARATOR"`
 */
export const useReadNonfungiblePositionManagerDomainSeparator =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'DOMAIN_SEPARATOR',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"PERMIT_TYPEHASH"`
 */
export const useReadNonfungiblePositionManagerPermitTypehash =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'PERMIT_TYPEHASH',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"WETH9"`
 */
export const useReadNonfungiblePositionManagerWeth9 =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'WETH9',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadNonfungiblePositionManagerBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"baseURI"`
 */
export const useReadNonfungiblePositionManagerBaseUri =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'baseURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"factory"`
 */
export const useReadNonfungiblePositionManagerFactory =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'factory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"getApproved"`
 */
export const useReadNonfungiblePositionManagerGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadNonfungiblePositionManagerIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"name"`
 */
export const useReadNonfungiblePositionManagerName =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'name',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"ownerOf"`
 */
export const useReadNonfungiblePositionManagerOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'ownerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"positions"`
 */
export const useReadNonfungiblePositionManagerPositions =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'positions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadNonfungiblePositionManagerSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"symbol"`
 */
export const useReadNonfungiblePositionManagerSymbol =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'symbol',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"tokenByIndex"`
 */
export const useReadNonfungiblePositionManagerTokenByIndex =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'tokenByIndex',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"tokenOfOwnerByIndex"`
 */
export const useReadNonfungiblePositionManagerTokenOfOwnerByIndex =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'tokenOfOwnerByIndex',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"tokenURI"`
 */
export const useReadNonfungiblePositionManagerTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"totalSupply"`
 */
export const useReadNonfungiblePositionManagerTotalSupply =
  /*#__PURE__*/ createUseReadContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'totalSupply',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 */
export const useWriteNonfungiblePositionManager =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"approve"`
 */
export const useWriteNonfungiblePositionManagerApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"burn"`
 */
export const useWriteNonfungiblePositionManagerBurn =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'burn',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"collect"`
 */
export const useWriteNonfungiblePositionManagerCollect =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'collect',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"createAndInitializePoolIfNecessary"`
 */
export const useWriteNonfungiblePositionManagerCreateAndInitializePoolIfNecessary =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'createAndInitializePoolIfNecessary',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"decreaseLiquidity"`
 */
export const useWriteNonfungiblePositionManagerDecreaseLiquidity =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'decreaseLiquidity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"increaseLiquidity"`
 */
export const useWriteNonfungiblePositionManagerIncreaseLiquidity =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'increaseLiquidity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"mint"`
 */
export const useWriteNonfungiblePositionManagerMint =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'mint',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"multicall"`
 */
export const useWriteNonfungiblePositionManagerMulticall =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'multicall',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"permit"`
 */
export const useWriteNonfungiblePositionManagerPermit =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'permit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"refundETH"`
 */
export const useWriteNonfungiblePositionManagerRefundEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'refundETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteNonfungiblePositionManagerSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermit"`
 */
export const useWriteNonfungiblePositionManagerSelfPermit =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowed"`
 */
export const useWriteNonfungiblePositionManagerSelfPermitAllowed =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowed',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowedIfNecessary"`
 */
export const useWriteNonfungiblePositionManagerSelfPermitAllowedIfNecessary =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowedIfNecessary',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitIfNecessary"`
 */
export const useWriteNonfungiblePositionManagerSelfPermitIfNecessary =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitIfNecessary',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteNonfungiblePositionManagerSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"sweepToken"`
 */
export const useWriteNonfungiblePositionManagerSweepToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'sweepToken',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteNonfungiblePositionManagerTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"uniswapV3MintCallback"`
 */
export const useWriteNonfungiblePositionManagerUniswapV3MintCallback =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'uniswapV3MintCallback',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"unwrapWETH9"`
 */
export const useWriteNonfungiblePositionManagerUnwrapWeth9 =
  /*#__PURE__*/ createUseWriteContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'unwrapWETH9',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 */
export const useSimulateNonfungiblePositionManager =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"approve"`
 */
export const useSimulateNonfungiblePositionManagerApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"burn"`
 */
export const useSimulateNonfungiblePositionManagerBurn =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'burn',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"collect"`
 */
export const useSimulateNonfungiblePositionManagerCollect =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'collect',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"createAndInitializePoolIfNecessary"`
 */
export const useSimulateNonfungiblePositionManagerCreateAndInitializePoolIfNecessary =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'createAndInitializePoolIfNecessary',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"decreaseLiquidity"`
 */
export const useSimulateNonfungiblePositionManagerDecreaseLiquidity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'decreaseLiquidity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"increaseLiquidity"`
 */
export const useSimulateNonfungiblePositionManagerIncreaseLiquidity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'increaseLiquidity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"mint"`
 */
export const useSimulateNonfungiblePositionManagerMint =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'mint',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"multicall"`
 */
export const useSimulateNonfungiblePositionManagerMulticall =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'multicall',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"permit"`
 */
export const useSimulateNonfungiblePositionManagerPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'permit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"refundETH"`
 */
export const useSimulateNonfungiblePositionManagerRefundEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'refundETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateNonfungiblePositionManagerSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermit"`
 */
export const useSimulateNonfungiblePositionManagerSelfPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowed"`
 */
export const useSimulateNonfungiblePositionManagerSelfPermitAllowed =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowed',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitAllowedIfNecessary"`
 */
export const useSimulateNonfungiblePositionManagerSelfPermitAllowedIfNecessary =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitAllowedIfNecessary',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"selfPermitIfNecessary"`
 */
export const useSimulateNonfungiblePositionManagerSelfPermitIfNecessary =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'selfPermitIfNecessary',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateNonfungiblePositionManagerSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"sweepToken"`
 */
export const useSimulateNonfungiblePositionManagerSweepToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'sweepToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateNonfungiblePositionManagerTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"uniswapV3MintCallback"`
 */
export const useSimulateNonfungiblePositionManagerUniswapV3MintCallback =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'uniswapV3MintCallback',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `functionName` set to `"unwrapWETH9"`
 */
export const useSimulateNonfungiblePositionManagerUnwrapWeth9 =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    functionName: 'unwrapWETH9',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__
 */
export const useWatchNonfungiblePositionManagerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"Approval"`
 */
export const useWatchNonfungiblePositionManagerApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const useWatchNonfungiblePositionManagerApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"Collect"`
 */
export const useWatchNonfungiblePositionManagerCollectEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'Collect',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"DecreaseLiquidity"`
 */
export const useWatchNonfungiblePositionManagerDecreaseLiquidityEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'DecreaseLiquidity',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"IncreaseLiquidity"`
 */
export const useWatchNonfungiblePositionManagerIncreaseLiquidityEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nonfungiblePositionManagerAbi,
    address: nonfungiblePositionManagerAddress,
    eventName: 'IncreaseLiquidity',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nonfungiblePositionManagerAbi}__ and `eventName` set to `"Transfer"`
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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"factory"`
 */
export const useReadPoolFactory = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'factory',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"fee"`
 */
export const useReadPoolFee = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'fee',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"feeGrowthGlobal0X128"`
 */
export const useReadPoolFeeGrowthGlobal0X128 =
  /*#__PURE__*/ createUseReadContract({
    abi: poolAbi,
    functionName: 'feeGrowthGlobal0X128',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"feeGrowthGlobal1X128"`
 */
export const useReadPoolFeeGrowthGlobal1X128 =
  /*#__PURE__*/ createUseReadContract({
    abi: poolAbi,
    functionName: 'feeGrowthGlobal1X128',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"liquidity"`
 */
export const useReadPoolLiquidity = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'liquidity',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"maxLiquidityPerTick"`
 */
export const useReadPoolMaxLiquidityPerTick =
  /*#__PURE__*/ createUseReadContract({
    abi: poolAbi,
    functionName: 'maxLiquidityPerTick',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"observations"`
 */
export const useReadPoolObservations = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'observations',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"observe"`
 */
export const useReadPoolObserve = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'observe',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"positions"`
 */
export const useReadPoolPositions = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'positions',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"protocolFees"`
 */
export const useReadPoolProtocolFees = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'protocolFees',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"slot0"`
 */
export const useReadPoolSlot0 = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'slot0',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"snapshotCumulativesInside"`
 */
export const useReadPoolSnapshotCumulativesInside =
  /*#__PURE__*/ createUseReadContract({
    abi: poolAbi,
    functionName: 'snapshotCumulativesInside',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"tickBitmap"`
 */
export const useReadPoolTickBitmap = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'tickBitmap',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"tickSpacing"`
 */
export const useReadPoolTickSpacing = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'tickSpacing',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"ticks"`
 */
export const useReadPoolTicks = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'ticks',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"token0"`
 */
export const useReadPoolToken0 = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'token0',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"token1"`
 */
export const useReadPoolToken1 = /*#__PURE__*/ createUseReadContract({
  abi: poolAbi,
  functionName: 'token1',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__
 */
export const useWritePool = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"burn"`
 */
export const useWritePoolBurn = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'burn',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"collect"`
 */
export const useWritePoolCollect = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'collect',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"collectProtocol"`
 */
export const useWritePoolCollectProtocol = /*#__PURE__*/ createUseWriteContract(
  { abi: poolAbi, functionName: 'collectProtocol' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"flash"`
 */
export const useWritePoolFlash = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'flash',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"increaseObservationCardinalityNext"`
 */
export const useWritePoolIncreaseObservationCardinalityNext =
  /*#__PURE__*/ createUseWriteContract({
    abi: poolAbi,
    functionName: 'increaseObservationCardinalityNext',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"initialize"`
 */
export const useWritePoolInitialize = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'initialize',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"mint"`
 */
export const useWritePoolMint = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'mint',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"setFeeProtocol"`
 */
export const useWritePoolSetFeeProtocol = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'setFeeProtocol',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"swap"`
 */
export const useWritePoolSwap = /*#__PURE__*/ createUseWriteContract({
  abi: poolAbi,
  functionName: 'swap',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__
 */
export const useSimulatePool = /*#__PURE__*/ createUseSimulateContract({
  abi: poolAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"burn"`
 */
export const useSimulatePoolBurn = /*#__PURE__*/ createUseSimulateContract({
  abi: poolAbi,
  functionName: 'burn',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"collect"`
 */
export const useSimulatePoolCollect = /*#__PURE__*/ createUseSimulateContract({
  abi: poolAbi,
  functionName: 'collect',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"collectProtocol"`
 */
export const useSimulatePoolCollectProtocol =
  /*#__PURE__*/ createUseSimulateContract({
    abi: poolAbi,
    functionName: 'collectProtocol',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"flash"`
 */
export const useSimulatePoolFlash = /*#__PURE__*/ createUseSimulateContract({
  abi: poolAbi,
  functionName: 'flash',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"increaseObservationCardinalityNext"`
 */
export const useSimulatePoolIncreaseObservationCardinalityNext =
  /*#__PURE__*/ createUseSimulateContract({
    abi: poolAbi,
    functionName: 'increaseObservationCardinalityNext',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"initialize"`
 */
export const useSimulatePoolInitialize =
  /*#__PURE__*/ createUseSimulateContract({
    abi: poolAbi,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"mint"`
 */
export const useSimulatePoolMint = /*#__PURE__*/ createUseSimulateContract({
  abi: poolAbi,
  functionName: 'mint',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"setFeeProtocol"`
 */
export const useSimulatePoolSetFeeProtocol =
  /*#__PURE__*/ createUseSimulateContract({
    abi: poolAbi,
    functionName: 'setFeeProtocol',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link poolAbi}__ and `functionName` set to `"swap"`
 */
export const useSimulatePoolSwap = /*#__PURE__*/ createUseSimulateContract({
  abi: poolAbi,
  functionName: 'swap',
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__
 */
export const useWatchPoolEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: poolAbi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"Burn"`
 */
export const useWatchPoolBurnEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: poolAbi,
  eventName: 'Burn',
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"Collect"`
 */
export const useWatchPoolCollectEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: poolAbi,
    eventName: 'Collect',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"CollectProtocol"`
 */
export const useWatchPoolCollectProtocolEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: poolAbi,
    eventName: 'CollectProtocol',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"Flash"`
 */
export const useWatchPoolFlashEvent = /*#__PURE__*/ createUseWatchContractEvent(
  { abi: poolAbi, eventName: 'Flash' },
)

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"IncreaseObservationCardinalityNext"`
 */
export const useWatchPoolIncreaseObservationCardinalityNextEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: poolAbi,
    eventName: 'IncreaseObservationCardinalityNext',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"Initialize"`
 */
export const useWatchPoolInitializeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: poolAbi,
    eventName: 'Initialize',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"Mint"`
 */
export const useWatchPoolMintEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: poolAbi,
  eventName: 'Mint',
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"SetFeeProtocol"`
 */
export const useWatchPoolSetFeeProtocolEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: poolAbi,
    eventName: 'SetFeeProtocol',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link poolAbi}__ and `eventName` set to `"Swap"`
 */
export const useWatchPoolSwapEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: poolAbi,
  eventName: 'Swap',
})
