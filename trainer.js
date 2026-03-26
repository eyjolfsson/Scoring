const form = document.getElementById("trainerForm");

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
    recordSetBtn.addEventListener("click", (event) => {
      event.preventDefault();
      recordSet();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("uruzoneTrainerDraft");
      setTimeout(() => {
        setDefaultDate();
        updateTrainerSummary();
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
    return "—";
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
  return score.toFixed(2);
}

function updateTrainerSummary() {
  const summaryCards = document.querySelectorAll(".summary-card");

  if (summaryCards.length >= 1) {
    const captureStrong = summaryCards[0].querySelector("strong");
    if (captureStrong) {
      captureStrong.textContent = calculateCaptureSuccess();
    }
  }

  if (summaryCards.length >= 2) {
    const observedStrong = summaryCards[1].querySelector("strong");
    if (observedStrong) {
      observedStrong.textContent = calculateObservedChangeScore();
    }
  }
}

function collectTrainerPayload() {
  return {
    trainerId: document.getElementById("trainerId")?.value.trim() || "",
    userId: document.getElementById("userId")?.value.trim() || "",
    sessionNumber: document.getElementById("sessionNumber")?.value || "",
    date: document.getElementById("sessionDate")?.value || "",
    deviceId: document.getElementById("deviceId")?.value.trim() || "",
    exercise: document.getElementById("exercise")?.value.trim() || "",
    loadKg: document.getElementById("loadKg")?.value || "",
    reps: document.getElementById("reps")?.value || "",

    setupSuccessful: getRadioValue("setupSuccessful"),
    dataCaptured: getRadioValue("dataCaptured"),
    technicalIssue: getRadioValue("technicalIssue"),
    issueCategory: document.getElementById("issueCategory")?.value.trim() || "",

    confirmedObservation: getCheckboxValue("confirmedObservation") ? 1 : 0,
    revealedSomethingNew: getCheckboxValue("revealedSomethingNew") ? 1 : 0,
    behaviorChange: getCheckboxValue("behaviorChange") ? 1 : 0,
    decisionChange: getCheckedDecisionChanges(),

    coachingValue: getRadioValue("coachingValue"),
    validatedNextSet: getRadioValue("validatedNextSet"),

    quickScript: document.getElementById("quickScript")?.value.trim() || "",
    trainerNotes: document.getElementById("trainerNotes")?.value.trim() || "",

    captureSuccess: calculateCaptureSuccess(),
    observedChangeScore: calculateObservedChangeScore(),

    savedAt: new Date().toISOString()
  };
}

function validateTrainerForm(payload) {
  const missing = [];

  if (!payload.trainerId) missing.push("Trainer ID");
  if (!payload.userId) missing.push("User ID");
  if (!payload.sessionNumber) missing.push("Session number");
  if (!payload.date) missing.push("Date");
  if (!payload.deviceId) missing.push("Device ID");
  if (!payload.exercise) missing.push("Exercise");
  if (payload.loadKg === "") missing.push("Load");
  if (!payload.reps) missing.push("Reps");
  if (payload.setupSuccessful === null) missing.push("Setup successful");
  if (payload.dataCaptured === null) missing.push("Data captured");
  if (payload.technicalIssue === null) missing.push("Technical issue");
  if (payload.coachingValue === null) missing.push("Coaching value");
  if (payload.validatedNextSet === null) missing.push("Next-set validation");

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

    setValue("trainerId", draft.trainerId);
    setValue("userId", draft.userId);
    setValue("sessionNumber", draft.sessionNumber);
    setValue("sessionDate", draft.date);
    setValue("deviceId", draft.deviceId);
    setValue("exercise", draft.exercise);
    setValue("loadKg", draft.loadKg);
    setValue("reps", draft.reps);
    setValue("issueCategory", draft.issueCategory);
    setValue("quickScript", draft.quickScript);
    setValue("trainerNotes", draft.trainerNotes);

    setRadioValue("setupSuccessful", draft.setupSuccessful);
    setRadioValue("dataCaptured", draft.dataCaptured);
    setRadioValue("technicalIssue", draft.technicalIssue);
    setRadioValue("coachingValue", draft.coachingValue);
    setRadioValue("validatedNextSet", draft.validatedNextSet);

    setCheckboxValue("confirmedObservation", draft.confirmedObservation === 1);
    setCheckboxValue("revealedSomethingNew", draft.revealedSomethingNew === 1);
    setCheckboxValue("behaviorChange", draft.behaviorChange === 1);

    if (Array.isArray(draft.decisionChange)) {
      draft.decisionChange.forEach((value) => {
        const input = document.querySelector(`input[name="decisionChange"][value="${value}"]`);
        if (input) input.checked = true;
      });
    }

    updateTrainerSummary();
    showPageMessage("Draft loaded.");
  } catch (error) {
    console.error("Failed to load trainer draft:", error);
  }
}

function recordSet() {
  const payload = collectTrainerPayload();
  const missing = validateTrainerForm(payload);

  if (missing.length > 0) {
    showPageMessage(`Please complete: ${missing.join(", ")}`);
    return;
  }

  localStorage.setItem("uruzoneTrainerLastSubmission", JSON.stringify(payload));
  localStorage.removeItem("uruzoneTrainerDraft");

  console.log("URUzone Trainer Set Payload:", payload);
  showPageMessage("Set recorded locally.");

  form.reset();
  setDefaultDate();
  updateTrainerSummary();
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