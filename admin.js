/* =========================================================
   SURVEYKSHAN - COMPLETE ADMIN SCRIPT WITH EXCEL EXPORT
   ========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allQuestionsMap = {};
let orderedQuestions = [];

// DOM References
const surveysTableBody = document.getElementById("surveysTableBody");
const statTotalSurveys = document.getElementById("statTotalSurveys");
const statTodaySurveys = document.getElementById("statTodaySurveys");
const statTotalSurveyors = document.getElementById("statTotalSurveyors");
const statTotalQuestions = document.getElementById("statTotalQuestions");
const adminEmailDisplay = document.getElementById("adminEmailDisplay");

/* =========================================================
   1. AUTHENTICATION & ACCESS GUARD
   ========================================================= */
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const currentEmail = (user.email || "").toLowerCase().trim();
    if (currentEmail !== ADMIN_EMAIL.toLowerCase()) {
        alert("⚠️ अनाधिकृत प्रवेश! केवल अधिकृत एडमिन ही यह डैशबोर्ड देख सकते हैं।");
        await firebase.auth().signOut();
        window.location.href = "index.html";
        return;
    }

    if (adminEmailDisplay) {
        adminEmailDisplay.textContent = user.email;
    }

    // Load initial data
    await loadAllAdminData();
});

function logoutAdmin() {
    firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
    });
}
window.logoutAdmin = logoutAdmin;

/* =========================================================
   2. DATA LOADER & AGGREGATOR
   ========================================================= */
async function loadAllAdminData() {
    if (surveysTableBody) {
        surveysTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#64748b;">⏳ डेटा लोड हो रहा है, कृपया प्रतीक्षा करें...</td></tr>`;
    }

    try {
        // A. Load Questions
        await loadQuestions();

        // B. Load Surveys
        await loadSurveys();

        // C. Update Dashboard Stats
        updateDashboardCounters();

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        if (surveysTableBody) {
            surveysTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#ef4444;">त्रुटि: ${err.message}</td></tr>`;
        }
    }
}
window.loadAllAdminData = loadAllAdminData;

async function loadQuestions() {
    allQuestionsMap = {};
    orderedQuestions = [];

    const snap = await firebase.firestore().collection("questions").get();
    const tempQuestions = [];

    snap.forEach((doc) => {
        const data = doc.data();
        const item = {
            id: doc.id,
            text: data.text || data.question || `Question_${doc.id}`,
            order: data.order !== undefined ? Number(data.order) : 999
        };
        tempQuestions.push(item);
        allQuestionsMap[doc.id] = item.text;
    });

    tempQuestions.sort((a, b) => a.order - b.order);
    orderedQuestions = tempQuestions;

    if (statTotalQuestions) {
        statTotalQuestions.textContent = tempQuestions.length;
    }
}

async function loadSurveys() {
    const snap = await firebase.firestore().collection("surveys").get();
    allSurveys = [];

    snap.forEach((doc) => {
        allSurveys.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Sort descending by date
    allSurveys.sort((a, b) => {
        const dateA = parseSurveyDate(a);
        const dateB = parseSurveyDate(b);
        return dateB - dateA;
    });

    renderSurveysTable(allSurveys);
}

/* =========================================================
   3. DATE & TIME UTILITY
   ========================================================= */
function parseSurveyDate(item) {
    if (!item) return new Date(0);
    try {
        if (item.timestamp?.toDate) return item.timestamp.toDate();
        if (item.timestamp?.seconds) return new Date(item.timestamp.seconds * 1000);
        if (item.createdAt) {
            const d = new Date(item.createdAt);
            if (!isNaN(d.getTime())) return d;
        }
        if (item.timestamp) {
            const d = new Date(item.timestamp);
            if (!isNaN(d.getTime())) return d;
        }
    } catch (e) {}
    return new Date(0);
}

function formatSurveyDate(item) {
    const d = parseSurveyDate(item);
    if (d.getTime() === 0) return "N/A";
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true
    });
}

/* =========================================================
   4. RENDER SURVEYS TABLE
   ========================================================= */
function renderSurveysTable(dataList) {
    if (!surveysTableBody) return;

    if (!dataList || dataList.length === 0) {
        surveysTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#64748b;">कोई सर्वे रिकॉर्ड नहीं मिला।</td></tr>`;
        return;
    }

    surveysTableBody.innerHTML = "";

    dataList.forEach((survey) => {
        const tr = document.createElement("tr");

        // Photo Count & Button
        const photoList = extractSurveyPhotos(survey);
        const photoBtnHtml = photoList.length > 0 
            ? `<button class="btn-table-photo" onclick="openPhotosModal('${survey.id}')">📷 Photos (${photoList.length})</button>`
            : `<span style="color:#94a3b8; font-size:12px;">No Photo</span>`;

        // Location & Map
        let locHtml = survey.village || "N/A";
        if (survey.latitude && survey.longitude) {
            locHtml += ` <a href="https://www.google.com/maps?q=${survey.latitude},${survey.longitude}" target="_blank" class="map-badge">📍 Map</a>`;
        }

        // Surveyor & Date
        const surveyorEmail = survey.surveyorEmail || survey.createdBy || "Unknown";
        const dateStr = formatSurveyDate(survey);

        tr.innerHTML = `
            <td>${photoBtnHtml}</td>
            <td style="font-weight:700; color:#1d4ed8;">${survey.name || "N/A"}</td>
            <td>${survey.mobile || "N/A"}</td>
            <td>${survey.age || "N/A"}</td>
            <td>${survey.gender || "N/A"}</td>
            <td>${survey.village || "N/A"}</td>
            <td>${locHtml}</td>
            <td>
                <div style="font-weight:700; color:#0f172a;">${surveyorEmail}</div>
                <div style="font-size:11px; color:#64748b;">${dateStr}</div>
            </td>
            <td>
                <button class="btn-table-answers" onclick="openAnswersModal('${survey.id}')">📋 Answers</button>
                <button class="btn-table-delete" onclick="deleteSurveyRecord('${survey.id}')">🗑️ Delete</button>
            </td>
        `;

        surveysTableBody.appendChild(tr);
    });
}

function extractSurveyPhotos(survey) {
    if (Array.isArray(survey.photos) && survey.photos.length > 0) {
        return survey.photos;
    }
    if (survey.categorizedPhotos) {
        const list = [
            survey.categorizedPhotos.villagePhoto,
            survey.categorizedPhotos.issuePhoto,
            survey.categorizedPhotos.respondentPhoto,
            survey.categorizedPhotos.selfiePhoto
        ].filter(Boolean);
        if (list.length > 0) return list;
    }
    if (survey.photoURL) return [survey.photoURL];
    if (survey.photo) return [survey.photo];
    return [];
}

/* =========================================================
   5. SEARCH FILTER
   ========================================================= */
function filterSurveysTable() {
    const q = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

    if (!q) {
        renderSurveysTable(allSurveys);
        return;
    }

    const filtered = allSurveys.filter((s) => {
        const name = (s.name || "").toLowerCase();
        const mobile = (s.mobile || "").toLowerCase();
        const village = (s.village || "").toLowerCase();
        const surveyor = (s.surveyorEmail || s.createdBy || "").toLowerCase();
        return name.includes(q) || mobile.includes(q) || village.includes(q) || surveyor.includes(q);
    });

    renderSurveysTable(filtered);
}
window.filterSurveysTable = filterSurveysTable;

/* =========================================================
   6. COUNTER CARDS UPDATE
   ========================================================= */
function updateDashboardCounters() {
    if (statTotalSurveys) {
        statTotalSurveys.textContent = allSurveys.length;
    }

    // Today's Count
    const todayStr = new Date().toDateString();
    let todayCount = 0;
    const uniqueSurveyors = new Set();

    allSurveys.forEach((s) => {
        const d = parseSurveyDate(s);
        if (d.toDateString() === todayStr) {
            todayCount++;
        }
        const surveyor = s.surveyorEmail || s.createdBy;
        if (surveyor) uniqueSurveyors.add(surveyor);
    });

    if (statTodaySurveys) statTodaySurveys.textContent = todayCount;
    if (statTotalSurveyors) statTotalSurveyors.textContent = uniqueSurveyors.size;
}

/* =========================================================
   7. EXCEL EXPORT SYSTEM (.XLSX)
   ========================================================= */
async function exportSurveysToExcel() {
    const exportBtn = document.getElementById("btnExportExcel");
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = "<span>⏳ एक्सेल तैयार हो रहा है...</span>";
    }

    try {
        if (!allSurveys || allSurveys.length === 0) {
            alert("⚠️ डाउनलोड करने के लिए कोई सर्वे डेटा उपलब्ध नहीं है!");
            return;
        }

        const excelRows = [];
        let index = 1;

        allSurveys.forEach((s) => {
            // Google Maps Link
            let mapLink = "N/A";
            if (s.latitude && s.longitude) {
                mapLink = `https://www.google.com/maps?q=${s.latitude},${s.longitude}`;
            }

            const photos = extractSurveyPhotos(s);

            const rowData = {
                "क्र. सं. (S.No)": index++,
                "सर्वेक्षक का ईमेल (Surveyor Email)": s.surveyorEmail || s.createdBy || "N/A",
                "सर्वे दिनांक व समय (Submission Date)": formatSurveyDate(s),
                "उत्तरदाता का नाम (Respondent Name)": s.name || "N/A",
                "मोबाइल नंबर (Mobile)": s.mobile || "N/A",
                "उम्र (Age)": s.age || "N/A",
                "लिंग (Gender)": s.gender || "N/A",
                "गाँव/वार्ड (Village)": s.village || "N/A",
                "जिला (District)": s.district || "N/A",
                "पिन कोड (PIN Code)": s.pincode || "N/A",
                "अक्षांश (Latitude)": s.latitude || "",
                "देशांतर (Longitude)": s.longitude || "",
                "गूगल मैप लिंक (Google Maps Link)": mapLink,
                "कुल फ़ोटो संख्या (Photos Count)": photos.length
            };

            // Dynamic Questions Columns (Mapped with Real Question Text)
            if (orderedQuestions.length > 0) {
                orderedQuestions.forEach((q) => {
                    let ans = s.answers ? s.answers[q.id] : "";
                    if (Array.isArray(ans)) ans = ans.join(", ");
                    rowData[q.text] = ans || "-";
                });
            } else if (s.answers) {
                Object.keys(s.answers).forEach((k) => {
                    let ans = s.answers[k];
                    if (Array.isArray(ans)) ans = ans.join(", ");
                    const title = allQuestionsMap[k] || k;
                    rowData[title] = ans || "-";
                });
            }

            excelRows.push(rowData);
        });

        // Generate Worksheet & Workbook
        const worksheet = XLSX.utils.json_to_sheet(excelRows);

        // Dynamic Column Auto-Width
        const colWidths = Object.keys(excelRows[0] || {}).map((k) => ({
            wch: Math.max(k.length + 4, 15)
        }));
        worksheet["!cols"] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Survey_Report");

        // Trigger Download
        const currentDate = new Date().toISOString().split("T")[0];
        XLSX.writeFile(workbook, `Surveykshan_Full_Report_${currentDate}.xlsx`);

    } catch (err) {
        console.error("Excel Export Failure:", err);
        alert("एक्सेल एक्सपोर्ट में समस्या आई: " + err.message);
    } finally {
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = "<span>📥 Export to Excel (.xlsx)</span>";
        }
    }
}
window.exportSurveysToExcel = exportSurveysToExcel;

/* =========================================================
   8. MODALS (PHOTOS & ANSWERS)
   ========================================================= */
function openPhotosModal(surveyId) {
    const survey = allSurveys.find((s) => s.id === surveyId);
    if (!survey) return;

    const modal = document.getElementById("photosModal");
    const container = document.getElementById("modalPhotosContainer");
    const title = document.getElementById("modalPhotoTitle");

    title.textContent = `Photos: ${survey.name || "Survey"} (${survey.mobile || ""})`;
    container.innerHTML = "";

    const photos = extractSurveyPhotos(survey);
    const labels = [
        "1. गाँव/शहर की फोटो",
        "2. समस्या की फोटो",
        "3. रिस्पॉन्डेंट की फोटो",
        "4. रिस्पॉन्डेंट के साथ सेल्फी"
    ];

    if (photos.length === 0) {
        container.innerHTML = `<p style="color:#64748b; font-size:14px; grid-column: 1 / -1;">कोई फोटो संलग्न नहीं है।</p>`;
    } else {
        photos.forEach((src, idx) => {
            const item = document.createElement("div");
            item.className = "modal-photo-item";
            item.innerHTML = `
                <a href="${src}" target="_blank">
                    <img src="${src}" alt="Photo ${idx + 1}">
                </a>
                <span>${labels[idx] || `Photo ${idx + 1}`}</span>
            `;
            container.appendChild(item);
        });
    }

    modal.style.display = "flex";
}
window.openPhotosModal = openPhotosModal;

function closePhotosModal() {
    document.getElementById("photosModal").style.display = "none";
}
window.closePhotosModal = closePhotosModal;

function openAnswersModal(surveyId) {
    const survey = allSurveys.find((s) => s.id === surveyId);
    if (!survey) return;

    const modal = document.getElementById("answersModal");
    const container = document.getElementById("modalAnswersContainer");
    const title = document.getElementById("modalAnswersTitle");

    title.textContent = `Answers: ${survey.name || "Survey"} (${survey.mobile || ""})`;
    container.innerHTML = "";

    const answers = survey.answers || {};
    const keys = Object.keys(answers);

    if (keys.length === 0) {
        container.innerHTML = `<p style="color:#64748b; font-size:14px;">कोई उत्तर दर्ज नहीं हैं।</p>`;
    } else {
        let idx = 1;
        // Match ordered questions first
        orderedQuestions.forEach((q) => {
            if (answers[q.id] !== undefined) {
                let ans = answers[q.id];
                if (Array.isArray(ans)) ans = ans.join(", ");
                container.innerHTML += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                        <div style="font-weight:700; color:#1e293b; font-size:14px; margin-bottom:4px;">Q${idx}. ${q.text}</div>
                        <div style="color:#1d4ed8; font-weight:600; font-size:14.5px;">${ans || "-"}</div>
                    </div>
                `;
                idx++;
            }
        });

        // Fallback for any questions not in ordered list
        keys.forEach((k) => {
            if (!orderedQuestions.some((q) => q.id === k)) {
                let ans = answers[k];
                if (Array.isArray(ans)) ans = ans.join(", ");
                container.innerHTML += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                        <div style="font-weight:700; color:#1e293b; font-size:14px; margin-bottom:4px;">${allQuestionsMap[k] || k}</div>
                        <div style="color:#1d4ed8; font-weight:600; font-size:14.5px;">${ans || "-"}</div>
                    </div>
                `;
            }
        });
    }

    modal.style.display = "flex";
}
window.openAnswersModal = openAnswersModal;

function closeAnswersModal() {
    document.getElementById("answersModal").style.display = "none";
}
window.closeAnswersModal = closeAnswersModal;

/* =========================================================
   9. DELETE RECORD
   ========================================================= */
async function deleteSurveyRecord(surveyId) {
    const ok = confirm("क्या आप वाकई इस सर्वे रिकॉर्ड को हमेशा के लिए हटाना चाहते हैं?");
    if (!ok) return;

    try {
        await firebase.firestore().collection("surveys").doc(surveyId).delete();
        alert("✅ सर्वे सफलतापूर्वक हटा दिया गया!");
        await loadAllAdminData();
    } catch (err) {
        console.error("Delete Error:", err);
        alert("हटाने में त्रुटि: " + err.message);
    }
}
window.deleteSurveyRecord = deleteSurveyRecord;
