/* =========================================================
   SURVEYKSHAN - ORIGINAL COMPLETE ADMIN JS WITH FIRESTORE SURVEYORS
   ========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let surveys = [];
let questions = [];
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
        alert("अनाधिकृत प्रवेश! केवल अधिकृत एडमिन ही लॉगिन कर सकते हैं।");
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
   3. SURVEY QUESTION MANAGER
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
            alert("कृपया प्रश्न दर्ज करें!");
            return;
        }

        saveQuestionBtn.disabled = true;
        try {
            if (editingQuestionId) {
                await firebase.firestore().collection("questions").doc(editingQuestionId).update({
                    text, type, options
                });
                questionMessage.textContent = "✅ प्रश्न अपडेट हो गया!";
            } else {
                const snap = await firebase.firestore().collection("questions").get();
                await firebase.firestore().collection("questions").add({
                    text, type, options, order: snap.size + 1
                });
                questionMessage.textContent = "✅ नया प्रश्न जुड़ गया!";
            }

            resetQuestionForm();
            loadQuestions();
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
    firebase.firestore().collection("questions").orderBy("order", "asc").onSnapshot((snapshot) => {
        questions = [];
        questionsList.innerHTML = "";
        snapshot.forEach((doc) => {
            const q = { id: doc.id, ...doc.data() };
            questions.push(q);

            const div = document.createElement("div");
            div.className = "question-card";
            div.innerHTML = `
                <h3>${q.order || ""}. ${q.text || q.question} (${q.type})</h3>
                <p><strong>Options:</strong> ${q.options ? q.options.join(", ") : "None"}</p>
                <button class="primary" onclick="editQuestion('${q.id}')">✏️ Edit</button>
                <button class="danger" onclick="deleteQuestion('${q.id}')">🗑️ Delete</button>
            `;
            questionsList.appendChild(div);
        });

        if (questionCountEl) questionCountEl.textContent = questions.length;
    });
}

window.editQuestion = function(id) {
    const q = questions.find(item => item.id === id);
    if (!q) return;

    editingQuestionId = id;
    questionText.value = q.text || q.question || "";
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
    if (!confirm("क्या आप वाकई इस प्रश्न को हटाना चाहते हैं?")) return;
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
            limitMessage.textContent = "✅ लिमिट सेव हो गई!";
            setTimeout(() => limitMessage.textContent = "", 3000);
        } catch (e) {
            limitMessage.textContent = "Error: " + e.message;
        } finally {
            saveDailyLimitBtn.disabled = false;
        }
    });
}

/* =========================================================
   5. LOAD SURVEYORS & SURVEYS (FIRESTORE SYNC)
   ========================================================= */
function loadSurveyorsAndSurveys() {
    // 1. Listen to surveyors collection from Firestore
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

        // Ensure default IDs exist as fallback
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

    // 2. Listen to surveys collection
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
        surveyTable.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#777;">कोई रिकॉर्ड नहीं मिला</td></tr>`;
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
   6. SURVEYOR STATS TABLE (SHOWS ALL REGISTERED SURVEYORS)
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

    // Initialize map with all registered surveyors from Firestore
    registeredSurveyors.forEach(srv => {
        map[srv.email] = {
            total: 0,
            today: 0,
            week: 0,
            month: 0,
            status: srv.status || "active",
            enabled: srv.enabled
        };
    });

    // Populate counts from surveys
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

    // Render each surveyor row
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
   8. EXCEL EXPORT (LOCATED NEXT TO LOGOUT BUTTON)
   ========================================================= */
if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
        if (!surveys || surveys.length === 0) {
            alert("⚠️ एक्सपोर्ट करने के लिए कोई सर्वे रिकॉर्ड मौजूद नहीं है!");
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

                // Dynamic Questions Text & Answers
                if (questions.length > 0) {
                    questions.forEach(q => {
                        let ans = s.answers ? s.answers[q.id] : "";
                        if (Array.isArray(ans)) ans = ans.join(", ");
                        row[q.text || q.question] = ans || "-";
                    });
                } else if (s.answers) {
                    Object.keys(s.answers).forEach(k => {
                        let ans = s.answers[k];
                        if (Array.isArray(ans)) ans = ans.join(", ");
                        row[`Question_${k}`] = ans || "-";
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
   9. MODALS: ANSWERS, PHOTOS, EDIT & DELETE
   ========================================================= */
window.openAnswersModal = function(id) {
    const s = surveys.find(i => i.id === id);
    if (!s) return;

    answerModalBody.innerHTML = "";
    const ans = s.answers || {};

    if (questions.length > 0) {
        questions.forEach((q, idx) => {
            let val = ans[q.id];
            if (Array.isArray(val)) val = val.join(", ");
            answerModalBody.innerHTML += `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px;">
                    <div style="font-weight:bold; color:#1565c0; font-size:14px;">Q${idx + 1}. ${q.text || q.question}</div>
                    <div style="margin-top:5px; font-size:15px; color:#222;">${val || "<span style='color:#999'>कोई उत्तर नहीं</span>"}</div>
                </div>
            `;
        });
    } else {
        Object.keys(ans).forEach((k, idx) => {
            let val = ans[k];
            if (Array.isArray(val)) val = val.join(", ");
            answerModalBody.innerHTML += `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px;">
                    <div style="font-weight:bold; color:#1565c0;">Q${idx + 1}. ${k}</div>
                    <div style="margin-top:5px; font-size:15px;">${val || "-"}</div>
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
    const labels = ["1. गाँव/शहर की फोटो", "2. समस्या की फोटो", "3. रिस्पॉन्डेंट की फोटो", "4. रिस्पॉन्डेंट के साथ सेल्फी"];

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

    editSurveyModal.classList.add("show");
};

window.closeEditModal = function() {
    editingSurveyModal.classList.remove("show");
    editingSurveyId = null;
};

if (editSurveyForm) {
    editSurveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editingSurveyId) return;

        try {
            await firebase.firestore().collection("surveys").doc(editingSurveyId).update({
                name: editName.value.trim(),
                mobile: editMobile.value.trim(),
                age: editAge.value.trim(),
                village: editVillage.value.trim()
            });
            alert("✅ रिकॉर्ड अपडेट हो गया!");
            closeEditModal();
        } catch (err) {
            alert("Error: " + err.message);
        }
    });
}

window.deleteSurvey = async function(id) {
    if (!confirm("क्या आप वाकई इस सर्वे को हटाना चाहते हैं?")) return;
    try {
        await firebase.firestore().collection("surveys").doc(id).delete();
    } catch (e) {
        alert("Error: " + e.message);
    }
};

if (deleteAllSurveysBtn) {
    deleteAllSurveysBtn.addEventListener("click", async () => {
        if (!confirm("⚠️ चेतावनी: क्या आप वाकई सभी सर्वे रिकॉर्ड्स डिलीट करना चाहते हैं? यह डेटा वापस नहीं आएगा!")) return;
        const prompt = window.prompt("पुष्टि करने के लिए 'DELETE' टाइप करें:");
        if (prompt !== "DELETE") return;

        try {
            const snap = await firebase.firestore().collection("surveys").get();
            const batch = firebase.firestore().batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            alert("✅ सभी सर्वे डिलीट कर दिए गए!");
        } catch (e) {
            alert("Error: " + e.message);
        }
    });
}
