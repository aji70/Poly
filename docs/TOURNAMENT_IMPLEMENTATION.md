# Tournament Mode — Implementation Plan

This document describes how to implement **Tournament Mode** for PolygonTYcoon: algorithm, contract strategy (upgrade vs new contract), backend design, and frontend integration.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tournament Algorithm](#2-tournament-algorithm)
3. [Contract Strategy: Upgrade vs New Contract](#3-contract-strategy-upgrade-vs-new-contract)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [End-to-End Flows](#6-end-to-end-flows)
7. [Phased Rollout](#7-phased-rollout)

---

## 1. Overview

**Tournament mode** is a structured competition where:

- Players register (with or without an entry fee; see tournament types below).
- They are placed into a **bracket** (single-elimination), **up to 256 players** per tournament.
- Each **round** consists of **matches**; each match is one **Tycoon game** (existing create/join/play/exit flow).
- **Winners** of each match advance; losers are eliminated.
- Final **payouts** come from the tournament prize pool (e.g. 1st, 2nd, 3rd, 4th).

**Tournament types**

- **Entry-fee pool**: Players pay an entry fee (USDC); prize pool = sum of entry fees (minus optional platform cut). Max players configurable (e.g. 8–256).
- **Creator-funded (free entry)**: The **creator** puts up the full prize pool; **entry is free** for participants. Creator sets prize amount and prize distribution (e.g. 50% / 30% / 15% / 5% for top 4). Supports **up to 256 players**.

Existing building blocks:

- **Tycoon contract**: createGame, joinGame, exitGame, payouts by rank (USDC + vouchers + collectibles).
- **Backend**: Game model, gameController, tycoonContract (createGameByBackend, joinGameByBackend, setTurnCount, removePlayerFromGame).
- **Frontend**: Create game, join by code, play game, game over.

Tournament mode **orchestrates multiple Tycoon games** and adds: registration, bracket, round progression, and tournament-specific prize distribution.

---

## 2. Tournament Algorithm

### 2.1 High-Level Flow

```
Registration (open) → Bracket locked → Round 1 → Round 2 → … → Final → Payouts
```

- **Registration phase**: Players register (and pay entry fee only if tournament is entry-fee type). For creator-funded tournaments, entry is free. Min/max players (max up to 256) and deadline are set.
- **Bracket phase**: When registration closes, bracket is generated (backend). Each “slot” is a match; each match will map to one game.
- **Per round**:
  - For each match in the round, backend **creates one Tycoon game** (or reuses a pre-created placeholder).
  - Two players (or N in a future “group stage”) are assigned to that game; they **join** via existing join flow (code or backend).
  - They **play** the game as today (off-chain + contract for stakes/exits).
  - When the game **ends**, backend records **winner** and **loser** for that match.
- **Advancement**: Winner of match M advances to the next round’s slot (e.g. winner of match 1 and winner of match 2 play in semi-final).
- **Payouts**: After final round, distribute prize pool by final placement (1st, 2nd, 3rd, 4th, etc.) using existing reward system where possible.

### 2.2 Bracket Representation (Single Elimination)

- **Rounds**: Round 0 = first round, Round 1 = quarter/semi, … Round (log2(N)-1) = final.
- **Matches**: Number matches per round:
  - Round 0: `N/2` matches (e.g. 8 players → 4 matches).
  - Round 1: `N/4` matches, etc.
  - Final: 1 match.
- **Slots**: Each match has:
  - `match_id` (global or round + index).
  - `slot_a`, `slot_b`: references to “previous match winner” or “seed” (for round 0, seed = registered player).
- **Seeding**: Round 0: assign registered players to match slots (e.g. 1v8, 2v7, 3v6, 4v5 or random).

Data structures (conceptual):

- **Tournament**: id, creator_id (FK users.id), name, status (REGISTRATION_OPEN, BRACKET_LOCKED, IN_PROGRESS, COMPLETED, CANCELLED), **prize_source** (ENTRY_FEE_POOL | CREATOR_FUNDED), max_players (2–256), min_players, entry_fee_wei (0 for creator-funded), prize_pool_wei (for CREATOR_FUNDED: amount creator put up), prize_distribution (e.g. JSON: {1: 50, 2: 30, 3: 15, 4: 5}), registration_deadline, chain, created_at.
- **TournamentEntry**: tournament_id, user_id (or address), seed_order, payment_tx_hash (nullable; only for entry-fee), status.
- **TournamentRound**: tournament_id, round_index (0, 1, 2, …), status (PENDING, IN_PROGRESS, COMPLETED).
- **TournamentMatch**: tournament_id, round_index, match_index, slot_a_type (ENTRY | MATCH_WINNER), slot_a_entry_id or slot_a_match_id, slot_b_*, game_id (FK to games.id), winner_entry_id (nullable), status (PENDING, AWAITING_GAME, IN_PROGRESS, COMPLETED).

### 2.3 Algorithm: Generating the Bracket (Backend)

1. When registration closes (or max players reached):
   - Set tournament status → BRACKET_LOCKED.
   - Fetch all confirmed entries; sort by seed_order or randomize.
   - Compute number of rounds: `num_rounds = ceil(log2(entries.length))`. Optionally pad with BYEs so that entries.length is power of 2.
2. Create TournamentRound rows for round_index = 0 .. num_rounds-1.
3. Create TournamentMatch rows for Round 0:
   - Match count = entries.length / 2.
   - For each match i: slot_a = entry at index 2*i, slot_b = entry at index 2*i + 1.
4. For each subsequent round r (r >= 1):
   - Create matches for that round; slot_a/slot_b reference **previous round’s match** (e.g. slot_a = winner of match (r-1, 0), slot_b = winner of (r-1, 1)).

### 2.4 Algorithm: Running a Round

1. Mark round as IN_PROGRESS.
2. For each match in the round that has two determined participants (for round 0, both are entries; for r > 0, both are winners from previous round):
   - Create a **Tycoon game** via backend (createGameByBackend or create + join x2):
     - Private game with a unique code (e.g. `T{tournamentId}-R{round}-M{matchIndex}`).
     - Stake = 0 or a fixed “match stake” (if you want per-match stakes; otherwise only tournament entry fee).
   - Save `game_id` and `contract_game_id` on TournamentMatch.
   - Notify both players (push / in-app) to join the game (code or deep link).
3. When each game finishes (backend detects game status FINISHED and winner_id):
   - Set TournamentMatch.winner_entry_id = entry corresponding to winner, status = COMPLETED.
   - If this was the final match, set tournament status = COMPLETED and trigger payout (from entry-fee pool or creator’s prize_pool_wei).
   - Otherwise, ensure next round’s match has this winner in the correct slot and, when both slots are ready, create the next game (repeat step 2 for that match).

**Scale note**: For up to 256 players, single-elimination has 8 rounds (256 → 128 → 64 → 32 → 16 → 8 → 4 → 2 → 1). Round 0 has 128 matches; run game creation in batches if needed to avoid timeouts.

### 2.5 Algorithm: Payouts

- **Entry-fee pool**: Prize pool = sum of entry fees (minus platform cut if any).
- **Creator-funded**: Prize pool = amount the creator deposited when creating the tournament (`prize_pool_wei`). No entry fees; creator funds the entire pool.

Payout execution:

- **Option A (recommended for v1): Backend-driven**
  - Prize pool (from entry fees or creator deposit) is held in escrow or tracked off-chain.
  - When tournament status = COMPLETED, backend computes amounts per placement from prize_distribution.
  - Backend triggers payouts (USDC from treasury/escrow or mint vouchers). For creator-funded, payouts come from the creator’s deposited amount.
  - No change to Tycoon game contract payout logic; each **match** is a normal game (stake can be 0); tournament prizes are separate.

- **Option B: On-chain tournament contract**
  - Contract holds either entry fees or creator-deposited prize; distributes by placement when tournament is finalized. More trustless but requires new contract.

Recommendation: start with **Option A**; add Option B later for on-chain guarantees.

---

## 3. Contract Strategy: Upgrade vs New Contract

### 3.1 Use Existing Tycoon Contract for Matches

- **Do not change** the core game lifecycle in `Tycoon.sol`: createGame, joinGame, exitGame, removePlayerFromGame, setTurnCount, and existing payout logic (rank-based USDC + vouchers + collectibles).
- Each **tournament match** is just a **normal Tycoon game**:
  - Created via `createGame` / `createGameByBackend` (private, 2 players, stake 0 or fixed).
  - Both players join via `joinGame` / `joinGameByBackend`.
  - They play; when the game ends (last player exits or winner), backend reads `winner_id` / contract’s `getGame(gameId).winner` and records the match result.

No contract **upgrade** is required for running matches.

### 3.2 Where Contracts Might Change (Optional)

- **Entry fee collection**: Today, stakes are per-game on Tycoon. Tournament entry could be:
  - **Off-chain / backend**: Users pay entry (e.g. Stripe, or send USDC to a known wallet); backend tracks who paid and allows registration. No contract change.
  - **On-chain escrow**: New **TournamentEscrow** (or extended Tycoon) contract: `registerForTournament(tournamentId)` that pulls `entryFee` USDC from msg.sender and holds it; when tournament ends, owner/backend calls `payoutTournament(tournamentId, [addresses], [amounts])` to send USDC to winners. That’s a **new small contract** or an **upgrade** to add a “tournament module” (if you use a proxy for Tycoon).
- **Prize distribution**: Same as above; can be backend + treasury wallet (no contract), or escrow contract (new or upgrade).

Recommendation:

- **Phase 1**: No new contract. Entry fee and prizes handled off-chain / backend (track balances, pay from treasury). All matches use existing Tycoon create/join/exit.
- **Phase 2**: If you want on-chain entry and prizes, add a **new** contract (e.g. `TycoonTournament` or `TycoonTournamentEscrow`) that:
  - Accepts registration + USDC entry fee.
  - Holds funds until tournament is finalized.
  - Pays out to winner addresses based on placement (backend or owner calls `finalize(tournamentId, [rank1, rank2, ...], [amount1, amount2, ...])`).
- **No need to upgrade the existing Tycoon game contract** for tournament logic; only add a new contract if you want on-chain entry/prizes.

---

## 4. Backend Implementation

### 4.1 New Tables (Migrations)

- **tournaments**
  - id, **creator_id** (FK users.id, who created the tournament), name, status (REGISTRATION_OPEN, BRACKET_LOCKED, IN_PROGRESS, COMPLETED, CANCELLED), **prize_source** (ENUM: ENTRY_FEE_POOL | CREATOR_FUNDED), **max_players** (integer, 2–256), min_players, **entry_fee_wei** (0 for creator-funded), **prize_pool_wei** (nullable; for CREATOR_FUNDED: total prize creator put up), prize_distribution (JSON, e.g. {1: 50, 2: 30, 3: 15, 4: 5}), registration_deadline, chain, created_at, updated_at.

- **tournament_entries**
  - id, tournament_id, user_id (FK users.id), address, chain, seed_order, payment_tx_hash (nullable; only used for entry-fee tournaments), status (REGISTERED, CONFIRMED, DISQUALIFIED), created_at.

- **tournament_rounds**
  - id, tournament_id, round_index (0-based), status (PENDING, IN_PROGRESS, COMPLETED), started_at, completed_at.

- **tournament_matches**
  - id, tournament_id, round_index, match_index, slot_a_type (ENTRY | MATCH_WINNER), slot_a_entry_id, slot_a_prev_match_id, slot_b_type, slot_b_entry_id, slot_b_prev_match_id, game_id (FK games.id), contract_game_id (string), winner_entry_id (nullable), status (PENDING, AWAITING_PLAYERS, IN_PROGRESS, COMPLETED, BYE), created_at, updated_at.

Optional: **tournament_payouts** (id, tournament_id, entry_id, rank, amount_wei, tx_hash, paid_at) for audit.

### 4.2 Backend Services

- **tournamentService.js**
  - `createTournament(data)` – create row in `tournaments`. For **CREATOR_FUNDED**: require creator_id, prize_pool_wei, prize_distribution; entry_fee_wei = 0; validate max_players in 2–256. Optionally collect creator’s prize deposit (backend-held or future escrow).
  - `openRegistration(tournamentId)`, `closeRegistration(tournamentId)` – set status, optionally generate bracket.
  - `registerPlayer(tournamentId, userId, address, paymentInfo?)` – add tournament_entries. For creator-funded tournaments, no payment; just check max_players and duplicate registration.
  - `generateBracket(tournamentId)` – implement bracket algorithm above; create tournament_rounds and tournament_matches for round 0 and later rounds.
  - `startRound(tournamentId, roundIndex)` – for each match with two known participants, create Tycoon game, save game_id/contract_game_id, notify players.
  - `onGameFinished(gameId)` – find tournament_matches by game_id, set winner_entry_id from winner_id, mark match COMPLETED; if both slots for next round match are ready, create next game (or call startRound for next round).
  - `completeTournament(tournamentId)` – set status COMPLETED, compute payouts, call payout service.

- **tournamentPayoutService.js**
  - `computePayouts(tournamentId)` – from prize_distribution and final placement (from bracket), return list of (entry_id, rank, amount).
  - `executePayouts(tournamentId)` – send USDC from treasury or mint vouchers; record in tournament_payouts.

### 4.3 Backend API (Routers)

- **GET /api/tournaments** – list (filter by status, chain, prize_source).
- **GET /api/tournaments/:id** – detail + entries + rounds + matches (bracket). Include prize_source, entry_fee (0 = free), prize_pool for creator-funded.
- **POST /api/tournaments** – create. Body: name, prize_source (ENTRY_FEE_POOL | CREATOR_FUNDED), max_players (2–256), min_players, registration_deadline, prize_distribution; for CREATOR_FUNDED also: prize_pool_wei (and optional payment/escrow); for ENTRY_FEE_POOL: entry_fee_wei.
- **POST /api/tournaments/:id/register** – register current user. For creator-funded (free entry): no payment. For entry-fee: body payment_tx_hash or proof if on-chain.
- **GET /api/tournaments/:id/bracket** – bracket view (rounds + matches + winner_entry_id, game_id).
- **POST /api/tournaments/:id/close-registration** – admin; close and generate bracket.
- **POST /api/tournaments/:id/start-round/:roundIndex** – admin or cron; create games for that round (idempotent).
- **Webhooks / internal**: When a game finishes, gameController or a post-finish hook calls `tournamentService.onGameFinished(game.id)` so tournament state advances.

### 4.4 Hooks: Linking Game End to Tournament

- In `gameController.js` (or wherever game status is set to FINISHED and winner_id is set), after updating the game:
  - Check if `game.id` is linked to a tournament match: e.g. `TournamentMatch.findByGameId(game.id)`.
  - If yes, call `tournamentService.onGameFinished(game.id)` to update match winner, advance bracket, and optionally create the next round’s game.

### 4.5 Scheduler / Cron (Optional)

- **Close registration** when `registration_deadline` passes.
- **Start next round** when all matches in current round are COMPLETED (or run “start round” on a schedule and make it idempotent).

---

## 5. Frontend Implementation

### 5.1 New Pages / Routes

- **Tournaments list**: `/tournaments` – list upcoming and past tournaments (from GET /api/tournaments).
- **Tournament detail**: `/tournaments/:id` – name, status, **“Free entry”** vs entry fee, **prize pool** (creator-funded shows total prize), prize breakdown, “Register” button (or “Registered”), countdown to registration close. For creator-funded, emphasize “Free to join • Prize pool: X USDC”.
- **Bracket view**: `/tournaments/:id/bracket` – rounds and matches; each match shows:
  - Player A vs Player B (usernames), or “TBD” if from previous round.
  - “Join game” / “Play” if current user is in that match and game is created (link to existing game by code or game id).
  - Winner after game ends.
- **Play match**: Reuse existing **game room**; from bracket, user clicks “Play” and is deep-linked to `/game/:gameId` or join by code.

### 5.2 State and API Usage

- Tournament list/detail: fetch from REST above.
- Registration: POST /api/tournaments/:id/register (with wallet signature or payment proof if needed).
- Bracket: GET /api/tournaments/:id/bracket; poll or refetch when round advances.
- When user is in a match and a game exists: show “Your match is ready” and link to game (same as current join flow).

### 5.3 UI Components (Suggestions)

- `TournamentCard` – summary for list.
- `TournamentBracket` – round columns, match boxes, lines connecting matches to next round.
- `TournamentMatchBox` – two names, vs, winner highlight, “Join game” button.
- Reuse existing `GameRoom` / join-by-code flow for actually playing the match.

---

## 6. End-to-End Flows

### 6.1 Player Registers and Plays

1. User opens Tournaments → selects tournament → Register (for creator-funded: free, one click; for entry-fee: pay entry; backend or contract records it).
2. Registration closes; bracket is generated; user sees bracket with “TBD” in later rounds.
3. Round 0 starts: backend creates one game per match; user sees “Your match: [Opponent]. Join game.”
4. User clicks Join → enters game (same as current join by code or deep link); both play.
5. Game ends → backend sets match winner; bracket updates; if user won, next round shows their next match when it’s ready.
6. After final, tournament status = COMPLETED; payouts run; user sees placement and prize (and receives USDC/voucher).

### 6.2 Creator Creates a Free-Entry Tournament (Creator-Funded)

1. Creator opens “Create tournament” (e.g. from `/tournaments` or dashboard).
2. Selects **Creator-funded (free entry)**; sets:
   - Name, max players (2–256), registration deadline, chain.
   - **Prize pool amount** (e.g. 100 USDC total).
   - **Prize distribution** (e.g. 1st: 50%, 2nd: 30%, 3rd: 15%, 4th: 5%).
3. Submits; backend creates tournament (status REGISTRATION_OPEN). Optionally creator pays prize into escrow/treasury at creation (or before bracket locks).
4. Players join for free; when registration closes, bracket is generated and matches run as in 6.1. Payouts are drawn from the creator’s prize pool.

### 6.3 Backend Flow (Per Round)

1. Admin or cron calls `startRound(tournamentId, roundIndex)`.
2. For each match in round with two participants: create Tycoon game (private, 2 players), store game_id in tournament_matches, notify players.
3. When game finishes: `onGameFinished(gameId)` → set winner_entry_id, mark match COMPLETED; for next round match that now has both slots filled, create next game (or batch in next startRound).

---

## 7. Phased Rollout

| Phase | Scope |
|-------|--------|
| **1 – MVP** | Backend: tournaments (incl. **creator-funded, free entry**, max 256 players), entries, rounds, matches; bracket generation; create one game per match; link game end to match winner. Frontend: list tournament, **create tournament** (creator sets prize + distribution, free entry), register (free for creator-funded), view bracket, join match. Payouts: manual or backend pay-from-treasury/creator deposit. No new contract. |
| **2** | Entry-fee on-chain (optional); creator prize deposit on-chain (escrow); payouts on-chain; optional cron to auto-advance rounds. |
| **3** | Double-elimination or group stage; larger brackets; leaderboards and history. |

Use this document as the single source of truth for implementing tournament mode; adjust table names and API paths to match your codebase conventions.
