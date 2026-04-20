# xpire — Tobacco Expiry Tracker

React + Vite web app **and** Apple Shortcut / Scriptable integration for checking
tobacco product expiry codes in a retail setting.

---

## Product Code Format

Codes follow a two-character scheme: **[Letter A–L][Digit 0–9]**

| Part | Meaning |
|------|---------|
| Letter (A–L) | Manufacturing month (A = Jan … L = Dec) |
| Digit (0–9) | Last digit of manufacturing year |

Prefix the code with a product keyword to override the default (cigarette):

| Input | Product |
|-------|---------|
| `F5` | Cigarettes (default) |
| `cigar F5` | Cigars |
| `dip A6` | Smokeless / Dip |

### Shelf-life rules

| Product | Shelf Life |
|---------|-----------|
| Cigarettes | 6 months |
| Cigars | 12 months |
| Smokeless / Dip | 4 months |

---

## Apple Shortcut Setup (Recommended)

> **Requires:** [Scriptable](https://scriptable.app) (free, App Store)

### Step 1 — Add the script to Scriptable

1. Copy `TobaccoExpiryChecker.js` from this repo.
2. Open **Scriptable** → tap **+** → paste the code → name it exactly  
   **`TobaccoExpiryChecker`** → tap **Done**.

### Step 2 — Build the Shortcut

Open the **Shortcuts** app and create a new shortcut with these actions in order:

| # | Action | Settings |
|---|--------|----------|
| 1 | **Dictate Text** *(or "Ask for Input")* | Prompt: *"Say product code"* |
| 2 | **Run Script** (Scriptable) | Script: `TobaccoExpiryChecker` · Input: output of step 1 |
| 3 | **Speak Text** | Text: output of step 2 |

> **Tip:** Add the shortcut to your Home Screen or invoke it with  
> *"Hey Siri, Check tobacco code"* for hands-free scanning.

### How it works end-to-end

```
You say: "cigar F5"
          ↓
Shortcut passes text → Scriptable evaluates expiry
          ↓
Result spoken aloud: "Pull product. Cigars. Expired June 2025."
          ↓
Expired entry automatically saved to iCloud Drive/tobacco-expiry-log.json
```

### Status outcomes

| Status | Voice output | Action |
|--------|-------------|--------|
| 🟢 OK | *"Keep product. Cigarettes. Good until August 2026."* | Leave on shelf |
| 🟡 Warning | *"Warning. Cigars. Expires in 18 days, May 2026."* | Move to front / sell first |
| 🔴 Expired | *"Pull product. Smokeless or Dip. Expired March 2026."* | Remove immediately |
| ❓ Invalid | *"Invalid code. Say a letter A through L and a digit…"* | Re-scan / re-enter |

---

## Running Scriptable standalone (no Shortcut)

Launch **TobaccoExpiryChecker** directly in Scriptable to get the interactive UI:

- **Check Code** — type or paste a code, see instant result
- **View Pull Log** — browse the last 30 expired items; optionally clear the log

Expired items are saved to **iCloud Drive → Scriptable → tobacco-expiry-log.json**.

---

## Web App (React / Vite)

```bash
npm install
npm run dev
```

Core expiry logic lives in `src/scriptableExpiry.js` — shared by both the web
app and the Scriptable script.

---

## Repo layout

```
xpire/
├── TobaccoExpiryChecker.js   ← Scriptable script (Apple Shortcut engine)
├── src/
│   ├── scriptableExpiry.js   ← Shared expiry logic
│   ├── App.jsx               ← React UI
│   └── styles.css
├── index.html
└── package.json
```
