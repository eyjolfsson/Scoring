document.addEventListener("DOMContentLoaded", () => {
  bindSummaryTabs();
  bindScoreboardActions();
  bindFilterFeedback();
  showPageMessage("Scoreboard ready.");
});

function bindSummaryTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const titleEl = document.querySelector(".table-placeholder h3");
  const textEl = document.querySelector(".table-placeholder p");

  const tabContent = {
    "Trainer summary": {
      title: "Trainer summary",
      text: "This area shows trainer-level comparison, including sets logged, capture success, coaching value, and behavior change across trainers."
    },
    "User summary": {
      title: "User summary",
      text: "This area shows user-level comparison, including private review averages, session value, and how different users are responding to the system."
    },
    "Device summary": {
      title: "Device summary",
      text: "This area shows device-level comparison, combining capture quality with user and trainer-side outcomes."
    },
    "Exercise summary": {
      title: "Exercise summary",
      text: "This area shows exercise-level comparison, highlighting where capture, coaching value, and revealed-something-new rates are stronger or weaker."
    }
  };

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const label = button.textContent.trim();
      const next = tabContent[label];

      if (next && titleEl && textEl) {
        titleEl.textContent = next.title;
        textEl.textContent = next.text;
      }

      showPageMessage(`${label} selected.`);
    });
  });
}

function bindScoreboardActions() {
  const primaryBtn = document.querySelector(".primary-btn");
  const secondaryBtn = document.querySelector(".secondary-btn");
  const ghostBtn = document.querySelector(".ghost-btn");

  if (primaryBtn) {
    primaryBtn.addEventListener("click", () => {
      refreshScoreboard();
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
    });
  }
}

function bindFilterFeedback() {
  const filterInputs = document.querySelectorAll(
    '#dateRange, #trainerFilter, #userFilter, #deviceFilter, #exerciseFilter'
  );

  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
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

function refreshScoreboard() {
  // Placeholder for future live data refresh
  const timestamp = new Date().toLocaleString();
  showPageMessage(`Scoreboard refreshed at ${timestamp}.`);
  console.log("URUzone Scoreboard refreshed.");
}

function exportScoreboard() {
  const payload = collectScoreboardState();

  // Placeholder for future export logic
  console.log("URUzone Scoreboard export payload:", payload);
  localStorage.setItem("uruzoneScoreboardLastExport", JSON.stringify(payload));

  showPageMessage("Scoreboard export prepared locally.");
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

  showPageMessage("Filters reset.");
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
    exportedAt: new Date().toISOString()
  };
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