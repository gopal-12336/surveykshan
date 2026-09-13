/* =========================================================
   SURVEYKSHAN - COMPLETE SURVEY LOGIC
   Flow: Basic Details -> Questionnaire -> Location -> Photos -> Submit
   ========================================================= */

let currentUser = null;
let dailyLimit = 20;
let todaySurveyCount = 0;
let userLocation = null;

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let capturedPhotos = [];

// DOM Steps
const stepBasic = document.getElementById("stepBasic");
const stepQuestions = document.getElementById("stepQuestions");
const stepLocation = document.getElementById("stepLocation");
const stepPhotos = document.getElementById("stepPhotos");

// Basic Detail Elements
const btnBasicNext = document.getElementById("btnBasicNext");
const todayCountEl = document.getElementById("todayCount");
const remainingCountEl = document.getElementById("remainingCount");
const messageEl = document.getElementById("message");

// Question Step Elements
const questionNumberEl = document.getElementById("questionNumber");
const questionTextEl = document.getElementById("questionText");
const questionOptionsEl = document.getElementById("questionOptions");
const btnQuestionsPrev = document.getElementById("btnQuestionsPrev");
const btnQuestionsNext = document.getElementById("btnQuestionsNext");

// Location Step Elements
const locationCoords = document.getElementById("locationCoords");
const btnLocationPrev = document.getElementById("btnLocationPrev");
const btnLocationNext = document.getElementById("btnLocationNext");

// Photo & Submit Elements
const surveyPhotosInput = document.getElementById("surveyPhotosInput");
const photoGrid = document.getElementById("photoGrid");
const btnPhotosPrev = document.getElementById("btnPhotosPrev");
const btnFinalSubmit = document.getElementById("btnFinalSubmit");

/* =========================================================
   1. AUTH STATE CHECK
   ========================================================= */
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    currentUser = user;

    await loadDailyLimitAndProgress();
    loadQuestionsFromFirestore();
    fetchLocation();
});

/* =========================================================
   2. GPS LOCATION FETCHER
   ========================================================= */
function fetchLocation() {
    if (locationCoords) locationCoords.innerHTML = "📡 GPS सिग्नल खोजा जा रहा है...";

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = {
                    latitude: Number(pos.coords.latitude.toFixed(6)),
                    longitude: Number(pos.coords.longitude.toFixed(6))
                };
                if (locationCoords) {
                    locationCoords.innerHTML = `✅ Lat: ${userLocation.latitude}<br>Lng: ${userLocation.longitude}`;
                }
            },
            (err) => {
                console.warn("Location Warning:", err);
                if (locationCoords) {
                    locationCoords.innerHTML = "⚠️ कृपया फ़ोन की GPS लोकेशन अनुमति ऑन करें";
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        if (locationCoords) locationCoords.innerHTML = "⚠️ GPS समर्थित नहीं है";
    }
}
window.fetchLocation = fetchLocation;

/* =========================================================
   3. PHOTO PROCESSING & RESIZING (OPTIMIZED FOR STORAGE)
   ========================================================= */
if (surveyPhotosInput) {
    surveyPhotosInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files).slice(0, 4);
        capturedPhotos = [];
        if (photoGrid) photoGrid.innerHTML = "";

        for (const file of files) {
            const base64 = await compressImage(file);
            capturedPhotos.push(base64);

            if (photoGrid) {
                const img = document.createElement("img");
                img.src = base64;
                photoGrid.appendChild(img);
            }
        }
    });
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDim = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                } else if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.65));
            };
        };
    });
}

/* =========================================================
   4. COUNTERS & DAILY LIMIT
   ========================================================= */
function parseDateSafely(data) {
    if (!data) return null;
    try {
        if (data.timestamp?.toDate) return data.timestamp.toDate();
        if (data.timestamp?.seconds) return new Date(data.timestamp.seconds * 1000);
        if (data.createdAt) {
            const d = new Date(data.createdAt);
            if (!isNaN(d.getTime())) return d;
        }
    } catch (e) {}
    return null;
}

async function loadDailyLimitAndProgress() {
    try {
        try {
            const configDoc = await firebase.firestore().collection("settings").doc("config").get();
            if (configDoc.exists && configDoc.data().dailyLimit !== undefined) {
                dailyLimit = Number(configDoc.data().dailyLimit) || 20;
            }
        } catch (e) {
            dailyLimit = 20;
        }

        const todayStr = new Date().toDateString();
        const snap = await firebase.firestore()
            .collection("surveys")
            .where("surveyorEmail", "==", currentUser.email)
            .get();

        todaySurveyCount = 0;
        snap.forEach(doc => {
            const d = parseDateSafely(doc.data());
            if (d && d.toDateString() === todayStr) {
                todaySurveyCount++;
            }
        });

        updateLimitUI();
    } catch (err) {
        updateLimitUI();
    }
}

function updateLimitUI() {
    const remaining = Math.max(0, dailyLimit - todaySurveyCount);
    if (todayCountEl) todayCountEl.textContent = todaySurveyCount;
    if (remainingCountEl) remainingCountEl.textContent = remaining;

    if (todaySurveyCount >= dailyLimit) {
        if (messageEl) {
            messageEl.style.color = "red";
            messageEl.textContent = `⚠️ आज की निर्धारित लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`;
        }
        if (btnBasicNext) btnBasicNext.disabled = true;
    }
}

/* =========================================================
   5. LOAD QUESTIONS FROM FIRESTORE
   ========================================================= */
function loadQuestionsFromFirestore() {
    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        questions = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            questions.push({
                id: doc.id,
                text: data.text || data.question || "प्रश्न",
                type: data.type || "radio",
                options: data.options || [],
                order: data.order || 0
            });
        });
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
}

/* =========================================================
   6. STEP 1 (Basic Details) -> STEP 2 (Questions)
   ========================================================= */
if (btnBasicNext) {
    btnBasicNext.addEventListener("click", () => {
        const name = document.getElementById("name")?.value.trim();
        const mobile = document.getElementById("mobile")?.value.trim();
        const age = document.getElementById("age")?.value.trim();
        const gender = document.getElementById("gender")?.value;
        const village = document.getElementById("village")?.value.trim();
        const district = document.getElementById("district")?.value.trim();
        const pincode = document.getElementById("pincode")?.value.trim();

        if (!name) { alert("कृपया नाम दर्ज करें!"); return; }
        if (!mobile || mobile.length < 10) { alert("कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें!"); return; }
        if (!age) { alert("कृपया उम्र दर्ज करें!"); return; }
        if (!gender) { alert("कृपया जेंडर चुनें!"); return; }
        if (!village) { alert("कृपया गाँव का नाम दर्ज करें!"); return; }
        if (!district) { alert("कृपया जिला दर्ज करें!"); return; }
        if (!pincode || pincode.length < 6) { alert("कृपया 6 अंकों का पिन कोड दर्ज करें!"); return; }

        if (todaySurveyCount >= dailyLimit) {
            alert(`⚠️ आपकी आज की लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`);
            return;
        }

        // Hide Step 1
        stepBasic.style.display = "none";

        // If questions exist, show question wizard; else go straight to Location
        if (questions.length > 0) {
            stepQuestions.style.display = "block";
            currentQuestionIndex = 0;
            renderQuestion(currentQuestionIndex);
        } else {
            stepLocation.style.display = "block";
            fetchLocation();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =========================================================
   7. STEP 2: QUESTIONS WIZARD NAVIGATION
   ========================================================= */
function renderQuestion(index) {
    if (!questions || questions.length === 0 || index >= questions.length) return;

    const q = questions[index];
    if (questionNumberEl) questionNumberEl.textContent = `Question ${index + 1} of ${questions.length}`;
    if (questionTextEl) questionTextEl.textContent = q.text;

    questionOptionsEl.innerHTML = "";
    const savedAns = userAnswers[q.id];

    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        q.options.forEach((opt) => {
            const label = document.createElement("label");
            label.style.cssText = "display:flex; align-items:center; gap:10px; margin:10px 0; font-weight:normal; font-size:16px; cursor:pointer;";

            const isChecked = Array.isArray(savedAns) ? savedAns.includes(opt) : savedAns === opt;
            const inputType = (q.type === "multiple" || q.type === "checkbox") ? "checkbox" : "radio";

            label.innerHTML = `
                <input type="${inputType}" name="current_q" value="${opt}" ${isChecked ? "checked" : ""} style="width:20px; min-height:20px;">
                <span>${opt}</span>
            `;
            questionOptionsEl.appendChild(label);
        });
    } else {
        questionOptionsEl.innerHTML = `
            <textarea id="textAnswerInput" placeholder="उत्तर दर्ज करें..." style="margin-top:10px;">${savedAns || ""}</textarea>
        `;
    }
}

function saveCurrentAnswer() {
    if (questions.length === 0) return;
    const q = questions[currentQuestionIndex];
    if (!q) return;

    const textInput = document.getElementById("textAnswerInput");
    if (textInput) {
        userAnswers[q.id] = textInput.value.trim();
        return;
    }

    const checkedInputs = questionOptionsEl.querySelectorAll("input[name='current_q']:checked");
    if (checkedInputs.length > 0) {
        if (q.type === "multiple" || q.type === "checkbox") {
            userAnswers[q.id] = Array.from(checkedInputs).map(i => i.value);
        } else {
            userAnswers[q.id] = checkedInputs[0].value;
        }
    }
}

if (btnQuestionsNext) {
    btnQuestionsNext.addEventListener("click", () => {
        saveCurrentAnswer();

        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            renderQuestion(currentQuestionIndex);
        } else {
            // All Questions Finished -> Move to Step 3 (Location)
            stepQuestions.style.display = "none";
            stepLocation.style.display = "block";
            fetchLocation();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

if (btnQuestionsPrev) {
    btnQuestionsPrev.addEventListener("click", () => {
        saveCurrentAnswer();

        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion(currentQuestionIndex);
        } else {
            // Back to Basic Details
            stepQuestions.style.display = "none";
            stepBasic.style.display = "block";
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =========================================================
   8. STEP 3 (Location) NAVIGATION
   ========================================================= */
if (btnLocationPrev) {
    btnLocationPrev.addEventListener("click", () => {
        stepLocation.style.display = "none";
        if (questions.length > 0) {
            stepQuestions.style.display = "block";
            currentQuestionIndex = questions.length - 1;
            renderQuestion(currentQuestionIndex);
        } else {
            stepBasic.style.display = "block";
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

if (btnLocationNext) {
    btnLocationNext.addEventListener("click", () => {
        // Move to Step 4 (Photos)
        stepLocation.style.display = "none";
        stepPhotos.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =========================================================
   9. STEP 4 (Photos) & FINAL SUBMISSION
   ========================================================= */
if (btnPhotosPrev) {
    btnPhotosPrev.addEventListener("click", () => {
        stepPhotos.style.display = "none";
        stepLocation.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

if (btnFinalSubmit) {
    btnFinalSubmit.addEventListener("click", async () => {
        const mobile = document.getElementById("mobile")?.value.trim();
        const village = document.getElementById("village")?.value.trim();

        btnFinalSubmit.disabled = true;
        btnFinalSubmit.textContent = "⏳ सबमिशन व डुप्लीकेट जाँच जारी है...";

        try {
            // 1. Strict Duplicate Check
            const duplicateCheck = await firebase.firestore()
                .collection("surveys")
                .where("mobile", "==", mobile)
                .get();

            if (!duplicateCheck.empty) {
                alert(`⚠️ डुप्लीकेट प्रविष्टि: मोबाइल नंबर ${mobile} से पहले ही सर्वे दर्ज हो चुका है!`);
                btnFinalSubmit.disabled = false;
                btnFinalSubmit.textContent = "Submit Survey ✅";
                stepPhotos.style.display = "none";
                stepBasic.style.display = "block";
                return;
            }

            // 2. Build Payload
            const surveyData = {
                name: document.getElementById("name")?.value.trim() || "",
                mobile: mobile,
                age: document.getElementById("age")?.value.trim() || "",
                gender: document.getElementById("gender")?.value || "",
                village: village || "",
                district: document.getElementById("district")?.value.trim() || "",
                pincode: document.getElementById("pincode")?.value.trim() || "",
                location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : village,
                latitude: userLocation ? userLocation.latitude : null,
                longitude: userLocation ? userLocation.longitude : null,
                photos: capturedPhotos,
                photoCount: capturedPhotos.length,
                answers: userAnswers,
                surveyorEmail: currentUser.email,
                createdBy: currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: new Date().toISOString()
            };

            await firebase.firestore().collection("surveys").add(surveyData);

            alert("✅ सर्वे, GPS लोकेशन और फोटो सफलतापूर्वक सबमिट हो गए!");

            // 3. Reset All Form State
            document.getElementById("name").value = "";
            document.getElementById("mobile").value = "";
            document.getElementById("age").value = "";
            document.getElementById("gender").value = "";
            document.getElementById("village").value = "";
            document.getElementById("district").value = "";
            document.getElementById("pincode").value = "";
            if (surveyPhotosInput) surveyPhotosInput.value = "";
            if (photoGrid) photoGrid.innerHTML = "";
            capturedPhotos = [];
            userAnswers = {};

            stepPhotos.style.display = "none";
            stepBasic.style.display = "block";

            todaySurveyCount++;
            updateLimitUI();
            window.scrollTo({ top: 0, behavior: "smooth" });

        } catch (err) {
            console.error("Submission failed:", err);
            alert("त्रुटि: " + err.message);
        } finally {
            btnFinalSubmit.disabled = false;
            btnFinalSubmit.textContent = "Submit Survey ✅";
        }
    });
}
