/* =========================================================
   SURVEYKSHAN - ADMIN JS (ACCURATE QUESTIONS & ANSWERS MAPPING)
   ========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let surveys = [];
let questions = [];
let questionsMap = {};
let registeredSurveyors = [];
let editingQuestionId = null;
let editingSurveyId = null;

// DOM Elements
const totalSurveyEl = document.getElementById("totalSurvey");
const todaySurveyEl = document.getElementById("todaySurvey");
const weekSurveyEl = document.getElementById("weekSurvey");
const monthSurveyEl = document.getElementById("monthSurvey");
const questionCountEl = document.getElementById("questionCount");

const questionManagerToggle = document.getElementById("questionManagerToggle");
const questionManagerBody = document.getElementById("questionManagerBody");
const questionText = document.getElementById("questionText");
const questionType = document.getElementById("questionType");
const optionsContainer = document.getElementById("optionsContainer");
const addOptionBtn = document.getElementById("addOption");
const saveQuestionBtn = document.getElementById("saveQuestion");
const cancelEditBtn = document.getElementById("cancelEdit");
const questionMessage = document.getElementById("questionMessage");
const questionsList = document.getElementById("questionsList");

const dailyLimitInput = document.getElementById("dailyLimitInput");
const saveDailyLimitBtn = document.getElementById("saveDailyLimit");
const limitMessage = document.getElementById("limitMessage");

const surveyorManagementTable = document.getElementById("surveyorManagementTable");
const surveyTable = document.getElementById("surveyTable");
const filterResultCount = document.getElementById("filterResultCount");

const filterName = document.getElementById("filterName");
const filterMobile = document.getElementById("filterMobile");
const filterVillage = document.getElementById("filterVillage");
const filterSurveyor = document.getElementById("filterSurveyor");
const filterDate = document.getElementById("filterDate");
const applySurveyFilterBtn = document.getElementById("applySurveyFilter");
const clearSurveyFilterBtn = document.getElementById("clearSurveyFilter");

const answerModal = document.getElementById("answerModal");
const answerModalBody = document.getElementById("answerModalBody");
const closeAnswerModalBtn = document.getElementById("closeAnswerModal");

const photosModal = document.getElementById("photosModal");
const photosModalGrid = document.getElementById("photosModalGrid");

const editSurveyModal = document.getElementById("editSurveyModal");
const editSurveyForm = document.getElementById("editSurveyForm");
const editName = document.getElementById("editName");
const editMobile = document.getElementById("editMobile");
const editAge = document.getElementById("editAge");
const editVillage = document.getElementById("editVillage");

const logoutBtn = document.getElementById("logoutBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const clientReportBtn = document.getElementById("clientReportBtn");
const deleteAllSurveysBtn = document.getElementById("deleteAllSurveysBtn");

/* =========================================================
   1. AUTHENTICATION
   ========================================================= */
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if ((user.email || "").toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) {
        alert("Anadhikrit pravesh! Sirf authorized admin hi login kar sakte hain.");
        firebase.auth().signOut().then(() => window.location.href = "index.html");
        return;
    }

    initAdmin();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        firebase.auth().signOut().then(() => window.location.href = "index.html");
    });
}

function initAdmin() {
    loadQuestions();
    loadDailyLimit();
    loadSurveyorsAndSurveys();
}

/* =========================================================
   2. DATE UTILS
   ========================================================= */
function parseDate(data) {
    if (!data) return new Date(0);
    try {
        if (data.timestamp?.toDate) return data.timestamp.toDate();
        if (data.timestamp?.seconds) return new Date(data.timestamp.seconds * 1000);
        if (data.createdAt) {
            const d = new Date(data.createdAt);
            if (!isNaN(d.getTime())) return d;
        }
        if (data.timestamp) {
            const d = new Date(data.timestamp);
            if (!isNaN(d.getTime())) return d;
        }
    } catch (e) {}
    return new Date(0);
}

function formatDate(date) {
    if (!date || isNaN(date.getTime()) || date.getTime() === 0) return "N/A";
    return date.toLocaleString("en-IN", {
        day: "numeric", month: "numeric", year: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric", hour12: true
    });
}

/* =========================================================
   3. SURVEY QUESTION MANAGER (FIXED: NO ORDER MISSING BLOCK)
   ========================================================= */
if (questionManagerToggle) {
    questionManagerToggle.addEventListener("click", () => {
        if (questionManagerBody.style.display === "none") {
            questionManagerBody.style.display = "block";
            questionManagerToggle.textContent = "🙈 Hide";
        } else {
            questionManagerBody.style.display = "none";
            questionManagerToggle.textContent = "👁️ Show";
        }
    });
}

if (addOptionBtn) {
    addOptionBtn.addEventListener("click", () => addOptionField());
}

function addOptionField(val = "") {
    const div = document.createElement("div");
    div.className = "option-row";
    div.innerHTML = `
        <input type="text" class="option-input" placeholder="Option value" value="${val}">
        <button type="button" class="danger" onclick="this.parentElement.remove()">✖</button>
    `;
    optionsContainer.appendChild(div);
}

if (saveQuestionBtn) {
    saveQuestionBtn.addEventListener("click", async () => {
        const text = questionText.value.trim();
        const type = questionType.value;
        const optInputs = optionsContainer.querySelectorAll(".option-input");
        const options = Array.from(optInputs).map(i => i.value.trim()).filter(Boolean);

        if (!text) {
            alert("Kripya prashna darj karein!");
            return;
        }

        saveQuestionBtn.disabled = true;
        try {
            if (editingQuestionId) {
                await firebase.firestore().collection("questions").doc(editingQuestionId).update({
                    text, type, options
                });
                questionMessage.textContent = "✅ Prashna update ho gaya!";
            } else {
                const snap = await firebase.firestore().collection("questions").get();
                await firebase.firestore().collection("questions").add({
                    text, type, options, order: snap.size + 1
                });
                questionMessage.textContent = "✅ Naya prashna jud gaya!";
            }

            resetQuestionForm();
        } catch (e) {
            questionMessage.textContent = "Error: " + e.message;
        } finally {
            saveQuestionBtn.disabled = false;
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => resetQuestionForm());
}

function resetQuestionForm() {
    editingQuestionId = null;
    questionText.value = "";
    questionType.value = "single";
    optionsContainer.innerHTML = "";
    cancelEditBtn.style.display = "none";
    saveQuestionBtn.textContent = "💾 Save Question";
}

function loadQuestions() {
    // Bina orderBy ke fetch karein taaki purane documents bina order field ke bhi load hon
    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        questions = [];
        questionsMap = {};
        if (questionsList) questionsList.innerHTML = "";

        snapshot.forEach((doc) => {
            const data = doc.data();
            const q = {
                id: doc.id,
                text: data.text || data.question || data.title || "Untitled Question",
                type: data.type || "single",
                options: data.options || [],
                order: (data.order !== undefined && data.order !== null) ? Number(data.order) : 999
            };
            questions.push(q);
            questionsMap[doc.id] = q.text;
        });

        // Client-side sort
        questions.sort((a, b) => a.order - b.order);

        if (questionsList) {
            questions.forEach((q, index) => {
                const div = document.createElement("div");
                div.className = "question-card";
                div.innerHTML = `
                    <h3>${index + 1}. ${q.text} (${q.type})</h3>
                    <p><strong>Options:</strong> ${q.options && q.options.length > 0 ? q.options.join(", ") : "None"}</p>
                    <button class="primary" onclick="editQuestion('${q.id}')">✏️ Edit</button>
                    <button class="danger" onclick="deleteQuestion('${q.id}')">🗑️ Delete</button>
                `;
                questionsList.appendChild(div);
            });
        }

        if (questionCountEl) questionCountEl.textContent = questions.length;
    });
}

window.editQuestion = function(id) {
    const q = questions.find(item => item.id === id);
    if (!q) return;

    editingQuestionId = id;
    questionText.value = q.text;
    questionType.value = q.type || "single";
    optionsContainer.innerHTML = "";

    if (q.options && Array.isArray(q.options)) {
        q.options.forEach(opt => addOptionField(opt));
    }

    cancelEditBtn.style.display = "inline-block";
    saveQuestionBtn.textContent = "💾 Update Question";
    window.scrollTo({ top: questionManagerBody.offsetTop - 50, behavior: "smooth" });
};

window.deleteQuestion = async function(id) {
    if (!confirm("Kya aap sach me is prashna ko delete karna chahte hain?")) return;
    try {
        await firebase.firestore().collection("questions").doc(id).delete();
    } catch (e) {
        alert("Error: " + e.message);
    }
};

/* =========================================================
   4. DAILY LIMIT SETTINGS
   ========================================================= */
async function loadDailyLimit() {
    try {
        const doc = await firebase.firestore().collection("settings").doc("config").get();
        if (doc.exists && doc.data().dailyLimit) {
            dailyLimitInput.value = doc.data().dailyLimit;
        }
    } catch (e) {}
}

if (saveDailyLimitBtn) {
    saveDailyLimitBtn.addEventListener("click", async () => {
        const val = Number(dailyLimitInput.value);
        if (!val || val < 1) return;
        saveDailyLimitBtn.disabled = true;
        try {
            await firebase.firestore().collection("settings").doc("config").set({ dailyLimit: val }, { merge: true });
            limitMessage.textContent = "✅ Limit save ho gayi!";
            setTimeout(() => limitMessage.textContent = "", 3000);
        } catch (e) {
            limitMessage.textContent = "Error: " + e.message;
        } finally {
            saveDailyLimitBtn.disabled = false;
        }
    });
}

/* =========================================================
   5. LOAD SURVEYORS & SURVEYS
   ========================================================= */
function loadSurveyorsAndSurveys() {
    firebase.firestore().collection("surveyors").onSnapshot((surveyorsSnap) => {
        registeredSurveyors = [];
        surveyorsSnap.forEach((doc) => {
            const data = doc.data();
            const email = data.email || doc.id;
            registeredSurveyors.push({
                email: email.trim(),
                active: data.active !== undefined ? data.active : true,
                enabled: data.enabled !== undefined ? data.enabled : true,
                status: data.status || "active"
            });
        });

        const defaultEmails = ["surveyor1@gopal.com", "surveyor2@gopal.com", "surveyor@gmail.com"];
        defaultEmails.forEach(defEmail => {
            if (!registeredSurveyors.some(s => s.email.toLowerCase() === defEmail.toLowerCase())) {
                registeredSurveyors.push({
                    email: defEmail,
                    active: true,
                    enabled: true,
                    status: "active"
                });
            }
        });

        renderSurveyorStats();
        populateFilterDropdowns();
    });

    firebase.firestore().collection("surveys").onSnapshot((snapshot) => {
        surveys = [];
        snapshot.forEach((doc) => {
            surveys.push({ id: doc.id, ...doc.data() });
        });

        surveys.sort((a, b) => parseDate(b) - parseDate(a));

        updateStats();
        populateFilterDropdowns();
        renderSurveyTable(surveys);
        renderSurveyorStats();
    });
}

function updateStats() {
    if (totalSurveyEl) totalSurveyEl.textContent = surveys.length;

    const now = new Date();
    const todayStr = now.toDateString();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayC = 0, weekC = 0, monthC = 0;

    surveys.forEach(s => {
        const d = parseDate(s);
        if (d.toDateString() === todayStr) todayC++;
        if (d >= startOfWeek) weekC++;
        if (d >= startOfMonth) monthC++;
    });

    if (todaySurveyEl) todaySurveyEl.textContent = todayC;
    if (weekSurveyEl) weekSurveyEl.textContent = weekC;
    if (monthSurveyEl) monthSurveyEl.textContent = monthC;
}

function renderSurveyTable(data) {
    if (!surveyTable) return;
    surveyTable.innerHTML = "";

    if (filterResultCount) {
        filterResultCount.textContent = `Showing: ${data.length} / ${surveys.length}`;
    }

    if (data.length === 0) {
        surveyTable.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#777;">Koi record nahi mila</td></tr>`;
        return;
    }

    data.forEach(s => {
        const tr = document.createElement("tr");

        const photos = getPhotosArray(s);
        const photoBtn = photos.length > 0
            ? `<button class="primary" style="padding:5px 10px; font-size:12px;" onclick="openPhotosModal('${s.id}')">📷 Photos (${photos.length})</button>`
            : `<span style="color:#aaa; font-size:12px;">No Photo</span>`;

        let locStr = s.village || "N/A";
        if (s.latitude && s.longitude) {
            locStr += ` <a href="https://www.google.com/maps?q=${s.latitude},${s.longitude}" target="_blank" style="color:white; background:#10b981; padding:3px 7px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold;">📍 Map</a>`;
        }

        const dateStr = formatDate(parseDate(s));
        const surveyor = s.surveyorEmail || s.createdBy || "Unknown";

        tr.innerHTML = `
            <td>${photoBtn}</td>
            <td style="font-weight:bold; color:#1565c0;">${s.name || "N/A"}</td>
            <td>${s.mobile || "N/A"}</td>
            <td>${s.age || "N/A"}</td>
            <td>${s.gender || "N/A"}</td>
            <td>${s.village || "N/A"}</td>
            <td>${locStr}</td>
            <td>
                <div style="font-weight:bold;">${surveyor}</div>
                <div style="font-size:11px; color:#666;">${dateStr}</div>
            </td>
            <td>
                <button class="purple" style="padding:5px 8px; font-size:12px;" onclick="openAnswersModal('${s.id}')">📋 Answers</button>
                <button class="primary" style="padding:5px 8px; font-size:12px;" onclick="openEditModal('${s.id}')">✏️ Edit</button>
                <button class="danger" style="padding:5px 8px; font-size:12px;" onclick="deleteSurvey('${s.id}')">🗑️ Delete</button>
            </td>
        `;
        surveyTable.appendChild(tr);
    });
}

function getPhotosArray(s) {
    if (Array.isArray(s.photos) && s.photos.length > 0) return s.photos;
    if (s.categorizedPhotos) {
        return [
            s.categorizedPhotos.villagePhoto,
            s.categorizedPhotos.issuePhoto,
            s.categorizedPhotos.respondentPhoto,
            s.categorizedPhotos.selfiePhoto
        ].filter(Boolean);
    }
    if (s.photoURL) return [s.photoURL];
    if (s.photo) return [s.photo];
    return [];
}

/* =========================================================
   6. SURVEYOR STATS TABLE
   ========================================================= */
function renderSurveyorStats() {
    if (!surveyorManagementTable) return;
    surveyorManagementTable.innerHTML = "";

    const map = {};
    const now = new Date();
    const todayStr = now.toDateString();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    registeredSurveyors.forEach(srv => {
        map[srv.email] = {
            total: 0, today: 0, week: 0, month: 0,
            status: srv.status || "active", enabled: srv.enabled
        };
    });

    surveys.forEach(s => {
        const email = (s.surveyorEmail || s.createdBy || "Unknown").trim();
        if (!map[email]) {
            map[email] = { total: 0, today: 0, week: 0, month: 0, status: "active", enabled: true };
        }

        map[email].total++;
        const d = parseDate(s);
        if (d.toDateString() === todayStr) map[email].today++;
        if (d >= startOfWeek) map[email].week++;
        if (d >= startOfMonth) map[email].month++;
    });

    Object.keys(map).forEach(email => {
        const st = map[email];
        const isPending = st.status === "pending";
        const statusBadge = isPending 
            ? `<span style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:5px; font-weight:bold; font-size:12px;">Pending</span>`
            : `<span style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:5px; font-weight:bold; font-size:12px;">Active</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight:bold; text-align:left;">${email}</td>
            <td><strong>${st.total}</strong></td>
            <td>${st.today}</td>
            <td>${st.week}</td>
            <td>${st.month}</td>
            <td>${statusBadge}</td>
        `;
        surveyorManagementTable.appendChild(tr);
    });
}

/* =========================================================
   7. FILTERS LOGIC
   ========================================================= */
function populateFilterDropdowns() {
    const names = new Set(), mobiles = new Set(), villages = new Set(), surveyorsList = new Set();

    registeredSurveyors.forEach(srv => surveyorsList.add(srv.email));

    surveys.forEach(s => {
        if (s.name) names.add(s.name.trim());
        if (s.mobile) mobiles.add(s.mobile.trim());
        if (s.village) villages.add(s.village.trim());
        const sur = s.surveyorEmail || s.createdBy;
        if (sur) surveyorsList.add(sur.trim());
    });

    fillSelect(filterName, names, "👤 All Names");
    fillSelect(filterMobile, mobiles, "📱 All Mobiles");
    fillSelect(filterVillage, villages, "🏠 All Villages");
    fillSelect(filterSurveyor, surveyorsList, "🧑‍💼 All Surveyors");
}

function fillSelect(el, set, placeholder) {
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">${placeholder}</option>`;
    Array.from(set).sort().forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        if (item === current) opt.selected = true;
        el.appendChild(opt);
    });
}

if (applySurveyFilterBtn) {
    applySurveyFilterBtn.addEventListener("click", () => {
        const nameVal = filterName.value;
        const mobileVal = filterMobile.value;
        const villageVal = filterVillage.value;
        const surveyorVal = filterSurveyor.value;
        const dateVal = filterDate.value;

        const now = new Date();
        const todayStr = now.toDateString();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const filtered = surveys.filter(s => {
            if (nameVal && (s.name || "").trim() !== nameVal) return false;
            if (mobileVal && (s.mobile || "").trim() !== mobileVal) return false;
            if (villageVal && (s.village || "").trim() !== villageVal) return false;
            if (surveyorVal && (s.surveyorEmail || s.createdBy || "").trim() !== surveyorVal) return false;

            if (dateVal) {
                const d = parseDate(s);
                if (dateVal === "today" && d.toDateString() !== todayStr) return false;
                if (dateVal === "week" && d < startOfWeek) return false;
                if (dateVal === "month" && d < startOfMonth) return false;
            }

            return true;
        });

        renderSurveyTable(filtered);
    });
}

if (clearSurveyFilterBtn) {
    clearSurveyFilterBtn.addEventListener("click", () => {
        filterName.value = "";
        filterMobile.value = "";
        filterVillage.value = "";
        filterSurveyor.value = "";
        filterDate.value = "";
        renderSurveyTable(surveys);
    });
}

/* =========================================================
   8. EXCEL EXPORT
   ========================================================= */
if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
        if (!surveys || surveys.length === 0) {
            alert("⚠️ Export karne ke liye koi survey record maujood nahi hai!");
            return;
        }

        exportExcelBtn.disabled = true;
        exportExcelBtn.textContent = "⏳ Exporting...";

        try {
            const rows = [];
            let index = 1;

            surveys.forEach(s => {
                let mapLink = "N/A";
                if (s.latitude && s.longitude) {
                    mapLink = `https://www.google.com/maps?q=${s.latitude},${s.longitude}`;
                }

                const photos = getPhotosArray(s);

                const row = {
                    "S.No": index++,
                    "Surveyor Email": s.surveyorEmail || s.createdBy || "N/A",
                    "Date & Time": formatDate(parseDate(s)),
                    "Respondent Name": s.name || "N/A",
                    "Mobile Number": s.mobile || "N/A",
                    "Age": s.age || "N/A",
                    "Gender": s.gender || "N/A",
                    "Village": s.village || "N/A",
                    "District": s.district || "N/A",
                    "PIN Code": s.pincode || "N/A",
                    "Latitude": s.latitude || "",
                    "Longitude": s.longitude || "",
                    "Google Maps Link": mapLink,
                    "Photos Count": photos.length
                };

                if (questions.length > 0) {
                    questions.forEach(q => {
                        let ans = s.answers ? (s.answers[q.id] || s.answers[q.text]) : "";
                        if (Array.isArray(ans)) ans = ans.join(", ");
                        row[q.text] = ans || "-";
                    });
                } else if (s.answers) {
                    Object.keys(s.answers).forEach(k => {
                        let ans = s.answers[k];
                        if (Array.isArray(ans)) ans = ans.join(", ");
                        row[questionsMap[k] || `Question_${k}`] = ans || "-";
                    });
                }

                rows.push(row);
            });

            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Surveys_Data");

            const dateStr = new Date().toISOString().split("T")[0];
            XLSX.writeFile(workbook, `Surveykshan_Data_${dateStr}.xlsx`);

        } catch (err) {
            alert("Export Error: " + err.message);
        } finally {
            exportExcelBtn.disabled = false;
            exportExcelBtn.textContent = "📥 Export to Excel";
        }
    });
}

/* =========================================================
   9. ONE-CLICK CLIENT PDF REPORT
   ========================================================= */
if (clientReportBtn) {
    clientReportBtn.addEventListener("click", generateClientReport);
}

function generateClientReport() {
    if (!surveys || surveys.length === 0) {
        alert("⚠️ Report taiyar karne ke liye koi survey data uplabdh nahi hai!");
        return;
    }

    const totalCount = surveys.length;
    const uniqueVillages = Array.from(new Set(surveys.map(s => (s.village || "").trim()).filter(Boolean)));
    const uniqueSurveyors = Array.from(new Set(surveys.map(s => s.surveyorEmail || s.createdBy).filter(Boolean)));

    let genderStats = { Male: 0, Female: 0, Other: 0 };
    let ageGroups = { "18-25": 0, "26-35": 0, "36-50": 0, "50+": 0 };

    surveys.forEach(s => {
        const g = s.gender || "Other";
        if (genderStats[g] !== undefined) genderStats[g]++;
        else genderStats.Other++;

        const a = Number(s.age) || 0;
        if (a >= 18 && a <= 25) ageGroups["18-25"]++;
        else if (a >= 26 && a <= 35) ageGroups["26-35"]++;
        else if (a >= 36 && a <= 50) ageGroups["36-50"]++;
        else if (a > 50) ageGroups["50+"]++;
    });

    const questionAnalytics = [];
    questions.forEach((q) => {
        const counts = {};
        let answeredTotal = 0;

        surveys.forEach(s => {
            if (s.answers) {
                const ans = s.answers[q.id] !== undefined ? s.answers[q.id] : s.answers[q.text];
                if (Array.isArray(ans)) {
                    ans.forEach(val => {
                        counts[val] = (counts[val] || 0) + 1;
                        answeredTotal++;
                    });
                } else if (ans) {
                    counts[ans] = (counts[ans] || 0) + 1;
                    answeredTotal++;
                }
            }
        });

        questionAnalytics.push({
            id: q.id,
            text: q.text,
            counts: counts,
            total: answeredTotal
        });
    });

    let leadsRowsHtml = "";
    surveys.forEach((s, idx) => {
        const mapLink = (s.latitude && s.longitude)
            ? `<a href="https://www.google.com/maps?q=${s.latitude},${s.longitude}" target="_blank" style="color:#0284c7; font-weight:bold;">📍 Map Link</a>`
            : "N/A";

        let answersSnippet = [];
        questions.forEach(q => {
            const a = s.answers ? (s.answers[q.id] !== undefined ? s.answers[q.id] : s.answers[q.text]) : "";
            if (a) answersSnippet.push(`<strong>${q.text}:</strong> ${Array.isArray(a) ? a.join(", ") : a}`);
        });

        leadsRowsHtml += `
            <tr>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px;">${idx + 1}</td>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:bold; color:#1e3a8a;">${s.name || "N/A"}</td>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px;">${s.mobile || "N/A"}</td>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px;">${s.age || "-"} / ${s.gender || "-"}</td>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px;">${s.village || "N/A"}</td>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px;">${mapLink}</td>
                <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:11px; text-align:left;">
                    ${answersSnippet.join("<br>") || "<span style='color:#94a3b8;'>No responses</span>"}
                </td>
            </tr>
        `;
    });

    const reportWindow = window.open("", "_blank");
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Surveykshan_Executive_Report_${new Date().toISOString().split("T")[0]}</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                * { box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #1e293b; margin: 0; padding: 30px; }
                .report-header { border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
                .report-title { font-size: 26px; font-weight: 800; color: #1e3a8a; }
                .report-subtitle { font-size: 13.5px; color: #64748b; margin-top: 4px; }
                .print-bar { background: #0f172a; color: white; padding: 14px 20px; border-radius: 10px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
                .btn-print { background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                .stat-box { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 18px; text-align: center; }
                .stat-box strong { display: block; font-size: 26px; color: #1e40af; margin-top: 4px; }
                .stat-box span { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
                .section-heading { font-size: 18px; font-weight: 800; color: #0f172a; margin: 30px 0 16px 0; border-left: 4px solid #1e40af; padding-left: 10px; }
                .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                .chart-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
                .chart-card h4 { margin: 0 0 15px 0; font-size: 15px; color: #1e293b; text-align: center; }
                .leads-table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left; }
                .leads-table th { background: #1e40af; color: white; padding: 10px; font-size: 12px; }
                @media print {
                    .print-bar { display: none; }
                    body { padding: 0; }
                    .chart-card { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="print-bar">
                <span>📄 <strong>Surveykshan Comprehensive Analytical Report</strong></span>
                <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            </div>

            <div class="report-header">
                <div>
                    <div class="report-title">📊 Surveykshan Executive Summary</div>
                    <div class="report-subtitle">Field Research, Public Opinion Analytics & Verified Leads Report</div>
                </div>
                <div style="text-align:right; font-size:12px; color:#64748b;">
                    <div><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN")}</div>
                    <div><strong>Platform:</strong> Surveykshan Audit Portal</div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <span>Total Valid Surveys</span>
                    <strong>${totalCount}</strong>
                </div>
                <div class="stat-box">
                    <span>Villages / Wards</span>
                    <strong>${uniqueVillages.length}</strong>
                </div>
                <div class="stat-box">
                    <span>Field Surveyors</span>
                    <strong>${uniqueSurveyors.length}</strong>
                </div>
                <div class="stat-box">
                    <span>Total Questions</span>
                    <strong>${questions.length}</strong>
                </div>
            </div>

            <div class="section-heading">1. Demographics Overview</div>
            <div class="charts-grid">
                <div class="chart-card">
                    <h4>Gender Ratio Distribution</h4>
                    <canvas id="genderChart" style="max-height:220px;"></canvas>
                </div>
                <div class="chart-card">
                    <h4>Age Group Breakdown</h4>
                    <canvas id="ageChart" style="max-height:220px;"></canvas>
                </div>
            </div>

            <div class="section-heading">2. Question-Wise Public Opinion Analytics</div>
            <div class="charts-grid" id="questionChartsWrapper"></div>

            <div class="section-heading">3. Complete Verified Leads Directory (${surveys.length} Records)</div>
            <table class="leads-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Age/Gender</th>
                        <th>Village</th>
                        <th>Location</th>
                        <th style="text-align:left;">Survey Responses</th>
                    </tr>
                </thead>
                <tbody>
                    ${leadsRowsHtml}
                </tbody>
            </table>

            <div style="margin-top:40px; border-top:1px solid #cbd5e1; padding-top:15px; text-align:center; font-size:12px; color:#94a3b8;">
                Confidential Document • Prepared automatically via Surveykshan Platform
            </div>

            <script>
                new Chart(document.getElementById('genderChart'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Male', 'Female', 'Other'],
                        datasets: [{
                            data: [${genderStats.Male}, ${genderStats.Female}, ${genderStats.Other}],
                            backgroundColor: ['#2563eb', '#ec4899', '#94a3b8']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });

                new Chart(document.getElementById('ageChart'), {
                    type: 'bar',
                    data: {
                        labels: ['18-25', '26-35', '36-50', '50+'],
                        datasets: [{
                            label: 'Respondents',
                            data: [${ageGroups["18-25"]}, ${ageGroups["26-35"]}, ${ageGroups["36-50"]}, ${ageGroups["50+"]}],
                            backgroundColor: '#3b82f6'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                });

                const qData = ${JSON.stringify(questionAnalytics)};
                const wrapper = document.getElementById('questionChartsWrapper');

                qData.forEach((item, idx) => {
                    const card = document.createElement('div');
                    card.className = 'chart-card';
                    card.innerHTML = '<h4>Q' + (idx + 1) + '. ' + item.text + '</h4><canvas id="qChart_' + idx + '" style="max-height:220px;"></canvas>';
                    wrapper.appendChild(card);

                    const labels = Object.keys(item.counts);
                    const values = Object.values(item.counts);

                    new Chart(document.getElementById('qChart_' + idx), {
                        type: 'bar',
                        data: {
                            labels: labels.length > 0 ? labels : ['No Response'],
                            datasets: [{
                                label: 'Votes',
                                data: values.length > 0 ? values : [0],
                                backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6']
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                });
            <\/script>
        </body>
        </html>
    `);
    reportWindow.document.close();
}

/* =========================================================
   10. MODALS: ANSWERS (CLEAN TITLE & VALUE MAPPING)
   ========================================================= */
window.openAnswersModal = function(id) {
    const s = surveys.find(i => i.id === id);
    if (!s) return;

    answerModalBody.innerHTML = "";
    const ans = s.answers || {};

    let answeredItems = [];

    // Pehle questions array se match karein ID aur Text dono ke basis par
    questions.forEach((q, idx) => {
        let val = ans[q.id] !== undefined ? ans[q.id] : ans[q.text];
        if (val !== undefined) {
            if (Array.isArray(val)) val = val.join(", ");
            answeredItems.push({
                num: idx + 1,
                title: q.text,
                answer: val
            });
        }
    });

    // Agar koi answer aisi key me ho jo Firestore questions me alag ho
    Object.keys(ans).forEach(key => {
        const alreadyIncluded = answeredItems.some(item => item.title === key || item.title === questionsMap[key]);
        if (!alreadyIncluded) {
            let val = ans[key];
            if (Array.isArray(val)) val = val.join(", ");
            answeredItems.push({
                num: answeredItems.length + 1,
                title: questionsMap[key] || key,
                answer: val
            });
        }
    });

    if (answeredItems.length === 0) {
        answerModalBody.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">Is survey me koi answer darj nahi mila.</div>`;
    } else {
        answeredItems.forEach(item => {
            answerModalBody.innerHTML += `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:12px;">
                    <div style="font-weight:bold; color:#1e40af; font-size:14.5px; margin-bottom:6px;">Q${item.num}. ${item.title}</div>
                    <div style="font-size:15px; color:#0f172a; font-weight:600; background:#ffffff; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px;">
                        ${item.answer || "<span style='color:#94a3b8;'>Khali</span>"}
                    </div>
                </div>
            `;
        });
    }

    answerModal.classList.add("show");
};

if (closeAnswerModalBtn) {
    closeAnswerModalBtn.addEventListener("click", () => answerModal.classList.remove("show"));
}

window.openPhotosModal = function(id) {
    const s = surveys.find(i => i.id === id);
    if (!s) return;

    photosModalGrid.innerHTML = "";
    const photos = getPhotosArray(s);
    const labels = ["1. Gaon/Shahar ki Photo", "2. Samasya ki Photo", "3. Respondent ki Photo", "4. Respondent ke sath Selfie"];

    photos.forEach((url, i) => {
        photosModalGrid.innerHTML += `
            <div style="text-align:center; background:#f8fafc; border:1px solid #ddd; border-radius:10px; padding:10px;">
                <a href="${url}" target="_blank"><img src="${url}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;"></a>
                <div style="font-weight:bold; margin-top:8px; font-size:13px; color:#333;">${labels[i] || `Photo ${i+1}`}</div>
            </div>
        `;
    });

    photosModal.style.display = "flex";
};

window.closePhotosModal = function() {
    photosModal.style.display = "none";
};

window.openEditModal = function(id) {
    const s = surveys.find(i => i.id === id);
    if (!s) return;

    editingSurveyId = id;
    editName.value = s.name || "";
    editMobile.value = s.mobile || "";
    editAge.value = s.age || "";
    editVillage.value = s.village || "";

    if (editSurveyModal) {
        editSurveyModal.classList.add("show");
    }
};

window.closeEditModal = function() {
    if (editSurveyModal) {
        editSurveyModal.classList.remove("show");
    }
    editingSurveyId = null;
};

if (editSurveyForm) {
    editSurveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editingSurveyId) return;

        const submitBtn = editSurveyForm.querySelector("button[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "⏳ Saving...";
        }

        try {
            await firebase.firestore().collection("surveys").doc(editingSurveyId).update({
                name: editName.value.trim(),
                mobile: editMobile.value.trim(),
                age: editAge.value.trim(),
                village: editVillage.value.trim()
            });
            alert("✅ Record safaltapoorvak update ho gaya!");
            window.closeEditModal();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "💾 Save Changes";
            }
        }
    });
}

window.deleteSurvey = async function(id) {
    if (!confirm("Kya aap sach me is survey ko delete karna chahte hain?")) return;
    try {
        await firebase.firestore().collection("surveys").doc(id).delete();
    } catch (e) {
        alert("Error: " + e.message);
    }
};

if (deleteAllSurveysBtn) {
    deleteAllSurveysBtn.addEventListener("click", async () => {
        if (!confirm("⚠️ Chetawani: Kya aap sabhi survey records delete karna chahte hain? Ye data wapas nahi aayega!")) return;
        const prompt = window.prompt("Pushti ke liye 'DELETE' type karein:");
        if (prompt !== "DELETE") return;

        try {
            const snap = await firebase.firestore().collection("surveys").get();
            const batch = firebase.firestore().batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            alert("✅ Sabhi surveys delete kar diye gaye!");
        } catch (e) {
            alert("Error: " + e.message);
        }
    });
}
