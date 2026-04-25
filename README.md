# 🔌 IPC Debugger Console

> A real-time visual debugging tool for **Pipes**, **Message Queues**, and **Shared Memory** — simulates inter-process communication, detects synchronization failures, and explains root cause.

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Visit%20Site-00d4ff?style=for-the-badge)](https://ipc-debugger.netlify.app/)
[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://ipc-debugger.netlify.app/)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://ipc-debugger.netlify.app/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://ipc-debugger.netlify.app/)
[![GitHub](https://img.shields.io/badge/GitHub-kxvdvkr-181717?style=flat&logo=github&logoColor=white)](https://github.com/kxvdvkr/IPC-Debugger-v2)

---

## 📖 Problem Statement

> **Design a debugging tool for inter-process communication methods (pipes, message queues, shared memory) to help developers identify issues in synchronization and data sharing between processes. Include a GUI to simulate data transfer and highlight potential bottlenecks or deadlocks.**

Real-world IPC bugs — buffer overflows, consumer starvation, mutex deadlocks — are notoriously hard to reproduce and explain. This tool makes them **visible**, **controllable**, and **explainable** in a browser with zero setup.

Built as a project for **Operating Systems (B.Tech CSE)**.

---

## 🌐 Live Demo

**[https://ipc-debugger.netlify.app/](https://ipc-debugger.netlify.app/)**

---

## 🌐 How to Run locally

```bash
# Clone the repository
git clone https://github.com/kxvdvkr/IPC-Debugger-v2.git

# Open in browser — no build step, no install needed
cd IPC-Debugger-v2
open index.html
```

Works in Chrome, Firefox, Edge, and Safari.

---

## 🚀 Features

| Feature | Description |
|---|---|
| **Three IPC Modes** | Switch between Pipe, Message Queue, and Shared Memory at any time — even mid-simulation |
| **Live Animated Transfer** | Packets animate across the pipe track; buffer slots fill and drain with colour-coded health states |
| **Four Guided Scenarios** | Balanced Throughput, Producer Surge, Consumer Starvation, Shared Memory Deadlock — load any with one click |
| **Robustness Engine** | Four always-on guards: Buffer Overflow Guard, Timeout Detector, Lock Ownership Tracker, Flow Imbalance Analyzer |
| **Fault Injection** | Toggle forces worst-case synchronization paths without changing any source code |
| **Incident Analysis Panel** | Detected problem, root cause, suggested fix, and presentation cue — all derived automatically every tick |
| **Live Event Timeline** | Timestamped log of every produce, consume, block, and lock event with severity colour coding |
| **Health Score System** | Numeric health score (92% → 64% → 73% → 34%) with animated status dot for instant system-level reading |
| **Simulation Controls** | Sliders for producer rate, consumer rate, buffer capacity, and lock hold time. Run / Pause / Step / Reset |
| **Responsive Layout** | CSS Grid layout collapses gracefully on smaller screens — all controls stay accessible |

---

## 📁 Project Structure

```
IPC-Debugger-v2/
├── index.html        # Semantic HTML5 markup, ARIA roles, all element IDs
├── styles.css        # CSS design system — custom properties, Grid layout, responsive breakpoints
└── script.js         # Simulation engine, state machine, issue evaluator, render layer (~600 lines)
```

---

## 🧠 IPC Mechanisms Implemented

### 1. Pipe — Unidirectional Stream
Models Unix `pipe(2)`. Data moves strictly in order from writer to reader. The debugger monitors **back-pressure** — when the writer fills the pipe faster than the reader drains it, the buffer builds up, blocking the producer and increasing wait time.

### 2. Message Queue — Discrete Backlog
Models POSIX `mq_open(3)`. Each item is an independent message. The debugger reveals **queue buildup**, delayed consumers, and **starvation** when the queue repeatedly empties before useful work happens.

### 3. Shared Memory — Mutex-Protected Region
Models `shm_open(3)` with a mutex guard. Shared memory is fast but sensitive to synchronization bugs. The debugger traces **mutex ownership**, prolonged lock hold time, and **deadlock risk** when the lock is never released.

---

## 🎮 Guided Scenarios

### ✅ Balanced Throughput
- **Mode:** Pipe | **Producer:** 6 msg/s | **Consumer:** 5 msg/s
- Shows a healthy IPC channel with no anomaly — use this as the demo baseline
- Health score: **92%** | Status: `HEALTHY`

### 🟡 Producer Surge
- **Mode:** Message Queue | **Producer:** 9 msg/s | **Consumer:** 3 msg/s
- Demonstrates backlog growth, back-pressure, and bottleneck alerts
- Health score: **64%** | Status: `BOTTLENECK`

### 🟠 Consumer Starvation
- **Mode:** Pipe | **Producer:** 2 msg/s | **Consumer:** 8 msg/s
- Explains idle consumers, low utilisation, and missing upstream production
- Health score: **73%** | Status: `STARVATION`

### 🔴 Shared Memory Deadlock
- **Mode:** Shared Memory | **Lock hold:** 8 ticks | **Fault:** ON
- Demonstrates robust detection of prolonged lock ownership and deadlock risk
- Health score: **34%** | Status: `DEADLOCK`

---

## 🔬 How It Works

### Credit Accumulator Engine
Instead of one timer per process, the engine uses floating-point credit accumulators. This eliminates timer drift, gives fractional-rate support, and makes the **Step** button produce exactly the same sequence as the running mode:

```js
state.producerCredit += state.producerRate;  // adds rate each tick
while (state.producerCredit >= 10) {
  produce();
  state.producerCredit -= 10;
}
```

### Issue Classifier — Priority Cascade

```
deadlock   → fault ON + shared memory mode + mutex held        → health 34%
bottleneck → fill ≥ 80% OR wait ≥ 6 OR rate delta ≥ 4        → health 64%
starvation → fill ≤ 10% AND consumer faster AND tick > 3      → health 73%
healthy    → none of the above                                 → health 92%
```

Each category carries its own root-cause explanation, KPI trend labels, guard messages, and health score — the UI is self-documenting.

### Deadlock Simulation
When fault injection is ON in shared memory mode, `lockTicks` is forced beyond the configured hold time, guaranteeing the mutex stays held long enough to block the consumer:

```js
if (state.mode === "memory" && state.fault && state.lockOwner === "Producer") {
  state.wait += 2;
  els.consumerState.textContent = "Blocked: mutex held too long";
  addEvent("Consumer cannot access shared memory — mutex not released", "bad");
}
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                  │
│   Sliders · Tab buttons · Scenario pills · Fault toggle  │
└────────────────────────┬────────────────────────────────┘
                         │  event listeners
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    STATE MACHINE                         │
│   state = { tick, queue, lockOwner, throughput, wait }   │
└──────┬──────────────────────────────────────┬────────────┘
       │ setInterval(tick, 750ms)              │ reset()
       ▼                                       ▼
┌──────────────────────┐          ┌────────────────────────┐
│  SIMULATION ENGINE   │─────────▶│   RENDER LAYER         │
│  tick() · produce()  │          │   buildSlots()         │
│  consume()           │          │   renderPackets()      │
│  updateLockState()   │          │   renderStatus()       │
└──────────────────────┘          └────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  ISSUE EVALUATOR — evaluateIssue()                       │
│  → healthy  →  bottleneck  →  starvation  →  deadlock    │
└──────────────────────────────────────────────────────────┘
```

---

## 🧪 Quick Demo Guide

### Step 1 — Healthy Baseline
1. Open `index.html` → Balanced scenario is already loaded
2. Click **Run** → observe packets flowing, health at 92%, all guards green

### Step 2 — Trigger a Bottleneck
1. Click **Producer Surge** scenario pill
2. Watch queue depth climb, buffer slots turn amber then red
3. Incident panel updates: `BOTTLENECK — Buffer filling faster than it drains`

### Step 3 — Simulate Deadlock
1. Click **Shared Memory Deadlock** scenario
2. Fault injection turns ON automatically
3. Consumer becomes blocked, health drops to 34%, lock indicator shows `Mutex: held by Producer`

### Step 4 — Step-Through Mode
1. Click **Reset** → then **Step** repeatedly
2. Watch each tick individually — every produce, consume, and lock event appears in the timeline one by one

---

## 🛠️ Tech Stack

- **HTML5** — semantic elements, ARIA roles, accessibility
- **CSS3** — custom properties, CSS Grid layout, `clamp()`, responsive breakpoints
- **Vanilla JavaScript (ES2020)** — state machine, simulation engine, DOM updates, event wiring
- **CSS transitions + JS** — packet animation, slot colour transitions
- **Git + GitHub** — feature branches, 7 descriptive revisions
- **No frameworks, no dependencies** — runs entirely in the browser

---

## 📚 Concepts Covered

- IPC mechanisms: Pipes, Message Queues, Shared Memory
- Producer-Consumer problem and buffer management
- Mutex / semaphore-based synchronization
- Deadlock conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait
- Back-pressure and flow control
- Consumer starvation vs deadlock — distinguishing two different failure modes
- Lock ownership tracking and timeout detection

---

## 🔁 Revision History

| # | Branch | Commit Message |
|---|--------|----------------|
| 1 | `feat/html-structure` | feat: scaffold semantic HTML with ARIA roles and all element IDs |
| 2 | `feat/css-design-system` | feat: add CSS design system — custom properties, grid layout, responsive breakpoints |
| 3 | `feat/ipc-modes` | feat: implement modes registry and tab switching for Pipe, Queue, Shared Memory |
| 4 | `feat/simulation-engine` | feat: build credit-accumulator simulation engine with produce/consume/tick loop |
| 5 | `feat/fault-injection` | feat: add fault injection toggle — scheduling faults and mutex non-release paths |
| 6 | `feat/scenario-presets` | feat: add four guided scenario presets with one-click parameter loading |
| 7 | `feat/incident-analysis` | feat: complete incident analysis panel with evaluateIssue classifier and live event timeline |

Each feature was developed on its own branch and merged into `main` only after manual browser testing — `main` is always in a working, demo-ready state.

---

## 🔭 Future Scope

- **WebSocket backend** — replace simulation with a Node.js process spawning real child processes via actual pipes and message queues
- **OS metrics integration** — connect to `/proc` or `perf_event_open` for real CPU scheduling data
- **Replay mode** — record a simulation run as JSON and replay frame-by-frame for post-mortem analysis
- **Multi-process topology** — extend from two processes to N, enabling ring-buffer and pipeline topologies
- **Export** — one-click PDF of the incident analysis and event log

---

## 📚 References

1. W. Richard Stevens — *UNIX Network Programming, Vol. 2: Interprocess Communications*
2. Silberschatz, Galvin, Gagne — *Operating System Concepts*, 10th ed., Wiley
3. MDN Web Docs — CSS Grid, Custom Properties, ARIA — https://developer.mozilla.org
4. Conventional Commits — https://www.conventionalcommits.org

---

## 👨‍💻 Author

**Keshav Divakar**
- Operating Systems CSE316
- B.Tech CSE — Lovely Professional University
- Roll: 06
- Section: 2E048 
- Enrollment: 12406609

---

*IPC Debugger Console v2.0 — Built for CSE316 Academic Task-2*
