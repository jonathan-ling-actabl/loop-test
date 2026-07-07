// Stopwatch: counts up from zero, supports pause/resume, reset, and laps.
// Timing is based on wall-clock timestamps (Date.now()) so throttled render
// intervals never accumulate drift into the measured elapsed time.

export function pad2(value) {
  return String(value).padStart(2, "0");
}

// Canonical state shape:
//   { running: boolean, startedAt: number|null, accumulatedMs: number }
// Elapsed = accumulatedMs + (running ? now - startedAt : 0).
export function createState() {
  return { running: false, startedAt: null, accumulatedMs: 0 };
}

// Current elapsed milliseconds for a given state at timestamp `now`.
export function elapsedMs(state, now = Date.now()) {
  const live = state.running && state.startedAt !== null ? now - state.startedAt : 0;
  return state.accumulatedMs + live;
}

// Begin or resume counting from the current elapsed value. Idempotent while
// already running (returns the same state).
export function start(state, now = Date.now()) {
  if (state.running) return state;
  return { running: true, startedAt: now, accumulatedMs: state.accumulatedMs };
}

// Freeze counting, banking the live delta into accumulatedMs. Idempotent while
// already stopped.
export function stop(state, now = Date.now()) {
  if (!state.running) return state;
  return {
    running: false,
    startedAt: null,
    accumulatedMs: elapsedMs(state, now),
  };
}

// Return to zero and not-running, regardless of prior state.
export function reset() {
  return createState();
}

// Format a millisecond duration as zero-padded HH:MM:SS.cs (centiseconds).
// Negative inputs are clamped to zero. Centiseconds are truncated, not rounded,
// so the display never shows time that has not yet elapsed.
export function formatElapsed(ms) {
  const clamped = Math.max(0, Math.floor(ms));
  const totalCentis = Math.floor(clamped / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
}

// Append a lap (a millisecond duration) to a lap list, returning a new array.
export function recordLap(laps, ms) {
  return [...laps, ms];
}

// Empty the lap list, returning a new array.
export function clearLaps() {
  return [];
}

function initApp() {
  const displayEl = document.getElementById("display");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const lapBtn = document.getElementById("lap-btn");
  const resetBtn = document.getElementById("reset-btn");
  const clearLapsBtn = document.getElementById("clear-laps-btn");
  const lapListEl = document.getElementById("lap-list");

  if (!displayEl || !startBtn || !stopBtn || !lapBtn || !resetBtn || !clearLapsBtn || !lapListEl) {
    return;
  }

  let state = createState();
  let laps = clearLaps();
  let renderTimer = null;

  function isIdleAtZero() {
    return !state.running && state.accumulatedMs === 0;
  }

  function updateControls() {
    startBtn.disabled = state.running;
    stopBtn.disabled = !state.running;
    lapBtn.disabled = isIdleAtZero();
  }

  function renderDisplay() {
    displayEl.textContent = formatElapsed(elapsedMs(state));
  }

  function renderLaps() {
    lapListEl.innerHTML = "";
    laps.forEach((lapMs, index) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.className = "lap-label";
      label.textContent = `Lap ${index + 1}`;
      const value = document.createElement("span");
      value.className = "lap-value";
      value.textContent = formatElapsed(lapMs);
      li.appendChild(label);
      li.appendChild(value);
      lapListEl.appendChild(li);
    });
  }

  function startRenderLoop() {
    if (renderTimer !== null) return;
    renderTimer = setInterval(renderDisplay, 50);
  }

  function stopRenderLoop() {
    if (renderTimer === null) return;
    clearInterval(renderTimer);
    renderTimer = null;
  }

  startBtn.addEventListener("click", () => {
    state = start(state);
    startRenderLoop();
    renderDisplay();
    updateControls();
  });

  stopBtn.addEventListener("click", () => {
    state = stop(state);
    stopRenderLoop();
    renderDisplay();
    updateControls();
  });

  lapBtn.addEventListener("click", () => {
    if (isIdleAtZero()) return;
    laps = recordLap(laps, elapsedMs(state));
    renderLaps();
  });

  resetBtn.addEventListener("click", () => {
    state = reset();
    laps = clearLaps();
    stopRenderLoop();
    renderDisplay();
    renderLaps();
    updateControls();
  });

  clearLapsBtn.addEventListener("click", () => {
    laps = clearLaps();
    renderLaps();
  });

  renderDisplay();
  renderLaps();
  updateControls();
}

initApp();
