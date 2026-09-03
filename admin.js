/* =========================================================
   SURVEYKSHAN - ADMIN PANEL (COMPLETELY INTEGRATED)
   ========================================================= */

// State Variables
let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let editingQuestionId = null;
let currentEditId = null;

// Authorized Admin Email
const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

// DOM Helper
const getEl = (id) => document.getElementById(id);

/* =========================================================
   1. UNIVERSAL PHOTO EXTRACTOR (Cloudinary & Local Safe)
   ========================================================= */
function getSurveyPhotosArray(survey) {
    if (!survey) return [];
    let photos = [];

    const checkAndAdd = (val) => {
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
        if (Array.isArray(survey.photos)) survey.photos.forEach(checkAndAdd);
        else if (typeof survey.photos === "object") Object.values(survey.photos).forEach(checkAndAdd);
        else if (typeof survey.photos === "string") checkAndAdd(survey.photos);
    }

    ["photoUrls", "photoURLs", "images", "imageUrls", "surveyPhotos"].forEach(key => {
        if (survey[key]) {
            if (Array.isArray(survey[key])) survey[key].forEach(checkAndAdd);
            else if (typeof survey[key] === "object") Object.values(survey[key]).forEach(checkAndAdd);
        }
    });

    ["photo1", "photo2", "photo3", "photo4", "photo_1", "photo_2", "photo_3", "photo_4"].forEach(k => {
        if (survey[k]) checkAndAdd(survey[k]);
    });

    ["photoURL", "photoUrl", "imageUrl", "imageURL", "cloudinaryURL", "photo", "image"].forEach(k => {
        if (survey[k]) checkAndAdd(survey[k]);
    });

    if (photos.length === 0) {
        Object.keys(survey).forEach(k => {
            const val = survey[k];
            if (typeof val === "string" && (val.includes("cloudinary.com") || val.includes("res.cloudinary"))) {
                checkAndAdd(val);
            }
        });
    }

    return photos;
}

/* =========================================================
   2. DATE FORMATTER (ELIMINATES "INVALID DATE")
   ========================================================= */
function formatSurveyDate(survey) {
    try {
        if (survey.timestamp && typeof survey.timestamp.toDate === "function") {
            return survey.timestamp.toDate().toLocaleString("en-IN");
        }
        if (survey.timestamp && typeof survey.timestamp === "object" && survey.timestamp.seconds !== undefined) {
            return new Date(survey.timestamp.seconds * 1000).toLocaleString("en-IN");
        }
        const fallback = survey.createdAt || survey.timestamp || survey.date;
        if (fallback) {
            const d = new Date(fallback);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString("en-IN");
            }
        }
    } catch (e) {}
    return "N/A";
}

/* =========================================================
   3. AUTHENTICATION OBSERVER
   ========================================================= */
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const email = (user.email || "").toLowerCase().trim();
    if (email !== ADMIN_EMAIL.toLowerCase()) {
        alert("केवल अधिकृत एडमिन ही इस पैनल को खोल सकता है!");
        firebase.auth().signOut().then(() => window.location.href = "login.html");
        return;
    }

    loadSurveysRealtime();
    loadSurveyorsRealtime();
    loadQuestionsRealtime();
    loadDailyLimit();
});

/* =========================================================
   4. SURVEYS TABLE RENDERER (WITH EDIT BUTTON)
   ========================================================= */
function loadSurveysRealtime() {
    firebase.firestore().collection("surveys").onSnapshot((snapshot) => {
        allSurveys = [];
        snapshot.forEach((doc) => {
            allSurveys.push({ id: doc.id, ...doc.data() });
        });

        allSurveys.sort((a, b) => {
            const getT = (obj) => {
                if (obj.timestamp?.toDate) return obj.timestamp.toDate().getTime();
                if (obj.timestamp?.seconds) return obj.timestamp.seconds * 1000;
                if (obj.createdAt) return new Date(obj.createdAt).getTime();
                return 0;
            };
            return getT(b) - getT(a);
        });

        renderSurveys(allSurveys);
        populateFilterDropdowns(allSurveys);
        updateDashboardCards();
    }, (error) => {
        console.error("Firestore Surveys Error:", error);
    });
}

function renderSurveys(surveys) {
    const surveyTable = getEl("surveyTable");
    if (!surveyTable) return;
    surveyTable.innerHTML = "";

    const filterCount = getEl("filterResultCount");
    if (filterCount) filterCount.textContent = `Showing: ${surveys.length} / ${allSurveys.length}`;

    if (surveys.length === 0) {
        surveyTable.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:#888;">कोई सर्वे रिकॉर्ड नहीं मिला।</td></tr>`;
        return;
    }

    surveys.forEach((survey) => {
        const photos = getSurveyPhotosArray(survey);
        const tr = document.createElement("tr");

        let photoHtml = `<span style="color:#94a3b8; font-size:12px;">No Photo</span>`;
        if (photos.length > 0) {
            photoHtml = `
                <button type="button" class="primary" style="padding:5px 9px; font-size:11px; border-radius:6px; margin:0;" onclick="openPhotosModal('${survey.id}')">
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
        const dateString = formatSurveyDate(survey);

        tr.innerHTML = `
            <td>${photoHtml}</td>
            <td style="font-weight:bold; color:#1565c0;">${survey.name || survey.respondentName || "-"}</td>
            <td>${survey.mobile || survey.phone || "-"}</td>
            <td>${survey.age || "-"}</td>
            <td>${survey.gender || "-"}</td>
            <td>${survey.village || "-"}</td>
            <td>${mapLink}</td>
            <td>
                <div style="font-weight:bold; font-size:12px;">${surveyorEmail}</div>
                <div style="font-size:11px; color:#666;">${dateString}</div>
            </td>
            <td>
                <div style="display:inline-flex; gap:4px;">
                    <button type="button" class="purple" style="padding:5px 8px; font-size:11px;" onclick="openAnswersModal('${survey.id}')">📋 Answers</button>
                    <button type="button" class="primary" style="padding:5px 8px; font-size:11px;" onclick="openEditModal('${survey.id}')">✏️ Edit</button>
                    <button type="button" class="danger" style="padding:5px 8px; font-size:11px;" onclick="deleteSurvey('${survey.id}')">🗑️ Delete</button>
                </div>
            </td>
        `;

        surveyTable.appendChild(tr);
    });
}

/* =========================================================
   5. EDIT MODAL LOGIC
   ========================================================= */
window.openEditModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    currentEditId = surveyId;
    if (getEl("editName")) getEl("editName").value = survey.name || survey.respondentName || "";
    if (getEl("editMobile")) getEl("editMobile").value = survey.mobile || survey.phone || "";
    if (getEl("editAge")) getEl("editAge").value = survey.age || "";
    if (getEl("editVillage")) getEl("editVillage").value = survey.village || "";

    const modal = getEl("editSurveyModal");
    if (modal) modal.classList.add("show");
};

window.closeEditModal = function() {
    const modal = getEl("editSurveyModal");
    if (modal) modal.classList.remove("show");
    currentEditId = null;
};

/* =========================================================
   6. 4-PHOTO MODAL
   ========================================================= */
window.openPhotosModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const photos = getSurveyPhotosArray(survey);
    const photosGrid = getEl("photosModalGrid");
    
    if (photosGrid) {
        photosGrid.innerHTML = "";
        if (photos.length === 0) {
            photosGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#888;">इस सर्वे में कोई फोटो उपलब्ध नहीं है।</p>`;
        } else {
            photos.forEach((url, idx) => {
                const card = document.createElement("div");
                card.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; padding:8px; text-align:center;";
                card.innerHTML = `
                    <img src="${url}" alt="Photo ${idx + 1}" style="width:100%; height:180px; object-fit:cover; border-radius:6px; cursor:pointer;" onclick="window.open('${url}', '_blank')">
                    <div style="margin-top:6px; font-size:12px; font-weight:bold; color:#334155;">Photo ${idx + 1}</div>
                    <a href="${url}" target="_blank" style="font-size:11px; color:#1565c0; text-decoration:none; display:inline-block; margin-top:3px;">🔍 Full View</a>
                `;
                photosGrid.appendChild(card);
            });
        }
    }

    const modal = getEl("photosModal");
    if (modal) modal.style.display = "flex";
};

window.closePhotosModal = function() {
    const modal = getEl("photosModal");
    if (modal) modal.style.display = "none";
};

/* =========================================================
   7. ANSWERS MODAL
   ========================================================= */
window.openAnswersModal = function(surveyId) {
    const survey = allSurveys.find(s => s.id === surveyId);
    if (!survey) return;

    const body = getEl("answerModalBody");
    if (body) {
        body.innerHTML = "";
        let answers = survey.answers || survey.responses || {};

        if (Array.isArray(answers)) {
            let mapped = {};
            answers.forEach((ans, i) => mapped[`Q${i+1}`] = ans);
            answers = mapped;
        }

        const keys = Object.keys(answers);
        if (keys.length === 0) {
            body.innerHTML = `<p style="text-align:center; color:#888;">कोई उत्तर दर्ज नहीं हैं।</p>`;
        } else {
            let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
            keys.forEach(k => {
                html += `
                    <div style="background:#f1f5f9; padding:12px; border-radius:8px; border-left:4px solid #1565c0;">
                        <div style="font-weight:bold; color:#1e293b; font-size:14px;">${k}</div>
                        <div style="color:#334155; margin-top:4px; font-size:13px;">${answers[k]}</div>
                    </div>
                `;
            });
            html += `</div>`;
            body.innerHTML = html;
        }
    }

    const modal = getEl("answerModal");
    if (modal) modal.classList.add("show");
};

/* =========================================================
   8. DASHBOARD CARDS SYNC
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
        let d = null;
        if (s.timestamp?.toDate) d = s.timestamp.toDate();
        else if (s.timestamp?.seconds) d = new Date(s.timestamp.seconds * 1000);
        else if (s.createdAt) d = new Date(s.createdAt);

        if (d && !isNaN(d.getTime())) {
            if (d.toISOString().split("T")[0] === todayStr) countToday++;
            if (d >= startOfWeek) countWeek++;
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) countMonth++;
        }
    });

    if (getEl("totalSurvey")) getEl("totalSurvey").textContent = allSurveys.length;
    if (getEl("todaySurvey")) getEl("todaySurvey").textContent = countToday;
    if (getEl("weekSurvey")) getEl("weekSurvey").textContent = countWeek;
    if (getEl("monthSurvey")) getEl("monthSurvey").textContent = countMonth;
    if (getEl("questionCount")) getEl("questionCount").textContent = allQuestions.length;
}

/* =========================================================
   9. DELETE SURVEYS
   ========================================================= */
window.deleteSurvey = async function(surveyId) {
    if (confirm("क्या आप वाकई इस सर्वे को हटाना चाहते हैं?")) {
        try {
            await firebase.firestore().collection("surveys").doc(surveyId).delete();
            alert("सर्वे सफलतापूर्वक हटा दिया गया।");
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    }
};

/* =========================================================
   10. SURVEYORS MANAGEMENT TABLE
   ========================================================= */
function loadSurveyorsRealtime() {
    firebase.firestore().collection("surveyors").onSnapshot((snapshot) => {
        allSurveyors = [];
        snapshot.forEach((doc) => {
            allSurveyors.push({ id: doc.id, ...doc.data() });
        });
        renderSurveyorsTable();
    });
}

function renderSurveyorsTable() {
    const tableBody = getEl("surveyorManagementTable");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (allSurveyors.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#888;">कोई सर्वेक्षक पंजीकृत नहीं है।</td></tr>`;
        return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    allSurveyors.forEach((s) => {
        const surveyorEmail = (s.email || s.id || "").toLowerCase();
        let total = 0, today = 0, week = 0, month = 0;

        allSurveys.forEach(surv => {
            const sEmail = (surv.surveyorEmail || surv.createdBy || "").toLowerCase();
            if (sEmail === surveyorEmail) {
                total++;
                let d = surv.timestamp?.toDate ? surv.timestamp.toDate() : (surv.timestamp?.seconds ? new Date(surv.timestamp.seconds * 1000) : (surv.createdAt ? new Date(surv.createdAt) : null));
                if (d && !isNaN(d.getTime())) {
                    if (d.toISOString().split("T")[0] === todayStr) today++;
                    if (d >= startOfWeek) week++;
                    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) month++;
                }
            }
        });

        const isApproved = (s.status === "approved" || s.active === true);
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td style="text-align:left; font-weight:bold;">${s.name || s.id} <br><small style="color:#666; font-weight:normal;">${s.email || s.id}</small></td>
            <td><strong>${total}</strong></td>
            <td>${today}</td>
            <td>${week}</td>
            <td>${month}</td>
            <td>
                <button type="button" class="${isApproved ? 'warning' : 'success'}" style="padding:4px 8px; font-size:11px;" onclick="toggleSurveyorStatus('${s.id}', '${s.status || (isApproved ? 'approved' : 'pending')}')">
                    ${isApproved ? 'Reject' : 'Approve'}
                </button>
                <button type="button" class="danger" style="padding:4px 8px; font-size:11px;" onclick="deleteSurveyor('${s.id}')">🗑️</button>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

window.toggleSurveyorStatus = async function(id, currentStatus) {
    const nextStatus = currentStatus === "approved" ? "pending" : "approved";
    try {
        await firebase.firestore().collection("surveyors").doc(id).set({
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
            await firebase.firestore().collection("surveyors").doc(id).delete();
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    }
};

/* =========================================================
   11. QUESTION MANAGER
   ========================================================= */
function loadQuestionsRealtime() {
    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        allQuestions = [];
        snapshot.forEach(doc => allQuestions.push({ id: doc.id, ...doc.data() }));

        const list = getEl("questionsList");
        if (list) {
            list.innerHTML = "";
            allQuestions.forEach((q, idx) => {
                const card = document.createElement("div");
                card.className = "question-card";
                card.innerHTML = `
                    <h3>${idx + 1}. ${q.text || q.question} (${q.type === 'single' ? 'Single Choice' : 'Multiple Choice'})</h3>
                    <p style="color:#555; margin:5px 0;">Options: ${q.options ? q.options.join(", ") : "None"}</p>
                    <button type="button" class="warning" onclick="editQuestion('${q.id}')">✏️ Edit</button>
                    <button type="button" class="danger" onclick="deleteQuestion('${q.id}')">🗑️ Delete</button>
                `;
                list.appendChild(card);
            });
        }
        updateDashboardCards();
    });
}

window.editQuestion = function(id) {
    const q = allQuestions.find(x => x.id === id);
    if (!q) return;

    editingQuestionId = id;
    getEl("questionText").value = q.text || q.question || "";
    getEl("questionType").value = q.type || "single";
    
    const container = getEl("optionsContainer");
    container.innerHTML = "";
    if (q.options && Array.isArray(q.options)) {
        q.options.forEach(opt => {
            const row = document.createElement("div");
            row.className = "option-row";
            row.innerHTML = `
                <input type="text" value="${opt}" class="question-opt-input">
                <button type="button" class="danger" onclick="this.parentElement.remove()">✖</button>
            `;
            container.appendChild(row);
        });
    }

    getEl("cancelEdit").style.display = "inline-block";
    getEl("questionManagerBody").style.display = "block";
    if (getEl("questionManagerToggle")) getEl("questionManagerToggle").textContent = "🙈 Hide";
};

window.deleteQuestion = async function(id) {
    if (confirm("क्या आप इस प्रश्न को हटाना चाहते हैं?")) {
        try {
            await firebase.firestore().collection("questions").doc(id).delete();
        } catch (e) {
            alert("त्रुटि: " + e.message);
        }
    }
};

/* =========================================================
   12. DAILY SURVEY LIMIT
   ========================================================= */
function loadDailyLimit() {
    firebase.firestore().collection("settings").doc("config").get().then((doc) => {
        if (doc.exists && doc.data().dailyLimit !== undefined) {
            const input = getEl("dailyLimitInput");
            if (input) input.value = doc.data().dailyLimit;
        }
    }).catch(e => console.warn(e));
}

/* =========================================================
   13. FILTERS (Populate & Apply)
   ========================================================= */
function populateFilterDropdowns(surveys) {
    const fillSelect = (selectId, values) => {
        const select = getEl(selectId);
        if (!select) return;
        const currentVal = select.value;
        const defaultOpt = select.options[0].outerHTML;
        select.innerHTML = defaultOpt;
        Array.from(values).sort().forEach(val => {
            if (val) {
                const opt = document.createElement("option");
                opt.value = val;
                opt.textContent = val;
                select.appendChild(opt);
            }
        });
        select.value = currentVal;
    };

    const names = new Set(), mobiles = new Set(), villages = new Set(), surveyors = new Set();
    surveys.forEach(s => {
        if (s.name || s.respondentName) names.add(s.name || s.respondentName);
        if (s.mobile || s.phone) mobiles.add(s.mobile || s.phone);
        if (s.village) villages.add(s.village);
        if (s.surveyorEmail || s.createdBy) surveyors.add(s.surveyorEmail || s.createdBy);
    });

    fillSelect("filterName", names);
    fillSelect("filterMobile", mobiles);
    fillSelect("filterVillage", villages);
    fillSelect("filterSurveyor", surveyors);
}

function applyFilters() {
    const fName = getEl("filterName")?.value || "";
    const fMobile = getEl("filterMobile")?.value || "";
    const fVillage = getEl("filterVillage")?.value || "";
    const fSurveyor = getEl("filterSurveyor")?.value || "";
    const fDate = getEl("filterDate")?.value || "";

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const filtered = allSurveys.filter(survey => {
        const name = survey.name || survey.respondentName || "";
        const mobile = survey.mobile || survey.phone || "";
        const village = survey.village || "";
        const surveyor = survey.surveyorEmail || survey.createdBy || "";

        if (fName && name !== fName) return false;
        if (fMobile && mobile !== fMobile) return false;
        if (fVillage && village !== fVillage) return false;
        if (fSurveyor && surveyor !== fSurveyor) return false;

        if (fDate) {
            let d = survey.timestamp?.toDate ? survey.timestamp.toDate() : (survey.timestamp?.seconds ? new Date(survey.timestamp.seconds * 1000) : (survey.createdAt ? new Date(survey.createdAt) : null));
            if (!d || isNaN(d.getTime())) return false;

            if (fDate === "today" && d.toISOString().split("T")[0] !== todayStr) return false;
            if (fDate === "week" && d < startOfWeek) return false;
            if (fDate === "month" && (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear)) return false;
        }

        return true;
    });

    renderSurveys(filtered);
}

/* =========================================================
   14. ATTACH ALL DOM EVENT LISTENERS
   ========================================================= */
window.addEventListener("DOMContentLoaded", () => {
    // Edit Form Submit
    const editForm = getEl("editSurveyForm");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentEditId) return;

            const updatedData = {
                name: getEl("editName").value.trim(),
                mobile: getEl("editMobile").value.trim(),
                age: getEl("editAge").value.trim(),
                village: getEl("editVillage").value.trim()
            };

            try {
                await firebase.firestore().collection("surveys").doc(currentEditId).update(updatedData);
                alert("सर्वे सफलतापूर्वक अपडेट हो गया!");
                closeEditModal();
            } catch (error) {
                alert("अपडेट करने में त्रुटि: " + error.message);
            }
        });
    }

    // Question Manager Toggle
    const qToggle = getEl("questionManagerToggle");
    if (qToggle) {
        qToggle.addEventListener("click", () => {
            const body = getEl("questionManagerBody");
            if (body) {
                const isHidden = body.style.display === "none";
                body.style.display = isHidden ? "block" : "none";
                qToggle.textContent = isHidden ? "🙈 Hide" : "👁️ Show";
            }
        });
    }

    // Add Option
    const addOpt = getEl("addOption");
    if (addOpt) {
        addOpt.addEventListener("click", () => {
            const container = getEl("optionsContainer");
            const row = document.createElement("div");
            row.className = "option-row";
            row.innerHTML = `
                <input type="text" placeholder="Option text" class="question-opt-input">
                <button type="button" class="danger" onclick="this.parentElement.remove()">✖</button>
            `;
            container.appendChild(row);
        });
    }

    // Save Question
    const saveQ = getEl("saveQuestion");
    if (saveQ) {
        saveQ.addEventListener("click", async () => {
            const text = getEl("questionText")?.value.trim();
            const type = getEl("questionType")?.value;
            const optInputs = document.querySelectorAll(".question-opt-input");
            let options = [];
            optInputs.forEach(input => {
                if (input.value.trim()) options.push(input.value.trim());
            });

            if (!text) {
                alert("कृपया प्रश्न दर्ज करें!");
                return;
            }

            try {
                if (editingQuestionId) {
                    await firebase.firestore().collection("questions").doc(editingQuestionId).update({
                        question: text,
                        text: text,
                        type: type,
                        options: options
                    });
                    editingQuestionId = null;
                    getEl("cancelEdit").style.display = "none";
                } else {
                    await firebase.firestore().collection("questions").add({
                        question: text,
                        text: text,
                        type: type,
                        options: options,
                        order: allQuestions.length + 1,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                getEl("questionText").value = "";
                getEl("optionsContainer").innerHTML = "";
                getEl("questionMessage").textContent = "प्रश्न सफलतापूर्वक सेव हो गया!";
                setTimeout(() => getEl("questionMessage").textContent = "", 3000);
            } catch (e) {
                alert("त्रुटि: " + e.message);
            }
        });
    }

    // Cancel Edit Question
    const cancelEdit = getEl("cancelEdit");
    if (cancelEdit) {
        cancelEdit.addEventListener("click", () => {
            editingQuestionId = null;
            getEl("questionText").value = "";
            getEl("optionsContainer").innerHTML = "";
            cancelEdit.style.display = "none";
        });
    }

    // Daily Limit Save
    const saveLimit = getEl("saveDailyLimit");
    if (saveLimit) {
        saveLimit.addEventListener("click", async () => {
            const val = parseInt(getEl("dailyLimitInput")?.value);
            if (!val || val < 1) {
                alert("कृपया सही संख्या दर्ज करें!");
                return;
            }
            try {
                await firebase.firestore().collection("settings").doc("config").set({ dailyLimit: val }, { merge: true });
                const msg = getEl("limitMessage");
                if (msg) {
                    msg.textContent = "✅ सेव हो गया!";
                    setTimeout(() => msg.textContent = "", 3000);
                }
            } catch (e) {
                alert("त्रुटि: " + e.message);
            }
        });
    }

    // Filter Buttons
    const applyFilter = getEl("applySurveyFilter");
    if (applyFilter) applyFilter.addEventListener("click", applyFilters);

    const clearFilter = getEl("clearSurveyFilter");
    if (clearFilter) {
        clearFilter.addEventListener("click", () => {
            ["filterName", "filterMobile", "filterVillage", "filterSurveyor", "filterDate"].forEach(id => {
                const el = getEl(id);
                if (el) el.value = "";
            });
            renderSurveys(allSurveys);
        });
    }

    // Close Answer Modal
    const closeAns = getEl("closeAnswerModal");
    if (closeAns) {
        closeAns.addEventListener("click", () => {
            const modal = getEl("answerModal");
            if (modal) modal.classList.remove("show");
        });
    }

    // Delete All Surveys
    const delAll = getEl("deleteAllSurveysBtn");
    if (delAll) {
        delAll.addEventListener("click", async () => {
            if (!confirm("चेतावनी: इससे सभी सर्वे हमेशा के लिए मिट जाएँगे! क्या आप जारी रखना चाहते हैं?")) return;
            try {
                const snap = await firebase.firestore().collection("surveys").get();
                const batch = firebase.firestore().batch();
                snap.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                alert("सभी सर्वे हटा दिए गए!");
            } catch (e) {
                alert("त्रुटि: " + e.message);
            }
        });
    }

    // Logout
    const logout = getEl("logoutBtn");
    if (logout) {
        logout.addEventListener("click", () => {
            firebase.auth().signOut().then(() => window.location.href = "login.html");
        });
    }
});
