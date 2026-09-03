/* =========================================================
   SURVEYKSHAN - ADMIN PANEL JAVASCRIPT (STABLE & BULLETPROOF)
   ========================================================= */

// State variables
let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let dailyLimit = 5;

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

// Global Admin Email (Matches Firestore Rules)
const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

/* =========================================================
   1. AUTHENTICATION OBSERVER
   ========================================================= */
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const email = (user.email || "").toLowerCase().trim();
    if (email !== ADMIN_EMAIL.toLowerCase()) {
        alert("अनधिकृत एक्सेस! केवल मुख्य एडमिन ही इस पैनल को खोल सकता है।");
        firebase.auth().signOut().then(() => {
            window.location.href = "login.html";
        });
        return;
    }

    if (adminUserEmail) adminUserEmail.textContent = user.email;

    // Load Initial Data
    loadDailyLimit();
    loadSurveysRealtime();
    loadSurveyorsRealtime();
    loadQuestionsRealtime();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
            window.location.href = "login.html";
        });
    });
}

/* =========================================================
   2. UNIVERSAL PHOTO EXTRACTOR
   ========================================================= */
function getSurveyPhotosArray(survey) {
    if (!survey) return [];
    let photos = [];

    const checkAndAdd = (val) => {
        if (!val) return;
        if (typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:image/"))) {
            const cleanUrl = val.trim();
            if (!photos.includes(cleanUrl)) photos.push(cleanUrl);
        } else if (typeof val === "object" && val !== null) {
            const possibleUrl = val.url || val.secure_url || val.photoUrl || val.photoURL || val.src;
            if (typeof possibleUrl === "string" && possibleUrl.startsWith("http")) {
                const cleanObjUrl = possibleUrl.trim();
                if (!photos.includes(cleanObjUrl)) photos.push(cleanObjUrl);
            }
        }
    };

    // Array / Object inside photos
    if (survey.photos) {
        if (Array.isArray(survey.photos)) survey.photos.forEach(checkAndAdd);
        else if (typeof survey.photos === "object") Object.values(survey.photos).forEach(checkAndAdd);
        else if (typeof survey.photos === "string") checkAndAdd(survey.photos);
    }

    // Alternate Array Keys
    ["photoUrls", "photoURLs", "images", "imageUrls", "surveyPhotos"].forEach(key => {
        if (survey[key]) {
            if (Array.isArray(survey[key])) survey[key].forEach(checkAndAdd);
            else if (typeof survey[key] === "object") Object.values(survey[key]).forEach(checkAndAdd);
        }
    });

    // Root Individual Fields
    ["photo1", "photo2", "photo3", "photo4", "photo_1", "photo_2", "photo_3", "photo_4"].forEach(key => {
        if (survey[key]) checkAndAdd(survey[key]);
    });

    // Single Root Fields
    [
        "photoURL", "photoUrl", "photo_url", "imageURL", "imageUrl", "image_url",
        "cloudinaryURL", "cloudinaryUrl", "cloudinary_url", "photo", "image",
        "surveyPhoto", "surveyPhotoURL", "respondentPhoto"
    ].forEach(key => {
        if (survey[key]) checkAndAdd(survey[key]);
    });

    // Deep Search for any Cloudinary link
    if (photos.length === 0) {
        Object.keys(survey).forEach(key => {
            const val = survey[key];
            if (typeof val === "string" && (val.includes("cloudinary.com") || val.includes("res.cloudinary"))) {
                checkAndAdd(val);
            }
        });
    }

    return photos;
}

/* =========================================================
   3. SURVEYS REALTIME LISTENER & RENDERER (NO QUERY CRASH)
   ========================================================= */
function loadSurveysRealtime() {
    // बिना orderBy के फ़ेच करेंगे ताकि मिसिंग timestamp या इंडेक्स की वजह से डेटा ब्लॉक न हो
    db.collection("surveys").onSnapshot((snapshot) => {
        allSurveys = [];
        snapshot.forEach((doc) => {
            allSurveys.push({ id: doc.id, ...doc.data() });
        });

        // क्लाइंट साइड पर सुरक्षित सॉर्टिंग
        allSurveys.sort((a, b) => {
            const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
        });

        renderSurveys(allSurveys);
        updateDashboardCards();
    }, (error) => {
        console.error("Error loading surveys:", error);
    });
}

function renderSurveys(surveys) {
    if (!surveysTableBody) return;
    surveysTableBody.innerHTML = "";

    if (surveys.length === 0) {
        surveysTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #888;">कोई सर्वे रिकॉर्ड नहीं मिला।</td></tr>`;
        return;
    }

    surveys.forEach((survey) => {
        const photos = getSurveyPhotosArray(survey);
        const tr = document.createElement("tr");

        // Photo Button / Fallback
        let photoHtml = `<span style="color: #999; font-size: 12px;">No Photo</span>`;
        if (photos.length > 0) {
            photoHtml = `
                <button class="action-btn" style="background:#2563eb; color:#fff; padding:5px 9px; font-size:11px; border-radius:6px; border:none; cursor:pointer;" onclick="openPhotosModal('${survey.id}')">
                    📷 Photos (${photos.length})
                </button>
            `;
        }

        // Map Location
        let mapLink = `<span style="color:#999; font-size:12px;">-</span>`;
        const villageText = survey.village || survey.address || "-";
        
        if (survey.latitude && survey.longitude) {
            mapLink = `${villageText} <a href="https://maps.google.com/?q=${survey.latitude},${survey.longitude}" target="_blank" class="badge" style="background:#059669; color:#fff; text-decoration:none; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px;">📍 Map</a>`;
        } else if (survey.location && typeof survey.location === "object" && survey.location.latitude) {
            mapLink = `${villageText} <a href="https://maps.google.com/?q=${survey.location.latitude},${survey.location.longitude}" target="_blank" class="badge" style="background:#059669; color:#fff; text-decoration:none; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px;">📍 Map</a>`;
        } else {
            mapLink = `${villageText}`;
        }

        // Surveyor details & Date
        const surveyorEmail = survey.surveyorEmail || survey.createdBy || "Unknown";
        let dateString = "-";
        if (survey.timestamp && survey.timestamp.toDate) {
            dateString = survey.timestamp.toDate().toLocaleString("en-IN");
        } else if (survey.createdAt) {
            dateString = new Date(survey.createdAt).toLocaleString("en-IN");
        }

        tr.innerHTML = `
            <td style="text-align: center;">${photoHtml}</td>
            <td style="font-weight: 500;">${survey.name || survey.respondentName || "-"}</td>
            <td>${survey.mobile || survey.phone || "-"}</td>
            <td>${survey.age || "-"}</td>
            <td>${survey.gender || "-"}</td>
            <td>${survey.village || "-"}</td>
            <td>${mapLink}</td>
            <td>
                <div style="font-weight: 600; font-size: 13px; color:#1e293b;">${surveyorEmail}</div>
                <div style="font-size: 11px; color: #64748b;">${dateString}</div>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="action-btn" style="background:#7c3aed; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="openAnswersModal('${survey.id}')">📋 Answers</button>
                    <button class="action-btn" style="background:#0284c7; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="openEditModal('${survey.id}')">✏️ Edit</button>
                    <button class="action-btn" style="background:#dc2626; color:#fff; padding:5px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="deleteSurvey('${survey.id}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        surveysTableBody.appendChild(tr);
    });
}

/* =========================================================
   4. 4-PHOTO MODAL
   ========================================================= */
window.openPhotosModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const photos = getSurveyPhotosArray(survey);
    const photosGrid = document.getElementById("modalPhotosGrid");
    
    if (!photosGrid) return;
    photosGrid.innerHTML = "";

    if (photos.length === 0) {
        photosGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#888;">इस सर्वे में कोई फोटो उपलब्ध नहीं है।</p>`;
    } else {
        photos.forEach((url, index) => {
            const container = document.createElement("div");
            container.style.cssText = "position:relative; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; text-align:center; padding:6px;";

            container.innerHTML = `
                <img src="${url}" alt="Survey Photo ${index + 1}" style="width:100%; height:170px; object-fit:cover; border-radius:6px; cursor:pointer;" onclick="window.open('${url}', '_blank')">
                <div style="margin-top:6px; font-size:12px; font-weight:600; color:#475569;">Photo ${index + 1}</div>
                <a href="${url}" target="_blank" style="display:inline-block; font-size:11px; color:#2563eb; text-decoration:none; margin-top:2px;">🔍 Full View</a>
            `;
            photosGrid.appendChild(container);
        });
    }

    if (photosModal) photosModal.style.display = "flex";
};

window.closePhotosModal = function() {
    if (photosModal) photosModal.style.display = "none";
};

/* =========================================================
   5. ANSWERS MODAL
   ========================================================= */
window.openAnswersModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const answersContainer = document.getElementById("modalAnswersContent");
    if (!answersContainer) return;

    answersContainer.innerHTML = "";

    let answers = survey.answers || survey.responses || {};
    if (Array.isArray(answers)) {
        let mappedObj = {};
        answers.forEach((ans, i) => {
            mappedObj[`Q${i+1}`] = ans;
        });
        answers = mappedObj;
    }

    const keys = Object.keys(answers);
    if (keys.length === 0) {
        answersContainer.innerHTML = `<p style="color:#888; text-align:center;">प्रश्नों के कोई उत्तर दर्ज नहीं हैं।</p>`;
    } else {
        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
        keys.forEach(k => {
            html += `
                <div style="background:#f1f5f9; padding:10px 14px; border-radius:6px;">
                    <div style="font-weight:600; color:#1e293b; font-size:13px;">${k}</div>
                    <div style="color:#334155; margin-top:3px; font-size:13px;">${answers[k]}</div>
                </div>
            `;
        });
        html += `</div>`;
        answersContainer.innerHTML = html;
    }

    if (answersModal) answersModal.style.display = "flex";
};

window.closeAnswersModal = function() {
    if (answersModal) answersModal.style.display = "none";
};

/* =========================================================
   6. EDIT & DELETE SURVEY
   ========================================================= */
let currentEditId = null;

window.openEditModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    currentEditId = surveyId;
    const editName = document.getElementById("editName");
    const editMobile = document.getElementById("editMobile");
    const editAge = document.getElementById("editAge");
    const editVillage = document.getElementById("editVillage");

    if (editName) editName.value = survey.name || survey.respondentName || "";
    if (editMobile) editMobile.value = survey.mobile || survey.phone || "";
    if (editAge) editAge.value = survey.age || "";
    if (editVillage) editVillage.value = survey.village || "";

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
            name: document.getElementById("editName").value.trim(),
            mobile: document.getElementById("editMobile").value.trim(),
            age: document.getElementById("editAge").value.trim(),
            village: document.getElementById("editVillage").value.trim()
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
    if (confirm("क्या आप वाकई इस सर्वे को हमेशा के लिए हटाना चाहते हैं?")) {
        try {
            await db.collection("surveys").doc(surveyId).delete();
            alert("सर्वे सफलतापूर्वक डिलीट कर दिया गया।");
        } catch (error) {
            alert("डिलीट करने में त्रुटि: " + error.message);
        }
    }
};

const deleteAllSurveysBtn = document.getElementById("deleteAllSurveysBtn");
if (deleteAllSurveysBtn) {
    deleteAllSurveysBtn.addEventListener("click", async () => {
        if (!confirm("चेतावनी: इससे सभी सर्वे हमेशा के लिए मिट जाएँगे! क्या आप जारी रखना चाहते हैं?")) return;
        
        try {
            const snapshot = await db.collection("surveys").get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            alert("सभी सर्वे हटा दिए गए!");
        } catch (error) {
            alert("त्रुटि: " + error.message);
        }
    });
}

/* =========================================================
   7. SURVEYORS
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
        surveyorsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color:#888;">कोई सर्वेक्षक नहीं है।</td></tr>`;
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
                <span class="badge" style="background:${isApproved ? '#22c55e' : '#eab308'}; color:#fff; padding:4px 8px; border-radius:4px; font-size:12px;">
                    ${status.toUpperCase()}
                </span>
            </td>
            <td>
                <button class="action-btn" style="background:${isApproved ? '#f59e0b' : '#16a34a'}; color:#fff; padding:5px 9px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="toggleSurveyorStatus('${s.id}', '${status}')">
                    ${isApproved ? 'अस्वीकृत करें (Reject)' : 'स्वीकृत करें (Approve)'}
                </button>
                <button class="action-btn" style="background:#dc2626; color:#fff; padding:5px 9px; font-size:12px; border-radius:4px; border:none; cursor:pointer; margin-left:4px;" onclick="deleteSurveyor('${s.id}')">
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
   8. QUESTIONS MANAGEMENT
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
            <td><span class="badge" style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px;">${q.type || "text"}</span></td>
            <td>${q.options ? q.options.join(", ") : "-"}</td>
            <td>
                <button class="action-btn" style="background:#dc2626; color:#fff; padding:4px 8px; font-size:12px; border-radius:4px; border:none; cursor:pointer;" onclick="deleteQuestion('${q.id}')">🗑️</button>
            </td>
        `;
        questionsTableBody.appendChild(tr);
    });
}

const addQuestionForm = document.getElementById("addQuestionForm");
if (addQuestionForm) {
    addQuestionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = document.getElementById("newQuestionText").value.trim();
        const type = document.getElementById("newQuestionType").value;
        const optionsRaw = document.getElementById("newQuestionOptions").value.trim();

        let options = [];
        if (optionsRaw) {
            options = optionsRaw.split(",").map(o => o.trim()).filter(o => o.length > 0);
        }

        try {
            await db.collection("questions").add({
                text: text,
                type: type,
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
   9. SETTINGS & DAILY LIMIT
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
        console.warn("Could not load dailyLimit:", e);
    }
}

const saveDailyLimitBtn = document.getElementById("saveDailyLimitBtn");
if (saveDailyLimitBtn) {
    saveDailyLimitBtn.addEventListener("click", async () => {
        const input = document.getElementById("dailyLimitInput");
        const val = parseInt(input.value);
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
   10. FILTERS & SEARCH
   ========================================================= */
function applyFilters() {
    const q = (searchInput ? searchInput.value : "").toLowerCase();
    const selSurveyor = filterSurveyor ? filterSurveyor.value : "";
    const selDate = filterDate ? filterDate.value : "";

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
   11. ALL 5 DASHBOARD CARDS AUTO-SYNC
   ========================================================= */
function updateDashboardCards() {
    const totalCard = document.getElementById("totalSurveysCard") || document.getElementById("totalSurveys");
    const todayCard = document.getElementById("todaySurveysCard") || document.getElementById("todaySurveys");
    const weekCard = document.getElementById("thisWeekSurveysCard") || document.getElementById("weekSurveys") || document.getElementById("thisWeekSurveys");
    const monthCard = document.getElementById("thisMonthSurveysCard") || document.getElementById("monthSurveys") || document.getElementById("thisMonthSurveys");
    const questionsCard = document.getElementById("totalQuestionsCard") || document.getElementById("totalQuestions");

    // Total Surveys
    if (totalCard) totalCard.textContent = allSurveys.length;

    // Dates Calculations
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start of Week (Sunday/Monday based)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;

    allSurveys.forEach(s => {
        let dateObj = null;
        if (s.timestamp && s.timestamp.toDate) {
            dateObj = s.timestamp.toDate();
        } else if (s.createdAt) {
            dateObj = new Date(s.createdAt);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            const dateStr = dateObj.toISOString().split("T")[0];
            if (dateStr === todayStr) countToday++;
            if (dateObj >= startOfWeek) countWeek++;
            if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) countMonth++;
        }
    });

    if (todayCard) todayCard.textContent = countToday;
    if (weekCard) weekCard.textContent = countWeek;
    if (monthCard) monthCard.textContent = countMonth;
    if (questionsCard) questionsCard.textContent = allQuestions.length;
}
