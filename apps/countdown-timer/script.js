const STORAGE_KEY = "countdown-timer:events";

// Hackathon end: 2026-07-10 17:00 EDT == 21:00 UTC.
export const HACKATHON_END = new Date("2026-07-10T21:00:00Z");

// Date's own representable range tops out around the year 275760; anything
// past that can never produce a valid target and should be flagged as an
// overflow rather than a generic "invalid date".
const MAX_DATE_YEAR = 275760;

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDateInputValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatTimeInputValue(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function validateEventName(name) {
  if (!name || !name.trim()) {
    return "Please enter a name for the event.";
  }
  return null;
}

// Parses a <input type="date"> value and an optional <input type="time">
// value using only builtin Date math (no libraries). An omitted time
// defaults to midnight local time on the event date.
export function parseEventDateTime(dateStr, timeStr) {
  if (!dateStr) {
    return { error: "Please enter a valid date." };
  }

  const dateMatch = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!dateMatch) {
    return { error: "Please enter a valid date." };
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  if (year > MAX_DATE_YEAR) {
    return {
      error: "That date is too far in the future for this timer to handle.",
    };
  }

  let hour = 0;
  let minute = 0;
  if (timeStr) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr.trim());
    if (!timeMatch) {
      return { error: "Please enter a valid time." };
    }
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    if (hour > 23 || minute > 59) {
      return { error: "Please enter a valid time." };
    }
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  const isRealDate =
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isRealDate) {
    return { error: "Please enter a valid date." };
  }

  return { date };
}

// Breaks the remaining milliseconds until targetMs into days/hours/minutes/
// seconds. Once the target is reached the countdown clamps at zero.
export function getRemaining(targetMs, nowMs = Date.now()) {
  const totalMs = targetMs - nowMs;
  const reached = totalMs <= 0;
  const clampedMs = Math.max(totalMs, 0);
  const totalSeconds = Math.floor(clampedMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    reached,
  };
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (event) =>
        event &&
        typeof event.id === "string" &&
        typeof event.name === "string" &&
        typeof event.targetMs === "number",
    );
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(events.map(({ id, name, targetMs }) => ({ id, name, targetMs }))),
  );
}

function initApp() {
  const form = document.getElementById("event-form");
  const nameInput = document.getElementById("event-name");
  const dateInput = document.getElementById("event-date");
  const timeInput = document.getElementById("event-time");
  const warningEl = document.getElementById("form-warning");
  const listEl = document.getElementById("countdown-list");

  if (!form || !nameInput || !dateInput || !timeInput || !warningEl || !listEl) {
    return;
  }

  nameInput.value = "Hackathon ends";
  dateInput.value = formatDateInputValue(HACKATHON_END);
  timeInput.value = formatTimeInputValue(HACKATHON_END);

  const events = loadEvents();
  const timers = new Map();

  function removeEvent(id, card) {
    clearInterval(timers.get(id));
    timers.delete(id);
    card.remove();
    const index = events.findIndex((event) => event.id === id);
    if (index !== -1) events.splice(index, 1);
    saveEvents(events);
  }

  function addCountdownCard(event, { persist }) {
    const card = document.createElement("li");
    card.className = "countdown-card";
    card.dataset.id = event.id;
    card.innerHTML = `
      <div class="countdown-card__header">
        <h2></h2>
        <button type="button" class="countdown-card__remove" aria-label="Remove countdown">&times;</button>
      </div>
      <div class="countdown-card__display">
        <div class="countdown-card__unit"><span class="value" data-unit="days">00</span><span class="label">days</span></div>
        <div class="countdown-card__unit"><span class="value" data-unit="hours">00</span><span class="label">hours</span></div>
        <div class="countdown-card__unit"><span class="value" data-unit="minutes">00</span><span class="label">minutes</span></div>
        <div class="countdown-card__unit"><span class="value" data-unit="seconds">00</span><span class="label">seconds</span></div>
      </div>
      <p class="countdown-card__status" role="status"></p>
    `;
    card.querySelector("h2").textContent = event.name;
    listEl.appendChild(card);

    const unitEls = {
      days: card.querySelector('[data-unit="days"]'),
      hours: card.querySelector('[data-unit="hours"]'),
      minutes: card.querySelector('[data-unit="minutes"]'),
      seconds: card.querySelector('[data-unit="seconds"]'),
    };
    const statusEl = card.querySelector(".countdown-card__status");

    function tick() {
      const remaining = getRemaining(event.targetMs);
      unitEls.days.textContent = pad2(remaining.days);
      unitEls.hours.textContent = pad2(remaining.hours);
      unitEls.minutes.textContent = pad2(remaining.minutes);
      unitEls.seconds.textContent = pad2(remaining.seconds);

      if (remaining.reached) {
        clearInterval(timers.get(event.id));
        timers.delete(event.id);
        card.classList.add("countdown-card--reached");
        statusEl.textContent = `\u{1F389} ${event.name} has arrived!`;
      }
    }

    tick();
    timers.set(event.id, setInterval(tick, 1000));

    card
      .querySelector(".countdown-card__remove")
      .addEventListener("click", () => removeEvent(event.id, card));

    if (persist) {
      events.push(event);
      saveEvents(events);
    }
  }

  events.forEach((event) => addCountdownCard(event, { persist: false }));

  form.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    warningEl.textContent = "";

    const nameError = validateEventName(nameInput.value);
    if (nameError) {
      warningEl.textContent = nameError;
      return;
    }

    const parsed = parseEventDateTime(dateInput.value, timeInput.value);
    if (parsed.error) {
      warningEl.textContent = parsed.error;
      return;
    }

    addCountdownCard(
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: nameInput.value.trim(),
        targetMs: parsed.date.getTime(),
      },
      { persist: true },
    );

    form.reset();
    nameInput.value = "";
    dateInput.value = "";
    timeInput.value = "";
  });
}

initApp();
