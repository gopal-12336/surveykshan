/* =========================================================
   SURVEYKSHAN - ADMIN PANEL (100% WORKING & BULLETPROOF)
   ========================================================= */

// 1. Firebase Firestore & Auth Initialization
const auth = firebase.auth();
const db = firebase.firestore();

// 2. Global Variables & State
let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let dailyLimit = 5;

// Main Admin Email (Matches your login)
const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

// DOM Elements
const surveysTableBody = document.getElementById("surveysTableBody");
const surveyorsTableBody = document.getElementById("surveyorsTableBody");
const questionsTableBody = document.getElementById("questionsTableBody");
const searchInput = document.getElementById("searchInput");
const filterSurveyor = document.getElementById("filterSurveyor");
const filterDate = document.getElementById("filterDate");
const adminUserEmail = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutBtn");

// Modals
const answersModal = document.getElementById("answersModal");
const photosModal = document.getElementById("photosModal");
const editSurveyModal = document.getElementById("editSurveyModal");

/* =========================================================
   3. AUTHENTICATION & ACCESS CONTROL
   ========================================================= */
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const currentEmail = (user.email || "").toLowerCase().trim();
    if (currentEmail !== ADMIN_EMAIL.toLowerCase()) {
        alert("अनधिकृत एक्सेस! केवल मुख्य एडमिन ही इस पैनल को खोल सकता है।");
        auth.signOut().then(() => {
            window.location.href = "login.html";
        });
        return;
    }

    if (adminUserEmail) adminUserEmail.textContent = user.email;

    // Load All Realtime Data
    loadDailyLimit();
    loadSurveysRealtime();
    loadSurveyorsRealtime();
    loadQuestionsRealtime();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        auth.signOut().then(() => {
            window.location.href = "login.html";
        });
    });
}

/* =========================================================
   4. CLOUDINARY & PHOTO DETECTOR (All Formats Supported)
   ========================================================= */
function getSurveyPhotosArray(survey) {
    if (!survey) return [];
    let photos = [];

    const addValidUrl = (val) => {
        if (!val) return;
        if (typeof val === "string") {
            const clean = val.trim();
            if ((clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:image/")) && !photos.includes(clean)) {
                photos.push(clean);
            }
        } else if (typeof val === "object" && val !== null) {
            const possibleUrl = val.url || val.secure_url || val.photoUrl || val.photoURL || val.src;
            if (typeof possibleUrl === "string" && possibleUrl.startsWith("http")) {
                const clean = possibleUrl.trim();
                if (!photos.includes(clean)) photos.push(clean);
            }
        }
    };

    // 1. Standard Array/Object
    if (survey.photos) {
        if (Array.isArray(survey.photos)) survey.photos.forEach(addValidUrl);
        else if (typeof survey.photos === "object") Object.values(survey.photos).forEach(addValidUrl);
        else if (typeof survey.photos === "string") addValidUrl(survey.photos);
    }

    // 2. Alternate Array Names
    ["photoUrls", "photoURLs", "images", "imageUrls", "surveyPhotos"].forEach(key => {
        if (survey[key]) {
            if (Array.isArray(survey[key])) survey[key].forEach(addValidUrl);
            else if (typeof survey[key] === "object") Object.values(survey[key]).forEach(addValidUrl);
        }
    });

    // 3. Multi-keys: photo1, photo2, photo3, photo4
    ["photo1", "photo2", "photo3", "photo4", "photo_1", "photo_2", "photo_3", "photo_4"].forEach(k => {
        if (survey[k]) addValidUrl(survey[k]);
    });

    // 4. Single keys
    ["photoURL", "photoUrl", "imageUrl", "imageURL", "cloudinaryURL", "photo", "image"].forEach(k => {
        if (survey[k]) addValidUrl(survey[k]);
    });

    // 5. Deep Scan (Any Cloudinary URL inside the document)
    if (photos.length === 0) {
        Object.keys(survey).forEach(k => {
            const val = survey[k];
            if (typeof val === "string" && (val.includes("cloudinary.com") || val.includes("res.cloudinary"))) {
                addValidUrl(val);
            }
        });
    }

    return photos;
}

/* =========================================================
   5. REALTIME SURVEYS LOADER
   ========================================================= */
function loadSurveysRealtime() {
    db.collection("surveys").onSnapshot((snapshot) => {
        allSurveys = [];
        snapshot.forEach((doc) => {
            allSurveys.push({ id: doc.id, ...doc.data() });
        });

        // Safe Client-Side Sorting
        allSurveys.sort((a, b) => {
            const getTime = (obj) => {
                if (obj.timestamp && obj.timestamp.toDate) return obj.timestamp.toDate().getTime();
                if (obj.timestamp) return new Date(obj.timestamp).getTime();
                if (obj.createdAt) return new Date(obj.createdAt).getTime();
                return 0;
            };
            return getTime(b) - getTime(a);
        });

        renderSurveys(allSurveys);
        updateDashboardCards();
    }, (error) => {
        console.error("Error loading surveys:", error);
        alert("सर्वे लोड करने में त्रुटि: " + error.message);
    });
}

function renderSurveys(surveys) {
    if (!surveysTableBody) return;
    surveysTableBody.innerHTML = "";

    if (surveys.length === 0) {
        surveysTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:#888;">कोई सर्वे रिकॉर्ड नहीं मिला।</td></tr>`;
        return;
    }

    surveys.forEach((survey) => {
        const photos = getSurveyPhotosArray(survey);
        const tr = document.createElement("tr");

        // Photo Action
        let photoHtml = `<span style="color:#94a3b8; font-size:12px;">No Photo</span>`;
        if (photos.length > 0) {
            photoHtml = `
                <button class="action-btn" style="background:#2563eb; color:#fff; padding:6px 10px; font-size:11px; border-radius:6px; border:none; cursor:pointer; font-weight:600;" onclick="openPhotosModal('${survey.id}')">
                    📷 Photos (${photos.length})
                </button>
            `;
        }

        // Location & Map
        let mapLink = `<span style="color:#94a3b8; font-size:12px;">-</span>`;
        const villageText = survey.village || survey.address || "-";
        
        if (survey.latitude && survey.longitude) {
            mapLink = `${villageText} <a href="https://maps.google.com/?q=${survey.latitude},${survey.longitude}" target="_blank" style="background:#059669; color:#fff; text-decoration:none; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px; display:inline-block;">📍 Map</a>`;
        } else if (survey.location && typeof survey.location === "object" && survey.location.latitude) {
            mapLink = `${villageText} <a href="https://maps.google.com/?q=${survey.location.latitude},${survey.location.longitude}" target="_blank" style="background:#059669; color:#fff; text-decoration:none; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px; display:inline-block;">📍 Map</a>`;
        } else {
            mapLink = `${villageText}`;
        }

        // Surveyor & Date
        const surveyorEmail = survey.surveyorEmail || survey.createdBy || "Unknown";
        let dateString = "-";
        if (survey.timestamp && survey.timestamp.toDate) {
            dateString = survey.timestamp.toDate().toLocaleString("en-IN");
        } else if (survey.createdAt) {
            dateString = new Date(survey.createdAt).toLocaleString("en-IN");
        }

        tr.innerHTML = `
            <td style="text-align:center;">${photoHtml}</td>
            <td style="font-weight:600; color:#1e293b;">${survey.name || survey.respondentName || "-"}</td>
            <td>${survey.mobile || survey.phone || "-"}</td>
            <td>${survey.age || "-"}</td>
            <td>${survey.gender || "-"}</td>
            <td>${survey.village || "-"}</td>
            <td>${mapLink}</td>
            <td>
                <div style="font-weight:600; font-size:12px; color:#1e293b;">${surveyorEmail}</div>
                <div style="font-size:11px; color:#64748b;">${dateString}</div>
            </td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button style="background:#7c3aed; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="openAnswersModal('${survey.id}')">📋 Answers</button>
                    <button style="background:#0284c7; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="openEditModal('${survey.id}')">✏️ Edit</button>
                    <button style="background:#dc2626; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="deleteSurvey('${survey.id}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        surveysTableBody.appendChild(tr);
    });
}

/* =========================================================
   6. 4-PHOTO MODAL
   ========================================================= */
window.openPhotosModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const photos = getSurveyPhotosArray(survey);
    const photosGrid = document.getElementById("modalPhotosGrid");
    
    if (photosGrid) {
        photosGrid.innerHTML = "";
        if (photos.length === 0) {
            photosGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#888;">कोई फोटो उपलब्ध नहीं है।</p>`;
        } else {
            photos.forEach((url, idx) => {
                const card = document.createElement("div");
                card.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; padding:6px; text-align:center;";
                card.innerHTML = `
                    <img src="${url}" alt="Photo ${idx + 1}" style="width:100%; height:180px; object-fit:cover; border-radius:6px; cursor:pointer;" onclick="window.open('${url}', '_blank')">
                    <div style="margin-top:6px; font-size:12px; font-weight:600; color:#334155;">Photo ${idx + 1}</div>
                    <a href="${url}" target="_blank" style="font-size:11px; color:#2563eb; text-decoration:none; display:inline-block; margin-top:3px;">🔍 Full Size</a>
                `;
                photosGrid.appendChild(card);
            });
        }
    }

    if (photosModal) photosModal.style.display = "flex";
};

window.closePhotosModal = function() {
    if (photosModal) photosModal.style.display = "none";
};

/* =========================================================
   7. ANSWERS MODAL
   ========================================================= */
window.openAnswersModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const container = document.getElementById("modalAnswersContent");
    if (!container) return;

    container.innerHTML = "";
    let answers = survey.answers || survey.responses || {};

    if (Array.isArray(answers)) {
        let mapped = {};
        answers.forEach((ans, i) => mapped[`Q${i+1}`] = ans);
        answers = mapped;
    }

    const keys = Object.keys(answers);
    if (keys.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888;">कोई उत्तर दर्ज नहीं हैं।</p>`;
    } else {
        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
        keys.forEach(k => {
            html += `
                <div style="background:#f1f5f9; padding:10px 14px; border-radius:6px;">
                    <div style="font-weight:600; color:#1e293b; font-size:13px;">${k}</div>
                    <div style="color:#334155; margin-top:4px; font-size:13px;">${answers[k]}</div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    if (answersModal) answersModal.style.display = "flex";
};

window.closeAnswersModal = function() {
    if (answersModal) answersModal.style.display = "none";
};

/* =========================================================
   8. EDIT & DELETE SURVEY
   ========================================================= */
let currentEditId = null;

window.openEditModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    currentEditId = surveyId;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setVal("editName", survey.name || survey.respondentName);
    setVal("editMobile", survey.mobile || survey.phone);
    setVal("editAge", survey.age);
    setVal("editVillage", survey.village);

    if (editSurveyModal) editSurveyModal.style.display = "flex";
};

window.closeEditModal = function() {
    if (editSurveyModal) editSurveyModal.style.display = "none";
    currentEditId = null;
};

const editSurveyForm = document.getElementById("editSurveyForm");
if (editSurveyForm) {
    editSurveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentEditId) return;

        const updatedData = {
            name: document.getElementById("editName")?.value.trim() || "",
            mobile: document.getElementById("editMobile")?.value.trim() || "",
            age: document.getElementById("editAge")?.value.trim() || "",
            village: document.getElementById("editVillage")?.value.trim() || ""
        };

        try {
            await db.collection("surveys").doc(currentEditId).update(updatedData);
            alert("सर्वे सफलतापूर्वक अपडेट हो गया!");
            closeEditModal();
        } catch (error) {
            alert("अपडेट करने में त्रुटि: " + error.message);
        }
    });
}

window.deleteSurvey = async function(surveyId) {
    if (confirm("क्या आप इस सर्वे को हमेशा के लिए हटाना चाहते हैं?")) {
        try {
            await db.collection("surveys").doc(surveyId).delete();
            alert("सर्वे हटा दिया गया।");
        } catch (error) {
            alert("त्रुटि: " + error.message);
        }
    }
};

const deleteAllSurveysBtn = document.getElementById("deleteAllSurveysBtn");
if (deleteAllSurveysBtn) {
    deleteAllSurveysBtn.addEventListener("click", async () => {
        if (!confirm("चेतावनी: इससे सभी सर्वे हमेशा के लिए मिट जाएँगे! क्या आप जारी रखना चाहते हैं?")) return;
        try {
            const snap = await db.collection("surveys").get();
            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            alert("सभी सर्वे हटा दिए गए!");
        } catch (error) {
            alert("त्रुटि: " + error.message);
        }
    });
}

/* =========================================================
   9. SURVEYORS MANAGEMENT
   ========================================================= */
function loadSurveyorsRealtime() {
    db.collection("surveyors").onSnapshot((snapshot) => {
        allSurveyors = [];
        if (filterSurveyor) {
            filterSurveyor.innerHTML = `<option value="">सभी सर्वेक्षक (All Surveyors)</option>`;
        }

        snapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            allSurveyors.push(data);

            if (filterSurveyor && (data.email || data.id)) {
                const opt = document.createElement("option");
                opt.value = data.email || data.id;
                opt.textContent = `${data.name || data.id} (${data.email || data.id})`;
                filterSurveyor.appendChild(opt);
            }
        });

        renderSurveyors(allSurveyors);
    });
}

function renderSurveyors(surveyors) {
    if (!surveyorsTableBody) return;
    surveyorsTableBody.innerHTML = "";

    if (surveyors.length === 0) {
        surveyorsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">कोई सर्वेक्षक पंजीकृत नहीं है।</td></tr>`;
        return;
    }

    surveyors.forEach((s) => {
        const tr = document.createElement("tr");
        const status = s.status || (s.active !== false ? "approved" : "pending");
        const isApproved = status === "approved";

        tr.innerHTML = `
            <td><strong>${s.name || "-"}</strong></td>
            <td>${s.email || s.id}</td>
            <td>${s.phone || s.mobile || "-"}</td>
            <td>
                <span style="background:${isApproved ? '#22c55e' : '#eab308'}; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">
                    ${status.toUpperCase()}
                </span>
            </td>
            <td>
                <button style="background:${isApproved ? '#f59e0b' : '#16a34a'}; color:#fff; padding:4px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer;" onclick="toggleSurveyorStatus('${s.id}', '${status}')">
                    ${isApproved ? 'अस्वीकृत करें' : 'स्वीकृत करें'}
                </button>
                <button style="background:#dc2626; color:#fff; padding:4px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer; margin-left:4px;" onclick="deleteSurveyor('${s.id}')">
                    🗑️
                </button>
            </td>
        `;
        surveyorsTableBody.appendChild(tr);
    });
}

window.toggleSurveyorStatus = async function(id, currentStatus) {
    const nextStatus = currentStatus === "approved" ? "pending" : "approved";
    try {
        await db.collection("surveyors").doc(id).set({
            status: nextStatus,
            active: nextStatus === "approved"
        }, { merge: true });
    } catch (e) {
        alert("त्रुटि: " + e.message);
    }
};

window.deleteSurveyor = async function(id) {
    if (confirm("क्या आप इस सर्वेक्षक को हटाना चाहते हैं?")) {
        try {
            await db.collection("surveyors").doc(id).delete();
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    }
};

/* =========================================================
   10. QUESTIONS MANAGEMENT
   ========================================================= */
function loadQuestionsRealtime() {
    db.collection("questions").onSnapshot((snapshot) => {
        allQuestions = [];
        snapshot.forEach(doc => {
            allQuestions.push({ id: doc.id, ...doc.data() });
        });
        renderQuestions(allQuestions);
        updateDashboardCards();
    });
}

function renderQuestions(questions) {
    if (!questionsTableBody) return;
    questionsTableBody.innerHTML = "";

    questions.forEach((q, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${q.text || q.question}</strong></td>
            <td><span style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-size:11px;">${q.type || "text"}</span></td>
            <td>${q.options ? q.options.join(", ") : "-"}</td>
            <td>
                <button style="background:#dc2626; color:#fff; padding:4px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer;" onclick="deleteQuestion('${q.id}')">🗑️</button>
            </td>
        `;
        questionsTableBody.appendChild(tr);
    });
}

const addQuestionForm = document.getElementById("addQuestionForm");
if (addQuestionForm) {
    addQuestionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = document.getElementById("newQuestionText")?.value.trim();
        const type = document.getElementById("newQuestionType")?.value;
        const optionsRaw = document.getElementById("newQuestionOptions")?.value.trim();

        if (!text) return;
        let options = optionsRaw ? optionsRaw.split(",").map(o => o.trim()).filter(o => o.length > 0) : [];

        try {
            await db.collection("questions").add({
                text: text,
                type: type || "text",
                options: options,
                order: allQuestions.length + 1,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            addQuestionForm.reset();
            alert("नया प्रश्न जुड़ गया!");
        } catch (err) {
            alert("त्रुटि: " + err.message);
        }
    });
}

window.deleteQuestion = async function(id) {
    if (confirm("क्या आप इस प्रश्न को हटाना चाहते हैं?")) {
        try {
            await db.collection("questions").doc(id).delete();
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    }
};

/* =========================================================
   11. SETTINGS & LIMIT
   ========================================================= */
async function loadDailyLimit() {
    try {
        const doc = await db.collection("settings").doc("config").get();
        if (doc.exists && doc.data().dailyLimit !== undefined) {
            dailyLimit = doc.data().dailyLimit;
            const input = document.getElementById("dailyLimitInput");
            if (input) input.value = dailyLimit;
        }
    } catch (e) {
        console.warn("dailyLimit fetch error:", e);
    }
}

const saveDailyLimitBtn = document.getElementById("saveDailyLimitBtn");
if (saveDailyLimitBtn) {
    saveDailyLimitBtn.addEventListener("click", async () => {
        const input = document.getElementById("dailyLimitInput");
        const val = parseInt(input?.value);
        if (isNaN(val) || val < 1) {
            alert("कृपया सही संख्या दर्ज करें!");
            return;
        }
        try {
            await db.collection("settings").doc("config").set({ dailyLimit: val }, { merge: true });
            dailyLimit = val;
            alert("डेली लिमिट अपडेट हो गई!");
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    });
}

/* =========================================================
   12. SEARCH & FILTERS
   ========================================================= */
function applyFilters() {
    const q = (searchInput?.value || "").toLowerCase();
    const selSurveyor = filterSurveyor?.value || "";
    const selDate = filterDate?.value || "";

    const filtered = allSurveys.filter(survey => {
        const name = (survey.name || survey.respondentName || "").toLowerCase();
        const mobile = (survey.mobile || survey.phone || "").toLowerCase();
        const village = (survey.village || "").toLowerCase();
        const surveyor = survey.surveyorEmail || survey.createdBy || "";

        const matchesSearch = !q || name.includes(q) || mobile.includes(q) || village.includes(q);
        const matchesSurveyor = !selSurveyor || surveyor === selSurveyor;

        let matchesDate = true;
        if (selDate) {
            let sDate = "";
            if (survey.timestamp && survey.timestamp.toDate) {
                sDate = survey.timestamp.toDate().toISOString().split("T")[0];
            } else if (survey.createdAt) {
                sDate = new Date(survey.createdAt).toISOString().split("T")[0];
            }
            matchesDate = (sDate === selDate);
        }

        return matchesSearch && matchesSurveyor && matchesDate;
    });

    renderSurveys(filtered);
}

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (filterSurveyor) filterSurveyor.addEventListener("change", applyFilters);
if (filterDate) filterDate.addEventListener("change", applyFilters);

/* =========================================================
   13. DASHBOARD METRICS (SMART AUTO-SELECTORS)
   ========================================================= */
function updateDashboardCards() {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;

    allSurveys.forEach(s => {
        let dateObj = null;
        if (s.timestamp && s.timestamp.toDate) dateObj = s.timestamp.toDate();
        else if (s.createdAt) dateObj = new Date(s.createdAt);

        if (dateObj && !isNaN(dateObj.getTime())) {
            const dateStr = dateObj.toISOString().split("T")[0];
            if (dateStr === todayStr) countToday++;
            if (dateObj >= startOfWeek) countWeek++;
            if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) countMonth++;
        }
    });

    // Helper to safely set text by finding multiple possible IDs or text contents
    const setCardValue = (elementIds, value) => {
        for (const id of elementIds) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
                return;
            }
        }
    };

    setCardValue(["totalSurveysCard", "totalSurveys", "statTotalSurveys"], allSurveys.length);
    setCardValue(["todaySurveysCard", "todaySurveys", "statTodaySurveys"], countToday);
    setCardValue(["thisWeekSurveysCard", "thisWeekSurveys", "weekSurveys", "statWeekSurveys"], countWeek);
    setCardValue(["thisMonthSurveysCard", "thisMonthSurveys", "monthSurveys", "statMonthSurveys"], countMonth);
    setCardValue(["totalQuestionsCard", "totalQuestions", "statTotalQuestions"], allQuestions.length);

    // Fallback: If elements do not have standard IDs, update the numbers inside the stat cards directly
    const statCards = document.querySelectorAll(".stat-card, .card");
    if (statCards.length >= 5) {
        const values = [allSurveys.length, countToday, countWeek, countMonth, allQuestions.length];
        statCards.forEach((card, idx) => {
            if (idx < values.length) {
                const numEl = card.querySelector("h2, h3, .stat-number, .number, span:not(.label)");
                if (numEl) numEl.textContent = values[idx];
            }
        });
    }
}
