// constants/contracts.ts
import { Address } from 'viem';
import {  polygon } from 'wagmi/chains'; // import your chains

export const TYCOON_CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON as Address,
};
export const REWARD_CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_REWARD as Address,
}
export const TYC_TOKEN_ADDRESS: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_TOKEN as Address,
  }

export const USDC_TOKEN_ADDRESS: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_USDC as Address,
 
}