/* =========================================================
   SURVEYKSHAN - PROFESSIONAL SURVEY LOGIC WITH DIRECT CAMERA
   ========================================================= */

let currentUser = null;
let dailyLimit = 20;
let todaySurveyCount = 0;
let userLocation = null;

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};

// 4 Specific Photos Object
let surveyPhotos = {
    photo1: null, // Village Photo
    photo2: null, // Problem Photo
    photo3: null, // Respondent Photo
    photo4: null  // Selfie Photo
};

// DOM Step Sections
const stepBasic = document.getElementById("stepBasic");
const stepQuestions = document.getElementById("stepQuestions");
const stepLocation = document.getElementById("stepLocation");
const stepPhotos = document.getElementById("stepPhotos");

// Step 1
const btnBasicNext = document.getElementById("btnBasicNext");
const todayCountEl = document.getElementById("todayCount");
const remainingCountEl = document.getElementById("remainingCount");
const messageEl = document.getElementById("message");

// Step 2
const questionNumberEl = document.getElementById("questionNumber");
const questionTextEl = document.getElementById("questionText");
const questionOptionsEl = document.getElementById("questionOptions");
const btnQuestionsPrev = document.getElementById("btnQuestionsPrev");
const btnQuestionsNext = document.getElementById("btnQuestionsNext");

// Step 3 (Location)
const locationCard = document.getElementById("locationCard");
const locStatusText = document.getElementById("locStatusText");
const btnGetLocation = document.getElementById("btnGetLocation");
const btnLocationPrev = document.getElementById("btnLocationPrev");
const btnLocationNext = document.getElementById("btnLocationNext");

// Step 4 (Photos & Submit)
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
});

/* =========================================================
   2. GPS LOCATION (CLICK TO CAPTURE)
   ========================================================= */
function captureLiveLocation() {
    if (!("geolocation" in navigator)) {
        alert("आपके डिवाइस में GPS लोकेशन सपोर्ट नहीं करता है।");
        return;
    }

    btnGetLocation.disabled = true;
    btnGetLocation.innerHTML = "<span>⏳ लोकेशन खोजी जा रही है...</span>";

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userLocation = {
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6))
            };

            // Success State UI
            locationCard.classList.add("captured");
            btnGetLocation.classList.add("success");
            btnGetLocation.disabled = false;
            btnGetLocation.innerHTML = "<span>✅ लोकेशन ले ली गई है</span>";
            locStatusText.innerHTML = `<strong style="color:#16a34a;">Lat:</strong> ${userLocation.latitude} | <strong style="color:#16a34a;">Lng:</strong> ${userLocation.longitude}`;
        },
        (err) => {
            console.warn("Location error:", err);
            btnGetLocation.disabled = false;
            btnGetLocation.innerHTML = "<span>⚠️ दोबारा प्रयास करें</span>";
            locStatusText.innerHTML = "<span style='color:#dc2626;'>लोकेशन अनुमति नहीं मिली! फ़ोन की GPS सेटिंग चालू करें।</span>";
            alert("कृपया अपने मोबाइल की लोकेशन (GPS) अनुमति चालू करें।");
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}
window.captureLiveLocation = captureLiveLocation;

/* =========================================================
   3. DIRECT CAMERA TRIGGER & LIVE PREVIEW
   ========================================================= */
function triggerCamera(inputId) {
    const inputEl = document.getElementById(inputId);
    if (inputEl) {
        inputEl.click();
    }
}
window.triggerCamera = triggerCamera;

async function handleLivePhoto(event, photoIndex) {
    const file = event.target.files[0];
    if (!file) return;

    // Fast Compression to keep submission instantaneous
    const compressedBase64 = await compressImage(file);
    surveyPhotos[`photo${photoIndex}`] = compressedBase64;

    // UI Updates
    const card = document.getElementById(`cardPhoto${photoIndex}`);
    const status = document.getElementById(`statusPhoto${photoIndex}`);
    const imgEl = document.getElementById(`prevPhoto${photoIndex}`);
    const iconEl = document.getElementById(`iconPhoto${photoIndex}`);

    if (card) card.classList.add("has-image");
    if (status) status.innerHTML = "<span style='color:#16a34a; font-weight:bold;'>✅ फोटो ले ली गई (बदलने के लिए फिर टैप करें)</span>";
    if (iconEl) iconEl.style.display = "none";
    if (imgEl) {
        imgEl.src = compressedBase64;
        imgEl.style.display = "block";
    }
}
window.handleLivePhoto = handleLivePhoto;

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDim = 800; // Optimal for mobile Firestore payloads
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
   4. LIMIT COUNTERS & PROGRESS
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
        if (data.timestamp) {
            const d = new Date(data.timestamp);
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
            messageEl.style.color = "#dc2626";
            messageEl.textContent = `⚠️ आज की निर्धारित लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`;
        }
        if (btnBasicNext) btnBasicNext.disabled = true;
    }
}

/* =========================================================
   5. LOAD DYNAMIC QUESTIONS
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

        stepBasic.style.display = "none";

        if (questions.length > 0) {
            stepQuestions.style.display = "block";
            currentQuestionIndex = 0;
            renderQuestion(currentQuestionIndex);
        } else {
            stepLocation.style.display = "block";
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
            label.style.cssText = "display:flex; align-items:center; gap:12px; margin:11px 0; font-weight:normal; font-size:15.5px; cursor:pointer;";

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
            <textarea id="textAnswerInput" placeholder="उत्तर यहाँ दर्ज करें..." style="margin-top:10px;">${savedAns || ""}</textarea>
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
            // सवालो के बाद सीधे लोकेशन स्टेप
            stepQuestions.style.display = "none";
            stepLocation.style.display = "block";
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
        if (!userLocation) {
            const proceedWithoutLoc = confirm("आपने अभी तक GPS लोकेशन कैप्चर नहीं की है। क्या आप फिर भी आगे बढ़ना चाहते हैं?");
            if (!proceedWithoutLoc) return;
        }

        stepLocation.style.display = "none";
        stepPhotos.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =========================================================
   9. STEP 4 (Photos) & FINAL SUBMIT
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

        // 4 Photos Array for Admin compatibility
        const photosArray = [
            surveyPhotos.photo1,
            surveyPhotos.photo2,
            surveyPhotos.photo3,
            surveyPhotos.photo4
        ].filter(Boolean);

        btnFinalSubmit.disabled = true;
        btnFinalSubmit.textContent = "⏳ सबमिशन व डुप्लीकेट जाँच जारी है...";

        try {
            // 1. DUPLICATE CHECK
            const duplicateCheck = await firebase.firestore()
                .collection("surveys")
                .where("mobile", "==", mobile)
                .get();

            if (!duplicateCheck.empty) {
                alert(`⚠️ डुप्लीकेट प्रविष्टि: मोबाइल नंबर ${mobile} से पहले ही सर्वे दर्ज हो चुका है!`);
                btnFinalSubmit.disabled = false;
                btnFinalSubmit.textContent = "Submit Survey (सर्वे सबमिट करें) ✅";
                stepPhotos.style.display = "none";
                stepBasic.style.display = "block";
                return;
            }

            // 2. Prepare Survey Document
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
                photos: photosArray, // एडमिन में Photos (4) बटन के लिए
                categorizedPhotos: {
                    villagePhoto: surveyPhotos.photo1,
                    issuePhoto: surveyPhotos.photo2,
                    respondentPhoto: surveyPhotos.photo3,
                    selfiePhoto: surveyPhotos.photo4
                },
                photoCount: photosArray.length,
                answers: userAnswers,
                surveyorEmail: currentUser.email,
                createdBy: currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: new Date().toISOString()
            };

            await firebase.firestore().collection("surveys").add(surveyData);

            alert("✅ सर्वे, GPS लोकेशन और चारों तस्वीरें सफलतापूर्वक सबमिट हो गईं!");

            // 3. Reset All Form State
            document.getElementById("name").value = "";
            document.getElementById("mobile").value = "";
            document.getElementById("age").value = "";
            document.getElementById("gender").value = "";
            document.getElementById("village").value = "";
            document.getElementById("district").value = "";
            document.getElementById("pincode").value = "";

            // Reset Photos & Location
            surveyPhotos = { photo1: null, photo2: null, photo3: null, photo4: null };
            userLocation = null;
            userAnswers = {};

            for (let i = 1; i <= 4; i++) {
                const card = document.getElementById(`cardPhoto${i}`);
                const status = document.getElementById(`statusPhoto${i}`);
                const imgEl = document.getElementById(`prevPhoto${i}`);
                const iconEl = document.getElementById(`iconPhoto${i}`);
                const inputEl = document.getElementById(`inputPhoto${i}`);

                if (card) card.classList.remove("has-image");
                if (status) status.innerHTML = (i === 4) ? "🤳 सेल्फी लेने के लिए टैप करें" : "📷 फोटो खींचने के लिए टैप करें";
                if (imgEl) { imgEl.src = ""; imgEl.style.display = "none"; }
                if (iconEl) iconEl.style.display = "block";
                if (inputEl) inputEl.value = "";
            }

            locationCard.classList.remove("captured");
            btnGetLocation.classList.remove("success");
            btnGetLocation.innerHTML = "<span>📍 अपनी लोकेशन चुनें</span>";
            locStatusText.innerHTML = "लोकेशन अभी कैप्चर नहीं की गई है";

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
            btnFinalSubmit.textContent = "Submit Survey (सर्वे सबमिट करें) ✅";
        }
    });
}
