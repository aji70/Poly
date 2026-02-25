# Registration & Guest–Wallet Linking

This document describes how registration works today (contract + backend, guest mode) and how to implement **guest ↔ wallet account linking** so that:

1. **Wallet users** can access their account without the wallet (e.g. “login with email” or “sign in with wallet” to get a session).
2. **Guests** can link their account to a wallet address and use “their main wallet profile” (same stats, same identity; wallet used for signing / staked games).

---

## Table of Contents

1. [Current Registration (Contract + Backend)](#1-current-registration-contract--backend)
2. [Guest Mode Today](#2-guest-mode-today)
3. [Goals: One Identity, Multiple Ways to Sign In](#3-goals-one-identity-multiple-ways-to-sign-in)
4. [Implementation: Allow Guests to Link a Wallet](#4-implementation-allow-guests-to-link-a-wallet)
5. [Implementation: Allow Wallet Users to Access Their Account as “Guest”](#5-implementation-allow-wallet-users-to-access-their-account-as-guest)
6. [Data Model Changes](#6-data-model-changes)
7. [API Summary](#7-api-summary)
8. [Frontend Flows](#8-frontend-flows)

---

## 1. Current Registration (Contract + Backend)

### 1.1 On-chain (Tycoon contract)

- **Wallet users**: Call `registerPlayer(username)` from the frontend (user signs with their wallet). One address per user; username unique. Contract stores `users[username]` and `registered[address] = true`.
- **Guest users**: Do **not** sign themselves. Backend calls `registerPlayerFor(playerAddress, username, passwordHash, chain)` where:
  - `playerAddress` = a **custodial wallet** created by the backend (ethers.Wallet.createRandom()).
  - `passwordHash` = keccak256(password) so the contract can authenticate “backend acting for this guest” (e.g. endAIGameByBackend, exitGameByBackend).

So there are two ways to be “registered” on the contract: (1) wallet self-register, (2) backend register on behalf of a custodial address (guest).

### 1.2 Backend (users table)

- **Wallet user**: Created when the frontend calls **POST /api/users** with `{ username, address, chain }` (after the user has already registered on the contract). No `password_hash`; no `is_guest`. Identified by `(address, chain)`.
- **Guest user**: Created by **POST /api/auth/guest-register** with `{ username, password, chain }`. Backend:
  1. Creates a new custodial wallet.
  2. Calls `registerPlayerFor(address, username, keccak256(password), chain)` on the contract.
  3. Inserts a user row with `address` = custodial address, `password_hash` = keccak256(password), `is_guest = true`.

Both paths result in one row in `users` with a unique `(username, chain)` (per migration 20260226100000). Wallet users have `address` = their real wallet; guest users have `address` = backend-owned custodial address.

### 1.3 Auth today

- **Guest**: Gets a **JWT** from `guest-register` or `guest-login`. All guest-only endpoints (e.g. create-as-guest, join-as-guest) use **Authorization: Bearer &lt;token&gt;**; middleware `requireAuth` sets `req.user` from the JWT.
- **Wallet**: No JWT in the current flow. The frontend sends `address` (and sometimes chain) in request bodies (e.g. create game, join game). The backend looks up the user by `User.findByAddress(address, chain)` when it needs to. So “auth” for wallet users is effectively “whoever sends this address” (trusted in a same-origin app; for production you may add signature verification for sensitive actions).

---

## 2. Guest Mode Today

- **Register**: User picks username + password + chain. Backend creates custodial wallet, registers on contract, creates user with `is_guest: true`, returns JWT.
- **Login**: Username + password → same user → JWT.
- **Limitation**: Guest does not “own” the custodial address (private key stays on backend). They can play, create/join games via backend (createGameByBackend, joinGameByBackend). They **cannot** create staked games (contract requires USDC from the player’s wallet); backend message says: “Connect your wallet to create staked games.”
- **Linking (not yet implemented)**: There is no way for a guest to “attach” their real wallet to their account so that when they connect that wallet, they see the same profile (stats, username, history).

---

## 3. Goals: One Identity, Multiple Ways to Sign In

| Scenario | Goal |
|----------|------|
| **Guest → Wallet** | Guest links their real wallet to their account. When they “connect wallet” with that address, the app treats them as the **same user** (same backend `users.id`, same stats, same username). They can then use the wallet for staked games, withdrawals, etc., while keeping their existing progress. |
| **Wallet → “Guest” access** | A wallet user should be able to use the app **without** having the wallet connected (e.g. on another device). So they need a way to “log in” and get a session (JWT) that refers to the same backend user. Options: (A) “Connect email” + password and then “Login with email”; (B) “Sign in with wallet” (sign a message once, backend issues JWT for that address). |

---

## 4. Implementation: Allow Guests to Link a Wallet

### 4.1 Idea

- The **identity** stays the guest’s backend user (same `users.id`, username, stats).
- We add a field: **linked_wallet_address** (and optionally **linked_wallet_chain**) on `users`.
- When a guest “links” their wallet, we verify they control that address (signature), then set `linked_wallet_address` / `linked_wallet_chain` on their user row.
- When **any** request comes in “as” that wallet (e.g. user connected wallet and we resolve by address), we treat it as the **same** user if `address` matches either:
  - `users.address` (primary: custodial or main wallet), or
  - `users.linked_wallet_address`.

So: one user can be reached by **primary address** (custodial for guest) or **linked wallet address**.

### 4.2 Backend steps

1. **Migration**: Add to `users`:
   - `linked_wallet_address` (string, nullable)
   - `linked_wallet_chain` (string, nullable)
2. **Link endpoint** (guest only):  
   **POST /api/auth/link-wallet**  
   - Requires: `Authorization: Bearer <guest JWT>`.  
   - Body: `{ walletAddress, chain, message, signature }`.  
   - Backend: Verify that `signature` is the wallet signing `message` (e.g. “Link Tycoon account: &lt;username&gt;” + nonce). Recover signer; require `recovered === walletAddress`.  
   - Update: `User.update(req.user.id, { linked_wallet_address: walletAddress, linked_wallet_chain: chain })`.  
   - Optional: Ensure `walletAddress` is not already used as primary or linked address by another user (one wallet → one account).
3. **Resolve user by wallet**: In any flow that identifies user by “connected address” (e.g. create game, join game, “my games”), when looking up by `(address, chain)`:
   - First try `User.findByAddress(address, chain)`.
   - If none, try **find by linked wallet**: e.g. `User.findByLinkedWallet(address, chain)` (new method: `where({ linked_wallet_address: address, linked_wallet_chain: chain })` or equivalent). If found, that user is the “current” user for that request.
4. **Unlink (optional)**: **POST /api/auth/unlink-wallet** with guest JWT; set `linked_wallet_address` and `linked_wallet_chain` to null.

### 4.3 Contract note

- The **contract** still has one identity per address (username tied to address). The guest’s **on-chain** identity is the custodial address (used for registerPlayerFor, createGameByBackend, etc.).
- Linking a wallet on the **backend** does not change the contract. For **staked** games, the player must pay from their wallet; when a linked-wallet user creates a staked game, the frontend would use the **linked wallet** to sign and pay; the **game/contract** still sees that wallet’s address. The backend would treat that wallet as the same user (via linked_wallet_address) and can associate the game with the same `users.id`.

### 4.4 Frontend (guest links wallet)

- Logged-in guest sees “Link your wallet” in settings/profile.
- On click: connect wallet (e.g. MetaMask) → build message “Link Tycoon account: &lt;username&gt;” (plus optional nonce) → request signature → POST /api/auth/link-wallet with `walletAddress`, `chain`, `message`, `signature`.
- After success, show “Wallet linked: 0x…”. From then on, when the user connects that wallet, the app can call an endpoint that resolves user by address (including linked) and returns the same profile / JWT (see next section).

---

## 5. Implementation: Allow Wallet Users to Access Their Account as “Guest”

Here “as guest” means: **log in without the wallet** and get a session (JWT) that refers to the **same** backend user as their wallet account.

### 5.1 Option A: Connect email + password (wallet user adds email, then can “login with email”)

- **Migration**: Add to `users`:
   - `email` (string, nullable, unique)
   - `password_hash_email` (string, nullable) — use a **different** hash from contract’s keccak256 (e.g. bcrypt) so email login is independent of contract auth.
- **Flow**:
  1. Wallet user (identified by connected wallet + backend user) goes to Settings → “Connect email”.
  2. They enter email + password; backend hashes password (bcrypt), sets `email` and `password_hash_email` on their user row. Optionally send verification email.
  3. Later, from any device, they go to “Login” → “Login with email” → enter email + password → **POST /api/auth/login-email** → backend finds user by `email`, verifies bcrypt, issues JWT for that `userId` (same as wallet user). Response includes same user payload (id, username, address, is_guest: false, etc.).
- **Backend**: New endpoint **POST /api/auth/login-email** `{ email, password }`; new endpoint **POST /api/auth/connect-email** (requires auth: either JWT or wallet-signature auth) `{ email, password }` to attach email to current user. Add `User.findByEmail`, `User.setEmailPassword(id, email, hashedPassword)`.

### 5.2 Option B: Sign in with wallet (no email)

- Wallet user (or anyone with a registered address) can get a **JWT session** by proving they own the address:
  1. Frontend: user connects wallet, signs a message (e.g. “Sign in to Tycoon at &lt;timestamp&gt;” or SIWE).
  2. **POST /api/auth/login-by-wallet** with `{ address, chain, message, signature }`.
  3. Backend: Verify signature (recover signer === address). Find user by `User.findByAddress(address, chain)` or `User.findByLinkedWallet(address, chain)`. If found, issue JWT for that `userId` (same format as guest JWT so existing middleware works).
  4. Frontend stores JWT; from then on they use the app with Bearer token (no need to keep wallet connected until they want to sign a tx).

This gives “access wallet account as guest” without adding email: one-time sign-in with wallet to get a session.

### 5.3 Recommendation

- Implement **Option B** first (sign in with wallet → JWT). Simple, no new columns, works for all wallet users.
- Add **Option A** (email + password) later so wallet users can log in from devices where they don’t have the wallet (e.g. “Login with email” on mobile).

---

## 6. Data Model Changes

| Change | Purpose |
|-------|--------|
| **users.linked_wallet_address** (nullable string) | Guest’s linked wallet; resolve user by this address so “connect wallet” shows same profile. |
| **users.linked_wallet_chain** (nullable string) | Chain for linked wallet. |
| **users.email** (nullable string, unique) | Optional; for “login with email” (wallet user). |
| **users.password_hash_email** (nullable string) | Bcrypt (or similar) for email login; separate from contract’s keccak256. |

Order of implementation:

1. **Phase 1**: Add `linked_wallet_address` and `linked_wallet_chain` only. Implement link-wallet, unlink-wallet, and “resolve user by address or linked address” everywhere you currently resolve by address.
2. **Phase 2**: Add `login-by-wallet` (sign message → JWT) so wallet users get a session.
3. **Phase 3** (optional): Add `email` and `password_hash_email`; implement connect-email and login-email.

---

## 7. API Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|--------|
| POST | /api/auth/guest-register | — | Create guest (custodial wallet + contract + user); return JWT. |
| POST | /api/auth/guest-login | — | Guest login (username + password); return JWT. |
| GET | /api/auth/me | Bearer | Current user (guest or wallet session). |
| POST | /api/auth/link-wallet | Bearer (guest) | Link wallet to current guest (body: walletAddress, chain, message, signature). |
| POST | /api/auth/unlink-wallet | Bearer (guest) | Remove linked wallet from current user. |
| POST | /api/auth/login-by-wallet | — | Body: address, chain, message, signature; verify signature, find user (by address or linked_wallet_address), return JWT. |
| POST | /api/auth/connect-email | Bearer or wallet | Attach email + password to current user (Phase 3). |
| POST | /api/auth/login-email | — | Login with email + password; return JWT (Phase 3). |

**Resolve user by “connected wallet” everywhere**: When a request carries `address` (and chain) from the frontend (e.g. after “Connect wallet”), backend should resolve user with:

- `User.findByAddress(address, chain)` **or**
- `User.findByLinkedWallet(address, chain)` (new).

Use that user as `req.user` for the rest of the flow (e.g. create game, join game, my games).

---

## 8. Frontend Flows

### 8.1 Guest links wallet

1. User is logged in as guest (JWT).
2. Settings / Profile: “Link wallet” → connect wallet → sign message → POST /api/auth/link-wallet.
3. Show “Wallet linked.” When they later “Connect wallet” with that address, the app should call an endpoint that resolves user by address (including linked) and, if you use JWT for wallet sessions, issue or reuse JWT for that user so the UI shows the same profile (username, stats).

### 8.2 Wallet user gets a session (“login as guest” with wallet)

1. User connects wallet (no JWT yet).
2. “Sign in to Tycoon” or “Get session” → sign message → POST /api/auth/login-by-wallet → receive JWT.
3. Frontend stores JWT; subsequent API calls use Bearer token. Backend loads user from JWT; no need to send address in body for every request. Optionally still show “Wallet connected” for signing txs when needed.

### 8.3 Wallet user connects email (Phase 3)

1. Wallet user (or guest) in Settings → “Connect email” → enter email + password → POST /api/auth/connect-email (with current JWT or wallet proof).
2. Later: “Login with email” → email + password → POST /api/auth/login-email → JWT for same user.

### 8.4 Prompting wallet users to connect email

- After wallet registration (or on first visit when user is identified by wallet), show a one-time prompt: “Add an email to log in from any device later?” with [Add email] and [Skip]. If they choose Add email, open the “Connect email” flow above.

---

## Summary

- **Registration** is documented: contract (registerPlayer vs registerPlayerFor), backend (POST /users for wallet, guest-register for guest), and auth (JWT for guest; address in body for wallet).
- **Guest → wallet linking**: Add `linked_wallet_address` / `linked_wallet_chain`; guest proves ownership with signature; when app resolves user by “connected address,” also match on linked wallet so the same profile is used.
- **Wallet → “guest” access**: Add **login-by-wallet** (sign message → JWT) so wallet users get a session without email; optionally add **connect email** + **login-email** so they can log in from any device.

Implement in phases: (1) link/unlink wallet + resolve by linked address, (2) login-by-wallet, (3) optional email connect and login-email.
