const form = document.getElementById("userForm");

/*
  Paste your deployed Google Apps Script web app URL here.
  Example:
  https://script.google.com/macros/s/XXXXXXXXXXXX/exec
*/
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbznM9fTzwGMaF4kmDeAhfzq8A0puhkk756ZQKNVIJ2LqXVd4wodIKEWz9tHSHesJqGHAA/exec";
document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  injectActionIdsIfMissing();
  bindUserActions();
  bindLiveSummary();
  loadDraft();
  updateUserSummary();
});

function setDefaultDate() {
  const dateInput = document.getElementById("reviewDate");
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

  if (primaryBtn && !primaryBtn.id) primaryBtn.id = "recordSessionBtn";
  if (secondaryBtn && !secondaryBtn.id) secondaryBtn.id = "saveDraftBtn";
  if (resetBtn && !resetBtn.id) resetBtn.id = "resetBtn";
}

function bindUserActions() {
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const recordSessionBtn = document.getElementById("recordSessionBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", (event) => {
      event.preventDefault();
      saveDraft();
    });
  }

  if (recordSessionBtn) {
    recordSessionBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      await recordSession();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("uruzoneUserDraft");
      setTimeout(() => {
        setDefaultDate();
        updateUserSummary();
        showPageMessage("Form reset.");
      }, 0);
    });
  }
}

function bindLiveSummary() {
  const watchedInputs = form.querySelectorAll("input, textarea, select");

  watchedInputs.forEach((input) => {
    input.addEventListener("change", updateUserSummary);
    input.addEventListener("input", updateUserSummary);
  });
}

function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function average(values) {
  if (!values.length) return "";
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

function calculateImmediatePerceivedScore() {
  const values = [
    getRadioValue("q1ReflectionAccuracy"),
    getRadioValue("q2Trust"),
    getRadioValue("q3TrainingImpact"),
    getRadioValue("q4Integration"),
    getRadioValue("q5Awareness")
  ]
    .filter((value) => value !== null)
    .map(Number);

  if (values.length !== 5) return "";
  return average(values);
}

function calculateSessionValueScore() {
  const values = [
    getRadioValue("overallSessionValue"),
    getRadioValue("wouldUseAgain"),
    getRadioValue("confidenceToApplyAgain")
  ]
    .filter((value) => value !== null)
    .map(Number);

  if (values.length !== 3) return "";
  return average(values);
}

function updateUserSummary() {
  const summaryCards = document.querySelectorAll(".summary-card");

  if (summaryCards.length >= 1) {
    const perceivedStrong = summaryCards[0].querySelector("strong");
    if (perceivedStrong) {
      const score = calculateImmediatePerceivedScore();
      perceivedStrong.textContent = score === "" ? "—" : score.toFixed(2);
    }
  }

  if (summaryCards.length >= 2) {
    const valueStrong = summaryCards[1].querySelector("strong");
    if (valueStrong) {
      const score = calculateSessionValueScore();
      valueStrong.textContent = score === "" ? "—" : score.toFixed(2);
    }
  }
}

function collectUserPayload() {
  return {
    sheet: "User_Review",

    timestamp: new Date().toISOString(),
    trainer_id: document.getElementById("trainerId")?.value.trim() || "",
    user_id: document.getElementById("userId")?.value.trim() || "",
    date: document.getElementById("reviewDate")?.value || "",
    primary_device_id: document.getElementById("primaryDeviceId")?.value.trim() || "",
    sets_in_session: document.getElementById("setsInSession")?.value || "",

    q1_reflection_accuracy: getRadioValue("q1ReflectionAccuracy"),
    q2_trust: getRadioValue("q2Trust"),
    q3_training_impact: getRadioValue("q3TrainingImpact"),
    q4_integration: getRadioValue("q4Integration"),
    q5_awareness: getRadioValue("q5Awareness"),

    overall_session_value: getRadioValue("overallSessionValue"),
    would_use_again: getRadioValue("wouldUseAgain"),
    confidence_to_apply_again: getRadioValue("confidenceToApplyAgain"),

    biggest_friction: document.getElementById("biggestFriction")?.value.trim() || "",
    most_useful_feedback: document.getElementById("mostUsefulFeedback")?.value.trim() || "",
    session_notes: document.getElementById("sessionNotes")?.value.trim() || "",
    private_review: document.getElementById("privateReview")?.checked ? 1 : 0,

    immediate_perceived_score: calculateImmediatePerceivedScore(),
    session_value_score: calculateSessionValueScore()
  };
}

function validateUserForm(payload) {
  const missing = [];

  if (!payload.trainer_id) missing.push("Trainer ID");
  if (!payload.user_id) missing.push("User ID");
  if (!payload.date) missing.push("Date");
  if (!payload.primary_device_id) missing.push("Primary device");
  if (!payload.sets_in_session) missing.push("Sets in session");

  if (payload.q1_reflection_accuracy === null) missing.push("Q1");
  if (payload.q2_trust === null) missing.push("Q2");
  if (payload.q3_training_impact === null) missing.push("Q3");
  if (payload.q4_integration === null) missing.push("Q4");
  if (payload.q5_awareness === null) missing.push("Q5");

  if (payload.overall_session_value === null) missing.push("Overall session value");
  if (payload.would_use_again === null) missing.push("Would use again");
  if (payload.confidence_to_apply_again === null) missing.push("Confidence to apply again");

  return missing;
}

function saveDraft() {
  const payload = collectUserPayload();
  localStorage.setItem("uruzoneUserDraft", JSON.stringify(payload));
  showPageMessage("Draft saved on this device.");
}

function loadDraft() {
  const raw = localStorage.getItem("uruzoneUserDraft");
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);

    setValue("trainerId", draft.trainer_id);
    setValue("userId", draft.user_id);
    setValue("reviewDate", draft.date);
    setValue("primaryDeviceId", draft.primary_device_id);
    setValue("setsInSession", draft.sets_in_session);

    setValue("biggestFriction", draft.biggest_friction);
    setValue("mostUsefulFeedback", draft.most_useful_feedback);
    setValue("sessionNotes", draft.session_notes);

    setRadioValue("q1ReflectionAccuracy", draft.q1_reflection_accuracy);
    setRadioValue("q2Trust", draft.q2_trust);
    setRadioValue("q3TrainingImpact", draft.q3_training_impact);
    setRadioValue("q4Integration", draft.q4_integration);
    setRadioValue("q5Awareness", draft.q5_awareness);

    setRadioValue("overallSessionValue", draft.overall_session_value);
    setRadioValue("wouldUseAgain", draft.would_use_again);
    setRadioValue("confidenceToApplyAgain", draft.confidence_to_apply_again);

    setCheckboxValue("privateReview", draft.private_review === 1);

    updateUserSummary();
    showPageMessage("Draft loaded.");
  } catch (error) {
    console.error("Failed to load user draft:", error);
    showPageMessage("Could not load saved draft.");
  }
}

async function saveUserRowToGoogleSheets(payload) {
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

async function recordSession() {
  const payload = collectUserPayload();
  const missing = validateUserForm(payload);

  if (missing.length > 0) {
    showPageMessage(`Please complete: ${missing.join(", ")}`);
    return;
  }

  try {
    showPageMessage("Recording session...");

    await saveUserRowToGoogleSheets(payload);

    localStorage.setItem("uruzoneUserLastSubmission", JSON.stringify(payload));
    localStorage.removeItem("uruzoneUserDraft");

    console.log("URUzone User Session Payload:", payload);
    showPageMessage("Session recorded to Google Sheets.");

    form.reset();
    setDefaultDate();
    updateUserSummary();
  } catch (error) {
    console.error("Failed to save user session:", error);
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