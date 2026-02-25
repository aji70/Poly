# TycoonTournamentEscrow — Deployment & Backend Integration

On-chain USDC for tournament **entry fees** and **prize pools**. Backend (or owner) creates tournaments, locks them, and finalizes payouts.

---

## 1. Contract Summary

| Function | Who | Description |
|----------|-----|-------------|
| `createTournament(tournamentId, entryFee, creator)` | Backend/Owner | Create tournament; `tournamentId` = backend DB id; `entryFee` in USDC (6 decimals); `creator` = address that funds prize (or `address(0)`). |
| `fundPrizePool(tournamentId, amount)` | Anyone | Creator deposits USDC (must `approve` escrow first). |
| `registerForTournament(tournamentId)` | Player | Pays `entryFee` USDC (approve first). No-op if entry fee is 0. |
| `lockTournament(tournamentId)` | Backend/Owner | No more deposits. |
| `finalizeTournament(tournamentId, recipients[], amounts[])` | Backend/Owner | Send USDC to `recipients`; `amounts` sum must be ≤ pool. |
| `cancelTournament(tournamentId)` | Backend/Owner | Refund all entry fees to entrants. |
| `refundPrizeToCreator(tournamentId)` | Owner | After cancel, send prize pool back to creator. |

**Views:** `tournaments(tournamentId)`, `entryPaid(tournamentId, user)`, `getEntrants(tournamentId)`, `tournamentPool(tournamentId)`.

---

## 2. Deployment

### 2.1 Deploy

Use the same USDC address as Tycoon (same chain).

```bash
# Example (Foundry)
forge create src/TycoonTournamentEscrow.sol:TycoonTournamentEscrow \
  --constructor-args <USDC_ADDRESS> <OWNER_ADDRESS> \
  --rpc-url <RPC_URL> \
  --private-key <PK>
```

Or in a script:

```solidity
TycoonTournamentEscrow escrow = new TycoonTournamentEscrow(usdcAddress, owner);
escrow.setBackend(backendWalletAddress);
```

### 2.2 Post-deploy

1. Call `setBackend(backendWallet)` so the backend wallet can create/lock/finalize/cancel.
2. Per chain: deploy one escrow (or one per environment). Backend stores `TOURNAMENT_ESCROW_ADDRESS_<CHAIN>`.

---

## 3. Backend Integration

### 3.1 When to Use Escrow

- **Entry-fee tournaments:** Players call `registerForTournament(tournamentId)` on-chain (or frontend does it for them). Backend can also verify on-chain that `entryPaid(tournamentId, user) > 0` before adding to `tournament_entries`.
- **Creator-funded:** Creator calls `fundPrizePool(tournamentId, amount)` after approving USDC. Backend creates tournament with `createTournament(tournamentId, 0, creatorAddress)` then creator funds.
- **Payouts:** When tournament is COMPLETED, backend calls `finalizeTournament(tournamentId, recipients[], amounts[])` with winner addresses and amounts (from `computePayouts`).

### 3.2 Backend Flow (Entry-Fee)

1. **Create tournament (backend):** `createTournament(tournamentId, entryFeeWei, creator)`. Use same `tournamentId` as DB.
2. **Player registers:** Frontend calls `usdc.approve(escrow, entryFee)` then `escrow.registerForTournament(tournamentId)`. Or backend can call on behalf of user if you have a meta-tx or relayer.
3. **Backend:** Before adding to `tournament_entries`, optionally verify on-chain: `entryPaid(tournamentId, userAddress) >= entryFee` (or require tx hash from frontend).
4. **Close registration:** Backend calls `lockTournament(tournamentId)` so no more entries.
5. **After tournament ends:** Backend calls `finalizeTournament(tournamentId, recipients, amounts)` with payout list.

### 3.3 Backend Flow (Creator-Funded)

1. Backend creates tournament in DB (no entry fee). Create on-chain: `createTournament(tournamentId, 0, creatorAddress)`.
2. Creator (frontend): `usdc.approve(escrow, prizeAmount)` then `escrow.fundPrizePool(tournamentId, prizeAmount)`.
3. Backend locks when bracket is set: `lockTournament(tournamentId)`.
4. After final: `finalizeTournament(tournamentId, [winner1, winner2, ...], [amt1, amt2, ...])`.

### 3.4 ABI Snippets (for Node/ethers)

Add to your backend contract ABI or `tycoonContract.js` (separate escrow contract instance):

```javascript
// TycoonTournamentEscrow
createTournament: (tournamentId, entryFee, creator) => ...
fundPrizePool: (tournamentId, amount) => ...
registerForTournament: (tournamentId) => ...
lockTournament: (tournamentId) => ...
finalizeTournament: (tournamentId, recipients[], amounts[]) => ...
cancelTournament: (tournamentId) => ...
refundPrizeToCreator: (tournamentId) => ...
tournaments: (tournamentId) => ...  // view
entryPaid: (tournamentId, user) => ...  // view
getEntrants: (tournamentId) => ...  // view
tournamentPool: (tournamentId) => ...  // view
```

### 3.5 Env Vars

- `TOURNAMENT_ESCROW_ADDRESS_BASE` (or `_POLYGON`, `_CELO`) — deployed escrow address per chain.
- Backend wallet that calls create/lock/finalize/cancel must be set as `backend` on the contract (same or different from game controller).

---

## 4. Payout Execution (Backend)

When you implement `executePayouts(tournamentId)` in `tournamentPayoutService.js`:

1. Load tournament and compute payout list (entry_id → user address, amount) from `computePayouts`.
2. If using **escrow:** build `recipients[]` and `amounts[]`, then call `escrow.finalizeTournament(tournamentId, recipients, amounts)` from the backend wallet. Ensure total ≤ `escrow.tournamentPool(tournamentId)`.
3. If using **off-chain treasury:** send USDC from your treasury wallet to each winner (no escrow call).

---

## 5. Cancellation

If tournament is cancelled before or after lock:

1. Backend calls `escrow.cancelTournament(tournamentId)` → all entry fees refunded to entrants.
2. Owner calls `escrow.refundPrizeToCreator(tournamentId)` to return prize pool to creator.
