const form = document.getElementById("trainerForm");

/*
  Paste your deployed Google Apps Script web app URL here.
  Example:
  https://script.google.com/macros/s/XXXXXXXXXXXX/exec
*/
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbznM9fTzwGMaF4kmDeAhfzq8A0puhkk756ZQKNVIJ2LqXVd4wodIKEWz9tHSHesJqGHAA/exec";
document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  injectActionIdsIfMissing();
  bindTrainerActions();
  bindLiveSummary();
  loadDraft();
  updateTrainerSummary();
});

function setDefaultDate() {
  const dateInput = document.getElementById("sessionDate");
  if (!dateInput || dateInput.value) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function injectActionIdsIfMissing() {
  const primaryBtn = document.querySelector(".primary-btn");
  const secondaryBtn = document.querySelector(".secondary-btn");
  const resetBtn = document.querySelector(".ghost-btn");

  if (primaryBtn && !primaryBtn.id) primaryBtn.id = "recordSetBtn";
  if (secondaryBtn && !secondaryBtn.id) secondaryBtn.id = "saveDraftBtn";
  if (resetBtn && !resetBtn.id) resetBtn.id = "resetBtn";
}

function bindTrainerActions() {
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const recordSetBtn = document.getElementById("recordSetBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", (event) => {
      event.preventDefault();
      saveDraft();
    });
  }

  if (recordSetBtn) {
    recordSetBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      await recordSet();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("uruzoneTrainerDraft");
      setTimeout(() => {
        setDefaultDate();
        updateTrainerSummary();
        showPageMessage("Form reset.");
      }, 0);
    });
  }
}

function bindLiveSummary() {
  const watchedInputs = form.querySelectorAll("input, textarea, select");

  watchedInputs.forEach((input) => {
    input.addEventListener("change", updateTrainerSummary);
    input.addEventListener("input", updateTrainerSummary);
  });
}

function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function getCheckboxValue(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function getCheckedDecisionChanges() {
  return [...document.querySelectorAll('input[name="decisionChange"]:checked')].map(
    (input) => input.value
  );
}

function calculateCaptureSuccess() {
  const setupSuccessful = getRadioValue("setupSuccessful");
  const dataCaptured = getRadioValue("dataCaptured");

  if (setupSuccessful === null || dataCaptured === null) {
    return "";
  }

  return Number(setupSuccessful) * Number(dataCaptured);
}

function calculateObservedChangeScore() {
  const values = [
    getCheckboxValue("confirmedObservation") ? 1 : 0,
    getCheckboxValue("revealedSomethingNew") ? 1 : 0,
    getCheckboxValue("behaviorChange") ? 1 : 0
  ];

  const score = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(score.toFixed(2));
}

function updateTrainerSummary() {
  const summaryCards = document.querySelectorAll(".summary-card");

  if (summaryCards.length >= 1) {
    const captureStrong = summaryCards[0].querySelector("strong");
    if (captureStrong) {
      const capture = calculateCaptureSuccess();
      captureStrong.textContent = capture === "" ? "—" : capture;
    }
  }

  if (summaryCards.length >= 2) {
    const observedStrong = summaryCards[1].querySelector("strong");
    if (observedStrong) {
      observedStrong.textContent = calculateObservedChangeScore().toFixed(2);
    }
  }
}

function collectTrainerPayload() {
  const decisionChangeValues = getCheckedDecisionChanges();

  return {
    sheet: "Trainer_Log",

    timestamp: new Date().toISOString(),
    trainer_id: document.getElementById("trainerId")?.value.trim() || "",
    user_id: document.getElementById("userId")?.value.trim() || "",
    session_number: document.getElementById("sessionNumber")?.value || "",
    date: document.getElementById("sessionDate")?.value || "",
    device_id: document.getElementById("deviceId")?.value.trim() || "",
    exercise: document.getElementById("exercise")?.value.trim() || "",
    load_kg: document.getElementById("loadKg")?.value || "",
    reps: document.getElementById("reps")?.value || "",

    setup_successful: getRadioValue("setupSuccessful"),
    data_captured: getRadioValue("dataCaptured"),
    technical_issue: getRadioValue("technicalIssue"),
    issue_category: document.getElementById("issueCategory")?.value.trim() || "",

    confirmed_observation: getCheckboxValue("confirmedObservation") ? 1 : 0,
    revealed_something_new: getCheckboxValue("revealedSomethingNew") ? 1 : 0,
    behavior_change: getCheckboxValue("behaviorChange") ? 1 : 0,
    decision_change: decisionChangeValues.join(", "),

    coaching_value: getRadioValue("coachingValue"),
    validated_next_set: getRadioValue("validatedNextSet"),

    capture_success: calculateCaptureSuccess(),
    observed_change_score: calculateObservedChangeScore(),

    quick_script: document.getElementById("quickScript")?.value.trim() || "",
    trainer_notes: document.getElementById("trainerNotes")?.value.trim() || ""
  };
}

function validateTrainerForm(payload) {
  const missing = [];

  if (!payload.trainer_id) missing.push("Trainer ID");
  if (!payload.user_id) missing.push("User ID");
  if (!payload.session_number) missing.push("Session number");
  if (!payload.date) missing.push("Date");
  if (!payload.device_id) missing.push("Device ID");
  if (!payload.exercise) missing.push("Exercise");
  if (payload.load_kg === "") missing.push("Load");
  if (!payload.reps) missing.push("Reps");
  if (payload.setup_successful === null) missing.push("Setup successful");
  if (payload.data_captured === null) missing.push("Data captured");
  if (payload.technical_issue === null) missing.push("Technical issue");
  if (payload.coaching_value === null) missing.push("Coaching value");
  if (payload.validated_next_set === null) missing.push("Next-set validation");

  return missing;
}

function saveDraft() {
  const payload = collectTrainerPayload();
  localStorage.setItem("uruzoneTrainerDraft", JSON.stringify(payload));
  showPageMessage("Draft saved on this device.");
}

function loadDraft() {
  const raw = localStorage.getItem("uruzoneTrainerDraft");
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);

    setValue("trainerId", draft.trainer_id);
    setValue("userId", draft.user_id);
    setValue("sessionNumber", draft.session_number);
    setValue("sessionDate", draft.date);
    setValue("deviceId", draft.device_id);
    setValue("exercise", draft.exercise);
    setValue("loadKg", draft.load_kg);
    setValue("reps", draft.reps);
    setValue("issueCategory", draft.issue_category);
    setValue("quickScript", draft.quick_script);
    setValue("trainerNotes", draft.trainer_notes);

    setRadioValue("setupSuccessful", draft.setup_successful);
    setRadioValue("dataCaptured", draft.data_captured);
    setRadioValue("technicalIssue", draft.technical_issue);
    setRadioValue("coachingValue", draft.coaching_value);
    setRadioValue("validatedNextSet", draft.validated_next_set);

    setCheckboxValue("confirmedObservation", draft.confirmed_observation === 1);
    setCheckboxValue("revealedSomethingNew", draft.revealed_something_new === 1);
    setCheckboxValue("behaviorChange", draft.behavior_change === 1);

    if (typeof draft.decision_change === "string" && draft.decision_change.trim()) {
      const values = draft.decision_change.split(",").map((v) => v.trim());
      values.forEach((value) => {
        const input = document.querySelector(`input[name="decisionChange"][value="${value}"]`);
        if (input) input.checked = true;
      });
    }

    updateTrainerSummary();
    showPageMessage("Draft loaded.");
  } catch (error) {
    console.error("Failed to load trainer draft:", error);
    showPageMessage("Could not load saved draft.");
  }
}

async function saveTrainerRowToGoogleSheets(payload) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_YOUR_APPS_SCRIPT_URL_HERE")) {
    throw new Error("Google Apps Script URL is missing.");
  }

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
}

async function recordSet() {
  const payload = collectTrainerPayload();
  const missing = validateTrainerForm(payload);

  if (missing.length > 0) {
    showPageMessage(`Please complete: ${missing.join(", ")}`);
    return;
  }

  try {
    showPageMessage("Recording set...");

    await saveTrainerRowToGoogleSheets(payload);

    localStorage.setItem("uruzoneTrainerLastSubmission", JSON.stringify(payload));
    localStorage.removeItem("uruzoneTrainerDraft");

    console.log("URUzone Trainer Set Payload:", payload);
    showPageMessage("Set recorded to Google Sheets.");

    form.reset();
    setDefaultDate();
    updateTrainerSummary();
  } catch (error) {
    console.error("Failed to save trainer set:", error);
    showPageMessage("Failed to save to Google Sheets. Check your script URL and deployment.");
  }
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;
  el.value = value;
}

function setRadioValue(name, value) {
  if (value === undefined || value === null || value === "") return;

  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function setCheckboxValue(id, checked) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = checked;
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
      form.appendChild(messageEl);
    }
  }

  messageEl.textContent = message;
}