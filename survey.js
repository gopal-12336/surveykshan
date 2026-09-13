/* =========================================================
   SURVEYKSHAN - FIXED & BULLETPROOF SURVEYOR LOGIC
   ========================================================= */

let currentUser = null;
let dailyLimit = 20;
let todaySurveyCount = 0;
let userLocation = null;

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};

// DOM Elements
const basicDetailsStep = document.getElementById("basicDetailsStep");
const questionStep = document.getElementById("questionStep");
const basicNextButton = document.getElementById("basicNextButton");
const messageEl = document.getElementById("message");

const todayCountEl = document.getElementById("todayCount");
const remainingCountEl = document.getElementById("remainingCount");

const questionNumberEl = document.getElementById("questionNumber");
const questionTextEl = document.getElementById("questionText");
const questionOptionsEl = document.getElementById("questionOptions");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const submitSurveyBtn = document.getElementById("submitSurvey");

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
   2. DATE PARSER & COUNTERS
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
        // Daily Limit
        try {
            const configDoc = await firebase.firestore().collection("settings").doc("config").get();
            if (configDoc.exists && configDoc.data().dailyLimit !== undefined) {
                dailyLimit = Number(configDoc.data().dailyLimit) || 20;
            }
        } catch (e) {
            dailyLimit = 20;
        }

        // Today's Surveys
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
        console.warn("Counter loaded with fallback:", err);
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
        if (basicNextButton) basicNextButton.disabled = true;
    }
}

/* =========================================================
   3. GEOLOCATION
   ========================================================= */
function fetchLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                };
            },
            (err) => console.warn("Location Warning:", err.message),
            { enableHighAccuracy: false, timeout: 6000 }
        );
    }
}

/* =========================================================
   4. LOAD QUESTIONS (FAIL-SAFE)
   ========================================================= */
function loadQuestionsFromFirestore() {
    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        questions = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            questions.push({
                id: doc.id,
                text: data.text || data.question || "सवाल",
                type: data.type || "radio",
                options: data.options || [],
                order: data.order || 0
            });
        });
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log("Total Questions Loaded:", questions.length);
    }, (err) => {
        console.error("Questions load error:", err);
    });
}

/* =========================================================
   5. STEP 1 -> STEP 2 (Next Button Click)
   ========================================================= */
if (basicNextButton) {
    basicNextButton.addEventListener("click", () => {
        const name = document.getElementById("name")?.value.trim();
        const mobile = document.getElementById("mobile")?.value.trim();
        const age = document.getElementById("age")?.value.trim();
        const gender = document.getElementById("gender")?.value;
        const village = document.getElementById("village")?.value.trim();
        const district = document.getElementById("district")?.value.trim();
        const pincode = document.getElementById("pincode")?.value.trim();

        // 1. Validation
        if (!name) { alert("कृपया नाम दर्ज करें!"); document.getElementById("name")?.focus(); return; }
        if (!mobile || mobile.length < 10) { alert("कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें!"); document.getElementById("mobile")?.focus(); return; }
        if (!age) { alert("कृपया उम्र दर्ज करें!"); document.getElementById("age")?.focus(); return; }
        if (!gender) { alert("कृपया जेंडर चुनें!"); document.getElementById("gender")?.focus(); return; }
        if (!village) { alert("कृपया गाँव का नाम दर्ज करें!"); document.getElementById("village")?.focus(); return; }
        if (!district) { alert("कृपया जिला दर्ज करें!"); document.getElementById("district")?.focus(); return; }
        if (!pincode || pincode.length < 6) { alert("कृपया 6 अंकों का पिन कोड दर्ज करें!"); document.getElementById("pincode")?.focus(); return; }

        if (todaySurveyCount >= dailyLimit) {
            alert(`⚠️ आपकी आज की लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`);
            return;
        }

        // 2. Switch to Questions Step
        basicDetailsStep.style.display = "none";
        questionStep.style.display = "block";
        currentQuestionIndex = 0;

        if (questions.length === 0) {
            // अगर अभी डेटाबेस में सवाल नहीं हैं, तो सीधे सबमिट विकल्प दें
            if (questionNumberEl) questionNumberEl.textContent = "";
            if (questionTextEl) questionTextEl.textContent = "कोई अतिरिक्त प्रश्न उपलब्ध नहीं हैं। कृपया सबमिट करें।";
            if (questionOptionsEl) questionOptionsEl.innerHTML = "";
            if (nextButton) nextButton.style.display = "none";
            if (submitSurveyBtn) submitSurveyBtn.style.display = "block";
        } else {
            renderQuestion(currentQuestionIndex);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =========================================================
   6. RENDER QUESTION WIZARD
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
                <input type="${inputType}" name="current_q" value="${opt}" ${isChecked ? "checked" : ""} style="width:20px; min-height:20px; cursor:pointer;">
                <span>${opt}</span>
            `;
            questionOptionsEl.appendChild(label);
        });
    } else {
        questionOptionsEl.innerHTML = `
            <textarea id="textAnswerInput" placeholder="उत्तर यहाँ दर्ज करें..." style="margin-top:10px;">${savedAns || ""}</textarea>
        `;
    }

    if (previousButton) {
        previousButton.disabled = false; //常に allow back to basic details or prev question
    }

    if (index === questions.length - 1) {
        if (nextButton) nextButton.style.display = "none";
        if (submitSurveyBtn) submitSurveyBtn.style.display = "block";
    } else {
        if (nextButton) nextButton.style.display = "block";
        if (submitSurveyBtn) submitSurveyBtn.style.display = "none";
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

if (nextButton) {
    nextButton.addEventListener("click", () => {
        saveCurrentAnswer();
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            renderQuestion(currentQuestionIndex);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
}

if (previousButton) {
    previousButton.addEventListener("click", () => {
        saveCurrentAnswer();
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion(currentQuestionIndex);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            questionStep.style.display = "none";
            basicDetailsStep.style.display = "block";
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
}

/* =========================================================
   7. FINAL SUBMIT (STRICT DUPLICATE BLOCK)
   ========================================================= */
if (submitSurveyBtn) {
    submitSurveyBtn.addEventListener("click", async () => {
        saveCurrentAnswer();

        const mobile = document.getElementById("mobile")?.value.trim();

        submitSurveyBtn.disabled = true;
        submitSurveyBtn.textContent = "⏳ जाँच और सबमिशन जारी है...";

        try {
            // DUPLICATE CHECK
            const duplicateCheck = await firebase.firestore()
                .collection("surveys")
                .where("mobile", "==", mobile)
                .get();

            if (!duplicateCheck.empty) {
                alert(`⚠️ डुप्लीकेट प्रविष्टि!\nमोबाइल नंबर (${mobile}) से पहले ही सर्वे दर्ज किया जा चुका है।`);
                submitSurveyBtn.disabled = false;
                submitSurveyBtn.textContent = "Submit Survey";
                questionStep.style.display = "none";
                basicDetailsStep.style.display = "block";
                return;
            }

            const surveyData = {
                name: document.getElementById("name")?.value.trim() || "",
                mobile: mobile,
                age: document.getElementById("age")?.value.trim() || "",
                gender: document.getElementById("gender")?.value || "",
                village: document.getElementById("village")?.value.trim() || "",
                district: document.getElementById("district")?.value.trim() || "",
                pincode: document.getElementById("pincode")?.value.trim() || "",
                location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : (document.getElementById("village")?.value.trim() || ""),
                latitude: userLocation ? userLocation.latitude : null,
                longitude: userLocation ? userLocation.longitude : null,
                answers: userAnswers,
                surveyorEmail: currentUser.email,
                createdBy: currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: new Date().toISOString()
            };

            await firebase.firestore().collection("surveys").add(surveyData);

            alert("✅ सर्वे सफलतापूर्वक सबमिट हो गया!");

            // Form Reset
            document.getElementById("name").value = "";
            document.getElementById("mobile").value = "";
            document.getElementById("age").value = "";
            document.getElementById("gender").value = "";
            document.getElementById("village").value = "";
            document.getElementById("district").value = "";
            document.getElementById("pincode").value = "";
            userAnswers = {};

            questionStep.style.display = "none";
            basicDetailsStep.style.display = "block";

            todaySurveyCount++;
            updateLimitUI();
            window.scrollTo({ top: 0, behavior: "smooth" });

        } catch (err) {
            console.error("Submission failed:", err);
            alert("त्रुटि: " + err.message);
        } finally {
            submitSurveyBtn.disabled = false;
            submitSurveyBtn.textContent = "Submit Survey";
        }
    });
}
