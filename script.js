const modes = {
  pipe: {
    title: "Pipe Debug View",
    badge: "unidirectional stream between two related processes",
    text: "Pipes move bytes in order. This debugger shows whether the writer is producing faster than the reader can drain the stream, which creates back-pressure and blocking.",
    channelLabel: "Pipe channel",
    narrative: "Data moves in strict order from writer to reader.",
    producer: "Writing bytes to pipe",
    consumer: "Reading bytes from pipe"
  },
  queue: {
    title: "Message Queue Debug View",
    badge: "discrete messages with backlog monitoring",
    text: "Message queues hold independent messages. The debugger reveals queue buildup, delayed consumers, and starvation when the queue repeatedly empties before useful work happens.",
    channelLabel: "Message queue",
    narrative: "Messages are stored, ordered, and drained by the receiver.",
    producer: "Publishing message to queue",
    consumer: "Dequeuing message from queue"
  },
  memory: {
    title: "Shared Memory Debug View",
    badge: "shared region protected by lock discipline",
    text: "Shared memory is fast but sensitive to synchronization bugs. The debugger traces mutex ownership, prolonged lock hold time, and potential deadlock or livelock situations.",
    channelLabel: "Shared memory segment",
    narrative: "Both processes access the same block and must coordinate safely.",
    producer: "Writing to shared segment",
    consumer: "Reading from shared segment"
  }
};

const scenarios = {
  balanced: {
    label: "Balanced throughput",
    mode: "pipe",
    producerRate: 6,
    consumerRate: 5,
    capacity: 6,
    lockHold: 3,
    fault: false,
    cue: "Start here to show a healthy IPC channel with no visible anomaly."
  },
  surge: {
    label: "Producer surge",
    mode: "queue",
    producerRate: 9,
    consumerRate: 3,
    capacity: 5,
    lockHold: 3,
    fault: false,
    cue: "Use this preset to demonstrate backlog growth, back-pressure, and bottleneck alerts."
  },
  starvation: {
    label: "Consumer starvation",
    mode: "pipe",
    producerRate: 2,
    consumerRate: 8,
    capacity: 6,
    lockHold: 2,
    fault: false,
    cue: "Use this to explain idle consumers, low utilization, and missing upstream production."
  },
  deadlock: {
    label: "Shared memory deadlock",
    mode: "memory",
    producerRate: 8,
    consumerRate: 6,
    capacity: 4,
    lockHold: 8,
    fault: true,
    cue: "This preset demonstrates robust detection of prolonged lock ownership and deadlock risk."
  }
};

const state = {
  mode: "pipe",
  running: false,
  scenario: "balanced",
  tick: 0,
  queue: 0,
  capacity: 6,
  producerRate: 6,
  consumerRate: 5,
  lockHold: 3,
  lockOwner: null,
  lockTicks: 0,
  wait: 0,
  throughput: 0,
  fault: false,
  producerCredit: 0,
  consumerCredit: 0,
  packets: [],
  issue: "healthy",
  consecutiveBlockedTicks: 0
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  scenarioPills: document.querySelectorAll(".scenario-pill"),
  playBtn: document.getElementById("playBtn"),
  stepBtn: document.getElementById("stepBtn"),
  resetBtn: document.getElementById("resetBtn"),
  producerRate: document.getElementById("producerRate"),
  consumerRate: document.getElementById("consumerRate"),
  capacity: document.getElementById("capacity"),
  lockHold: document.getElementById("lockHold"),
  producerRateText: document.getElementById("producerRateText"),
  consumerRateText: document.getElementById("consumerRateText"),
  capacityText: document.getElementById("capacityText"),
  lockHoldText: document.getElementById("lockHoldText"),
  faultToggle: document.getElementById("faultToggle"),
  producerNode: document.getElementById("producerNode"),
  consumerNode: document.getElementById("consumerNode"),
  producerState: document.getElementById("producerState"),
  consumerState: document.getElementById("consumerState"),
  pipeTrack: document.getElementById("pipeTrack"),
  bufferSlots: document.getElementById("bufferSlots"),
  lockIndicator: document.getElementById("lockIndicator"),
  lockIndicatorText: document.getElementById("lockIndicatorText"),
  queueDepth: document.getElementById("queueDepth"),
  bufferTrend: document.getElementById("bufferTrend"),
  waitTime: document.getElementById("waitTime"),
  waitTrend: document.getElementById("waitTrend"),
  throughput: document.getElementById("throughput"),
  throughputTrend: document.getElementById("throughputTrend"),
  riskLevel: document.getElementById("riskLevel"),
  syncTrend: document.getElementById("syncTrend"),
  recommendation: document.getElementById("recommendation"),
  rootCause: document.getElementById("rootCause"),
  fixAdvice: document.getElementById("fixAdvice"),
  presentationCue: document.getElementById("presentationCue"),
  healthScore: document.getElementById("healthScore"),
  statusDot: document.getElementById("statusDot"),
  issueHeadline: document.getElementById("issueHeadline"),
  demoScenario: document.getElementById("demoScenario"),
  detectedProblem: document.getElementById("detectedProblem"),
  issueTag: document.getElementById("issueTag"),
  incidentChip: document.getElementById("incidentChip"),
  timeline: document.getElementById("timeline"),
  tickLabel: document.getElementById("tickLabel"),
  conceptTitle: document.getElementById("conceptTitle"),
  conceptBadge: document.getElementById("conceptBadge"),
  conceptText: document.getElementById("conceptText"),
  channelLabel: document.getElementById("channelLabel"),
  channelNarrative: document.getElementById("channelNarrative"),
  pressureValue: document.getElementById("pressureValue"),
  delayValue: document.getElementById("delayValue"),
  lockText: document.getElementById("lockText"),
  bufferLabel: document.getElementById("bufferLabel"),
  demoNote: document.getElementById("demoNote"),
  explainerBadge: document.getElementById("explainerBadge"),
  guardBuffer: document.getElementById("guardBuffer"),
  guardTimeout: document.getElementById("guardTimeout"),
  guardLock: document.getElementById("guardLock"),
  guardFlow: document.getElementById("guardFlow")
};

let timer = null;

function addEvent(message, type = "ok") {
  const row = document.createElement("div");
  row.className = `event ${type === "ok" ? "" : type}`;
  row.innerHTML = `<strong>tick ${state.tick}</strong><span>${message}</span>`;
  els.timeline.prepend(row);
  while (els.timeline.children.length > 18) {
    els.timeline.lastChild.remove();
  }
}

function syncInputs() {
  state.producerRate = Number(els.producerRate.value);
  state.consumerRate = Number(els.consumerRate.value);
  state.capacity = Number(els.capacity.value);
  state.lockHold = Number(els.lockHold.value);

  els.producerRateText.textContent = `${state.producerRate} msg/s`;
  els.consumerRateText.textContent = `${state.consumerRate} msg/s`;
  els.capacityText.textContent = `${state.capacity} slots`;
  els.lockHoldText.textContent = `${state.lockHold} ticks`;
  els.bufferLabel.textContent = `${state.capacity} slots`;
}

function setMode(mode) {
  state.mode = mode;
  els.tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  const details = modes[state.mode];
  els.conceptTitle.textContent = details.title;
  els.conceptBadge.textContent = details.badge;
  els.conceptText.textContent = details.text;
  els.channelLabel.textContent = details.channelLabel;
  els.channelNarrative.textContent = details.narrative;
}

function setScenario(name) {
  const scenario = scenarios[name];
  state.scenario = name;
  els.scenarioPills.forEach((pill) => {
    pill.classList.toggle("is-active", pill.dataset.scenario === name);
  });

  setMode(scenario.mode);
  els.producerRate.value = scenario.producerRate;
  els.consumerRate.value = scenario.consumerRate;
  els.capacity.value = scenario.capacity;
  els.lockHold.value = scenario.lockHold;
  state.fault = scenario.fault;
  els.faultToggle.classList.toggle("is-on", state.fault);
  els.faultToggle.setAttribute("aria-pressed", String(state.fault));
  els.demoScenario.textContent = scenario.label;
  els.presentationCue.textContent = scenario.cue;
  syncInputs();
  reset(false);
  addEvent(`Loaded scenario: ${scenario.label}`, scenario.fault ? "bad" : "ok");
  render();
}

function buildSlots() {
  els.bufferSlots.style.gridTemplateColumns = `repeat(${state.capacity}, minmax(28px, 1fr))`;
  els.bufferSlots.innerHTML = "";
  const fillRatio = state.capacity === 0 ? 0 : state.queue / state.capacity;

  for (let i = 0; i < state.capacity; i += 1) {
    const slot = document.createElement("div");
    if (i < state.queue) {
      let type = "filled";
      if (fillRatio > 0.75) {
        type += " warn";
      }
      if (state.issue === "deadlock") {
        type += " bad";
      }
      slot.className = `slot ${type}`;
      slot.textContent = state.mode === "queue" ? `q${i + 1}` : `d${i + 1}`;
    } else {
      slot.className = "slot";
      slot.textContent = i + 1;
    }
    els.bufferSlots.appendChild(slot);
  }
}

function spawnPacket(type = "ok") {
  state.packets.push({
    id: `${Date.now()}-${Math.random()}`,
    progress: 0,
    type
  });
}

function renderPackets() {
  state.packets = state.packets
    .map((packet) => ({ ...packet, progress: packet.progress + 16 }))
    .filter((packet) => packet.progress <= 108);

  els.pipeTrack.querySelectorAll(".packet").forEach((node) => node.remove());

  state.packets.forEach((packet) => {
    const node = document.createElement("span");
    node.className = `packet ${packet.type}`;
    node.style.left = `${packet.progress}%`;
    els.pipeTrack.appendChild(node);
  });
}

function updateLockState() {
  if (state.mode !== "memory") {
    state.lockOwner = null;
    state.lockTicks = 0;
    return;
  }

  if (!state.lockOwner) {
    state.lockOwner = Math.random() > 0.5 ? "Producer" : "Consumer";
    state.lockTicks = state.fault ? state.lockHold + 6 : state.lockHold;
    addEvent(`${state.lockOwner} acquired the shared-memory mutex`, "ok");
  }

  state.lockTicks -= 1;

  if (state.lockTicks <= 0 && !state.fault) {
    addEvent(`${state.lockOwner} released the mutex`, "ok");
    state.lockOwner = null;
  }
}

function produce() {
  if (state.queue >= state.capacity) {
    state.wait += 1;
    state.consecutiveBlockedTicks += 1;
    els.producerState.textContent = "Blocked: IPC buffer full";
    els.producerNode.classList.add("blocked");
    addEvent("Producer blocked because the buffer is already full", "warn");
    return;
  }

  state.queue += 1;
  state.producerState.textContent = modes[state.mode].producer;
  els.producerNode.classList.remove("blocked");
  spawnPacket(state.queue / state.capacity > 0.75 ? "warn" : "ok");
  addEvent("Producer transferred data into the communication channel", "ok");
}

function consume() {
  if (state.queue <= 0) {
    state.wait += 1;
    state.consecutiveBlockedTicks += 1;
    els.consumerState.textContent = "Waiting: no data available";
    els.consumerNode.classList.add("blocked");
    addEvent("Consumer is idle because no data is available", "warn");
    return;
  }

  if (state.mode === "memory" && state.lockOwner === "Producer" && state.fault) {
    state.wait += 2;
    state.consecutiveBlockedTicks += 1;
    els.consumerState.textContent = "Blocked: mutex held too long";
    els.consumerNode.classList.add("blocked");
    addEvent("Consumer cannot access shared memory because the mutex was not released", "bad");
    return;
  }

  state.queue -= 1;
  state.throughput += 1;
  els.consumerState.textContent = modes[state.mode].consumer;
  els.consumerNode.classList.remove("blocked");
  addEvent("Consumer received data successfully", "ok");
}

function evaluateIssue() {
  const fill = state.capacity === 0 ? 0 : state.queue / state.capacity;

  if (state.mode === "memory" && state.fault && state.lockOwner) {
    return {
      code: "deadlock",
      headline: "Deadlock risk",
      chip: "DEADLOCK",
      tag: "Critical lock anomaly",
      score: 34,
      type: "bad",
      recommendation: "Mutex ownership is not being released, so shared memory access stalls. The debugger flags prolonged lock hold time as a deadlock risk.",
      rootCause: "Both processes depend on the same shared memory region, but one process keeps the lock long enough to block the other. That creates synchronization failure instead of healthy data sharing.",
      fix: "Add timeout handling, verify lock ordering, release the mutex immediately after the critical section, and log lock ownership history.",
      cue: "This is your strongest innovation point: the tool does not just simulate transfer, it also explains the exact synchronization failure and suggests a fix.",
      bufferTrend: "Writes trapped behind lock",
      waitTrend: "Severe blocking",
      throughputTrend: "Falling throughput",
      syncTrend: "Unsafe lock retention",
      pressure: "Critical",
      guardBuffer: "Buffer guard active, but lock issue is dominant",
      guardTimeout: "Timeout detector triggered prolonged wait",
      guardLock: "Lock tracker identified unreleased mutex",
      guardFlow: "Flow analyzer confirms stalled progress"
    };
  }

  if (fill >= 0.8 || state.wait >= 6 || state.producerRate - state.consumerRate >= 4) {
    return {
      code: "bottleneck",
      headline: "Buffer bottleneck",
      chip: "BOTTLENECK",
      tag: "Back-pressure increasing",
      score: 64,
      type: "warn",
      recommendation: "The producer is sending data faster than the consumer can process it. Queue depth is climbing, so the IPC channel is becoming a bottleneck.",
      rootCause: "The buffer is filling faster than it is drained. That eventually blocks the writer, increases latency, and reduces overall responsiveness.",
      fix: "Increase buffer capacity, improve consumer scheduling, or add producer-side flow control to reduce bursts.",
      cue: "Point to queue depth and wait time together. That makes the diagnosis look systematic rather than visual only.",
      bufferTrend: "Rising rapidly",
      waitTrend: "Producer blocking",
      throughputTrend: "Consumer limited",
      syncTrend: "Order safe, capacity strained",
      pressure: "High",
      guardBuffer: "Buffer guard warning: capacity almost exhausted",
      guardTimeout: "Timeout detector watching backlog growth",
      guardLock: "No lock issue detected in this scenario",
      guardFlow: "Flow analyzer detected producer-consumer imbalance"
    };
  }

  if ((fill <= 0.1 && state.tick > 3 && state.consumerRate > state.producerRate + 3) || state.issue === "starvation") {
    return {
      code: "starvation",
      headline: "Consumer starvation",
      chip: "STARVATION",
      tag: "Resource under-utilization",
      score: 73,
      type: "warn",
      recommendation: "The consumer spends too much time waiting because the producer is not generating enough work.",
      rootCause: "This is not a deadlock. The issue is low availability of data, which causes idle cycles and poor utilization of the receiving process.",
      fix: "Improve producer scheduling, batch messages, or use a better trigger for data creation so the consumer has a steadier flow.",
      cue: "Mention that the tool distinguishes starvation from deadlock, which shows more robust problem handling.",
      bufferTrend: "Mostly empty",
      waitTrend: "Consumer idle time high",
      throughputTrend: "Low supply",
      syncTrend: "No lock conflict",
      pressure: "Low",
      guardBuffer: "Buffer guard stable: no overflow pressure",
      guardTimeout: "Timeout detector sees repeated idle waits",
      guardLock: "Lock tracker stable",
      guardFlow: "Flow analyzer detected input starvation"
    };
  }

  return {
    code: "healthy",
    headline: "Healthy flow",
    chip: "HEALTHY",
    tag: "No anomaly",
    score: 92,
    type: "ok",
    recommendation: "Balanced producer and consumer speeds keep the communication channel healthy and easy to reason about.",
    rootCause: "The sender and receiver are coordinated well enough that data flows without excessive waiting, lock retention, or buffer pressure.",
    fix: "Use this baseline to compare with fault scenarios. It proves that the debugger can separate normal execution from actual IPC issues.",
    cue: "Begin your demo here, then switch to a stress scenario so the transition is obvious.",
    bufferTrend: "Stable",
    waitTrend: "No blocking",
    throughputTrend: "Nominal",
    syncTrend: "Lock order safe",
    pressure: "Low",
    guardBuffer: "Buffer overflow guard active",
    guardTimeout: "Timeout detection ready",
    guardLock: "Lock ownership tracking stable",
    guardFlow: "Flow imbalance analyzer active"
  };
}

function renderStatus() {
  const status = evaluateIssue();
  state.issue = status.code;

  els.queueDepth.textContent = `${state.queue} / ${state.capacity}`;
  els.waitTime.textContent = `${state.wait} ticks`;
  els.throughput.textContent = `${state.throughput} msg`;
  els.riskLevel.textContent = status.headline;
  els.healthScore.textContent = `${status.score}%`;
  els.issueHeadline.textContent = status.headline;
  els.detectedProblem.textContent = status.headline;
  els.issueTag.textContent = status.tag;
  els.incidentChip.textContent = status.chip;
  els.recommendation.textContent = status.recommendation;
  els.rootCause.textContent = status.rootCause;
  els.fixAdvice.textContent = status.fix;
  els.presentationCue.textContent = status.cue;
  els.bufferTrend.textContent = status.bufferTrend;
  els.waitTrend.textContent = status.waitTrend;
  els.throughputTrend.textContent = status.throughputTrend;
  els.syncTrend.textContent = status.syncTrend;
  els.pressureValue.textContent = status.pressure;
  els.delayValue.textContent = `${state.wait} ticks`;
  els.demoNote.textContent = `${scenarios[state.scenario].label} | ${status.tag}`;
  els.explainerBadge.textContent = status.type === "ok" ? "demo ready" : "issue highlighted";
  els.guardBuffer.textContent = status.guardBuffer;
  els.guardTimeout.textContent = status.guardTimeout;
  els.guardLock.textContent = status.guardLock;
  els.guardFlow.textContent = status.guardFlow;

  els.statusDot.className = `status-dot ${status.type === "ok" ? "" : status.type}`;
  els.incidentChip.className = `incident-chip ${status.type === "ok" ? "" : status.type}`;

  if (state.mode === "memory" && state.lockOwner) {
    els.lockIndicator.classList.add("locked");
    els.lockIndicatorText.textContent = `Mutex: held by ${state.lockOwner}`;
    els.lockText.textContent = `${state.lockOwner} owns lock`;
  } else {
    els.lockIndicator.classList.remove("locked");
    els.lockIndicatorText.textContent = "Mutex: Free";
    els.lockText.textContent = "Free";
  }
}

function render() {
  buildSlots();
  renderPackets();
  renderStatus();

  els.tickLabel.textContent = `tick ${state.tick}`;
  els.playBtn.textContent = state.running ? "Pause" : "Run";

  if (state.queue < state.capacity && !els.producerState.textContent.includes("Blocked")) {
    els.producerNode.classList.remove("blocked");
  }

  if (state.queue > 0 && !els.consumerState.textContent.includes("Blocked")) {
    els.consumerNode.classList.remove("blocked");
  }
}

function tick() {
  syncInputs();
  state.tick += 1;
  state.producerCredit += state.producerRate;
  state.consumerCredit += state.consumerRate;
  state.consecutiveBlockedTicks = 0;

  updateLockState();

  while (state.producerCredit >= 10) {
    produce();
    state.producerCredit -= 10;
  }

  const blockedByLock = state.mode === "memory" && state.fault && state.lockOwner === "Producer";

  while (state.consumerCredit >= 10) {
    if (blockedByLock) {
      consume();
      state.consumerCredit = 0;
      break;
    }
    consume();
    state.consumerCredit -= 10;
  }

  if (state.fault && state.mode !== "memory" && state.tick % 4 === 0) {
    state.wait += 1;
    addEvent("Injected scheduling fault increased synchronization delay", "bad");
  }

  render();
}

function reset(announce = true) {
  state.running = false;
  clearInterval(timer);
  timer = null;
  state.tick = 0;
  state.queue = 0;
  state.lockOwner = null;
  state.lockTicks = 0;
  state.wait = 0;
  state.throughput = 0;
  state.producerCredit = 0;
  state.consumerCredit = 0;
  state.packets = [];
  state.consecutiveBlockedTicks = 0;
  els.timeline.innerHTML = "";
  els.producerState.textContent = "Ready";
  els.consumerState.textContent = "Ready";
  els.producerNode.classList.remove("blocked");
  els.consumerNode.classList.remove("blocked");
  if (announce) {
    addEvent("Simulation reset to initial state", "ok");
  }
  render();
}

function setRunning(next) {
  state.running = next;
  clearInterval(timer);
  timer = null;
  if (state.running) {
    timer = setInterval(tick, 750);
  }
  render();
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setMode(tab.dataset.mode);
    addEvent(`Switched mode to ${tab.textContent}`, "ok");
    render();
  });
});

els.scenarioPills.forEach((pill) => {
  pill.addEventListener("click", () => setScenario(pill.dataset.scenario));
});

[els.producerRate, els.consumerRate, els.capacity, els.lockHold].forEach((input) => {
  input.addEventListener("input", () => {
    syncInputs();
    if (state.queue > state.capacity) {
      state.queue = state.capacity;
    }
    state.scenario = "balanced";
    els.demoScenario.textContent = "Custom tuning";
    render();
  });
});

els.playBtn.addEventListener("click", () => setRunning(!state.running));
els.stepBtn.addEventListener("click", tick);
els.resetBtn.addEventListener("click", () => reset(true));

els.faultToggle.addEventListener("click", () => {
  state.fault = !state.fault;
  els.faultToggle.classList.toggle("is-on", state.fault);
  els.faultToggle.setAttribute("aria-pressed", String(state.fault));
  els.demoScenario.textContent = state.fault ? "Fault injection enabled" : "Custom tuning";
  addEvent(state.fault ? "Fault injection enabled for resilience testing" : "Fault injection disabled", state.fault ? "bad" : "ok");
  render();
});

syncInputs();
setMode("pipe");
addEvent("Debugger console initialized", "ok");
render();
