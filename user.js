const form = document.getElementById("userForm");

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
    recordSessionBtn.addEventListener("click", (event) => {
      event.preventDefault();
      recordSession();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("uruzoneUserDraft");
      setTimeout(() => {
        setDefaultDate();
        updateUserSummary();
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
  if (!values.length) return "—";
  const total = values.reduce((sum, value) => sum + value, 0);
  return (total / values.length).toFixed(2);
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

  if (values.length !== 5) return "—";
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

  if (values.length !== 3) return "—";
  return average(values);
}

function updateUserSummary() {
  const summaryCards = document.querySelectorAll(".summary-card");

  if (summaryCards.length >= 1) {
    const perceivedStrong = summaryCards[0].querySelector("strong");
    if (perceivedStrong) {
      perceivedStrong.textContent = calculateImmediatePerceivedScore();
    }
  }

  if (summaryCards.length >= 2) {
    const valueStrong = summaryCards[1].querySelector("strong");
    if (valueStrong) {
      valueStrong.textContent = calculateSessionValueScore();
    }
  }
}

function collectUserPayload() {
  return {
    trainerId: document.getElementById("trainerId")?.value.trim() || "",
    userId: document.getElementById("userId")?.value.trim() || "",
    date: document.getElementById("reviewDate")?.value || "",
    primaryDeviceId: document.getElementById("primaryDeviceId")?.value.trim() || "",
    setsInSession: document.getElementById("setsInSession")?.value || "",

    q1ReflectionAccuracy: getRadioValue("q1ReflectionAccuracy"),
    q2Trust: getRadioValue("q2Trust"),
    q3TrainingImpact: getRadioValue("q3TrainingImpact"),
    q4Integration: getRadioValue("q4Integration"),
    q5Awareness: getRadioValue("q5Awareness"),

    overallSessionValue: getRadioValue("overallSessionValue"),
    wouldUseAgain: getRadioValue("wouldUseAgain"),
    confidenceToApplyAgain: getRadioValue("confidenceToApplyAgain"),

    biggestFriction: document.getElementById("biggestFriction")?.value.trim() || "",
    mostUsefulFeedback: document.getElementById("mostUsefulFeedback")?.value.trim() || "",
    sessionNotes: document.getElementById("sessionNotes")?.value.trim() || "",
    privateReview: document.getElementById("privateReview")?.checked ? 1 : 0,

    immediatePerceivedScore: calculateImmediatePerceivedScore(),
    sessionValueScore: calculateSessionValueScore(),

    savedAt: new Date().toISOString()
  };
}

function validateUserForm(payload) {
  const missing = [];

  if (!payload.trainerId) missing.push("Trainer ID");
  if (!payload.userId) missing.push("User ID");
  if (!payload.date) missing.push("Date");
  if (!payload.primaryDeviceId) missing.push("Primary device");
  if (!payload.setsInSession) missing.push("Sets in session");

  if (payload.q1ReflectionAccuracy === null) missing.push("Q1");
  if (payload.q2Trust === null) missing.push("Q2");
  if (payload.q3TrainingImpact === null) missing.push("Q3");
  if (payload.q4Integration === null) missing.push("Q4");
  if (payload.q5Awareness === null) missing.push("Q5");

  if (payload.overallSessionValue === null) missing.push("Overall session value");
  if (payload.wouldUseAgain === null) missing.push("Would use again");
  if (payload.confidenceToApplyAgain === null) missing.push("Confidence to apply again");

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

    setValue("trainerId", draft.trainerId);
    setValue("userId", draft.userId);
    setValue("reviewDate", draft.date);
    setValue("primaryDeviceId", draft.primaryDeviceId);
    setValue("setsInSession", draft.setsInSession);

    setValue("biggestFriction", draft.biggestFriction);
    setValue("mostUsefulFeedback", draft.mostUsefulFeedback);
    setValue("sessionNotes", draft.sessionNotes);

    setRadioValue("q1ReflectionAccuracy", draft.q1ReflectionAccuracy);
    setRadioValue("q2Trust", draft.q2Trust);
    setRadioValue("q3TrainingImpact", draft.q3TrainingImpact);
    setRadioValue("q4Integration", draft.q4Integration);
    setRadioValue("q5Awareness", draft.q5Awareness);

    setRadioValue("overallSessionValue", draft.overallSessionValue);
    setRadioValue("wouldUseAgain", draft.wouldUseAgain);
    setRadioValue("confidenceToApplyAgain", draft.confidenceToApplyAgain);

    setCheckboxValue("privateReview", draft.privateReview === 1);

    updateUserSummary();
    showPageMessage("Draft loaded.");
  } catch (error) {
    console.error("Failed to load user draft:", error);
  }
}

function recordSession() {
  const payload = collectUserPayload();
  const missing = validateUserForm(payload);

  if (missing.length > 0) {
    showPageMessage(`Please complete: ${missing.join(", ")}`);
    return;
  }

  localStorage.setItem("uruzoneUserLastSubmission", JSON.stringify(payload));
  localStorage.removeItem("uruzoneUserDraft");

  console.log("URUzone User Session Payload:", payload);
  showPageMessage("Session recorded locally.");

  form.reset();
  setDefaultDate();
  updateUserSummary();
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