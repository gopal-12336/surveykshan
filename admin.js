/* =========================================================
   SURVEYKSHAN - ORIGINAL ADMIN SCRIPT WITH CLEAN EXCEL EXPORT
   ========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let surveysData = [];
let questionsList = [];
let questionsDict = {};

const surveyTbody = document.getElementById("surveyTbody");

/* 1. AUTH CHECK */
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const currentEmail = (user.email || "").toLowerCase().trim();
    if (currentEmail !== ADMIN_EMAIL.toLowerCase()) {
        alert("अनाधिकृत प्रवेश!");
        firebase.auth().signOut().then(() => window.location.href = "index.html");
        return;
    }

    const emailEl = document.getElementById("userEmailSpan");
    if (emailEl) emailEl.textContent = user.email;

    loadSurveysData();
});

function logoutAdmin() {
    firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
    });
}
window.logoutAdmin = logoutAdmin;

/* 2. FETCH QUESTIONS & SURVEYS */
async function loadSurveysData() {
    if (surveyTbody) {
        surveyTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:#777;">डेटा लोड हो रहा है...</td></tr>`;
    }

    try {
        // Load questions for mapping
        questionsList = [];
        questionsDict = {};
        const qSnap = await firebase.firestore().collection("questions").get();
        qSnap.forEach(doc => {
            const d = doc.data();
            const item = {
                id: doc.id,
                text: d.text || d.question || `Question_${doc.id}`,
                order: d.order !== undefined ? Number(d.order) : 999
            };
            questionsList.push(item);
            questionsDict[doc.id] = item.text;
        });
        questionsList.sort((a, b) => a.order - b.order);

        // Load surveys
        const sSnap = await firebase.firestore().collection("surveys").get();
        surveysData = [];
        sSnap.forEach(doc => {
            surveysData.push({ id: doc.id, ...doc.data() });
        });

        // Sort by Date Descending
        surveysData.sort((a, b) => getSurveyDate(b) - getSurveyDate(a));

        renderTable(surveysData);

    } catch (err) {
        console.error("Load Error:", err);
        if (surveyTbody) {
            surveyTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:red;">त्रुटि: ${err.message}</td></tr>`;
        }
    }
}
window.loadSurveysData = loadSurveysData;

/* 3. DATE HELPER */
function getSurveyDate(item) {
    if (!item) return new Date(0);
    try {
        if (item.timestamp?.toDate) return item.timestamp.toDate();
        if (item.timestamp?.seconds) return new Date(item.timestamp.seconds * 1000);
        if (item.createdAt) {
            const d = new Date(item.createdAt);
            if (!isNaN(d.getTime())) return d;
        }
    } catch (e) {}
    return new Date(0);
}

function formatFullDate(item) {
    const d = getSurveyDate(item);
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

/* 4. EXTRACT PHOTOS */
function getPhotos(item) {
    if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos;
    if (item.categorizedPhotos) {
        const arr = [
            item.categorizedPhotos.villagePhoto,
            item.categorizedPhotos.issuePhoto,
            item.categorizedPhotos.respondentPhoto,
            item.categorizedPhotos.selfiePhoto
        ].filter(Boolean);
        if (arr.length > 0) return arr;
    }
    if (item.photoURL) return [item.photoURL];
    if (item.photo) return [item.photo];
    return [];
}

/* 5. RENDER ORIGINAL BLUE TABLE */
function renderTable(list) {
    if (!surveyTbody) return;

    if (!list || list.length === 0) {
        surveyTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:#777;">कोई सर्वे रिकॉर्ड उपलब्ध नहीं है।</td></tr>`;
        return;
    }

    surveyTbody.innerHTML = "";

    list.forEach(item => {
        const tr = document.createElement("tr");

        const photos = getPhotos(item);
        const photoBtn = photos.length > 0
            ? `<button class="btn-photo-pill" onclick="openPhotoModal('${item.id}')">📷 Photos (${photos.length})</button>`
            : `<span style="color:#aaa;">No Photo</span>`;

        let locStr = item.village || "N/A";
        if (item.latitude && item.longitude) {
            locStr += ` <a href="https://www.google.com/maps?q=${item.latitude},${item.longitude}" target="_blank" class="badge-map">📍 Map</a>`;
        }

        const surveyorEmail = item.surveyorEmail || item.createdBy || "Unknown";
        const dateDisplay = formatFullDate(item);

        tr.innerHTML = `
            <td>${photoBtn}</td>
            <td style="font-weight:bold; color:#1565c0;">${item.name || "N/A"}</td>
            <td>${item.mobile || "N/A"}</td>
            <td>${item.age || "N/A"}</td>
            <td>${item.gender || "N/A"}</td>
            <td>${item.village || "N/A"}</td>
            <td>${locStr}</td>
            <td>
                <div style="font-weight:bold; color:#222;">${surveyorEmail}</div>
                <div style="font-size:12px; color:#666;">${dateDisplay}</div>
            </td>
            <td>
                <button class="btn-action-answers" onclick="openAnswersModal('${item.id}')">📋 Answers</button>
                <button class="btn-action-del" onclick="deleteSurvey('${item.id}')">🗑️ Delete</button>
            </td>
        `;

        surveyTbody.appendChild(tr);
    });
}

/* 6. SEARCH FILTER */
function filterTable() {
    const q = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
    if (!q) {
        renderTable(surveysData);
        return;
    }
    const filtered = surveysData.filter(s => {
        const name = (s.name || "").toLowerCase();
        const mobile = (s.mobile || "").toLowerCase();
        const village = (s.village || "").toLowerCase();
        const surveyor = (s.surveyorEmail || s.createdBy || "").toLowerCase();
        return name.includes(q) || mobile.includes(q) || village.includes(q) || surveyor.includes(q);
    });
    renderTable(filtered);
}
window.filterTable = filterTable;

/* 7. EXCEL EXPORT */
function exportExcel() {
    const btn = document.getElementById("btnExcel");
    if (!surveysData || surveysData.length === 0) {
        alert("⚠️ एक्सपोर्ट करने के लिए कोई डेटा नहीं है!");
        return;
    }

    if (btn) btn.innerText = "⏳ Exporting...";

    try {
        const rows = [];
        let idx = 1;

        surveysData.forEach(s => {
            let mapUrl = "N/A";
            if (s.latitude && s.longitude) {
                mapUrl = `https://www.google.com/maps?q=${s.latitude},${s.longitude}`;
            }

            const pList = getPhotos(s);

            const row = {
                "S.No": idx++,
                "Surveyor Email": s.surveyorEmail || s.createdBy || "N/A",
                "Submission Date": formatFullDate(s),
                "Respondent Name": s.name || "N/A",
                "Mobile": s.mobile || "N/A",
                "Age": s.age || "N/A",
                "Gender": s.gender || "N/A",
                "Village": s.village || "N/A",
                "District": s.district || "N/A",
                "PIN Code": s.pincode || "N/A",
                "Latitude": s.latitude || "",
                "Longitude": s.longitude || "",
                "Map Link": mapUrl,
                "Photos Count": pList.length
            };

            // Real Question text mapping
            if (questionsList.length > 0) {
                questionsList.forEach(q => {
                    let a = s.answers ? s.answers[q.id] : "";
                    if (Array.isArray(a)) a = a.join(", ");
                    row[q.text] = a || "-";
                });
            } else if (s.answers) {
                Object.keys(s.answers).forEach(k => {
                    let a = s.answers[k];
                    if (Array.isArray(a)) a = a.join(", ");
                    row[questionsDict[k] || k] = a || "-";
                });
            }

            rows.push(row);
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Surveys");

        const dateStr = new Date().toISOString().split("T")[0];
        XLSX.writeFile(wb, `Surveykshan_Report_${dateStr}.xlsx`);

    } catch (e) {
        alert("Export Error: " + e.message);
    } finally {
        if (btn) btn.innerText = "📥 Export to Excel";
    }
}
window.exportExcel = exportExcel;

/* 8. MODAL HANDLERS */
function openPhotoModal(id) {
    const item = surveysData.find(s => s.id === id);
    if (!item) return;

    const modal = document.getElementById("photosModal");
    const cont = document.getElementById("photosContainer");
    cont.innerHTML = "";

    const photos = getPhotos(item);
    const labels = ["गाँव/शहर की फोटो", "समस्या की फोटो", "रिस्पॉन्डेंट की फोटो", "सेल्फी"];

    photos.forEach((src, i) => {
        const d = document.createElement("div");
        d.style.textAlign = "center";
        d.innerHTML = `
            <a href="${src}" target="_blank"><img src="${src}"></a>
            <div style="font-size:12px; font-weight:bold; margin-top:5px; color:#444;">${labels[i] || `Photo ${i+1}`}</div>
        `;
        cont.appendChild(d);
    });

    modal.style.display = "flex";
}
window.openPhotoModal = openPhotoModal;

function openAnswersModal(id) {
    const item = surveysData.find(s => s.id === id);
    if (!item) return;

    const modal = document.getElementById("answersModal");
    const cont = document.getElementById("answersContainer");
    cont.innerHTML = "";

    const ans = item.answers || {};

    questionsList.forEach((q, i) => {
        if (ans[q.id] !== undefined) {
            let val = ans[q.id];
            if (Array.isArray(val)) val = val.join(", ");
            cont.innerHTML += `
                <div style="background:#f1f5f9; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-weight:bold; font-size:13px; color:#1565c0;">Q${i+1}. ${q.text}</div>
                    <div style="font-size:14px; color:#222; margin-top:4px;">${val || "-"}</div>
                </div>
            `;
        }
    });

    modal.style.display = "flex";
}
window.openAnswersModal = openAnswersModal;

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}
window.closeModal = closeModal;

/* 9. DELETE SURVEY */
async function deleteSurvey(id) {
    if (!confirm("क्या आप वाकई इसे हटाना चाहते हैं?")) return;
    try {
        await firebase.firestore().collection("surveys").doc(id).delete();
        alert("✅ सर्वे हटा दिया गया!");
        loadSurveysData();
    } catch (e) {
        alert("Error: " + e.message);
    }
}
window.deleteSurvey = deleteSurvey;
