const WEB3FORMS_ACCESS_KEY = "9ee24974-a048-4ed8-8a1c-6116a6feb932";

const ACTIVITY_LABELS = {
  "table-tennis": "настольный теннис",
  tennis: "теннис",
  bowling: "боулинг",
  dinner: "ужин",
  walk: "прогулка",
  tea: "чай",
  museum: "музей",
  karting: "картинг",
  "amusement-park": "парк аттракционов",
  picnic: "пикник",
  surprise: "сюрприз от тебя",
};

const NO_BTN_W = 110;
const NO_BTN_H = 44;
const FLEE_RADIUS = 90;
const FLEE_PADDING = 8;
const NO_BTN_LERP = 0.12;

const screens = document.querySelectorAll(".screen");
const noBtn = document.getElementById("no-btn");
const noBtnSpacer = document.getElementById("no-btn-spacer");
const activityError = document.getElementById("activity-error");
const submitError = document.getElementById("submit-error");
const summaryText = document.getElementById("summary-text");
const datePick = document.getElementById("date-pick");

const minDate = new Date();
minDate.setDate(minDate.getDate() + 1);
datePick.min = minDate.toISOString().split("T")[0];

const noBtnState = {
  active: false,
  current: { x: 0, y: 0 },
  target: { x: 0, y: 0 },
  pointer: { x: -9999, y: -9999 },
  rafId: null,
};

function showScreen(name) {
  window.scrollTo(0, 0);

  screens.forEach((el) => {
    const active = el.dataset.screen === name;
    el.classList.toggle("screen--active", active);
    if (active) {
      const card = el.querySelector(".card");
      if (card) {
        card.classList.remove("fade-in-up");
        void card.offsetWidth;
        card.classList.add("fade-in-up");
      }
    }
  });

  if (name === "ask") {
    initNoButton();
  } else {
    stopNoButton();
  }
}

function getSelectedActivities() {
  return [...document.querySelectorAll('input[name="activity"]:checked')].map(
    (input) => ACTIVITY_LABELS[input.value] || input.value
  );
}

function formatDateRu(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function buildProposalSummary() {
  const activities = getSelectedActivities();
  const dateStr = formatDateRu(datePick.value);
  const time = document.getElementById("time-pick").value;
  const note = document.getElementById("note").value.trim();

  const parts = [`Второе свидание: ${activities.join(", ")}.`];
  if (dateStr && time) {
    parts.push(`${dateStr}, ${time}.`);
  } else if (dateStr) {
    parts.push(`${dateStr}.`);
  } else if (time) {
    parts.push(`Время: ${time}.`);
  }
  if (note) parts.push(`«${note}»`);

  return parts.join(" ");
}

async function submitProposal(button) {
  if (button?.disabled) return;

  const summary = buildProposalSummary();
  if (submitError) submitError.hidden = true;

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "отправляем…";

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Второе свидание — ответ с сайта",
        from_name: "Сезим (сайт свидания)",
        message: summary,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Submit failed");
    }

    summaryText.textContent = summary;
    showScreen("done");
  } catch {
    if (submitError) submitError.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function trackPointer(clientX, clientY) {
  noBtnState.pointer.x = clientX;
  noBtnState.pointer.y = clientY;
}

function onMouseMove(event) {
  trackPointer(event.clientX, event.clientY);
}

function onTouchMove(event) {
  const touch = event.touches[0];
  if (touch) {
    trackPointer(touch.clientX, touch.clientY);
  }
}

function tickNoButton() {
  if (noBtnState.active && noBtn) {
    const { current, target, pointer } = noBtnState;
    const centerX = current.x + NO_BTN_W / 2;
    const centerY = current.y + NO_BTN_H / 2;
    const dx = centerX - pointer.x;
    const dy = centerY - pointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < FLEE_RADIUS) {
      const angle = Math.atan2(dy, dx);
      const fleeCenterX =
        pointer.x + Math.cos(angle) * (FLEE_RADIUS + FLEE_PADDING);
      const fleeCenterY =
        pointer.y + Math.sin(angle) * (FLEE_RADIUS + FLEE_PADDING);
      let nextX = fleeCenterX - NO_BTN_W / 2;
      let nextY = fleeCenterY - NO_BTN_H / 2;
      nextX = Math.max(0, Math.min(window.innerWidth - NO_BTN_W, nextX));
      nextY = Math.max(0, Math.min(window.innerHeight - NO_BTN_H, nextY));
      target.x = nextX;
      target.y = nextY;
    }

    current.x += (target.x - current.x) * NO_BTN_LERP;
    current.y += (target.y - current.y) * NO_BTN_LERP;
    noBtn.style.left = `${current.x}px`;
    noBtn.style.top = `${current.y}px`;
  }

  noBtnState.rafId = requestAnimationFrame(tickNoButton);
}

function initNoButton() {
  if (!noBtn || !noBtnSpacer) return;

  requestAnimationFrame(() => {
    const rect = noBtnSpacer.getBoundingClientRect();
    noBtnState.current.x = rect.left;
    noBtnState.current.y = rect.top;
    noBtnState.target.x = rect.left;
    noBtnState.target.y = rect.top;
    noBtnState.active = true;

    noBtn.hidden = false;
    noBtn.setAttribute("aria-hidden", "false");
    noBtn.style.left = `${rect.left}px`;
    noBtn.style.top = `${rect.top}px`;
    noBtn.style.opacity = "1";

    if (noBtnState.rafId === null) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      noBtnState.rafId = requestAnimationFrame(tickNoButton);
    }
  });
}

function stopNoButton() {
  noBtnState.active = false;
  if (noBtn) {
    noBtn.hidden = true;
    noBtn.setAttribute("aria-hidden", "true");
    noBtn.style.opacity = "0";
  }
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("touchmove", onTouchMove);
  if (noBtnState.rafId !== null) {
    cancelAnimationFrame(noBtnState.rafId);
    noBtnState.rafId = null;
  }
}

document.addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]");
  if (!action) return;

  switch (action.dataset.action) {
    case "yes":
      showScreen("yay");
      break;
    case "next-activities":
      showScreen("activities");
      break;
    case "next-datetime": {
      const selected = getSelectedActivities();
      if (selected.length === 0) {
        activityError.hidden = false;
        return;
      }
      activityError.hidden = true;
      showScreen("datetime");
      break;
    }
    case "confirm":
      submitProposal(action);
      break;
    case "restart":
      document
        .querySelectorAll('input[name="activity"]')
        .forEach((c) => (c.checked = false));
      datePick.value = "";
      document.getElementById("time-pick").value = "";
      document.getElementById("note").value = "";
      activityError.hidden = true;
      if (submitError) submitError.hidden = true;
      showScreen("ask");
      break;
    default:
      break;
  }
});

if (noBtn) {
  noBtn.addEventListener("click", (event) => {
    event.preventDefault();
  });
}

document.querySelectorAll('input[name="activity"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (getSelectedActivities().length > 0) {
      activityError.hidden = true;
    }
  });
});

initNoButton();
