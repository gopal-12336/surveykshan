/* =========================================================
   SURVEYKSHAN - ADMIN PANEL (BULLETPROOF & ERROR-FREE)
   ========================================================= */

// 1. Safe Firebase Init (अगर पहले से बना है तो वही यूज़ करेगा)
const auth = window.auth || firebase.auth();
const db = window.db || firebase.firestore();

// 2. Global State
let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let dailyLimit = 5;

// Main Admin Email (Matches your login)
const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

// DOM Elements Helpers
const getEl = (id) => document.getElementById(id);

/* =========================================================
   3. UNIVERSAL PHOTO EXTRACTOR (Cloudinary & Base64 Safe)
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

    if (survey.photos) {
        if (Array.isArray(survey.photos)) survey.photos.forEach(addValidUrl);
        else if (typeof survey.photos === "object") Object.values(survey.photos).forEach(addValidUrl);
        else if (typeof survey.photos === "string") addValidUrl(survey.photos);
    }

    ["photoUrls", "photoURLs", "images", "imageUrls", "surveyPhotos"].forEach(key => {
        if (survey[key]) {
            if (Array.isArray(survey[key])) survey[key].forEach(addValidUrl);
            else if (typeof survey[key] === "object") Object.values(survey[key]).forEach(addValidUrl);
        }
    });

    ["photo1", "photo2", "photo3", "photo4", "photo_1", "photo_2", "photo_3", "photo_4"].forEach(k => {
        if (survey[k]) addValidUrl(survey[k]);
    });

    ["photoURL", "photoUrl", "imageUrl", "imageURL", "cloudinaryURL", "photo", "image"].forEach(k => {
        if (survey[k]) addValidUrl(survey[k]);
    });

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
   4. RENDER SURVEYS TABLE
   ========================================================= */
function renderSurveys(surveys) {
    const surveysTableBody = getEl("surveysTableBody");
    if (!surveysTableBody) return;
    surveysTableBody.innerHTML = "";

    if (!surveys || surveys.length === 0) {
        surveysTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:#888;">कोई सर्वे रिकॉर्ड नहीं मिला।</td></tr>`;
        return;
    }

    surveys.forEach((survey) => {
        const photos = getSurveyPhotosArray(survey);
        const tr = document.createElement("tr");

        let photoHtml = `<span style="color:#94a3b8; font-size:12px;">No Photo</span>`;
        if (photos.length > 0) {
            photoHtml = `
                <button type="button" class="action-btn" style="background:#2563eb; color:#fff; padding:6px 10px; font-size:11px; border-radius:6px; border:none; cursor:pointer; font-weight:600;" onclick="openPhotosModal('${survey.id}')">
                    📷 Photos (${photos.length})
                </button>
            `;
        }

        let mapLink = `<span style="color:#94a3b8; font-size:12px;">-</span>`;
        const villageText = survey.village || survey.address || "-";
        
        if (survey.latitude && survey.longitude) {
            mapLink = `${villageText} <a href="https://maps.google.com/?q=${survey.latitude},${survey.longitude}" target="_blank" style="background:#059669; color:#fff; text-decoration:none; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px; display:inline-block;">📍 Map</a>`;
        } else if (survey.location && typeof survey.location === "object" && survey.location.latitude) {
            mapLink = `${villageText} <a href="https://maps.google.com/?q=${survey.location.latitude},${survey.location.longitude}" target="_blank" style="background:#059669; color:#fff; text-decoration:none; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px; display:inline-block;">📍 Map</a>`;
        } else {
            mapLink = `${villageText}`;
        }

        const surveyorEmail = survey.surveyorEmail || survey.createdBy || "Unknown";
        let dateString = "-";
        try {
            if (survey.timestamp && survey.timestamp.toDate) {
                dateString = survey.timestamp.toDate().toLocaleString("en-IN");
            } else if (survey.createdAt) {
                dateString = new Date(survey.createdAt).toLocaleString("en-IN");
            }
        } catch(e) {}

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
                    <button type="button" style="background:#7c3aed; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="openAnswersModal('${survey.id}')">📋 Answers</button>
                    <button type="button" style="background:#0284c7; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="openEditModal('${survey.id}')">✏️ Edit</button>
                    <button type="button" style="background:#dc2626; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="deleteSurvey('${survey.id}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        surveysTableBody.appendChild(tr);
    });
}

/* =========================================================
   5. REALTIME LISTENERS
   ========================================================= */
function loadSurveysRealtime() {
    db.collection("surveys").onSnapshot((snapshot) => {
        allSurveys = [];
        snapshot.forEach((doc) => {
            allSurveys.push({ id: doc.id, ...doc.data() });
        });

        // Safe client sort
        allSurveys.sort((a, b) => {
            const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return tB - tA;
        });

        renderSurveys(allSurveys);
        updateDashboardCards();
    }, (err) => {
        console.error("Firestore Survey Error:", err);
    });
}

function loadSurveyorsRealtime() {
    db.collection("surveyors").onSnapshot((snapshot) => {
        allSurveyors = [];
        const filterSurveyor = getEl("filterSurveyor");
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

        const surveyorsTableBody = getEl("surveyorsTableBody");
        if (surveyorsTableBody) {
            surveyorsTableBody.innerHTML = "";
            allSurveyors.forEach((s) => {
                const tr = document.createElement("tr");
                const isApproved = (s.status === "approved" || s.active === true);
                tr.innerHTML = `
                    <td><strong>${s.name || "-"}</strong></td>
                    <td>${s.email || s.id}</td>
                    <td>${s.phone || s.mobile || "-"}</td>
                    <td><span style="background:${isApproved ? '#22c55e' : '#eab308'}; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">${isApproved ? 'APPROVED' : 'PENDING'}</span></td>
                    <td>
                        <button type="button" style="background:${isApproved ? '#f59e0b' : '#16a34a'}; color:#fff; padding:4px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer;" onclick="toggleSurveyorStatus('${s.id}', '${s.status || (isApproved ? 'approved' : 'pending')}')">${isApproved ? 'अस्वीकृत' : 'स्वीकृत'}</button>
                        <button type="button" style="background:#dc2626; color:#fff; padding:4px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer; margin-left:4px;" onclick="deleteSurveyor('${s.id}')">🗑️</button>
                    </td>
                `;
                surveyorsTableBody.appendChild(tr);
            });
        }
    }, (err) => console.error("Surveyors Error:", err));
}

function loadQuestionsRealtime() {
    db.collection("questions").onSnapshot((snapshot) => {
        allQuestions = [];
        snapshot.forEach((doc) => {
            allQuestions.push({ id: doc.id, ...doc.data() });
        });

        const questionsTableBody = getEl("questionsTableBody");
        if (questionsTableBody) {
            questionsTableBody.innerHTML = "";
            allQuestions.forEach((q, idx) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td><strong>${q.text || q.question || "-"}</strong></td>
                    <td><span style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-size:11px;">${q.type || "text"}</span></td>
                    <td>${q.options ? q.options.join(", ") : "-"}</td>
                    <td><button type="button" style="background:#dc2626; color:#fff; padding:4px 8px; font-size:11px; border-radius:4px; border:none; cursor:pointer;" onclick="deleteQuestion('${q.id}')">🗑️</button></td>
                `;
                questionsTableBody.appendChild(tr);
            });
        }
        updateDashboardCards();
    }, (err) => console.error("Questions Error:", err));
}

function loadDailyLimit() {
    db.collection("settings").doc("config").get().then((doc) => {
        if (doc.exists && doc.data().dailyLimit !== undefined) {
            dailyLimit = doc.data().dailyLimit;
            const input = getEl("dailyLimitInput");
            if (input) input.value = dailyLimit;
        }
    }).catch((e) => console.warn(e));
}

/* =========================================================
   6. CARDS METRICS AUTO-UPDATE
   ========================================================= */
function updateDashboardCards() {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;

    allSurveys.forEach(s => {
        let d = s.timestamp?.toDate ? s.timestamp.toDate() : (s.createdAt ? new Date(s.createdAt) : null);
        if (d && !isNaN(d.getTime())) {
            if (d.toISOString().split("T")[0] === todayStr) countToday++;
            if (d >= startOfWeek) countWeek++;
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) countMonth++;
        }
    });

    // 1. Direct IDs Update (अगर मौजूद हों)
    const setIfExists = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
    setIfExists("totalSurveysCard", allSurveys.length);
    setIfExists("todaySurveysCard", countToday);
    setIfExists("thisWeekSurveysCard", countWeek);
    setIfExists("thisMonthSurveysCard", countMonth);
    setIfExists("totalQuestionsCard", allQuestions.length);

    // 2. DOM Structure Scan (आपके स्क्रीनशॉट वाले 5 बड़े कार्ड्स के लिए)
    const statCards = document.querySelectorAll(".card, .stat-card, div[class*='card']");
    const matchedNumbers = [];
    document.querySelectorAll("h1, h2, h3, div, span").forEach(el => {
        const text = el.textContent.trim();
        // अगर कोई एलिमेंट केवल 0 या नंबर है और उसका पैरेंट कार्ड है
        if (/^\d+$/.test(text) && el.children.length === 0 && (el.className.includes('count') || el.className.includes('number') || el.style.fontSize || el.tagName.startsWith('H'))) {
            matchedNumbers.push(el);
        }
    });

    if (matchedNumbers.length >= 5) {
        matchedNumbers[0].textContent = allSurveys.length;
        matchedNumbers[1].textContent = countToday;
        matchedNumbers[2].textContent = countWeek;
        matchedNumbers[3].textContent = countMonth;
        matchedNumbers[4].textContent = allQuestions.length;
    }
}

/* =========================================================
   7. MODALS & POPUPS
   ========================================================= */
window.openPhotosModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const photos = getSurveyPhotosArray(survey);
    const photosGrid = getEl("modalPhotosGrid");
    
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

    const photosModal = getEl("photosModal");
    if (photosModal) photosModal.style.display = "flex";
};

window.closePhotosModal = function() {
    const photosModal = getEl("photosModal");
    if (photosModal) photosModal.style.display = "none";
};

window.openAnswersModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const container = getEl("modalAnswersContent");
    if (container) {
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
    }

    const answersModal = getEl("answersModal");
    if (answersModal) answersModal.style.display = "flex";
};

window.closeAnswersModal = function() {
    const answersModal = getEl("answersModal");
    if (answersModal) answersModal.style.display = "none";
};

/* =========================================================
   8. ACTIONS (EDIT, DELETE, STATUS)
   ========================================================= */
let currentEditId = null;

window.openEditModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;
    currentEditId = surveyId;

    const setV = (id, val) => { const el = getEl(id); if (el) el.value = val || ""; };
    setV("editName", survey.name || survey.respondentName);
    setV("editMobile", survey.mobile || survey.phone);
    setV("editAge", survey.age);
    setV("editVillage", survey.village);

    const editModal = getEl("editSurveyModal");
    if (editModal) editModal.style.display = "flex";
};

window.closeEditModal = function() {
    const editModal = getEl("editSurveyModal");
    if (editModal) editModal.style.display = "none";
    currentEditId = null;
};

window.deleteSurvey = async function(surveyId) {
    if (confirm("क्या आप वाकई इस सर्वे को हमेशा के लिए हटाना चाहते हैं?")) {
        try {
            await db.collection("surveys").doc(surveyId).delete();
            alert("सर्वे हटा दिया गया।");
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    }
};

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
   9. HIDE / TOGGLE BUTTON FIX
   ========================================================= */
// यह आपके स्क्रीनशॉट वाले Hide बटन को तुरंत ठीक करेगा
document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const text = btn.textContent.toLowerCase();
    if (text.includes("hide") || text.includes("show") || text.includes("छिपाएं")) {
        // Question Manager Container खोजकर टॉगल करेगा
        const container = btn.closest(".card, div")?.querySelector("form, .form-group, #questionForm, #addQuestionForm") || getEl("addQuestionForm");
        if (container) {
            const isHidden = container.style.display === "none";
            container.style.display = isHidden ? "block" : "none";
            btn.innerHTML = isHidden ? "🙈 Hide" : "👁️ Show";
        }
    }
});

/* =========================================================
   10. FILTERS
   ========================================================= */
function applyFilters() {
    const q = (getEl("searchInput")?.value || "").toLowerCase();
    const selSurveyor = getEl("filterSurveyor")?.value || "";
    const selDate = getEl("filterDate")?.value || "";

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
            if (survey.timestamp?.toDate) {
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

/* =========================================================
   11. INITIALIZATION ON DOM READY
   ========================================================= */
window.addEventListener("DOMContentLoaded", () => {
    // Attach Filters
    const search = getEl("searchInput");
    if (search) search.addEventListener("input", applyFilters);

    const fSurveyor = getEl("filterSurveyor");
    if (fSurveyor) fSurveyor.addEventListener("change", applyFilters);

    const fDate = getEl("filterDate");
    if (fDate) fDate.addEventListener("change", applyFilters);

    // Question Form
    const qForm = getEl("addQuestionForm") || getEl("questionForm");
    if (qForm) {
        qForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = (getEl("newQuestionText") || qForm.querySelector("input[type='text']"))?.value.trim();
            const type = (getEl("newQuestionType") || qForm.querySelector("select"))?.value || "text";
            if (!text) return;
            try {
                await db.collection("questions").add({
                    text: text,
                    type: type,
                    order: allQuestions.length + 1,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                qForm.reset();
                alert("प्रश्न जुड़ गया!");
            } catch(err) { alert("त्रुटि: " + err.message); }
        });
    }

    // Limit Save
    const saveLimitBtn = getEl("saveDailyLimitBtn");
    if (saveLimitBtn) {
        saveLimitBtn.addEventListener("click", async () => {
            const val = parseInt(getEl("dailyLimitInput")?.value);
            if (!val || val < 1) return;
            try {
                await db.collection("settings").doc("config").set({ dailyLimit: val }, { merge: true });
                alert("लिमिट सेव हो गई!");
            } catch(e) { alert("त्रुटि: " + e.message); }
        });
    }
});

/* =========================================================
   12. AUTH OBSERVER
   ========================================================= */
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const email = (user.email || "").toLowerCase().trim();
    if (email !== ADMIN_EMAIL.toLowerCase()) {
        alert("केवल एडमिन ही इस पैनल को खोल सकता है!");
        auth.signOut().then(() => window.location.href = "login.html");
        return;
    }

    const adminEmailEl = getEl("adminUserEmail");
    if (adminEmailEl) adminEmailEl.textContent = user.email;

    // Start Realtime Streams
    loadSurveysRealtime();
    loadSurveyorsRealtime();
    loadQuestionsRealtime();
    loadDailyLimit();
});
