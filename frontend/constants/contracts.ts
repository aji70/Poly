// constants/contracts.ts
import { Address } from 'viem';
import { polygon } from 'wagmi/chains';

// This frontend is Polygon-only.
export const TYCOON_CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON as Address,
};
export const REWARD_CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_REWARD as Address,
};
/** TYC ERC20 token address (must be the token contract, not the reward contract). Use useRewardTokenAddresses() in shop for addresses that match the reward contract. */
export const TYC_TOKEN_ADDRESS: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_TOKEN as Address | undefined,
};

export const USDC_TOKEN_ADDRESS: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_USDC as Address,
};

export const AI_AGENT_REGISTRY_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_AI_REGISTRY as Address,
};

/** Tournament escrow (entry fees + prize pool). ABI: context/abi/TycoonTournamentEscrow.json */
export const TOURNAMENT_ESCROW_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_TOURNAMENT_ESCROW as Address | undefined,
};

export const MINIPAY_CHAIN_IDS = [137]; // Polygon Mainnet

/** ERC-8004 Agent Trust Protocol. Polygon uses same registry address pattern as Celo. */
export const ERC8004_REPUTATION_REGISTRY_ADDRESSES: Record<number, Address | undefined> = {
  [polygon.id]: (process.env.NEXT_PUBLIC_ERC8004_REPUTATION as Address) || undefined,
};
export const ERC8004_IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as Address;