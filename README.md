# 🎲 Tycoon — Monopoly Tycoon on Chain

**The Web3 twist on the classic game of strategy, ownership, and fortune.**  
Play solo against AI, compete in multiplayer rooms, collect tokens, run tournaments, and become the ultimate blockchain tycoon.

---

## Executive Summary

**Tycoon** is a **fully on-chain** Monopoly-style strategy game **built on Polygon**. Players buy, sell, and trade digital properties, stake real value, earn rewards, and compete in ranked play and tournaments—all with **true ownership** via smart contracts. The product combines **proven game mechanics**, **real-time multiplayer**, **AI opponents**, **tournament infrastructure with escrow**, and **NFT/ERC-1155 collectibles** into one cohesive Web3 gaming experience.

**Live:** [poly-iota.vercel.app](https://poly-iota.vercel.app/) · [playtycoon.xyz](https://www.playtycoon.xyz/)

---

## Core Value Propositions

| Pillar | Description |
|--------|-------------|
| **Built on Polygon** | Low fees, fast finality; all game logic and rewards on Polygon. |
| **On-chain stakes & payouts** | Create/join games with staked value; winners paid out via smart contracts. |
| **Play without a wallet** | Guest accounts with custodial onboarding; link wallet later for withdrawals and full ownership. |
| **AI + multiplayer** | Solo vs AI (1–7 opponents) or real-time multiplayer rooms with chat and sync. |
| **Tournaments** | Create/join tournaments; entry fees and prize pools via escrow; bracket rounds and match creation. |
| **Collectibles economy** | In-game shop, ERC-1155 perks (extra turn, jail free, teleport, etc.), TYC token, USDC support. |

---

## All Product Features

### 1. Game Mechanics (Monopoly-style)

| Feature | Description |
|--------|-------------|
| **Classic board** | 40 squares, iconic layout; color groups, utilities, railroads. |
| **Dice & movement** | Roll 2d6 (2–12), animated movement; backend validates rolls. |
| **Property** | Buy/sell unowned properties; ownership tracked on-chain and in DB. |
| **Rent** | Site-only, 1–4 houses, hotel; utilities and railroads with special rules. |
| **Development** | Build houses/hotels on color groups; even-build rule option. |
| **Trading** | Offer/accept/decline trades; human ↔ human and human ↔ AI. |
| **Jail** | In jail, get-out-of-jail-free cards, rent-in-prison option. |
| **Chance & Community Chest** | Seeded card decks (advance to Go, pay tax, nearest railroad, etc.). |
| **Tax squares** | Income Tax ($200), Luxury Tax ($100). |
| **Auction** | Optional game rule for unowned properties. |
| **Mortgage** | Optional game rule. |
| **Bankruptcy** | Declare bankruptcy; game-over flow and winner resolution. |
| **End by net worth** | Untimed games: players vote to end by net worth. |
| **Turn timer** | Configurable per-turn time limit; consecutive timeouts can remove player. |
| **Game settings** | Auction, rent-in-prison, mortgage, even-build, starting cash, play order, timed/untimed. |

### 2. Web3 & Blockchain

| Feature | Description |
|--------|-------------|
| **Wallet connection** | Reown AppKit (WalletConnect); wagmi; link/unlink for guest accounts. |
| **Polygon** | All contracts and gameplay on Polygon (mainnet). |
| **Main game contract** | Create game, join, exit, stakes, winner payouts, player stats on-chain. |
| **Reward/collectibles contract** | ERC-1155 (TycoonRewardSystem): vouchers, collectibles, in-game shop. |
| **TYC token (ERC-20)** | In-game/reward token; used in shop and rewards. |
| **Tournament escrow** | Entry fees and prize pool; on-chain registration and payouts. |
| **NFT property (TycoonNFT)** | ERC-721 for property representation on-chain. |
| **Agent registry** | ERC-8004 Agent Trust (reputation/identity) for AI agents. |
| **Backend game controller** | Secure backend key for roll, exit, remove player, set turn count, etc. |

### 3. Multiplayer

| Feature | Description |
|--------|-------------|
| **Rooms / lobbies** | Game code = room; join by code; waiting room and game-room-loading flows. |
| **Real-time sync** | Socket.IO; join/leave game room; Redis adapter for scaling. |
| **Waiting room** | Pre-game lobby; game settings; start when ready. |
| **In-game chat** | Chat room (desktop and mobile) for players in the same game. |
| **Connection limits** | Per-IP connection cap; socket event rate limiting. |

### 4. AI (Single-player vs AI)

| Feature | Description |
|--------|-------------|
| **Play vs AI** | Dedicated flow: create AI game, 1–7 AI opponents, configurable. |
| **AI turn execution** | Roll, move, buy/build, trade decisions, end turn; full game loop. |
| **AI trade logic** | Accept/decline trades; heuristics + optional LLM/agent-registry. |
| **Pluggable agents** | Backend agent registry; internal LLM (e.g. Claude) for smarter AI. |
| **AI bankruptcy** | AI bankruptcy handling and game resolution. |
| **Guest AI games** | Create and play vs AI as guest (no wallet required). |

### 5. Tournaments

| Feature | Description |
|--------|-------------|
| **Create tournament** | Name, prize source (no pool / entry fee pool / creator funded), max/min players, entry fee. |
| **On-chain registration** | Tournament escrow; pay entry in USDC; register on-chain. |
| **Bracket & rounds** | Tournament rounds and matches; start round, create games per match. |
| **Start match** | “Start now” window; backend creates game and joins players on-chain. |
| **Prize distribution** | Configurable prize logic; escrow release to winners. |

### 6. Rewards & Economy

| Feature | Description |
|--------|-------------|
| **TYC vouchers** | ERC-1155 vouchers; mint by backend; redeem for TYC. |
| **Reward contract** | TycoonRewardSystem: vouchers, collectibles, shop. |
| **Admin rewards UI** | Mint vouchers/collectibles, restock, set prices, withdraw; escrow admin. |
| **Min turns for perks** | Contract-level min turns for full perks; consolation for early exit. |

### 7. Leaderboards

| Feature | Description |
|--------|-------------|
| **Leaderboard page** | Tabs: Wins, Earnings, Stakes, Win rate. |
| **Stats** | Games played, won, lost; total earned, staked, withdrawn; win rate. |

### 8. Guest Play & Auth

| Feature | Description |
|--------|-------------|
| **Guest register** | Username + password; custodial wallet; on-chain registration on Polygon. |
| **Guest login** | Password; JWT; session. |
| **Link wallet** | Connect wallet + sign message; link to guest account. |
| **Login by wallet** | Wallet signature → JWT (linked or native wallet users). |
| **Email** | Connect email, verify email, login with email. |
| **Profile** | View/edit profile, linked wallet, email, preferences. |

### 9. Shop & Collectibles

| Feature | Description |
|--------|-------------|
| **Game shop** | Buy collectibles with TYC or USDC. |
| **Collectibles (ERC-1155)** | 10 perk types: Extra Turn, Jail Free, Double Rent, Roll Boost, Cash, Teleport, Shield, Property Discount, Tax Refund, Exact Roll. |
| **Collectibles inventory** | In-game inventory; use perks (e.g. cash, teleport, jail free). |
| **Perks in game** | Applied in board logic; game-perks API. |
| **Shop admin** | Restock, set TYC/USDC prices, withdraw (rewards admin). |

### 10. Profile & Account

| Feature | Description |
|--------|-------------|
| **Profile page** | Desktop and mobile; balance, stats, linked wallet. |
| **Account link wallet** | Link external wallet for withdrawals and full ownership. |
| **Profile & identity** | User account; link wallet for withdrawals and full ownership. |

### 11. User Experience

| Feature | Description |
|--------|-------------|
| **Waitlist** | Sign up for waitlist; backend storage. |
| **NFT page** | Perk card / NFT-related UI. |
| **Game stats** | Post-game stats view. |
| **Config test** | Dev/ops: backend config, connection test, contract read/write. |
| **Farcaster** | Miniapp manifest; deep links; Farcaster-ready. |
| **Mobile-responsive** | Mobile variants for board, shop, profile, settings, join-room, etc. |
| **Game timer** | Visible countdown for timed games; turn timer. |
| **Trade alerts** | Badge/pill for incoming trade offers. |
| **Victory / defeat** | Clear end-of-game modal (win/loss, position, “Go home”). |

### 12. Platform & Operations

| Feature | Description |
|--------|-------------|
| **Analytics** | Events and dashboard; games by status, today/week. |
| **Game play history** | Log of moves/actions; API for replay and analytics. |
| **Scalability** | Redis for Socket.IO; DB indexes; rate limiting. |
| **Security** | Helmet, CORS; JWT auth; backend game controller for sensitive contract calls. |

---

## Tech Stack

| Layer | Tools |
|-------|--------|
| **Frontend** | React, Next.js, Tailwind CSS, Reown AppKit, wagmi |
| **Backend** | Node.js, Express, Socket.IO, Redis (optional) |
| **Database** | MySQL (Knex migrations) |
| **Blockchain** | Solidity on Polygon |
| **Contracts** | Tycoon (game + rewards), TycoonNFT, TycoonTournamentEscrow |

---

## Key Contracts (Polygon)

| Contract | Address |
|----------|---------|
| **Tycoon (main)** | `0xFB6d09FAF0Baf2eb84959d4dCB3E5D4A93B3e644` |
| **Reward** | `0x34Af2D46E9a81D19c25eFC4706Edc63262764376` |
| **TYC (ERC-20)** | `0x7346750357c5b39d42D6beaaE918349E3D5c5381` |

---

## Roadmap (High Level)

- ✅ Core smart contracts (Polygon)
- ✅ Board UI, Chance, Community Chest, Taxes
- ✅ NFT property minting
- ✅ On-chain game logic (dice, turns, stakes)
- ✅ Multiplayer rooms & real-time sync
- ✅ AI opponents & agent registry
- ✅ Tournaments & escrow
- ✅ Leaderboards & analytics
- ✅ Mobile UX & Farcaster
- 🔜 Security audit & mainnet hardening
- 🔜 DAO & community governance

---

## One-Liner for VCs

**Tycoon** is a **Polygon-native Monopoly-style tycoon game** with **on-chain stakes and rewards**, **NFT/ERC-1155 collectibles and shop**, **real-time multiplayer (rooms, chat)**, **vs-AI mode with pluggable agents**, **tournaments with escrow and brackets**, **guest play and email/wallet auth**, **leaderboards and analytics**, and **mobile-responsive UI**—built on Polygon for low fees and fast gameplay.

---

## Contact

- **Developer:** Sabo Ajidokwu Emmanuel / @ajisabo2  
- **Live:** [poly-iota.vercel.app](https://poly-iota.vercel.app/) · [playtycoon.xyz](https://www.playtycoon.xyz/)

*Built with ❤️ on Polygon. “Roll the dice. Build your empire.”*
