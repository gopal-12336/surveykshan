/* =========================================================
   SURVEKSHAN ADMIN PANEL
   COMPLETE FIXED & UPDATED VERSION
   ========================================================= */
console.log("==============================================");
console.log("SURVEKSHAN ADMIN JS LOADED - FIXED VERSION");
console.log("==============================================");

/* =========================================================
   ADMIN CONFIG
   ========================================================= */
const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

/* =========================================================
   GLOBAL DATA
   ========================================================= */
let allSurveys = [];
let filteredSurveys = [];
let allQuestions = [];
let allSurveyors = [];
let editingQuestionId = null;
let partyChart = null;

/* =========================================================
   SAFE FIREBASE CHECK
   ========================================================= */
if (typeof firebase === "undefined") {
    console.error("Firebase SDK is not loaded.");
} else {
    console.log("Firebase SDK detected.");
}

/* =========================================================
   DOM READY
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
    console.log("Admin DOM ready.");
    initializeAdmin();
});

/* =========================================================
   INITIALIZE ADMIN
   ========================================================= */
function initializeAdmin() {
    if (typeof firebase === "undefined") {
        console.error("Firebase is unavailable.");
        return;
    }
    if (typeof db === "undefined" || !db) {
        console.error("Firestore database 'db' is unavailable.");
        return;
    }
    initializeQuestionBuilder();
    setupAdminEvents();
    startAdminAuthentication();
}

/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */
function startAdminAuthentication() {
    firebase.auth()
        .setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(function () {
            firebase.auth().onAuthStateChanged(function (user) {
                console.log("Auth state:", user ? user.email : "No user");
                if (!user) {
                    window.location.replace("index.html");
                    return;
                }
                if (!user.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
                    console.warn("Unauthorized user:", user.email);
                    window.location.replace("survey.html");
                    return;
                }
                console.log("ADMIN LOGIN SUCCESS:", user.email);
                loadQuestions();
                loadSurveys();
                loadSurveyors();
                loadDailyLimit();
            });
        })
        .catch(function (error) {
            console.error("Authentication initialization error:", error);
        });
}

/* =========================================================
   HELPERS
   ========================================================= */
function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().toLowerCase();
}

function getDate(value) {
    if (!value) return null;
    try {
        if (typeof value.toDate === "function") return value.toDate();
        if (value.seconds !== undefined) return new Date(Number(value.seconds) * 1000);
        if (value._seconds !== undefined) return new Date(Number(value._seconds) * 1000);
        if (value instanceof Date) return value;
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (error) {
        console.error("Date conversion error:", error);
        return null;
    }
}

function isToday(date) {
    if (!date) return false;
    const now = new Date();
    return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}

function isThisWeek(date) {
    if (!date) return false;
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const difference = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - difference);
    start.setHours(0, 0, 0, 0);
    return date >= start;
}

function isThisMonth(date) {
    if (!date) return false;
    const now = new Date();
    return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}

/* =========================================================
   EXTRACT ALL PHOTOS (UP TO 4 PHOTOS SUPPORT)
   ========================================================= */
function getSurveyPhotosArray(survey) {
    let photos = [];
    if (survey.photos) {
        if (Array.isArray(survey.photos)) {
            photos = survey.photos.map(p => (typeof p === "object" && p ? (p.url || p.photoUrl) : p)).filter(Boolean);
        } else if (typeof survey.photos === "object") {
            ["photo1", "photo2", "photo3", "photo4"].forEach(key => {
                if (survey.photos[key]) {
                    const url = typeof survey.photos[key] === "object" ? survey.photos[key].url : survey.photos[key];
                    if (url) photos.push(url);
                }
            });
        }
    }
    if (photos.length === 0) {
        const singlePhoto = survey.photoURL || survey.photo || survey.image;
        if (singlePhoto) photos.push(singlePhoto);
    }
    return photos;
}

/* =========================================================
   QUESTION BUILDER
   ========================================================= */
function initializeQuestionBuilder() {
    const container = document.getElementById("optionsContainer");
    if (!container) return;
    if (container.children.length === 0) {
        createOptionInput();
        createOptionInput();
    }
}

function createOptionInput(value = "") {
    const container = document.getElementById("optionsContainer");
    if (!container) return;
    const row = document.createElement("div");
    row.className = "option-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "question-option";
    input.placeholder = "Enter option";
    input.value = value;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "❌";
    removeButton.addEventListener("click", function () {
        row.remove();
    });
    row.appendChild(input);
    row.appendChild(removeButton);
    container.appendChild(row);
}

function setupQuestionEvents() {
    const addButton = document.getElementById("addOption");
    if (addButton) {
        addButton.addEventListener("click", function () {
            createOptionInput();
        });
    }
    const saveButton = document.getElementById("saveQuestion");
    if (saveButton) {
        saveButton.addEventListener("click", saveQuestion);
    }
    const cancelButton = document.getElementById("cancelEdit");
    if (cancelButton) {
        cancelButton.addEventListener("click", function () {
            resetQuestionBuilder();
        });
    }
    const toggle = document.getElementById("questionManagerToggle");
    if (toggle) {
        toggle.addEventListener("click", function () {
            const body = document.getElementById("questionManagerBody");
            if (!body) return;
            if (body.style.display === "none") {
                body.style.display = "block";
                this.textContent = "🙈 Hide";
            } else {
                body.style.display = "none";
                this.textContent = "👁️ Show";
            }
        });
    }
}

function saveQuestion() {
    const textElement = document.getElementById("questionText");
    const typeElement = document.getElementById("questionType");
    const saveButton = document.getElementById("saveQuestion");
    if (!textElement || !typeElement) return;

    const questionText = textElement.value.trim();
    const questionType = typeElement.value || "single";
    if (!questionText) {
        showQuestionMessage("Please enter question.", false);
        return;
    }

    const optionInputs = document.querySelectorAll(".question-option");
    const options = [];
    optionInputs.forEach(function (input) {
        const value = input.value.trim();
        if (value) options.push(value);
    });

    if (options.length < 2) {
        showQuestionMessage("Please add at least 2 options.", false);
        return;
    }

    const questionData = {
        question: questionText,
        type: questionType,
        options: options,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    let operation;
    if (editingQuestionId) {
        operation = db.collection("questions").doc(editingQuestionId).update(questionData);
    } else {
        questionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        operation = db.collection("questions").add(questionData);
    }

    operation
        .then(function () {
            showQuestionMessage(editingQuestionId ? "Question updated successfully." : "Question added successfully.", true);
            resetQuestionBuilder();
            return loadQuestions();
        })
        .catch(function (error) {
            console.error("Question save error:", error);
            showQuestionMessage("Error: " + error.message, false);
        })
        .finally(function () {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "💾 Save Question";
            }
        });
}

function showQuestionMessage(text, success) {
    const element = document.getElementById("questionMessage");
    if (!element) return;
    element.textContent = text;
    element.style.color = success ? "green" : "red";
}

function loadQuestions() {
    return db.collection("questions").get().then(function (snapshot) {
        allQuestions = [];
        snapshot.forEach(function (doc) {
            allQuestions.push({ id: doc.id, ...doc.data() });
        });

        allQuestions.sort(function (a, b) {
            const dateA = getDate(a.createdAt || a.updatedAt);
            const dateB = getDate(b.createdAt || b.updatedAt);
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });

        setText("questionCount", allQuestions.length);
        setText("totalQuestions", allQuestions.length);
        renderQuestions();
        return allQuestions;
    }).catch(function (error) {
        console.error("QUESTION LOAD ERROR:", error);
        setText("questionCount", 0);
        setText("totalQuestions", 0);
        return [];
    });
}

function renderQuestions() {
    const container = document.getElementById("questionsList");
    if (!container) return;
    container.innerHTML = "";
    if (allQuestions.length === 0) {
        container.innerHTML = "<p>No questions added yet.</p>";
        return;
    }
    allQuestions.forEach(function (question, index) {
        const card = document.createElement("div");
        card.className = "question-card";
        const title = document.createElement("h3");
        title.textContent = (index + 1) + ". " + (question.question || "Untitled Question");
        card.appendChild(title);

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = question.type === "multiple" ? "Multiple Choice" : "Single Choice";
        card.appendChild(badge);

        const options = document.createElement("div");
        options.style.marginTop = "10px";
        (question.options || []).forEach(function (option) {
            const item = document.createElement("div");
            item.className = "option-item";
            item.textContent = "• " + option;
            options.appendChild(item);
        });
        card.appendChild(options);

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "primary";
        editButton.textContent = "✏️ Edit";
        editButton.addEventListener("click", function () {
            editQuestion(question.id);
        });
        card.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = "🗑️ Delete";
        deleteButton.addEventListener("click", function () {
            deleteQuestion(question.id);
        });
        card.appendChild(deleteButton);

        container.appendChild(card);
    });
}

function editQuestion(id) {
    const question = allQuestions.find(item => item.id === id);
    if (!question) {
        alert("Question not found.");
        return;
    }
    editingQuestionId = id;
    const textElement = document.getElementById("questionText");
    const typeElement = document.getElementById("questionType");
    const container = document.getElementById("optionsContainer");

    if (textElement) textElement.value = question.question || "";
    if (typeElement) typeElement.value = question.type || "single";
    if (container) {
        container.innerHTML = "";
        (question.options || []).forEach(opt => createOptionInput(opt));
        if (container.children.length === 0) {
            createOptionInput();
            createOptionInput();
        }
    }
    const saveButton = document.getElementById("saveQuestion");
    if (saveButton) saveButton.textContent = "💾 Update Question";
    const cancelButton = document.getElementById("cancelEdit");
    if (cancelButton) cancelButton.style.display = "inline-block";

    const managerBody = document.getElementById("questionManagerBody");
    if (managerBody) managerBody.style.display = "block";
    const toggle = document.getElementById("questionManagerToggle");
    if (toggle) toggle.textContent = "🙈 Hide";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteQuestion(id) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    db.collection("questions").doc(id).delete().then(function () {
        alert("Question deleted successfully.");
        return loadQuestions();
    }).catch(function (error) {
        alert("Delete failed: " + error.message);
    });
}

function resetQuestionBuilder() {
    editingQuestionId = null;
    const textElement = document.getElementById("questionText");
    const typeElement = document.getElementById("questionType");
    const container = document.getElementById("optionsContainer");
    const saveButton = document.getElementById("saveQuestion");
    const cancelButton = document.getElementById("cancelEdit");

    if (textElement) textElement.value = "";
    if (typeElement) typeElement.value = "single";
    if (container) {
        container.innerHTML = "";
        createOptionInput();
        createOptionInput();
    }
    if (saveButton) saveButton.textContent = "💾 Save Question";
    if (cancelButton) cancelButton.style.display = "none";
}

/* =========================================================
   LOAD SURVEYS
   ========================================================= */
function loadSurveys() {
    console.log("Loading surveys...");
    return db.collection("surveys").get().then(function (snapshot) {
        allSurveys = [];
        snapshot.forEach(function (doc) {
            allSurveys.push({ id: doc.id, ...doc.data() });
        });

        allSurveys.sort(function (a, b) {
            const dateA = getDate(a.createdAt || a.timestamp || a.submittedAt);
            const dateB = getDate(b.createdAt || b.timestamp || b.submittedAt);
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB - dateA;
        });

        filteredSurveys = allSurveys.slice();
        console.log("SURVEYS LOADED:", allSurveys.length);

        updateDashboard();
        populateFilterDropdowns();
        renderSurveyRecords();
        renderSurveyorManagement();
        renderSurveyorPerformance();
        renderPartyChart();
        return allSurveys;
    }).catch(function (error) {
        console.error("SURVEY LOAD ERROR:", error);
        setText("totalSurvey", 0);
        setText("todaySurvey", 0);
        setText("weekSurvey", 0);
        setText("monthSurvey", 0);
        return [];
    });
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function updateDashboard() {
    const total = allSurveys.length;
    let today = 0, week = 0, month = 0;
    let bjp = 0, congress = 0, aap = 0, bsp = 0, sp = 0, other = 0;

    allSurveys.forEach(function (survey) {
        const date = getDate(survey.createdAt || survey.timestamp || survey.submittedAt || survey.date);
        if (isToday(date)) today++;
        if (isThisWeek(date)) week++;
        if (isThisMonth(date)) month++;

        const party = normalizeValue(survey.party);
        if (party === "bjp") bjp++;
        else if (party === "congress") congress++;
        else if (party === "aap") aap++;
        else if (party === "bsp") bsp++;
        else if (party === "sp") sp++;
        else other++;
    });

    setText("totalSurvey", total);
    setText("todaySurvey", today);
    setText("weekSurvey", week);
    setText("monthSurvey", month);
    setText("todayCount", today);
    setText("weekCount", week);
    setText("monthCount", month);
    setText("filteredSurvey", total);
    setText("bjpCount", bjp);
    setText("congressCount", congress);
    setText("aapCount", aap);
    setText("bspCount", bsp);
    setText("spCount", sp);
    setText("otherCount", other);
}

/* =========================================================
   FILTER DROPDOWNS
   ========================================================= */
function addUniqueOption(select, value, label) {
    if (!select || value === null || value === undefined || String(value).trim() === "") return;
    const normalized = normalizeValue(value);
    const existing = Array.from(select.options).some(option => normalizeValue(option.value) === normalized);
    if (existing) return;

    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label || String(value);
    select.appendChild(option);
}

function populateFilterDropdowns() {
    const nameFilter = document.getElementById("filterName");
    const mobileFilter = document.getElementById("filterMobile");
    const villageFilter = document.getElementById("filterVillage");
    const surveyorFilter = document.getElementById("filterSurveyor");
    const villageFilterOld = document.getElementById("villageFilter");
    const surveyorFilterOld = document.getElementById("surveyorFilter");

    if (nameFilter) nameFilter.innerHTML = '<option value="">👤 All Names</option>';
    if (mobileFilter) mobileFilter.innerHTML = '<option value="">📱 All Mobile</option>';
    if (villageFilter) villageFilter.innerHTML = '<option value="">🏠 All Villages</option>';
    if (surveyorFilter) surveyorFilter.innerHTML = '<option value="">🧑‍💼 All Surveyors</option>';
    if (villageFilterOld) villageFilterOld.innerHTML = '<option value="">All Villages</option>';
    if (surveyorFilterOld) surveyorFilterOld.innerHTML = '<option value="">All Surveyors</option>';

    allSurveys.forEach(function (survey) {
        addUniqueOption(nameFilter, survey.name, survey.name);
        addUniqueOption(mobileFilter, survey.mobile, survey.mobile);
        addUniqueOption(villageFilter, survey.village, survey.village);
        addUniqueOption(villageFilterOld, survey.village, survey.village);
        const surveyor = survey.surveyorEmail || survey.surveyorId || survey.createdBy || survey.createdByEmail;
        addUniqueOption(surveyorFilter, surveyor, surveyor);
        addUniqueOption(surveyorFilterOld, surveyor, surveyor);
    });

    allSurveyors.forEach(function (surveyor) {
        const email = surveyor.email || surveyor.surveyorEmail || surveyor.id;
        addUniqueOption(surveyorFilter, email, email);
        addUniqueOption(surveyorFilterOld, email, email);
    });
}

/* =========================================================
   APPLY FILTERS
   ========================================================= */
function applySurveyFilters() {
    const name = normalizeValue(document.getElementById("filterName")?.value);
    const mobile = normalizeValue(document.getElementById("filterMobile")?.value);
    const village = normalizeValue(document.getElementById("filterVillage")?.value);
    const surveyor = normalizeValue(document.getElementById("filterSurveyor")?.value);
    const oldVillage = normalizeValue(document.getElementById("villageFilter")?.value);
    const oldSurveyor = normalizeValue(document.getElementById("surveyorFilter")?.value);
    const selectedVillage = village || oldVillage;
    const selectedSurveyor = surveyor || oldSurveyor;
    const dateFilter = document.getElementById("filterDate")?.value || document.getElementById("dateFilter")?.value || "";
    const search = normalizeValue(document.getElementById("searchBox")?.value);
    const party = normalizeValue(document.getElementById("partyFilter")?.value);
    const assembly = normalizeValue(document.getElementById("assemblyFilter")?.value);

    filteredSurveys = allSurveys.filter(function (survey) {
        const surveyName = normalizeValue(survey.name);
        const surveyMobile = normalizeValue(survey.mobile);
        const surveyVillage = normalizeValue(survey.village);
        const surveyAssembly = normalizeValue(survey.assembly);
        const surveyorValue = normalizeValue(survey.surveyorEmail || survey.surveyorId || survey.createdBy || survey.createdByEmail);

        if (search) {
            const searchText = [
                survey.name, survey.mobile, survey.age, survey.gender, survey.village,
                survey.assembly, survey.party, survey.candidate, survey.feedback,
                survey.surveyorEmail, survey.surveyorId, survey.createdBy
            ].map(v => normalizeValue(v)).join(" ");
            if (!searchText.includes(search)) return false;
        }

        if (name && surveyName !== name) return false;
        if (mobile && surveyMobile !== mobile) return false;
        if (selectedVillage && surveyVillage !== selectedVillage) return false;
        if (selectedSurveyor && surveyorValue !== selectedSurveyor) return false;
        if (party && normalizeValue(survey.party) !== party) return false;
        if (assembly && surveyAssembly !== assembly) return false;

        const date = getDate(survey.createdAt || survey.timestamp || survey.submittedAt || survey.date);
        if (dateFilter === "today" && !isToday(date)) return false;
        if (dateFilter === "week" && !isThisWeek(date)) return false;
        if (dateFilter === "month" && !isThisMonth(date)) return false;

        return true;
    });

    renderSurveyRecords();
    setText("filteredSurvey", filteredSurveys.length);
    setText("filterResultCount", "Showing: " + filteredSurveys.length + " / " + allSurveys.length);
}

function resetSurveyFilters() {
    [
        "filterName", "filterMobile", "filterVillage", "filterSurveyor", "filterDate",
        "searchBox", "partyFilter", "dateFilter", "villageFilter", "assemblyFilter", "surveyorFilter"
    ].forEach(function (id) {
        const element = document.getElementById(id);
        if (element) element.value = "";
    });

    filteredSurveys = allSurveys.slice();
    renderSurveyRecords();
    setText("filteredSurvey", allSurveys.length);
    setText("filterResultCount", "Showing: " + allSurveys.length + " / " + allSurveys.length);
}

/* =========================================================
   RENDER SURVEY RECORDS (FIXED TABLE ALIGNMENT + GOOGLE MAPS)
   ========================================================= */
function renderSurveyRecords() {
    const table = document.getElementById("surveyTable");
    if (!table) return;

    table.innerHTML = "";
    if (filteredSurveys.length === 0) {
        table.innerHTML = `<tr><td colspan="9" style="padding:30px; text-align:center; color:#777;">No Survey Found</td></tr>`;
        return;
    }

    filteredSurveys.forEach(function (survey) {
        const row = document.createElement("tr");

        // 1. Photos Array (4 photos maximum)
        const photos = getSurveyPhotosArray(survey);

        // 2. Location (City/Village + Google Map URL)
        const lat = survey.latitude || (survey.location && survey.location.lat) || (survey.coords && survey.coords.latitude);
        const lng = survey.longitude || (survey.location && survey.location.lng) || (survey.coords && survey.coords.longitude);
        const locName = survey.locationName || survey.city || survey.village || "Location";

        let mapHtml = `<span style="color:#6b7280;">${escapeHTML(locName)}</span>`;
        if (lat && lng) {
            mapHtml = `
                <div style="display:flex; align-items:center; gap:6px;">
                    <span>${escapeHTML(locName)}</span>
                    <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" style="background:#16a34a; color:#fff; padding:3px 8px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:2px;">
                        📍 Map
                    </a>
                </div>
            `;
        }

        // 3. Surveyor Email & Date
        const surveyor = survey.surveyorEmail || survey.surveyorId || survey.createdBy || survey.createdByEmail || "-";
        const dateObj = getDate(survey.createdAt || survey.timestamp || survey.submittedAt);
        const formattedDate = dateObj ? dateObj.toLocaleString("en-IN") : "-";

        row.innerHTML = `
            <td>
                ${photos.length > 0
                    ? `<button type="button" class="btn-photo" style="background:#2563eb; color:#fff; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px; display:inline-flex; align-items:center; gap:4px;" onclick="openPhotosModal('${survey.id}')">📷 Photos (${photos.length})</button>`
                    : `<span style="color:#9ca3af; font-size:12px;">No Photo</span>`
                }
            </td>
            <td>${escapeHTML(survey.name || "-")}</td>
            <td>${escapeHTML(survey.mobile || "-")}</td>
            <td>${escapeHTML(survey.age || "-")}</td>
            <td>${escapeHTML(survey.gender || "-")}</td>
            <td>${escapeHTML(survey.village || "-")}</td>
            <td>${mapHtml}</td>
            <td>
                <div style="font-weight:600; font-size:13px; color:#1f2937;">${escapeHTML(surveyor)}</div>
                <small style="color:#6b7280;">${escapeHTML(formattedDate)}</small>
            </td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-ans" style="background:#7c3aed; color:#fff; border:none; padding:5px 9px; border-radius:4px; cursor:pointer; font-size:12px;" onclick="showSurveyAnswersById('${survey.id}')">📋 Answers</button>
                    <button type="button" class="btn-edit" style="background:#0284c7; color:#fff; border:none; padding:5px 9px; border-radius:4px; cursor:pointer; font-size:12px;" onclick="editSurvey('${survey.id}')">✏️ Edit</button>
                    <button type="button" class="btn-del" style="background:#dc2626; color:#fff; border:none; padding:5px 9px; border-radius:4px; cursor:pointer; font-size:12px;" onclick="deleteSurvey('${survey.id}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        table.appendChild(row);
    });

    setText("filterResultCount", "Showing: " + filteredSurveys.length + " / " + allSurveys.length);
}

/* =========================================================
   4-PHOTO POPUP MODAL FUNCTION
   ========================================================= */
window.openPhotosModal = function (surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const photos = getSurveyPhotosArray(survey);
    const modal = document.getElementById("photosModal");
    const grid = document.getElementById("photosModalGrid");

    if (!modal || !grid) {
        if (photos.length > 0) window.open(photos[0], "_blank");
        return;
    }

    grid.innerHTML = "";
    if (photos.length === 0) {
        grid.innerHTML = "<p style='text-align:center; grid-column:1/-1; padding:20px; color:#6b7280;'>No photos available.</p>";
    } else {
        photos.forEach((url, i) => {
            grid.innerHTML += `
                <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; text-align:center; background:#f9fafb;">
                    <div style="font-weight:bold; font-size:12px; margin-bottom:6px; color:#4b5563;">Photo ${i + 1}</div>
                    <img src="${url}" alt="Photo ${i + 1}" style="width:100%; height:160px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.open('${url}', '_blank')">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:6px; font-size:12px; color:#2563eb; text-decoration:underline;">Full View</a>
                </div>
            `;
        });
    }

    modal.style.display = "flex";
};

window.closePhotosModal = function () {
    const modal = document.getElementById("photosModal");
    if (modal) modal.style.display = "none";
};

/* =========================================================
   SHOW ANSWERS & EDIT/DELETE SURVEY
   ========================================================= */
window.showSurveyAnswersById = function (id) {
    const survey = allSurveys.find(s => s.id === id);
    if (survey) showSurveyAnswers(survey);
};

function showSurveyAnswers(survey) {
    const modal = document.getElementById("answerModal");
    const body = document.getElementById("answerModalBody");
    if (!modal || !body) return;

    body.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:15px; background:#f3f4f6; padding:10px; border-radius:6px;">
            <div><strong>Name:</strong> ${escapeHTML(survey.name || "-")}</div>
            <div><strong>Mobile:</strong> ${escapeHTML(survey.mobile || "-")}</div>
            <div><strong>Village:</strong> ${escapeHTML(survey.village || "-")}</div>
        </div>
        <h3 style="margin-top:10px; margin-bottom:10px; color:#1f2937;">📋 Survey Answers</h3>
    `;

    let answers = survey.answers || survey.responses || survey.questions;
    if (answers && !Array.isArray(answers) && typeof answers === "object") {
        answers = Object.keys(answers).map(key => ({ question: key, answer: answers[key] }));
    }

    if (Array.isArray(answers) && answers.length > 0) {
        answers.forEach((item, index) => {
            const q = item.question || item.questionText || `Question ${index + 1}`;
            const a = Array.isArray(item.answer) ? item.answer.join(", ") : (item.answer || "No answer");
            body.innerHTML += `
                <div style="border-bottom:1px solid #e5e7eb; padding:8px 0;">
                    <strong style="color:#1f2937;">${escapeHTML(q)}</strong>
                    <div style="color:#4b5563; margin-top:2px;">${escapeHTML(a)}</div>
                </div>
            `;
        });
    } else {
        body.innerHTML += `<p style="color:#9ca3af; padding:10px 0;">No separate answer details found.</p>`;
    }

    modal.classList.add("show");
    modal.style.display = "flex";
}

function setupAnswerModal() {
    const closeButton = document.getElementById("closeAnswerModal");
    if (closeButton) {
        closeButton.addEventListener("click", function () {
            const modal = document.getElementById("answerModal");
            if (modal) {
                modal.classList.remove("show");
                modal.style.display = "none";
            }
        });
    }
}

window.editSurvey = function (id) {
    const survey = allSurveys.find(item => item.id === id);
    if (!survey) return;

    const fields = [
        ["Name", "name"],
        ["Mobile", "mobile"],
        ["Age", "age"],
        ["Gender", "gender"],
        ["Village", "village"],
        ["Assembly", "assembly"],
        ["Party", "party"],
        ["Candidate", "candidate"],
        ["Feedback", "feedback"]
    ];

    const updates = {};
    for (let i = 0; i < fields.length; i++) {
        const label = fields[i][0];
        const key = fields[i][1];
        const val = prompt(`${label}:`, survey[key] || "");
        if (val === null) return;
        updates[key] = val.trim();
    }

    db.collection("surveys").doc(id).update(updates)
        .then(() => {
            alert("Survey updated successfully.");
            loadSurveys();
        })
        .catch(err => alert("Update failed: " + err.message));
};

window.deleteSurvey = function (id) {
    if (!confirm("Are you sure you want to delete this survey?")) return;
    db.collection("surveys").doc(id).delete()
        .then(() => {
            alert("Survey deleted successfully.");
            loadSurveys();
        })
        .catch(err => alert("Delete failed: " + err.message));
};

/* =========================================================
   SURVEYOR MANAGEMENT & TOGGLE
   ========================================================= */
function loadSurveyors() {
    return db.collection("surveyors").get().then(function (snapshot) {
        allSurveyors = [];
        snapshot.forEach(function (doc) {
            allSurveyors.push({ id: doc.id, ...doc.data() });
        });
        populateFilterDropdowns();
        renderSurveyorManagement();
        renderSurveyorPerformance();
        return allSurveyors;
    }).catch(function () {
        return [];
    });
}

function renderSurveyorManagement() {
    const table = document.getElementById("surveyorManagementTable");
    if (!table) return;
    table.innerHTML = "";

    const map = {};
    allSurveyors.forEach(function (surveyor) {
        const email = normalizeValue(surveyor.email || surveyor.surveyorEmail || surveyor.id);
        if (email) {
            map[email] = {
                email: email,
                enabled: surveyor.enabled !== false,
                documentId: surveyor.id
            };
        }
    });

    allSurveys.forEach(function (survey) {
        const email = normalizeValue(survey.surveyorEmail || survey.surveyorId || survey.createdBy || survey.createdByEmail);
        if (email && !map[email]) {
            map[email] = {
                email: email,
                enabled: true,
                documentId: null
            };
        }
    });

    const surveyors = Object.values(map).sort((a, b) => a.email.localeCompare(b.email));
    if (surveyors.length === 0) {
        table.innerHTML = `<tr><td colspan="6" style="padding:20px;">No surveyors found.</td></tr>`;
        return;
    }

    surveyors.forEach(function (surveyor) {
        let total = 0, today = 0, week = 0, month = 0;
        allSurveys.forEach(function (survey) {
            const surveyEmail = normalizeValue(survey.surveyorEmail || survey.surveyorId || survey.createdBy || survey.createdByEmail);
            if (surveyEmail !== surveyor.email) return;
            total++;
            const date = getDate(survey.createdAt || survey.timestamp || survey.submittedAt);
            if (isToday(date)) today++;
            if (isThisWeek(date)) week++;
            if (isThisMonth(date)) month++;
        });

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHTML(surveyor.email)}</td>
            <td>${total}</td>
            <td>${today}</td>
            <td>${week}</td>
            <td>${month}</td>
            <td>
                <span style="color:${surveyor.enabled ? 'green' : 'red'}; font-weight:bold; margin-right:8px;">
                    ${surveyor.enabled ? '🟢 Active' : '🔴 Disabled'}
                </span>
                <button type="button" class="${surveyor.enabled ? 'warning' : 'success'} action-btn-toggle">
                    ${surveyor.enabled ? 'Disable' : 'Enable'}
                </button>
            </td>
        `;

        const btn = row.querySelector(".action-btn-toggle");
        if (btn) {
            btn.addEventListener("click", function () {
                toggleSurveyor(surveyor, !surveyor.enabled);
            });
        }
        table.appendChild(row);
    });
}

function toggleSurveyor(surveyor, enabled) {
    if (surveyor.documentId) {
        db.collection("surveyors").doc(surveyor.documentId).update({ enabled: enabled })
            .then(() => {
                alert(enabled ? "Surveyor enabled." : "Surveyor disabled.");
                loadSurveyors();
            })
            .catch(error => updateSurveyorByEmail(surveyor.email, enabled));
        return;
    }
    updateSurveyorByEmail(surveyor.email, enabled);
}

function updateSurveyorByEmail(email, enabled) {
    db.collection("surveyors").where("email", "==", email).get().then(function (snapshot) {
        if (snapshot.empty) {
            alert("Surveyor document not found for: " + email);
            return;
        }
        const updates = [];
        snapshot.forEach(doc => updates.push(doc.ref.update({ enabled: enabled })));
        return Promise.all(updates);
    }).then(() => {
        alert(enabled ? "Surveyor enabled." : "Surveyor disabled.");
        loadSurveyors();
    }).catch(err => alert("Status update failed: " + err.message));
}

function renderSurveyorPerformance() {
    const table = document.getElementById("surveyorPerformanceTable");
    if (!table) return;
    table.innerHTML = "";
    const emails = new Set();

    allSurveyors.forEach(s => {
        const em = normalizeValue(s.email || s.surveyorEmail || s.id);
        if (em) emails.add(em);
    });
    allSurveys.forEach(s => {
        const em = normalizeValue(s.surveyorEmail || s.surveyorId || s.createdBy || s.createdByEmail);
        if (em) emails.add(em);
    });

    if (emails.size === 0) {
        table.innerHTML = `<tr><td colspan="5">No surveyors found.</td></tr>`;
        return;
    }

    Array.from(emails).sort().forEach(function (email) {
        let total = 0, today = 0, week = 0, month = 0;
        allSurveys.forEach(function (survey) {
            const surveyEmail = normalizeValue(survey.surveyorEmail || survey.surveyorId || survey.createdBy || survey.createdByEmail);
            if (surveyEmail !== email) return;
            total++;
            const date = getDate(survey.createdAt || survey.timestamp || survey.submittedAt);
            if (isToday(date)) today++;
            if (isThisWeek(date)) week++;
            if (isThisMonth(date)) month++;
        });

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(email)}</td>
                <td>${total}</td>
                <td>${today}</td>
                <td>${week}</td>
                <td>${month}</td>
            </tr>
        `;
    });
}

/* =========================================================
   PARTY CHART & DAILY LIMIT
   ========================================================= */
function renderPartyChart() {
    const canvas = document.getElementById("partyChart");
    if (!canvas || typeof Chart === "undefined") return;

    let bjp = 0, congress = 0, aap = 0, bsp = 0, sp = 0, other = 0;
    allSurveys.forEach(function (survey) {
        const party = normalizeValue(survey.party);
        if (party === "bjp") bjp++;
        else if (party === "congress") congress++;
        else if (party === "aap") aap++;
        else if (party === "bsp") bsp++;
        else if (party === "sp") sp++;
        else other++;
    });

    if (partyChart) partyChart.destroy();
    partyChart = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: ["BJP", "Congress", "AAP", "BSP", "SP", "Other"],
            datasets: [{
                label: "Surveys",
                data: [bjp, congress, aap, bsp, sp, other]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function loadDailyLimit() {
    const input = document.getElementById("dailyLimitInput");
    if (!input) return;
    db.collection("settings").doc("config").get().then(function (doc) {
        if (doc.exists && doc.data().dailyLimit !== undefined) {
            input.value = Number(doc.data().dailyLimit);
        } else {
            input.value = 20;
        }
    }).catch(() => { input.value = 20; });
}

function saveDailyLimit() {
    const input = document.getElementById("dailyLimitInput");
    const button = document.getElementById("saveDailyLimit");
    const message = document.getElementById("limitMessage");
    if (!input) return;

    const limit = Number(input.value);
    if (!Number.isFinite(limit) || limit < 1) {
        if (message) { message.textContent = "Enter a valid limit."; message.style.color = "red"; }
        return;
    }

    if (button) { button.disabled = true; button.textContent = "Saving..."; }
    db.collection("settings").doc("config").set({
        dailyLimit: limit,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(function () {
        if (message) { message.textContent = "✅ Limit saved: " + limit; message.style.color = "green"; }
    })
    .catch(function (error) {
        if (message) { message.textContent = "❌ " + error.message; message.style.color = "red"; }
    })
    .finally(function () {
        if (button) { button.disabled = false; button.textContent = "💾 Save Limit"; }
    });
}

function deleteAllSurveys() {
    if (allSurveys.length === 0) {
        alert("There are no surveys to delete.");
        return;
    }
    const confirmation = prompt("WARNING: This will permanently delete ALL survey records.\n\nType DELETE to confirm:");
    if (confirmation !== "DELETE") return;

    db.collection("surveys").get().then(function (snapshot) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => {
        alert("All surveys deleted successfully.");
        loadSurveys();
    }).catch(err => alert("Delete all failed: " + err.message));
}

/* =========================================================
   EVENTS SETUP
   ========================================================= */
function setupAdminEvents() {
    setupQuestionEvents();
    setupAnswerModal();

    const saveLimitBtn = document.getElementById("saveDailyLimit");
    if (saveLimitBtn) saveLimitBtn.addEventListener("click", saveDailyLimit);

    const deleteBtn = document.getElementById("deleteAllSurveysBtn");
    if (deleteBtn) deleteBtn.addEventListener("click", deleteAllSurveys);

    const filterIds = [
        "filterName", "filterMobile", "filterVillage", "filterSurveyor", "filterDate",
        "searchBox", "partyFilter", "dateFilter", "villageFilter", "assemblyFilter", "surveyorFilter"
    ];
    filterIds.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", applySurveyFilters);
            el.addEventListener("change", applySurveyFilters);
        }
    });

    const applyBtn = document.getElementById("applySurveyFilter");
    if (applyBtn) applyBtn.addEventListener("click", applySurveyFilters);

    const resetBtn = document.getElementById("clearSurveyFilter") || document.getElementById("resetFilters");
    if (resetBtn) resetBtn.addEventListener("click", resetSurveyFilters);

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            firebase.auth().signOut().then(() => window.location.replace("index.html"));
        });
    }

    const photosModal = document.getElementById("photosModal");
    if (photosModal) {
        photosModal.addEventListener("click", function (event) {
            if (event.target === photosModal) closePhotosModal();
        });
    }
}

/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */
window.loadSurveys = loadSurveys;
window.loadQuestions = loadQuestions;
window.loadSurveyors = loadSurveyors;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.showSurveyAnswers = showSurveyAnswers;
window.applySurveyFilters = applySurveyFilters;
window.resetSurveyFilters = resetSurveyFilters;
window.deleteAllSurveys = deleteAllSurveys;
