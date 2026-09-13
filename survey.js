/* =========================================================
   SURVEYKSHAN - COMPLETE SURVEYOR JS (MULTI-STEP & DUPLICATE BLOCK)
   ========================================================= */

// Global App State
let currentUser = null;
let dailyLimit = 20;
let todaySurveyCount = 0;
let userLocation = null;
let currentStep = 1;
let dynamicQuestions = [];
let capturedPhotos = [];

// DOM Helper
const getEl = (id) => document.getElementById(id);

/* =========================================================
   1. AUTH OBSERVER & INITIALIZATION
   ========================================================= */
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;

    // Set user profile info if elements exist
    const surveyorEmailEl = getEl("surveyorUserEmail") || getEl("currentUserEmail") || getEl("surveyorEmail");
    if (surveyorEmailEl) surveyorEmailEl.textContent = user.email;

    // Load initial data
    await loadDailyLimitAndCounts();
    loadQuestions();
    fetchLocation();
});

/* =========================================================
   2. DAILY LIMIT & STATS COUNTER
   ========================================================= */
async function loadDailyLimitAndCounts() {
    try {
        // 1. Fetch Daily Limit (Fallback: 20)
        try {
            const configDoc = await firebase.firestore().collection("settings").doc("config").get();
            if (configDoc.exists && configDoc.data().dailyLimit !== undefined) {
                dailyLimit = Number(configDoc.data().dailyLimit) || 20;
            }
        } catch (e) {
            console.warn("Using default limit 20:", e);
            dailyLimit = 20;
        }

        // 2. Fetch Today's Surveys Count for current surveyor
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const snap = await firebase.firestore()
            .collection("surveys")
            .where("surveyorEmail", "==", currentUser.email)
            .get();

        todaySurveyCount = 0;
        snap.forEach(doc => {
            const data = doc.data();
            let d = null;
            if (data.timestamp?.toDate) d = data.timestamp.toDate();
            else if (data.timestamp?.seconds) d = new Date(data.timestamp.seconds * 1000);
            else if (data.createdAt) d = new Date(data.createdAt);

            if (d && d.toISOString().split("T")[0] === todayStr) {
                todayCountMatch(todaySurveyCount++);
            }
        });

        function todayCountMatch() {} // helper

        updateCounterUI();
    } catch (err) {
        console.error("Counter load error:", err);
        updateCounterUI(); // Ensure UI never stays stuck on 'Loading...'
    }
}

function updateCounterUI() {
    const remaining = Math.max(0, dailyLimit - todaySurveyCount);

    // Update various ID patterns if present in HTML
    const todayEl = getEl("todaySurveys") || getEl("todaySurvey") || document.querySelector(".today-count");
    if (todayEl) todayEl.textContent = todaySurveyCount;

    const remainingEl = getEl("remainingSurveys") || getEl("remainingCount") || document.querySelector(".remaining-count");
    if (remainingEl) remainingEl.textContent = remaining;

    // Text replacement fallback if structure is inside an info box
    const infoBox = document.querySelector(".stat-box, .survey-count-box, [class*='surveys']");
    const allSpans = document.querySelectorAll("span, p, div");
    allSpans.forEach(el => {
        if (el.textContent.includes("Remaining:") && el.textContent.includes("Loading")) {
            el.innerHTML = `Remaining: <strong>${remaining}</strong>`;
        }
        if (el.textContent.includes("Today's Surveys:") && el.textContent.includes("0")) {
            el.innerHTML = `📊 Today's Surveys: <strong>${todaySurveyCount}</strong>`;
        }
    });
}

/* =========================================================
   3. GEOLOCATION FETCHER
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
            (err) => {
                console.warn("Location permission warning:", err);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }
}

/* =========================================================
   4. STEP NAVIGATION (NEXT / PREVIOUS BUTTONS)
   ========================================================= */
window.nextStep = function() {
    // Step 1 Validation: Respondent Details
    if (currentStep === 1) {
        const mobileEl = getEl("mobile") || document.querySelector("input[type='tel']") || document.querySelector("input[placeholder*='Mobile']");
        const ageEl = getEl("age") || document.querySelector("input[placeholder*='Age']");
        const villageEl = getEl("village") || document.querySelector("input[placeholder*='Village']");

        if (mobileEl && (!mobileEl.value.trim() || mobileEl.value.trim().length < 10)) {
            alert("कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें!");
            mobileEl.focus();
            return;
        }

        if (todaySurveyCount >= dailyLimit) {
            alert(`⚠️ आपकी आज की लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`);
            return;
        }

        showStep(2);
    } else if (currentStep === 2) {
        showStep(3);
    }
};

window.prevStep = function() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
};

function showStep(stepNum) {
    currentStep = stepNum;

    // Detect steps by ID, Class, or data attributes
    const step1 = getEl("step1") || getEl("step-1") || document.querySelector(".step-1") || document.querySelector("[data-step='1']");
    const step2 = getEl("step2") || getEl("step-2") || document.querySelector(".step-2") || document.querySelector("[data-step='2']");
    const step3 = getEl("step3") || getEl("step-3") || document.querySelector(".step-3") || document.querySelector("[data-step='3']");

    const steps = [step1, step2, step3].filter(Boolean);

    if (steps.length > 0) {
        steps.forEach((el, index) => {
            el.style.display = (index + 1 === stepNum) ? "block" : "none";
        });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   5. DYNAMIC QUESTIONS LOADER
   ========================================================= */
function loadQuestions() {
    const container = getEl("questionsContainer") || getEl("dynamicQuestionsContainer") || getEl("step2");
    if (!container) return;

    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        dynamicQuestions = [];
        const questionMount = getEl("questionListMount") || container;

        if (getEl("questionListMount")) questionMount.innerHTML = "";

        snapshot.forEach((doc) => {
            dynamicQuestions.push({ id: doc.id, ...doc.data() });
        });

        dynamicQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));

        if (getEl("questionListMount")) {
            dynamicQuestions.forEach((q, idx) => {
                const card = document.createElement("div");
                card.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:12px;";

                let optsHtml = "";
                if (q.options && Array.isArray(q.options)) {
                    q.options.forEach(opt => {
                        optsHtml += `
                            <label style="display:flex; align-items:center; gap:8px; margin:7px 0; font-size:14px; cursor:pointer;">
                                <input type="${q.type === 'multiple' ? 'checkbox' : 'radio'}" name="q_${q.id}" value="${opt}">
                                ${opt}
                            </label>
                        `;
                    });
                }

                card.innerHTML = `
                    <div style="font-weight:700; color:#1e293b; font-size:14px; margin-bottom:8px;">${idx + 1}. ${q.text || q.question}</div>
                    ${optsHtml}
                `;
                questionMount.appendChild(card);
            });
        }
    });
}

/* =========================================================
   6. PHOTO CAPTURE HANDLER
   ========================================================= */
const photoInput = getEl("photoInput") || document.querySelector("input[type='file']");
if (photoInput) {
    photoInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files).slice(0, 4);
        capturedPhotos = [];
        const preview = getEl("photoPreviewGrid") || getEl("photoPreview");
        if (preview) preview.innerHTML = "";

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = (event) => {
                capturedPhotos.push(event.target.result);
                if (preview) {
                    const img = document.createElement("img");
                    img.src = event.target.result;
                    img.style.cssText = "width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #ccc; margin:4px;";
                    preview.appendChild(img);
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

/* =========================================================
   7. FORM SUBMISSION WITH STRICT DUPLICATE BLOCK
   ========================================================= */
const surveyForm = document.querySelector("form");
if (surveyForm) {
    surveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Get Mobile Number
        const mobileEl = getEl("mobile") || document.querySelector("input[type='tel']") || document.querySelector("input[placeholder*='Mobile']");
        const mobile = mobileEl ? mobileEl.value.trim() : "";

        if (!mobile || mobile.length < 10) {
            alert("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें!");
            showStep(1);
            if (mobileEl) mobileEl.focus();
            return;
        }

        // 2. Lock Submit Button Immediately
        const submitBtn = surveyForm.querySelector("button[type='submit']") || getEl("submitSurveyBtn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.origText = submitBtn.innerHTML;
            submitBtn.innerHTML = "⏳ जाँच और सबमिशन जारी है...";
        }

        try {
            // 3. DUPLICATE CHECK IN FIRESTORE
            const duplicateCheck = await firebase.firestore()
                .collection("surveys")
                .where("mobile", "==", mobile)
                .get();

            if (!duplicateCheck.empty) {
                alert(`⚠️ डुप्लीकेट प्रविष्टि: मोबाइल नंबर ${mobile} से पहले ही सर्वे दर्ज किया जा चुका है!`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitBtn.dataset.origText || "सबमिट करें";
                }
                showStep(1);
                return;
            }

            // 4. Collect Dynamic Answers
            const answers = {};
            dynamicQuestions.forEach(q => {
                const checked = surveyForm.querySelectorAll(`input[name="q_${q.id}"]:checked`);
                if (checked.length > 0) {
                    answers[q.id] = checked.length === 1 ? checked[0].value : Array.from(checked).map(c => c.value);
                }
            });

            // 5. Build Survey Payload
            const nameEl = getEl("name") || document.querySelector("input[placeholder*='Name']");
            const ageEl = getEl("age") || document.querySelector("input[placeholder*='Age']");
            const genderEl = getEl("gender") || document.querySelector("select");
            const villageEl = getEl("village") || document.querySelector("input[placeholder*='Village']");
            const districtEl = getEl("district") || document.querySelector("input[placeholder*='District']");
            const pincodeEl = getEl("pincode") || getEl("pinCode") || document.querySelector("input[placeholder*='PIN']");

            const surveyData = {
                name: nameEl ? nameEl.value.trim() : "",
                mobile: mobile,
                age: ageEl ? ageEl.value.trim() : "",
                gender: genderEl ? genderEl.value : "",
                village: villageEl ? villageEl.value.trim() : "",
                district: districtEl ? districtEl.value.trim() : "",
                pincode: pincodeEl ? pincodeEl.value.trim() : "",
                location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : (villageEl ? villageEl.value.trim() : ""),
                latitude: userLocation ? userLocation.latitude : null,
                longitude: userLocation ? userLocation.longitude : null,
                answers: answers,
                photos: capturedPhotos,
                photoCount: capturedPhotos.length,
                surveyorEmail: currentUser.email,
                createdBy: currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: new Date().toISOString()
            };

            // 6. Save to Firestore
            await firebase.firestore().collection("surveys").add(surveyData);

            alert("✅ सर्वे सफलतापूर्वक सबमिट हो गया!");
            surveyForm.reset();
            capturedPhotos = [];
            todaySurveyCount++;
            updateCounterUI();
            showStep(1);

        } catch (error) {
            console.error("Submission Error:", error);
            alert("सबमिशन विफल: " + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.origText || "सबमिट करें";
            }
        }
    });
}

/* =========================================================
   8. ATTACH CLICK LISTENERS
   ========================================================= */
window.addEventListener("DOMContentLoaded", () => {
    // Attach event to Next button if not using inline onclick
    const nextButtons = document.querySelectorAll("button");
    nextButtons.forEach(btn => {
        if (btn.textContent.includes("Next") || btn.id === "nextBtn") {
            btn.addEventListener("click", (e) => {
                if (btn.type !== "submit") {
                    e.preventDefault();
                    window.nextStep();
                }
            });
        }
        if (btn.textContent.includes("Back") || btn.textContent.includes("Previous") || btn.id === "prevBtn") {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                window.prevStep();
            });
        }
    });
});
