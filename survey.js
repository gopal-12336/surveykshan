/* =========================================================
   SURVEYKSHAN - FIXED SURVEYOR SCRIPT (DATE ERROR FIXED)
   ========================================================= */

let currentUser = null;
let dailyLimit = 20;
let todaySurveyCount = 0;
let userLocation = null;
let currentStep = 1;
let dynamicQuestions = [];
let capturedPhotos = [];

const getEl = (id) => document.getElementById(id);

/* 1. AUTHENTICATION */
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    currentUser = user;

    const emailDisplay = getEl("surveyorUserEmail") || getEl("currentUserEmail") || getEl("surveyorEmail");
    if (emailDisplay) emailDisplay.textContent = user.email;

    await loadDailyLimitAndCounts();
    loadQuestions();
    fetchLocation();
});

/* 2. SAFE DATE PARSER */
function parseDateSafely(data) {
    if (!data) return null;
    try {
        if (data.timestamp?.toDate) return data.timestamp.toDate();
        if (data.timestamp?.seconds) return new Date(data.timestamp.seconds * 1000);
        if (data.createdAt) {
            const parsed = new Date(data.createdAt);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        if (data.timestamp) {
            const parsed = new Date(data.timestamp);
            if (!isNaN(parsed.getTime())) return parsed;
        }
    } catch (e) {}
    return null;
}

/* 3. DAILY LIMIT & SAFE COUNTER */
async function loadDailyLimitAndCounts() {
    try {
        try {
            const configDoc = await firebase.firestore().collection("settings").doc("config").get();
            if (configDoc.exists && configDoc.data().dailyLimit !== undefined) {
                dailyLimit = Number(configDoc.data().dailyLimit) || 20;
            }
        } catch (e) {
            dailyLimit = 20;
        }

        const now = new Date();
        const todayStr = now.toDateString(); // Safe local date comparison

        const snap = await firebase.firestore()
            .collection("surveys")
            .where("surveyorEmail", "==", currentUser.email)
            .get();

        todaySurveyCount = 0;
        snap.forEach(doc => {
            const data = doc.data();
            const surveyDate = parseDateSafely(data);

            if (surveyDate && !isNaN(surveyDate.getTime())) {
                if (surveyDate.toDateString() === todayStr) {
                    todaySurveyCount++;
                }
            }
        });

        updateCounterUI();
    } catch (err) {
        console.error("Counter load handled:", err);
        updateCounterUI();
    }
}

function updateCounterUI() {
    const remaining = Math.max(0, dailyLimit - todaySurveyCount);

    if (getEl("todaySurveys")) getEl("todaySurveys").textContent = todaySurveyCount;
    if (getEl("todaySurvey")) getEl("todaySurvey").textContent = todaySurveyCount;
    if (getEl("remainingSurveys")) getEl("remainingSurveys").textContent = remaining;
    if (getEl("remainingCount")) getEl("remainingCount").textContent = remaining;

    const elements = document.querySelectorAll("span, p, b, strong");
    elements.forEach(el => {
        if (el.children.length === 0) {
            if (el.textContent.includes("Loading...")) {
                el.textContent = remaining;
            }
            if (el.textContent === "0" && el.parentElement?.textContent.includes("Today's")) {
                el.textContent = todaySurveyCount;
            }
        }
    });
}

/* 4. LOCATION (GEOLOCATION) */
function fetchLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                };
            },
            (err) => console.warn("Location permission warning:", err.message),
            { enableHighAccuracy: false, timeout: 5000 }
        );
    }
}

/* 5. MULTI-STEP NAVIGATION */
window.nextStep = function() {
    const mobileInput = document.querySelector("input[type='tel']") || getEl("mobile") || document.querySelector("input[placeholder*='Mobile']");
    
    if (mobileInput && (!mobileInput.value.trim() || mobileInput.value.trim().length < 10)) {
        alert("कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें!");
        mobileInput.focus();
        return;
    }

    if (todaySurveyCount >= dailyLimit) {
        alert(`⚠️ आज की लिमिट (${dailyLimit} सर्वे) पूरी हो चुकी है!`);
        return;
    }

    toggleSteps(2);
};

window.prevStep = function() {
    toggleSteps(1);
};

function toggleSteps(stepNum) {
    currentStep = stepNum;
    const s1 = getEl("step1") || document.querySelector(".step-1") || getEl("section1");
    const s2 = getEl("step2") || document.querySelector(".step-2") || getEl("section2");

    if (s1 && s2) {
        if (stepNum === 1) {
            s1.style.display = "block";
            s2.style.display = "none";
        } else {
            s1.style.display = "none";
            s2.style.display = "block";
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

/* 6. LOAD DYNAMIC QUESTIONS */
function loadQuestions() {
    const mount = getEl("questionListMount") || getEl("questionsContainer") || getEl("dynamicQuestionsContainer");
    if (!mount) return;

    firebase.firestore().collection("questions").onSnapshot((snapshot) => {
        dynamicQuestions = [];
        mount.innerHTML = "";

        snapshot.forEach((doc) => {
            dynamicQuestions.push({ id: doc.id, ...doc.data() });
        });

        dynamicQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));

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
            mount.appendChild(card);
        });
    });
}

/* 7. DUPLICATE CHECK & FORM SUBMISSION */
document.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mobileInput = document.querySelector("input[type='tel']") || getEl("mobile") || document.querySelector("input[placeholder*='Mobile']");
    const mobile = mobileInput ? mobileInput.value.trim() : "";

    if (!mobile || mobile.length < 10) {
        alert("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें!");
        toggleSteps(1);
        return;
    }

    const submitBtn = e.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.orig = submitBtn.innerHTML;
        submitBtn.innerHTML = "⏳ जाँच व सबमिशन जारी है...";
    }

    try {
        // DUPLICATE CHECK IN FIRESTORE
        const dupSnap = await firebase.firestore().collection("surveys").where("mobile", "==", mobile).get();
        if (!dupSnap.empty) {
            alert(`⚠️ डुप्लीकेट प्रविष्टि!\nमोबाइल नंबर (${mobile}) से पहले ही सर्वे दर्ज हो चुका है।`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.orig || "Submit";
            }
            toggleSteps(1);
            return;
        }

        // Collect Answers
        const answers = {};
        dynamicQuestions.forEach(q => {
            const checked = document.querySelectorAll(`input[name="q_${q.id}"]:checked`);
            if (checked.length > 0) {
                answers[q.id] = checked.length === 1 ? checked[0].value : Array.from(checked).map(c => c.value);
            }
        });

        // Collect Inputs
        const nameVal = (getEl("name") || document.querySelector("input[placeholder*='Name']"))?.value.trim() || "";
        const ageVal = (getEl("age") || document.querySelector("input[placeholder*='Age']"))?.value.trim() || "";
        const genderVal = (getEl("gender") || document.querySelector("select"))?.value || "";
        const villageVal = (getEl("village") || document.querySelector("input[placeholder*='Village']"))?.value.trim() || "";
        const districtVal = (getEl("district") || document.querySelector("input[placeholder*='District']"))?.value.trim() || "";
        const pinVal = (getEl("pincode") || document.querySelector("input[placeholder*='PIN']"))?.value.trim() || "";

        const payload = {
            name: nameVal,
            mobile: mobile,
            age: ageVal,
            gender: genderVal,
            village: villageVal,
            district: districtVal,
            pincode: pinVal,
            answers: answers,
            surveyorEmail: currentUser.email,
            createdBy: currentUser.email,
            latitude: userLocation ? userLocation.latitude : null,
            longitude: userLocation ? userLocation.longitude : null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        await firebase.firestore().collection("surveys").add(payload);

        alert("✅ सर्वे सफलतापूर्वक सबमिट हो गया!");
        e.target.reset();
        todaySurveyCount++;
        updateCounterUI();
        toggleSteps(1);

    } catch (err) {
        console.error("Submit error:", err);
        alert("त्रुटि: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.orig || "Submit";
        }
    }
});

/* 8. BUTTON EVENT BINDINGS */
window.addEventListener("DOMContentLoaded", () => {
    const allBtns = document.querySelectorAll("button");
    allBtns.forEach(b => {
        if (b.textContent.includes("Next")) {
            b.addEventListener("click", (ev) => {
                if (b.type !== "submit") {
                    ev.preventDefault();
                    window.nextStep();
                }
            });
        }
        if (b.textContent.includes("Back") || b.textContent.includes("Previous")) {
            b.addEventListener("click", (ev) => {
                ev.preventDefault();
                window.prevStep();
            });
        }
    });
});
