# Trojan Tarpit Protocol (TTP)

An offensive-defense bot mitigation framework that inverts the traditional security paradigm: instead of blocking scrapers with `403 Forbidden` or CAPTCHAs, TTP deceptively accepts bot requests, holds their connections open (tarpit), and serves schema-valid poisoned data.

Read the full framework position paper in [PAPER.md](./PAPER.md).

---

## The Core Concept

Traditional WAFs and bot blockers fail because blocking is cheap for the attacker and expensive for the defender. When a bot hits a `403` or a CAPTCHA:
1. The bot operator gets alerted instantly.
2. The scraper rotates its residential IP / headers and retries at zero cost.

**TTP flips the script:**
- **The bot is Troy.** It has its own ingestion pipeline and parsing infrastructure.
- **Your server is Greece.** It sends a "gift" response that looks like legitimate data (`200 OK`).
- **Once ingested**, the gift degrades the bot's operation without alerting the operator.

---

## 3-Phase Defense Architecture

1. **Phase 1: The Gift (Deceptive Acceptance)**
   - Plants hidden honeypot fields (`display: none`), disallowed endpoint traps (`/admin/debug/...`), and decoy mazes. Real users never touch them; scrapers do.

2. **Phase 2: Inside the Horse (Ambush)**
   - **Fingerprint Capture:** Hashes IP subnet, TLS/JA4 signatures, header order, and User-Agent.
   - **Deterministic Data Poisoning:** Scrambles data fields (e.g. swapping prices and SKUs) while preserving exact JSON schema structures. Bypasses NLP anomaly detectors because the data values are real—just assigned to the wrong objects.
   - **Adaptive Tarpit:** Introduces artificial delays (e.g. 3s) using non-blocking event loops, with automatic load-shedding if server CPU exceeds 80%.

3. **Phase 3: The Gates Open (Cascade Propagation)**
   - When a bot is caught on a honeypot, TTP clusters other active sessions sharing network/header fingerprints and assigns them a **Suspicious** rating.
   - Cascaded sessions receive a seamless WebCrypto SHA-256 **Proof-of-Work (PoW)** challenge to verify if they are real browsers or headless bots.

---

## Project Structure

```
.
├── PAPER.md           # Complete research paper & legal analysis
├── src/
│   ├── index.ts       # Express server & TTP middleware integration
│   ├── fingerprint.ts # Session hashing & header extraction
│   ├── cascade.ts     # Multi-signal fingerprint clustering & trust tiers
│   ├── poison.ts      # Seeded cyrb53 data swapping algorithm
│   ├── tarpit.ts      # Non-blocking delay engine + CPU load-shedder
│   └── pow.ts         # Server verification & WebCrypto SHA-256 solver
├── test-bot.js        # End-to-end test script simulating scrapers & cascade
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)

### Installation
```bash
git clone https://github.com/devarakondagowtham2-a11y/TTP.git
cd TTP
npm install
```

### Build & Run Server
```bash
npm run start
```
The server will start listening on port `3003`.

### Run the Demo Test
In a separate terminal window:
```bash
npm run test:bot
```

You'll see step-by-step logs demonstrating:
1. Normal user fetching clean data (~25ms).
2. Bot hitting a hidden trap endpoint (`200 OK`).
3. Bot getting tarpitted (~3000ms) and receiving poisoned product prices.
4. A new session from the same network getting caught by Cascade Detection and receiving a Proof-of-Work challenge.

---

## Legal & Ethical Principles

TTP operates strictly **server-side within standard HTTP response pipelines**:
- **No Client Exploitation:** Does not use logic bombs, zip bombs, or unauthorized client execution.
- **Server Autonomy:** A server is under no legal obligation to return accurate data or fast responses to unauthorized automated crawlers.
- **Legitimate Crawlers:** Search engine crawlers (Googlebot, Bingbot) are explicitly verified via reverse DNS (rDNS) lookup to bypass TTP logic.

---

## License

[MIT](./LICENSE) © Gowtham
