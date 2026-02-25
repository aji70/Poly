# Product Update: Frontend Feature Parity

*Summary of new and improved features when the main frontend is updated to match the latest experience.*

---

## New Features

### Leaderboard
- **Global leaderboard** accessible from the main navigation (desktop and mobile).
- View top players by:
  - **Wins** — games played, won, and lost
  - **Earnings** — total earned, staked, and withdrawn
  - **Stakes** — staking and earnings overview
  - **Win rate** — games played and win percentage
- Animated, easy-to-scan list with clear ranking.

### Analytics Dashboard (internal / admin)
- **Analytics page** for monitoring product usage:
  - Total games and breakdown by status
  - Games created and finished today and this week
  - Recorded events for debugging and insights
- Helps teams track adoption and react to feedback.

### Config & Test Tooling (internal / dev)
- **Config-test page** for development and ops:
  - View backend configuration (RPC, contract, etc.)
  - Run a connection test
  - Call contract read/write functions via the backend for debugging

---

## Improved Game Experience

### In-game clarity
- **Game timer** — Visible countdown when a game has a time limit, so players know how much time is left (including on mobile).
- **Trade alerts** — Clear badge/pill showing how many incoming trade offers you have; one tap to open and respond.
- **Victory / defeat screen** — Unified end-of-game modal for multiplayer: “You win” or “Game over” with your final position (1st, 2nd, etc.) and a single “Go home” action.

### Property & perks
- **Property details** — Dedicated modals for property info on board and AI board (desktop and mobile).
- **Buy prompts** — Clear buy prompt modal on AI board mobile when landing on a property.
- **Perks** — Dedicated perks modals so players can quickly see and use perks (board and AI, including mobile).

### Mobile gameplay
- **Roll dice** — Dedicated roll-dice section for a consistent mobile experience.
- **Notifications** — Bell-style notifications for important in-game events.
- **Balance** — Visible balance bar on AI board mobile so players always see their current balance.
- **Chat** — Desktop chat experience available where applicable for parity across devices.

---

## Rewards & Admin

- **Rewards panel** — Cleaner rewards admin experience with shared animated counters and consistent perk/collectible constants.
- **Unified rewards logic** — Centralized rewards constants and (where used) admin hook for easier maintenance and fewer inconsistencies.

---

## Summary for Stakeholders

| Area            | What’s new / improved                                      |
|-----------------|------------------------------------------------------------|
| **Discovery**   | Leaderboard in nav; users can compete and compare.         |
| **Insights**    | Analytics dashboard for usage and events.                  |
| **Gameplay**    | Timer, trade alerts, clear win/loss screen, better modals. |
| **Mobile**      | Better roll, notifications, balance, and perks on mobile.  |
| **Operations**  | Config-test and analytics for dev and support.             |
| **Rewards**     | More consistent rewards UI and admin flow.                 |

---

*This update brings the main frontend in line with the latest product experience; chain and contract configuration remain unchanged.*
