# How to Update `frontend` to Match `frontend_update`

This guide describes how to bring the main `frontend` in line with `frontend_update` (functionality only; chain/contract config stays in `frontend`).

---

## 1. Add Missing Routes

- **`/leaderboard`**  
  Add `app/leaderboard/page.tsx` that renders the Leaderboard component. Copy (or move) `frontend_update/components/leaderboard/leaderboard.tsx` into `frontend/components/leaderboard/` and fix imports (paths, API, types). Ignore chain-specific logic; keep the same UI and data shape.

- **`/analytics`**  
  Add `app/analytics/page.tsx` that renders the analytics dashboard. Copy `frontend_update/components/analytics/analytics-dashboard.tsx` into `frontend/components/analytics/` and wire it to your backend (e.g. `apiClient.get("analytics/dashboard")`). Adjust API base URL if needed.

- **`/config-test`** (optional, usually dev-only)  
  Add `app/config-test/page.tsx` and copy the config-test page component from `frontend_update`. Point it at your backend’s config/test endpoint; keep contract calls via backend so chain doesn’t matter in the UI.

---

## 2. Update Navigation

- In **`frontend/components/shared/navbar.tsx`** and **`navbar-mobile.tsx`**, add a “Leaderboard” link that goes to **`/leaderboard`** (same as in `frontend_update`).

---

## 3. Add Missing Shared Components and Hooks

Copy from `frontend_update` into `frontend` and fix imports/paths:

**Shared / rewards**

- `components/rewards/AnimatedCounter.tsx`
- `components/rewards/rewardsConstants.tsx` (or equivalent: perk names, initial collectibles, etc.)
- If `frontend_update` uses `useRewardsAdmin`, add that hook and use it in `app/rewards/page.tsx`; otherwise keep your current rewards logic and only reuse AnimatedCounter + constants where it helps.

**Game UI**

- `components/game/GameDurationCountdown.tsx`
- `components/game/TradeAlertPill.tsx`
- `components/game/modals/VictoryDefeatModal.tsx`
- Property/perks modals: `PropertyDetailModal`, `BoardPropertyDetailModal`, `BuyPromptModal`, `PerksModal`, `BoardPerksModal` (and any mobile variants used in board/ai-board).
- Mobile: `RollDiceSection`, `BellNotification`, `MyBalanceBar`, and desktop chat component if you want parity (`chat-room-desktop.tsx`).

**Board logic**

- `components/game/board/useGameBoardLogic.ts`
- Refactor your board (and optionally ai-board) to use this hook instead of inline logic so behavior matches `frontend_update`.

**Hooks**

- `hooks/useAIGameCreate.ts`
- Use it where AI games are created so that flow matches `frontend_update`.

---

## 4. Wire New UI Into Existing Screens

- **Game screens**  
  Use **`GameDurationCountdown`** wherever the game has a duration (e.g. game header or mobile bar). Use **`TradeAlertPill`** where you show “incoming trades” (e.g. next to the trade button or in the header). Use **`VictoryDefeatModal`** for end-of-game (replace or mirror your current victory/defeat modals). Use the new property/perks modals in the same places as in `frontend_update` (board/ai-board desktop and mobile).

- **Rewards**  
  In `app/rewards/page.tsx`, replace the inline `AnimatedCounter` with the shared `AnimatedCounter` and use `rewardsConstants` where applicable.

---

## 5. Keep Chain/Contract Config in `frontend`

- Do **not** copy chain-specific config from `frontend_update` (e.g. Celo vs Polygon, contract addresses, RPC).
- Keep using `frontend`’s existing contracts, env, and wallet/chain setup; only add the **UI and non-chain logic** from `frontend_update`.

---

## 6. Suggested Order

1. Add **AnimatedCounter** and **rewardsConstants**, then update rewards page.
2. Add **Leaderboard** page + nav link.
3. Add **Analytics** page (and optional **config-test**).
4. Add **GameDurationCountdown**, **TradeAlertPill**, **VictoryDefeatModal** and wire them into game flows.
5. Add **useGameBoardLogic** and refactor board to use it.
6. Add **useAIGameCreate** and the remaining modals (property, perks, buy prompt, etc.) and mobile pieces.

---

*Reference: see `FRONTEND_MISSING_FUNCTIONALITY.md` for the full list of missing items.*
