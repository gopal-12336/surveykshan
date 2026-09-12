/* =========================================================
   SURVEYKSHAN - SURVEYOR FORM SCRIPT (WITH DUPLICATE BLOCK)
   ========================================================= */

// Global State
let dynamicQuestions = [];
let userLocation = null;
let capturedPhotos = []; // Base64 or Blob objects
let dailyLimit = 20;

// Cloudinary Configuration (Unsigned Upload Preset)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/du7pmlt2m/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "survey_preset"; // आपका preset नाम या डिफ़ॉल्ट

// DOM Helpers
const getEl = (id) => document.getElementById(id);

/* =========================================================
   1. AUTH STATE & ACCESS CONTROL
   ========================================================= */
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const surveyorEmailEl = getEl("surveyorUserEmail") || getEl("currentUserEmail");
    if (surveyorEmailEl) surveyorEmailEl.textContent = user.email;

    // Load Settings, Questions & Stats
    await fetchDailyLimit();
    await checkDailySubmissions(user.email);
    loadQuestions();
    getGeolocation();
});

/* =========================================================
   2. DAILY LIMIT & COUNTER
   ========================================================= */
async function fetchDailyLimit() {
    try {
        const doc = await firebase.firestore().collection("settings").doc("config").get();
        if (doc.exists && doc.data().dailyLimit !== undefined) {
            dailyLimit = doc.data().dailyLimit;
        }
    } catch (e) {
        console.warn("Could not fetch daily limit:", e);
    }
}

async function checkDailySubmissions(email) {
    try {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const snap = await firebase.firestore()
            .collection("surveys")
            .where("surveyorEmail", "==", email)
            .get();

        let todayCount = 0;
        snap.forEach(doc => {
            const data = doc.data();
            let d = null;
            if (data.timestamp?.toDate) d = data.timestamp.toDate();
            else if (data.timestamp?.seconds) d = new Date(data.timestamp.seconds * 1000);
            else if (data.createdAt) d = new Date(data.createdAt);

            if (d && d.toISOString().split("T")[0] === todayStr) {
                todayCount++;
            }
        });

        const countEl = getEl("todaySubmissionCount");
        if (countEl) countEl.textContent = `${todayCount} / ${dailyLimit}`;

        if (todayCount >= dailyLimit) {
            const formCard = getEl("surveyFormCard") || getEl("surveyForm");
            if (formCard) {
                alert(`⚠️ आज की निर्धारित लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`);
            }
        }
    } catch (e) {
        console.error("Error checking daily submissions:", e);
    }
}

/* =========================================================
   3. GEOLOCATION FETCHER
   ========================================================= */
function getGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                };
                const locText = getEl("locationStatusText");
                if (locText) locText.innerHTML = `📍 लोकेशन प्राप्त: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
            },
            (err) => {
                console.warn("Location error:", err);
                const locText = getEl("locationStatusText");
                if (locText) locText.innerHTML = `⚠️ लोकेशन अनुमति नहीं मिली`;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
}

/* =========================================================
   4. LOAD DYNAMIC QUESTIONS FROM FIRESTORE
   ========================================================= */
function loadQuestions() {
    const container = getEl("dynamicQuestionsContainer") || getEl("questionsContainer");
    if (!container) return;

    firebase.firestore().collection("questions").orderBy("order", "asc").onSnapshot((snapshot) => {
        dynamicQuestions = [];
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `<p style="color:#64748b; font-size:13px;">कोई अतिरिक्त प्रश्न उपलब्ध नहीं हैं।</p>`;
            return;
        }

        let idx = 1;
        snapshot.forEach((doc) => {
            const q = { id: doc.id, ...doc.data() };
            dynamicQuestions.push(q);

            const qCard = document.createElement("div");
            qCard.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:12px;";

            let inputHtml = "";
            if (q.type === "multiple" || q.type === "checkbox") {
                (q.options || []).forEach(opt => {
                    inputHtml += `
                        <label style="display:flex; align-items:center; gap:8px; margin:6px 0; font-size:14px; cursor:pointer;">
                            <input type="checkbox" name="q_${q.id}" value="${opt}"> ${opt}
                        </label>
                    `;
                });
            } else if (q.options && q.options.length > 0) {
                // Single Choice Radio
                (q.options || []).forEach(opt => {
                    inputHtml += `
                        <label style="display:flex; align-items:center; gap:8px; margin:6px 0; font-size:14px; cursor:pointer;">
                            <input type="radio" name="q_${q.id}" value="${opt}" required> ${opt}
                        </label>
                    `;
                });
            } else {
                // Text input
                inputHtml = `<input type="text" name="q_${q.id}" class="input-box" placeholder="उत्तर दर्ज करें" style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; margin-top:6px;" required>`;
            }

            qCard.innerHTML = `
                <div style="font-weight:700; color:#1e293b; font-size:14px; margin-bottom:8px;">Q${idx}. ${q.text || q.question}</div>
                ${inputHtml}
            `;
            container.appendChild(qCard);
            idx++;
        });
    });
}

/* =========================================================
   5. PHOTO CAPTURE & COMPRESSION LOGIC
   ========================================================= */
const photoInput = getEl("surveyPhotoInput") || getEl("photoInput");
if (photoInput) {
    photoInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const previewContainer = getEl("photosPreviewGrid") || getEl("photoPreview");
        if (previewContainer) previewContainer.innerHTML = "";
        capturedPhotos = [];

        for (let i = 0; i < Math.min(files.length, 4); i++) {
            const file = files[i];
            const base64 = await readFileAsDataURL(file);
            capturedPhotos.push(base64);

            if (previewContainer) {
                const img = document.createElement("img");
                img.src = base64;
                img.style.cssText = "width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1;";
                previewContainer.appendChild(img);
            }
        }
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

async function uploadImagesToCloudinary(base64Images) {
    const uploadedUrls = [];
    for (const base64 of base64Images) {
        try {
            const formData = new FormData();
            formData.append("file", base64);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            const res = await fetch(CLOUDINARY_URL, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.secure_url) {
                uploadedUrls.push(data.secure_url);
            }
        } catch (err) {
            console.warn("Cloudinary direct upload failed, storing raw data:", err);
            uploadedUrls.push(base64);
        }
    }
    return uploadedUrls;
}

/* =========================================================
   6. DUPLICATE CHECK & FORM SUBMISSION
   ========================================================= */
const surveyForm = getEl("surveyForm") || document.querySelector("form");
const submitBtn = getEl("submitSurveyBtn") || (surveyForm ? surveyForm.querySelector("button[type='submit']") : null);

if (surveyForm) {
    surveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Validate Mobile Input
        const mobileEl = getEl("mobile") || getEl("respondentMobile") || surveyForm.querySelector("input[type='tel']");
        const mobile = mobileEl ? mobileEl.value.trim() : "";

        if (!mobile || mobile.length < 10) {
            alert("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें!");
            if (mobileEl) mobileEl.focus();
            return;
        }

        // 2. Disable Submit Button to Prevent Multiple Clicks
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.origText = submitBtn.innerHTML;
            submitBtn.innerHTML = "⏳ डुप्लीकेट जाँच व सबमिशन जारी है...";
        }

        try {
            // 3. DUPLICATE CHECK IN FIRESTORE
            const duplicateSnapshot = await firebase.firestore()
                .collection("surveys")
                .where("mobile", "==", mobile)
                .get();

            if (!duplicateSnapshot.empty) {
                alert(`⚠️ डुप्लीकेट प्रविष्टि!\nमोबाइल नंबर (${mobile}) से पहले ही सर्वे दर्ज हो चुका है।`);
                resetButtonState();
                return;
            }

            // 4. Collect Answers to Dynamic Questions
            let answersObject = {};
            dynamicQuestions.forEach((q) => {
                const radios = surveyForm.querySelectorAll(`input[name="q_${q.id}"]:checked`);
                if (radios.length > 0) {
                    if (radios.length === 1) {
                        answersObject[q.id] = radios[0].value;
                    } else {
                        answersObject[q.id] = Array.from(radios).map(r => r.value);
                    }
                } else {
                    const textInput = surveyForm.querySelector(`input[name="q_${q.id}"]`);
                    if (textInput && textInput.value.trim()) {
                        answersObject[q.id] = textInput.value.trim();
                    }
                }
            });

            // 5. Upload Captured Photos
            let finalPhotoUrls = [];
            if (capturedPhotos.length > 0) {
                if (submitBtn) submitBtn.innerHTML = "📷 फोटो अपलोड हो रही हैं...";
                finalPhotoUrls = await uploadImagesToCloudinary(capturedPhotos);
            }

            // 6. Form Payload
            const currentUser = firebase.auth().currentUser;
            const surveyPayload = {
                name: (getEl("name") || getEl("respondentName"))?.value.trim() || "",
                mobile: mobile,
                age: (getEl("age") || getEl("respondentAge"))?.value.trim() || "",
                gender: (getEl("gender") || getEl("respondentGender"))?.value || "",
                village: (getEl("village") || getEl("respondentVillage"))?.value.trim() || "",
                latitude: userLocation ? userLocation.latitude : null,
                longitude: userLocation ? userLocation.longitude : null,
                answers: answersObject,
                photos: finalPhotoUrls,
                photoCount: finalPhotoUrls.length,
                surveyorEmail: currentUser ? currentUser.email : "Unknown",
                createdBy: currentUser ? currentUser.email : "Unknown",
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: new Date().toISOString()
            };

            // 7. Save to Firestore
            await firebase.firestore().collection("surveys").add(surveyPayload);

            alert("✅ सर्वे सफलतापूर्वक दर्ज कर लिया गया है!");
            surveyForm.reset();
            capturedPhotos = [];
            const preview = getEl("photosPreviewGrid") || getEl("photoPreview");
            if (preview) preview.innerHTML = "";

            if (currentUser) {
                checkDailySubmissions(currentUser.email);
            }

        } catch (error) {
            console.error("Survey submission failure:", error);
            alert("त्रुटि: " + error.message);
        } finally {
            resetButtonState();
        }
    });
}

function resetButtonState() {
    if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.origText) {
            submitBtn.innerHTML = submitBtn.dataset.origText;
        } else {
            submitBtn.innerHTML = "सबमिट करें (Submit Survey)";
        }
    }
}

/* =========================================================
   7. LOGOUT
   ========================================================= */
const logoutBtn = getEl("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
            window.location.href = "index.html";
        });
    });
}
