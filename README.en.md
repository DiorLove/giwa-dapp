<div align="center">

<img src="web/public/logo.png" alt="이음 IEUM" width="104" height="104" />

# 이음 · IEUM

### A Korea-native on-chain escrow protocol — where money never passes through human hands

Settle jeonse deposits, moving-day balances, and rotating savings circles (kye)
in **a single transaction**. The moment an intermediary holds your money → **0 seconds**.

<br/>

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-ieum--protocol.vercel.app-000000?style=for-the-badge)](https://ieum-protocol.vercel.app)
[![GIWA Sepolia](https://img.shields.io/badge/Chain-GIWA_Sepolia_(91342)-4F46E5?style=for-the-badge)](https://sepolia-explorer.giwa.io)

![Foundry](https://img.shields.io/badge/tests-68_passing-3fb950?style=flat-square&logo=solidity)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

**UPBIT × GIWA · GASOK Builder Program**

[Demo](https://ieum-protocol.vercel.app) · [Explorer](https://sepolia-explorer.giwa.io) · [Deployments](#-deployments--giwa-sepolia) · [Security](#-security--audit-ready)

<br/>

[🇰🇷 한국어](README.md)  ·  **🇬🇧 English**

</div>

---

## 🧩 In one sentence

> **IEUM removes the accidents that happen when big money passes through "human hands."**
> Jeonse fraud, blown moving-day balances, a circle-leader running off with the pot — all three are caused by *the time an intermediary holds the money*, and that is exactly the problem smart contracts were designed to solve.

| Product | Real-world problem | IEUM's solution |
|---------|--------------------|-----------------|
| 🏠 **Jeonse Escrow** *(core)* | Deposits stranded when move-out/move-in dates don't line up; jeonse fraud | Lock the incoming tenant's deposit → at settlement, refund the outgoing tenant **and** pay the landlord's balance in **one transaction**, simultaneously |
| 💧 **IEUM Earn** *(money market)* | The liquidity gap between moving dates; covering a reverse-jeonse (falling-price) shortfall | Supply mKRW → earn real APY. mETH-collateral loans + jeonse bridge advances run in **one unified pool** |
| 🎏 **Kye Circles** | The trust risk of a circle leader absconding with the pot | The leader *is* the contract — **tamper-proof on-chain draw** · automatic settlement · deposit slashing on default |

---

## ⚙️ How it works — Atomic Settlement

```
   Incoming tenant B ──[ lock deposit ]──▶ ┌────────────────────┐
                                           │   JeonseEscrow      │
   Outgoing tenant A ◀─[ refund ]───────── │   settle() · 1 TX   │
                                           │   all three finalize │
   Landlord L        ◀──[ balance ]─────── │   together — nobody  │
                                           │   holds the money    │
   IEUM Earn ──[ bridge the date gap ]────▶└────────────────────┘
                └ only for deals whose deposit is already locked on-chain ┘
```

After the settlement date, **anyone** can call `settle()`, and all three parties are finalized **in a single transaction**. An intermediate state where only one side is paid is **structurally impossible**.

**Reverse-jeonse (falling prices)** is handled too — if the deposit to refund exceeds the new jeonse, the landlord tops up the shortfall from their wallet or borrows it against mETH collateral in IEUM Earn.

---

## 💧 IEUM Earn — the unified money market

The revenue engine: jeonse bridging and collateral lending run on **the same liquidity pool**.

- **Suppliers**: supply mKRW → earn loan interest + bridge fees as real APY, pro-rata to shares
- **Landlords / borrowers**: borrow mKRW against mETH collateral (70% LTV) → cover a reverse-jeonse shortfall
- **Utilization-based two-slope rates** · **liquidation at Health Factor < 1** (7% bonus)
- Bridge-advance receivables are **100% backed** by tokens locked in the escrow — not a phantom asset suppliers can drain

---

## 🔐 Security — Audit-Ready

As befits a protocol handling real money, we **self-audited and fixed every vulnerability we found**.

| # | Vulnerability | Fix |
|---|---------------|-----|
| 1 | **Forged-escrow pool drain** (an arbitrary contract inflates `refundAmount` to siphon a bridge advance with no collateral) | Only **trusted, factory-registered** escrows may bridge, via an `authorizeEscrow` allowlist |
| 2 | **Forged receivable clearing** (`onRepaid` callable without authorization) | Gated by the same allowlist |
| 3 | **Draw grinding** (the leader retries blocks until a favorable payout order) | **Commit–reveal 2-phase draw**: order is fixed from a future block hash → unpredictable, ungrindable |

Additional defense (against a "death spiral"):

- 🧯 **Oracle circuit breaker** — max ±20% price move per update, so a misfed/manipulated oracle can't cascade into mass liquidation
- ⏸ **Emergency pause (guardian)** — halts new borrows/bridges on anomaly; repay, withdraw, and liquidate always allowed
- ⏱ **Stale-price guard** — blocks over-borrowing and unfair liquidation from a frozen oracle
- ✅ **68 Foundry tests, all passing** (atomic settlement · slashing · first-depositor inflation defense · regression tests for the vulns above)
- All external transfers execute **after** state updates (checks-effects-interactions) · SafeERC20 · pull-payment

---

## 📦 Deployments · GIWA Sepolia

Chain ID `91342` · RPC `https://sepolia-rpc.giwa.io` · **all Verified ✅**

| Contract | Role | Address |
|----------|------|---------|
| **IeumEarn** | Unified money market (supply/borrow/bridge) | [`0xe4556aaa…151E`](https://sepolia-explorer.giwa.io/address/0xe4556aaaA3b6bE83F16c3DF3687136f0B9C7151E) |
| **JeonseFactory** | Creates jeonse escrows | [`0xEF5D1a63…3e49`](https://sepolia-explorer.giwa.io/address/0xEF5D1a636c18737B9dCFa75ddfa38bfd8fBA3e49) |
| **MulleFactory** | Creates kye circles | [`0xFc6cc4eE…24a3`](https://sepolia-explorer.giwa.io/address/0xFc6cc4eEa2e8dAb1318d52482db82e68873F24a3) |
| **PriceOracle** | Collateral price (circuit breaker) | [`0xC7383631…2d81`](https://sepolia-explorer.giwa.io/address/0xC7383631538124b8B19973b2DD83F9D948432d81) |
| **MockKRW** | Mock KRW (to be replaced) | [`0x34e78932…c18BB`](https://sepolia-explorer.giwa.io/address/0x34e78932cB132e248EEf189ed66574E9dffc18BB) |
| **MockETH** | Collateral token | [`0x9AaB1E96…5296`](https://sepolia-explorer.giwa.io/address/0x9AaB1E96a0E800beA9E1dC2aBc0378067b375296) |

---

## 💰 Revenue model *(all on-chain)*

| Item | Fee | Charged on |
|------|-----|-----------|
| Jeonse settlement | 0.05% of jeonse | **landlord's balance only** (refund is untouchable) |
| Bridge advance | 0.5% of advance | protocol share + supplier (LP) yield |
| Loan interest | utilization-based | 10% of interest (reserve factor) = protocol revenue |
| Kye pot | 0.1% of pot | each round on payout |

Every fee parameter is bounded in the constructor (e.g. settlement fee ≤ 1%).

---

## 🚀 Quick start

```bash
# 1) Contracts — test & deploy
cd contracts
forge test                     # 68 tests, all passing
forge script script/DeployUnified.s.sol \
  --rpc-url https://sepolia-rpc.giwa.io --broadcast

# 2) Web dApp
cd web && npm install && npm run dev   # http://localhost:3000
```

> 🌐 **Live demo** — https://ieum-protocol.vercel.app
> Connect wallet → mint free test mKRW/mETH → try jeonse escrow, IEUM Earn, and kye circles.

---

## 🛠 Tech stack

- **Contracts** — Solidity 0.8.24 · Foundry · OpenZeppelin v5 · SafeERC20 + pull-payment
- **Frontend** — Next.js 16 (Turbopack) · wagmi v2 + viem · TanStack Query · Tailwind v4 · framer-motion
- **Chain** — GIWA Sepolia (OP Stack L2) · Multicall3 aggregation to minimize RPC load
- **UX** — KO/EN i18n · spotlight onboarding · live number animations · EIP-6963 multi-wallet

---

## 📁 Repository layout

```
├── contracts/          # Foundry project
│   ├── src/            # IeumEarn · JeonseEscrow · Mulle · factories · PriceOracle · Mock*
│   ├── test/           # 68 tests
│   └── script/         # deployment scripts
├── web/                # Next.js dApp (landing + jeonse / Earn / kye / dashboard)
└── docs/               # spec · on-chain evidence · GASOK application
```

---

<div align="center">
<sub><b>이음 · IEUM</b> — connecting the paths of big money.</sub>
</div>
