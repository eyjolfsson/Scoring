/*
  Paste your deployed Google Apps Script web app URL here.
  Example:
  https://script.google.com/macros/s/XXXXXXXXXXXX/exec
*/
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbznM9fTzwGMaF4kmDeAhfzq8A0puhkk756ZQKNVIJ2LqXVd4wodIKEWz9tHSHesJqGHAA/exec";
let trainerRows = [];
let userRows = [];

document.addEventListener("DOMContentLoaded", async () => {
  bindSummaryTabs();
  bindScoreboardActions();
  bindFilterFeedback();
  showPageMessage("Loading scoreboard...");
  await refreshScoreboard();
});

function bindSummaryTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      renderSummaryTable();
      showPageMessage(`${button.textContent.trim()} selected.`);
    });
  });
}

function bindScoreboardActions() {
  const primaryBtn = document.querySelector(".primary-btn");
  const secondaryBtn = document.querySelector(".secondary-btn");
  const ghostBtn = document.querySelector(".ghost-btn");

  if (primaryBtn) {
    primaryBtn.addEventListener("click", async () => {
      await refreshScoreboard();
    });
  }

  if (secondaryBtn) {
    secondaryBtn.addEventListener("click", () => {
      exportScoreboard();
    });
  }

  if (ghostBtn) {
    ghostBtn.addEventListener("click", () => {
      resetFilters();
      renderAllScoreboardData();
      showPageMessage("Filters reset.");
    });
  }
}

function bindFilterFeedback() {
  const filterInputs = document.querySelectorAll(
    "#dateRange, #trainerFilter, #userFilter, #deviceFilter, #exerciseFilter"
  );

  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      renderAllScoreboardData();

      const activeFilters = getActiveFilters();
      if (activeFilters.length === 0) {
        showPageMessage("No filters applied.");
      } else {
        showPageMessage(`Filters applied: ${activeFilters.join(", ")}`);
      }
    });
  });
}

function getActiveFilters() {
  const filters = [
    { id: "dateRange", label: "Date range" },
    { id: "trainerFilter", label: "Trainer" },
    { id: "userFilter", label: "User" },
    { id: "deviceFilter", label: "Device" },
    { id: "exerciseFilter", label: "Exercise" }
  ];

  return filters
    .map((filter) => {
      const el = document.getElementById(filter.id);
      if (!el) return null;

      const value = el.value.trim();
      if (!value) return null;

      return `${filter.label}: ${value}`;
    })
    .filter(Boolean);
}

function callGoogleSheetsAction(params = {}) {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_YOUR_APPS_SCRIPT_URL_HERE")) {
      reject(new Error("Google Apps Script URL is missing."));
      return;
    }

    const callbackName = `googleSheetsCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const query = new URLSearchParams({
      callback: callbackName,
      ...params
    }).toString();

    const script = document.createElement("script");

    window[callbackName] = (response) => {
      try {
        delete window[callbackName];
        script.remove();

        if (response && response.success === false) {
          reject(new Error(response.error || "Google Sheets request failed"));
          return;
        }

        resolve(response);
      } catch (error) {
        reject(error);
      }
    };

    script.src = `${GOOGLE_SCRIPT_URL}?${query}&t=${Date.now()}`;

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Failed to connect to Google Sheets"));
    };

    document.body.appendChild(script);
  });
}

async function loadScoreboardDataFromGoogleSheets() {
  /*
    Expected Apps Script JSON response shape:
    {
      trainerRows: [...],
      userRows: [...]
    }

    Or:
    {
      trainer_logs: [...],
      user_reviews: [...]
    }
  */
  const response = await callGoogleSheetsAction({ action: "scoreboard" });

  return {
    trainerRows: Array.isArray(response?.trainerRows)
      ? response.trainerRows
      : Array.isArray(response?.trainer_logs)
        ? response.trainer_logs
        : [],
    userRows: Array.isArray(response?.userRows)
      ? response.userRows
      : Array.isArray(response?.user_reviews)
        ? response.user_reviews
        : []
  };
}

async function refreshScoreboard() {
  try {
    showPageMessage("Refreshing scoreboard...");

    const data = await loadScoreboardDataFromGoogleSheets();
    trainerRows = data.trainerRows;
    userRows = data.userRows;

    renderAllScoreboardData();

    const timestamp = new Date().toLocaleString();
    showPageMessage(`Scoreboard refreshed at ${timestamp}.`);
  } catch (error) {
    console.error("Failed to refresh scoreboard:", error);
    showPageMessage("Failed to load scoreboard data from Google Sheets.");
  }
}

function resetFilters() {
  const filterIds = [
    "dateRange",
    "trainerFilter",
    "userFilter",
    "deviceFilter",
    "exerciseFilter"
  ];

  filterIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function exportScoreboard() {
  const payload = collectScoreboardState();

  console.log("URUzone Scoreboard export payload:", payload);
  localStorage.setItem("uruzoneScoreboardLastExport", JSON.stringify(payload));

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `uruzone_scoreboard_${new Date().toISOString().split("T")[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);

  showPageMessage("Scoreboard exported.");
}

function collectScoreboardState() {
  const activeTab =
    document.querySelector(".tab-btn.active")?.textContent.trim() || "Trainer summary";

  return {
    filters: {
      dateRange: document.getElementById("dateRange")?.value.trim() || "",
      trainer: document.getElementById("trainerFilter")?.value.trim() || "",
      user: document.getElementById("userFilter")?.value.trim() || "",
      device: document.getElementById("deviceFilter")?.value.trim() || "",
      exercise: document.getElementById("exerciseFilter")?.value.trim() || ""
    },
    activeSummaryTab: activeTab,
    trainerRows,
    userRows,
    exportedAt: new Date().toISOString()
  };
}

function renderAllScoreboardData() {
  const filteredTrainerRows = getFilteredTrainerRows();
  const filteredUserRows = getFilteredUserRows();

  renderHeadlineMetrics(filteredTrainerRows, filteredUserRows);
  renderCoreMetrics(filteredTrainerRows);
  renderUserPerceptionMetrics(filteredUserRows);
  renderBiasControlledMetrics(filteredTrainerRows, filteredUserRows);
  renderSummaryTable(filteredTrainerRows, filteredUserRows);
}

function getFilteredTrainerRows() {
  return trainerRows.filter((row) => {
    const trainerFilter = getFilterValue("trainerFilter");
    const userFilter = getFilterValue("userFilter");
    const deviceFilter = getFilterValue("deviceFilter");
    const exerciseFilter = getFilterValue("exerciseFilter");

    const matchesTrainer = !trainerFilter || includesIgnoreCase(row.trainer_id, trainerFilter);
    const matchesUser = !userFilter || includesIgnoreCase(row.user_id, userFilter);
    const matchesDevice = !deviceFilter || includesIgnoreCase(row.device_id, deviceFilter);
    const matchesExercise = !exerciseFilter || includesIgnoreCase(row.exercise, exerciseFilter);

    return matchesTrainer && matchesUser && matchesDevice && matchesExercise;
  });
}

function getFilteredUserRows() {
  return userRows.filter((row) => {
    const trainerFilter = getFilterValue("trainerFilter");
    const userFilter = getFilterValue("userFilter");
    const deviceFilter = getFilterValue("deviceFilter");

    const matchesTrainer = !trainerFilter || includesIgnoreCase(row.trainer_id, trainerFilter);
    const matchesUser = !userFilter || includesIgnoreCase(row.user_id, userFilter);
    const matchesDevice = !deviceFilter || includesIgnoreCase(row.primary_device_id, deviceFilter);

    return matchesTrainer && matchesUser && matchesDevice;
  });
}

function getFilterValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function includesIgnoreCase(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function averageFromRows(rows, field) {
  const values = rows
    .map((row) => toNumber(row[field]))
    .filter((value) => value !== null);

  if (!values.length) return "—";

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return avg.toFixed(2);
}

function percentFromRows(rows, field) {
  const values = rows
    .map((row) => toNumber(row[field]))
    .filter((value) => value !== null);

  if (!values.length) return "—";

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${(avg * 100).toFixed(0)}%`;
}

function uniqueCount(rows, field) {
  const set = new Set(
    rows
      .map((row) => String(row[field] || "").trim())
      .filter(Boolean)
  );
  return String(set.size);
}

function setSummaryCardValueByLabel(labelText, value) {
  const cards = document.querySelectorAll(".summary-card");

  cards.forEach((card) => {
    const label = card.querySelector(".summary-label");
    const strong = card.querySelector("strong");

    if (!label || !strong) return;

    if (label.textContent.trim() === labelText) {
      strong.textContent = value;
    }
  });
}

function renderHeadlineMetrics(filteredTrainerRows, filteredUserRows) {
  setSummaryCardValueByLabel("Trainers active", uniqueCount(filteredTrainerRows, "trainer_id"));
  setSummaryCardValueByLabel("Users tested", uniqueCount(filteredUserRows, "user_id"));
  setSummaryCardValueByLabel("Devices used", uniqueCount(filteredTrainerRows, "device_id"));
  setSummaryCardValueByLabel("Total analyzed sets", String(filteredTrainerRows.length));
}

function renderCoreMetrics(filteredTrainerRows) {
  setSummaryCardValueByLabel("Successful session rate", percentFromRows(filteredTrainerRows, "capture_success"));
  setSummaryCardValueByLabel("Technical issue rate", percentFromRows(filteredTrainerRows, "technical_issue"));
  setSummaryCardValueByLabel("Q6 helps coaching avg", averageFromRows(filteredTrainerRows, "coaching_value"));
  setSummaryCardValueByLabel("% revealed something new", percentFromRows(filteredTrainerRows, "revealed_something_new"));
  setSummaryCardValueByLabel("% behavior change", percentFromRows(filteredTrainerRows, "behavior_change"));
}

function renderUserPerceptionMetrics(filteredUserRows) {
  setSummaryCardValueByLabel("Q1 average", averageFromRows(filteredUserRows, "q1_reflection_accuracy"));
  setSummaryCardValueByLabel("Q2 average", averageFromRows(filteredUserRows, "q2_trust"));
  setSummaryCardValueByLabel("Q3 average", averageFromRows(filteredUserRows, "q3_training_impact"));
  setSummaryCardValueByLabel("Q4 average", averageFromRows(filteredUserRows, "q4_integration"));
  setSummaryCardValueByLabel("Q5 average", averageFromRows(filteredUserRows, "q5_awareness"));
}

function renderBiasControlledMetrics(filteredTrainerRows, filteredUserRows) {
  setSummaryCardValueByLabel("Session reviews logged", String(filteredUserRows.length));
  setSummaryCardValueByLabel("Immediate perceived score", averageFromRows(filteredUserRows, "immediate_perceived_score"));
  setSummaryCardValueByLabel("Session value score", averageFromRows(filteredUserRows, "session_value_score"));
  setSummaryCardValueByLabel("Observed change score", averageFromRows(filteredTrainerRows, "observed_change_score"));
  setSummaryCardValueByLabel("Private entry rate", percentFromRows(filteredUserRows, "private_review"));
  setSummaryCardValueByLabel("Next-set validation rate", percentFromRows(filteredTrainerRows, "validated_next_set"));
}

function renderSummaryTable(filteredTrainerRows = getFilteredTrainerRows(), filteredUserRows = getFilteredUserRows()) {
  const activeTab =
    document.querySelector(".tab-btn.active")?.textContent.trim() || "Trainer summary";

  const titleEl = document.querySelector(".table-placeholder h3");
  const textEl = document.querySelector(".table-placeholder p");

  if (!titleEl || !textEl) return;

  if (activeTab === "Trainer summary") {
    const grouped = groupBy(filteredTrainerRows, "trainer_id");
    titleEl.textContent = "Trainer summary";
    textEl.innerHTML = buildSummaryList(grouped, (rows, key) => {
      return `
        <strong>${escapeHtml(key || "Unknown trainer")}</strong><br>
        Sets logged: ${rows.length}<br>
        Capture success: ${percentText(rows, "capture_success")}<br>
        Coaching value: ${averageText(rows, "coaching_value")}<br>
        Behavior change: ${percentText(rows, "behavior_change")}
      `;
    });
    return;
  }

  if (activeTab === "User summary") {
    const grouped = groupBy(filteredUserRows, "user_id");
    titleEl.textContent = "User summary";
    textEl.innerHTML = buildSummaryList(grouped, (rows, key) => {
      return `
        <strong>${escapeHtml(key || "Unknown user")}</strong><br>
        Reviews logged: ${rows.length}<br>
        Q1–Q5 avg: ${averageText(rows, "immediate_perceived_score")}<br>
        Session value: ${averageText(rows, "session_value_score")}<br>
        Private review rate: ${percentText(rows, "private_review")}
      `;
    });
    return;
  }

  if (activeTab === "Device summary") {
    const groupedTrainer = groupBy(filteredTrainerRows, "device_id");
    titleEl.textContent = "Device summary";
    textEl.innerHTML = buildSummaryList(groupedTrainer, (rows, key) => {
      return `
        <strong>${escapeHtml(key || "Unknown device")}</strong><br>
        Sets logged: ${rows.length}<br>
        Capture success: ${percentText(rows, "capture_success")}<br>
        Technical issues: ${percentText(rows, "technical_issue")}<br>
        Coaching value: ${averageText(rows, "coaching_value")}
      `;
    });
    return;
  }

  if (activeTab === "Exercise summary") {
    const grouped = groupBy(filteredTrainerRows, "exercise");
    titleEl.textContent = "Exercise summary";
    textEl.innerHTML = buildSummaryList(grouped, (rows, key) => {
      return `
        <strong>${escapeHtml(key || "Unknown exercise")}</strong><br>
        Sets logged: ${rows.length}<br>
        Capture success: ${percentText(rows, "capture_success")}<br>
        Coaching value: ${averageText(rows, "coaching_value")}<br>
        Revealed something new: ${percentText(rows, "revealed_something_new")}
      `;
    });
  }
}

function groupBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = String(row[field] || "").trim() || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

function averageText(rows, field) {
  const values = rows
    .map((row) => toNumber(row[field]))
    .filter((value) => value !== null);

  if (!values.length) return "—";
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return avg.toFixed(2);
}

function percentText(rows, field) {
  const values = rows
    .map((row) => toNumber(row[field]))
    .filter((value) => value !== null);

  if (!values.length) return "—";
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${(avg * 100).toFixed(0)}%`;
}

function buildSummaryList(groupedRows, formatter) {
  const entries = Object.entries(groupedRows);

  if (!entries.length) {
    return "No data available for this view.";
  }

  return entries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, rows]) => `<div style="margin-bottom: 16px;">${formatter(rows, key)}</div>`)
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showPageMessage(message) {
  let messageEl = document.getElementById("pageMessage");

  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.id = "pageMessage";
    messageEl.className = "page-message";

    const actionRow = document.querySelector(".action-row");
    if (actionRow) {
      actionRow.insertAdjacentElement("afterend", messageEl);
    } else {
      const appCard = document.querySelector(".app-card");
      if (appCard) appCard.appendChild(messageEl);
    }
  }

  messageEl.textContent = message;
}