/**
 * Verify the Collect event signature
 */

const { keccak256, toUtf8Bytes } = require('ethers');

// Uniswap V3 NFT Position Manager Collect event
const eventSignature = 'Collect(uint256,address,uint256,uint256)';
const hash = keccak256(toUtf8Bytes(eventSignature));

console.log('Collect event signature:', eventSignature);
console.log('Keccak256 hash:', hash);

// Compare with our constants
const ourSignature = '0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0';
console.log('Our signature:   ', ourSignature);
console.log('Match:', hash.toLowerCase() === ourSignature.toLowerCase());