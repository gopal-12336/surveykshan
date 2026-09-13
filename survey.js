/* =========================================================
   SURVEYKSHAN - COMPLETE SURVEYOR LOGIC (HTML MATCHED)
   ========================================================= */

// Global State
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
   2. DATE PARSER & DAILY LIMIT
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
        // 1. Settings से लिमिट लाएँ
        try {
            const configDoc = await firebase.firestore().collection("settings").doc("config").get();
            if (configDoc.exists && configDoc.data().dailyLimit !== undefined) {
                dailyLimit = Number(configDoc.data().dailyLimit) || 20;
            }
        } catch (e) {
            dailyLimit = 20;
        }

        // 2. आज के कुल सर्वे गिनें
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
        console.error("Counter load handled:", err);
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
            { enableHighAccuracy: false, timeout: 7000 }
        );
    }
}

/* =========================================================
   4. STEP 1 -> STEP 2 (Next Button Click)
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

        // Validation
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

        if (questions.length === 0) {
            alert("प्रश्न लोड हो रहे हैं, कृपया 2 सेकंड बाद पुनः प्रयास करें।");
            return;
        }

        // Switch Screen
        basicDetailsStep.style.display = "none";
        questionStep.style.display = "block";
        currentQuestionIndex = 0;
        renderQuestion(currentQuestionIndex);
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =========================================================
   5. QUESTIONS LOADER & WIZARD NAVIGATION
   ========================================================= */
function loadQuestionsFromFirestore() {
    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        questions = [];
        snapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() });
        });
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
}

function renderQuestion(index) {
    if (!questions || questions.length === 0 || index >= questions.length) return;

    const q = questions[index];
    if (questionNumberEl) questionNumberEl.textContent = `Question ${index + 1} of ${questions.length}`;
    if (questionTextEl) questionTextEl.textContent = q.text || q.question || "No Question Text";

    // Build Options
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

    // Previous Button Toggle
    if (previousButton) {
        previousButton.disabled = (index === 0);
    }

    // Next vs Submit Button Toggle
    if (index === questions.length - 1) {
        if (nextButton) nextButton.style.display = "none";
        if (submitSurveyBtn) submitSurveyBtn.style.display = "block";
    } else {
        if (nextButton) nextButton.style.display = "block";
        if (submitSurveyBtn) submitSurveyBtn.style.display = "none";
    }
}

function saveCurrentAnswer() {
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
            // First question: back to basic details
            questionStep.style.display = "none";
            basicDetailsStep.style.display = "block";
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
}

/* =========================================================
   6. FINAL SUBMIT WITH DUPLICATE CHECK
   ========================================================= */
if (submitSurveyBtn) {
    submitSurveyBtn.addEventListener("click", async () => {
        saveCurrentAnswer();

        const mobile = document.getElementById("mobile")?.value.trim();

        submitSurveyBtn.disabled = true;
        submitSurveyBtn.textContent = "⏳ सबमिशन व डुप्लीकेट जाँच जारी है...";

        try {
            // 1. DUPLICATE CHECK IN FIRESTORE
            const duplicateCheck = await firebase.firestore()
                .collection("surveys")
                .where("mobile", "==", mobile)
                .get();

            if (!duplicateCheck.empty) {
                alert(`⚠️ डुप्लीकेट प्रविष्टि: मोबाइल नंबर ${mobile} से पहले ही सर्वे दर्ज किया जा चुका है!`);
                submitSurveyBtn.disabled = false;
                submitSurveyBtn.textContent = "Submit Survey";
                return;
            }

            // 2. PAYLOAD
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

            // Reset Everything
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
