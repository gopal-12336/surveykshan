console.log("Survey JS Loaded - FINAL VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 0;
let currentQuestion = 0;
let surveyQuestions = [];
let answers = { basic: {}, questions: {} };
let surveyStarted = false;
let submitBtn = null;
let message = null;
let dailyLimitLoaded = false;

const LOCATION_QUESTION_ID = "__permanent_location__";
const PHOTO_QUESTION_ID = "__permanent_photos__";

function initializeSurveyPage() {
    console.log("Initializing Survey Page...");
    submitBtn = document.getElementById("submitSurvey");
    message = document.getElementById("message");

    setupBasicDetails();
    setupQuestionButtons();
    createDailyProgressUI();
    startAuthentication();
}

function createDailyProgressUI() {
    if (document.getElementById("dailyProgressBox")) return;

    const box = document.createElement("div");
    box.id = "dailyProgressBox";
    box.style.cssText =
        "background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:15px;margin:15px 0;box-shadow:0 2px 8px rgba(0,0,0,.08);font-family:Arial,sans-serif;";

    const titleRow = document.createElement("div");
    titleRow.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:bold;";

    const title = document.createElement("span");
    title.textContent = "📊 Today's Progress";

    const progressText = document.createElement("span");
    progressText.id = "dailyProgressText";
    progressText.textContent = "0 / --";

    titleRow.append(title, progressText);

    const progressBackground = document.createElement("div");
    progressBackground.style.cssText =
        "width:100%;height:12px;background:#eee;border-radius:20px;overflow:hidden;";

    const progressBar = document.createElement("div");
    progressBar.id = "dailyProgressBar";
    progressBar.style.cssText =
        "width:0%;height:100%;background:#1565c0;transition:width .4s ease;";

    progressBackground.appendChild(progressBar);

    const remainingText = document.createElement("div");
    remainingText.id = "dailyRemainingText";
    remainingText.textContent = "Loading daily limit...";
    remainingText.style.cssText =
        "margin-top:8px;font-size:13px;color:#555;";

    box.append(titleRow, progressBackground, remainingText);

    const container =
        document.querySelector(".survey-box") ||
        document.querySelector(".container") ||
        document.body;

    const dailyLimitBox = document.getElementById("dailyLimitBox");

    if (dailyLimitBox) {
        dailyLimitBox.insertAdjacentElement("afterend", box);
    } else if (container) {
        container.insertBefore(box, container.firstChild);
    }
}

function updateDailyProgress(count) {
    count = Number(count);

    if (!Number.isFinite(count) || count < 0) {
        count = 0;
    }

    const limit = Number(DAILY_LIMIT);

    if (!Number.isFinite(limit) || limit <= 0) return;

    const remaining = Math.max(limit - count, 0);
    const percentage = Math.min((count / limit) * 100, 100);

    const progressText =
        document.getElementById("dailyProgressText");

    const remainingText =
        document.getElementById("dailyRemainingText");

    const progressBar =
        document.getElementById("dailyProgressBar");

    const todayCount =
        document.getElementById("todayCount");

    const remainingCount =
        document.getElementById("remainingCount");

    if (progressText) {
        progressText.textContent =
            count + " / " + limit;
    }

    if (remainingText) {
        remainingText.textContent =
            remaining <= 0
                ? "🚫 Daily limit reached"
                : "Remaining today: " + remaining;
    }

    if (progressBar) {
        progressBar.style.width = percentage + "%";

        progressBar.style.background =
            count >= limit
                ? "#c62828"
                : percentage >= 80
                ? "#ef6c00"
                : "#1565c0";
    }

    if (todayCount) {
        todayCount.textContent = count;
    }

    if (remainingCount) {
        remainingCount.textContent = remaining;
    }

    if (count >= limit) {
        disableSurveyButtons();
    }
}

function loadDailyLimit() {
    return db.collection("settings")
        .doc("config")
        .get()
        .then(function(doc) {

            if (!doc.exists) {
                throw new Error(
                    "settings/config document not found."
                );
            }

            const value =
                Number((doc.data() || {}).dailyLimit);

            if (!Number.isFinite(value) || value <= 0) {
                throw new Error(
                    "Invalid dailyLimit in settings/config."
                );
            }

            DAILY_LIMIT = value;
            dailyLimitLoaded = true;

            console.log(
                "Daily Limit Loaded:",
                DAILY_LIMIT
            );

            return DAILY_LIMIT;
        })
        .catch(function(error) {

            console.error(
                "Daily limit loading error:",
                error
            );

            dailyLimitLoaded = false;
            DAILY_LIMIT = 0;

            showMessage(
                "Unable to load daily survey limit. Please contact admin."
            );

            throw error;
        });
}

function startAuthentication() {

    firebase.auth()
        .setPersistence(
            firebase.auth.Auth.Persistence.SESSION
        )
        .then(function() {

            firebase.auth().onAuthStateChanged(
                function(user) {

                    if (!user) {
                        window.location.replace(
                            "index.html"
                        );
                        return;
                    }

                    if (
                        user.email &&
                        user.email.toLowerCase() ===
                        ADMIN_EMAIL.toLowerCase()
                    ) {
                        window.location.replace(
                            "admin.html"
                        );
                        return;
                    }

                    loadDailyLimit()
                        .then(function() {
                            return getTodayCount(user);
                        })
                        .then(function(count) {

                            updateDailyProgress(count);

                            if (
                                count >= DAILY_LIMIT
                            ) {

                                showMessage(
                                    "🚫 Daily survey limit reached. You cannot submit more surveys today."
                                );

                                disableSurveyButtons();
                                return;
                            }

                            enableSurveyButtons();

                            loadQuestionsFromFirestore();
                        })
                        .catch(function(error) {

                            console.error(
                                "Startup error:",
                                error
                            );
                        });
                }
            );
        })
        .catch(function(error) {

            console.error(
                "Authentication error:",
                error
            );

            showMessage(
                "Authentication error: " +
                error.message
            );
        });
}

function getTodayCount(user) {

    if (!user || !user.email) {
        return Promise.resolve(0);
    }

    const todayStart = new Date();

    todayStart.setHours(
        0,
        0,
        0,
        0
    );

    return db.collection("surveys")
        .where(
            "surveyorEmail",
            "==",
            user.email
        )
        .get()
        .then(function(snapshot) {

            let count = 0;

            snapshot.forEach(function(doc) {

                const date =
                    getFirestoreDate(
                        doc.data().createdAt
                    );

                if (
                    date &&
                    date >= todayStart
                ) {
                    count++;
                }
            });

            return count;
        })
        .catch(function(error) {

            console.error(
                "Today count error:",
                error
            );

            return 0;
        });
}

function getFirestoreDate(value) {

    if (!value) return null;

    try {

        if (
            typeof value.toDate ===
            "function"
        ) {
            return value.toDate();
        }

        if (
            value.seconds !== undefined
        ) {
            return new Date(
                value.seconds * 1000
            );
        }

        const date = new Date(value);

        return isNaN(date.getTime())
            ? null
            : date;

    } catch (error) {

        return null;
    }
}

function loadQuestionsFromFirestore() {

    const questionText =
        document.getElementById(
            "questionText"
        );

    if (questionText) {
        questionText.textContent =
            "Loading questions...";
    }

    db.collection("questions")
        .orderBy("createdAt", "asc")
        .get()

        .then(function(snapshot) {

            buildQuestionsFromSnapshot(
                snapshot
            );

        })

        .catch(function(error) {

            console.warn(
                "Ordered question loading failed:",
                error
            );

            return db.collection("questions")
                .get();
        })

        .then(function(snapshot) {

            if (
                snapshot &&
                surveyQuestions.length === 0
            ) {
                buildQuestionsFromSnapshot(
                    snapshot
                );
            }
        })

        .catch(function(error) {

            console.error(
                "Question loading error:",
                error
            );

            showMessage(
                "Questions load failed: " +
                error.message
            );
        });
}

function buildQuestionsFromSnapshot(snapshot) {

    surveyQuestions = [];

    snapshot.forEach(function(doc) {

        const data = doc.data();

        if (
            !data.question ||
            !Array.isArray(data.options)
        ) {
            return;
        }

        const options =
            data.options
                .map(function(option) {
                    return String(option).trim();
                })
                .filter(function(option) {
                    return option !== "";
                });

        if (options.length < 2) return;

        surveyQuestions.push({

            id: doc.id,

            question:
                String(data.question)
                .trim(),

            type:
                data.type === "multiple"
                    ? "multiple"
                    : "single",

            options: options,

            createdAt:
                data.createdAt || null
        });
    });

    surveyQuestions.sort(function(a, b) {

        const dateA =
            getFirestoreDate(
                a.createdAt
            );

        const dateB =
            getFirestoreDate(
                b.createdAt
            );

        if (dateA && dateB) {
            return (
                dateA.getTime() -
                dateB.getTime()
            );
        }

        if (dateA && !dateB) return -1;

        if (!dateA && dateB) return 1;

        return 0;
    });

    /*
     * ==========================================
     * PERMANENT QUESTIONS
     * ALWAYS AT THE END
     * ==========================================
     */

    surveyQuestions.push({

        id: LOCATION_QUESTION_ID,

        question:
            "📍 कृपया अपनी वर्तमान स्थिति का स्थान चुनें।",

        type: "location",

        options: []
    });

    surveyQuestions.push({

        id: PHOTO_QUESTION_ID,

        question:
            "📷 कृपया निम्न चार चित्र अपलोड करें।",

        type: "photos",

        options: []
    });

    console.log(
        "Questions loaded:",
        surveyQuestions
    );

    if (surveyQuestions.length === 2) {

        showMessage(
            "No admin questions available. Permanent questions are available."
        );
    }

    currentQuestion = 0;
    answers.questions = {};

    renderQuestion();
}

function setupBasicDetails() {

    const button =
        document.getElementById(
            "basicNextButton"
        );

    if (!button) return;

    button.addEventListener(
        "click",
        function() {

            clearMessage();

            if (
                !dailyLimitLoaded ||
                DAILY_LIMIT <= 0
            ) {
                showMessage(
                    "Daily limit is still loading. Please wait."
                );
                return;
            }

            const name =
                getValue("name");

            const mobile =
                getValue("mobile");

            const age =
                getValue("age");

            const gender =
                getValue("gender");

            const village =
                getValue("village");

            const district =
                getValue("district");

            const pincode =
                getValue("pincode");

            if (
                !name ||
                !mobile ||
                !age ||
                !gender ||
                !village
            ) {

                showMessage(
                    "Please fill all required basic information."
                );

                return;
            }

            if (
                !/^[0-9]{10}$/.test(
                    mobile
                )
            ) {

                showMessage(
                    "❌ Mobile number must contain exactly 10 digits."
                );

                return;
            }

            const ageNumber =
                Number(age);

            if (
                !Number.isFinite(ageNumber) ||
                ageNumber < 1 ||
                ageNumber > 120
            ) {

                showMessage(
                    "❌ Please enter a valid age."
                );

                return;
            }

            if (
                pincode &&
                !/^[0-9]{6}$/.test(
                    pincode
                )
            ) {

                showMessage(
                    "❌ PIN code must contain exactly 6 digits."
                );

                return;
            }

            const user =
                firebase.auth().currentUser;

            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );

                return;
            }

            getTodayCount(user)
                .then(function(count) {

                    updateDailyProgress(count);

                    if (
                        count >= DAILY_LIMIT
                    ) {

                        disableSurveyButtons();

                        showMessage(
                            "🚫 Daily survey limit reached."
                        );

                        return;
                    }

                    answers.basic = {

                        name: name,

                        mobile: mobile,

                        age: ageNumber,

                        gender: gender,

                        village: village,

                        district: district,

                        pincode: pincode
                    };

                    answers.questions = {};

                    currentQuestion = 0;

                    surveyStarted = true;

                    showQuestionPage();
                })
                .catch(function(error) {

                    console.error(
                        "Basic details error:",
                        error
                    );

                    showMessage(
                        "Unable to continue: " +
                        error.message
                    );
                });
        }
    );
}

function showQuestionPage() {

    const basicStep =
        document.getElementById(
            "basicDetailsStep"
        );

    const questionStep =
        document.getElementById(
            "questionStep"
        );

    if (
        !basicStep ||
        !questionStep
    ) {

        console.error(
            "Basic Details Step or Question Step not found."
        );

        return;
    }

    questionStep.style.display =
        "block";

    questionStep.style.position =
        "absolute";

    questionStep.style.left =
        "0";

    questionStep.style.top =
        "0";

    questionStep.style.width =
        "100%";

    questionStep.style.transform =
        "translateX(100%)";

    questionStep.style.opacity =
        "0";

    basicStep.style.position =
        "relative";

    basicStep.style.transform =
        "translateX(0)";

    basicStep.style.opacity =
        "1";

    basicStep.style.transition =
        "transform .45s ease, opacity .45s ease";

    questionStep.style.transition =
        "transform .45s ease, opacity .45s ease";

    void questionStep.offsetWidth;

    basicStep.style.transform =
        "translateX(-100%)";

    basicStep.style.opacity =
        "0";

    questionStep.style.transform =
        "translateX(0)";

    questionStep.style.opacity =
        "1";

    setTimeout(function() {

        basicStep.style.display =
            "none";

        basicStep.style.position =
            "relative";

        basicStep.style.left =
            "auto";

        basicStep.style.top =
            "auto";

        basicStep.style.width =
            "100%";

        questionStep.style.position =
            "relative";

        questionStep.style.left =
            "auto";

        questionStep.style.top =
            "auto";

        questionStep.style.width =
            "100%";

        basicStep.style.transform =
            "";

        basicStep.style.opacity =
            "";

        questionStep.style.transform =
            "";

        questionStep.style.opacity =
            "";

        renderQuestion();

    }, 450);
}

function renderQuestion() {

    const questionText =
        document.getElementById(
            "questionText"
        );

    const questionNumber =
        document.getElementById(
            "questionNumber"
        );

    const optionsBox =
        document.getElementById(
            "questionOptions"
        );

    const nextButton =
        document.getElementById(
            "nextButton"
        );

    const previousButton =
        document.getElementById(
            "previousButton"
        );

    const submitButton =
        document.getElementById(
            "submitSurvey"
        );

    if (
        !questionText ||
        !optionsBox
    ) {
        return;
    }

    if (
        surveyQuestions.length === 0
    ) {

        questionText.textContent =
            "No questions found.";

        optionsBox.innerHTML = "";

        return;
    }

    const question =
        surveyQuestions[currentQuestion];

    if (!question) return;

    if (questionNumber) {

        questionNumber.textContent =
            "Question " +
            (currentQuestion + 1) +
            " of " +
            surveyQuestions.length;
    }

    /*
     * ==========================================
     * LOCATION QUESTION
     * ==========================================
     */

    if (
        question.type === "location"
    ) {

        renderLocationQuestion(
            questionText,
            optionsBox
        );

    }

    /*
     * ==========================================
     * PHOTO QUESTION
     * ==========================================
     */

    else if (
        question.type === "photos"
    ) {

        renderPhotoQuestion(
            questionText,
            optionsBox
        );

    }

    /*
     * ==========================================
     * NORMAL ADMIN QUESTION
     * ==========================================
     */

    else {

        questionText.textContent =
            question.question;

        optionsBox.innerHTML = "";

        const savedAnswer =
            answers.questions[
                question.id
            ];

        question.options.forEach(
            function(option) {

                const label =
                    document.createElement(
                        "label"
                    );

                label.style.cssText =
                    "display:block;margin-bottom:10px;padding:13px;border:1px solid #ddd;border-radius:8px;cursor:pointer;";

                const input =
                    document.createElement(
                        "input"
                    );

                input.type =
                    question.type ===
                    "multiple"
                        ? "checkbox"
                        : "radio";

                input.name =
                    "surveyQuestion_" +
                    question.id;

                input.value =
                    option;

                input.style.marginRight =
                    "10px";

                if (
                    question.type ===
                    "multiple"
                ) {

                    if (
                        Array.isArray(
                            savedAnswer
                        ) &&
                        savedAnswer.includes(
                            option
                        )
                    ) {
                        input.checked = true;
                    }

                } else if (
                    savedAnswer === option
                ) {

                    input.checked = true;
                }

                label.appendChild(input);

                label.appendChild(
                    document.createTextNode(
                        option
                    )
                );

                optionsBox.appendChild(
                    label
                );
            }
        );
    }

    if (previousButton) {

        previousButton.disabled =
            currentQuestion === 0;
    }

    const isLastQuestion =
        currentQuestion ===
        surveyQuestions.length - 1;

    if (nextButton) {

        nextButton.style.display =
            isLastQuestion
                ? "none"
                : "block";
    }

    if (submitButton) {

        submitButton.style.display =
            isLastQuestion
                ? "block"
                : "none";
    }
}

function renderLocationQuestion(
    questionText,
    optionsBox
) {

    questionText.textContent =
        "📍 कृपया अपनी वर्तमान स्थिति का स्थान चुनें।";

    optionsBox.innerHTML = "";

    const box =
        document.createElement("div");

    box.style.cssText =
        "text-align:center;padding:20px;border:1px solid #ddd;border-radius:12px;background:#f8fbff;";

    const text =
        document.createElement("p");

    text.textContent =
        "नीचे दिए गए बटन पर क्लिक करते ही आपकी वर्तमान स्थिति प्राप्त की जाएगी।";

    text.style.cssText =
        "font-size:15px;color:#555;";

    const button =
        document.createElement("button");

    button.type = "button";

    button.textContent =
        "📍 मेरी Live Location चुनें";

    button.style.cssText =
        "background:#1565c0;color:white;border:0;border-radius:8px;padding:12px 18px;font-weight:bold;cursor:pointer;";

    const result =
        document.createElement("div");

    result.id =
        "locationResult";

    result.style.cssText =
        "margin-top:12px;font-weight:bold;color:#2e7d32;";

    const saved =
        answers.questions[
            LOCATION_QUESTION_ID
        ];

    if (saved) {

        result.textContent =
            "✅ Location captured: " +
            saved.latitude +
            ", " +
            saved.longitude;
    }

    button.addEventListener(
        "click",
        function() {

            if (
                !navigator.geolocation
            ) {

                result.textContent =
                    "❌ Your browser does not support location.";

                result.style.color =
                    "#c62828";

                return;
            }

            button.disabled = true;

            button.textContent =
                "📍 Getting Location...";

            navigator.geolocation.getCurrentPosition(

                function(position) {

                    const latitude =
                        Number(
                            position.coords.latitude
                        );

                    const longitude =
                        Number(
                            position.coords.longitude
                        );

                    answers.questions[
                        LOCATION_QUESTION_ID
                    ] = {

                        latitude:
                            latitude,

                        longitude:
                            longitude,

                        accuracy:
                            Number(
                                position.coords.accuracy ||
                                0
                            ),

                        capturedAt:
                            new Date().toISOString()
                    };

                    result.textContent =
                        "✅ Live location captured successfully.";

                    result.style.color =
                        "#2e7d32";

                    button.textContent =
                        "✅ Location Captured";
                },

                function(error) {

                    console.error(
                        "Location error:",
                        error
                    );

                    button.disabled = false;

                    button.textContent =
                        "📍 मेरी Live Location चुनें";

                    let errorText =
                        "❌ Location could not be captured.";

                    if (
                        error.code ===
                        1
                    ) {
                        errorText =
                            "❌ Please allow location permission.";
                    }

                    result.textContent =
                        errorText;

                    result.style.color =
                        "#c62828";
                },

                {
                    enableHighAccuracy:
                        true,

                    timeout:
                        15000,

                    maximumAge:
                        0
                }
            );
        }
    );

    box.appendChild(text);

    box.appendChild(button);

    box.appendChild(result);

    optionsBox.appendChild(box);
}

function renderPhotoQuestion(
    questionText,
    optionsBox
) {

    questionText.textContent =
        "📷 चार चित्र अपलोड करें";

    optionsBox.innerHTML = "";

    const container =
        document.createElement("div");

    container.style.cssText =
        "display:flex;flex-direction:column;gap:14px;";

    const photoLabels = [

        "1️⃣ गाँव की तस्वीर",

        "2️⃣ गाँव की समस्या की तस्वीर",

        "3️⃣ संबंधित व्यक्ति की तस्वीर",

        "4️⃣ Respondent के साथ Selfie"
    ];

    const existing =
        answers.questions[
            PHOTO_QUESTION_ID
        ] || [];

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const wrapper =
            document.createElement("div");

        wrapper.style.cssText =
            "padding:14px;border:1px solid #ddd;border-radius:10px;background:#f8fbff;";

        const label =
            document.createElement("label");

        label.textContent =
            photoLabels[i];

        label.style.cssText =
            "display:block;font-weight:bold;margin-bottom:8px;";

        const input =
            document.createElement("input");

        input.type =
            "file";

        input.accept =
            "image/*";

        input.capture =
            "environment";

        input.style.cssText =
            "width:100%;padding:8px;";

        const status =
            document.createElement("div");

        status.style.cssText =
            "margin-top:6px;font-size:13px;color:#2e7d32;";

        if (
            existing[i] &&
            existing[i].name
        ) {

            status.textContent =
                "✅ " +
                existing[i].name;
        }

        input.addEventListener(
            "change",
            function() {

                const file =
                    input.files &&
                    input.files[0];

                if (!file) return;

                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    input.value = "";

                    status.textContent =
                        "❌ Please select an image.";

                    status.style.color =
                        "#c62828";

                    return;
                }

                /*
                 * Browser-selected files cannot
                 * safely be stored directly in
                 * Firestore. We keep the file
                 * object until submission.
                 */

                if (
                    !Array.isArray(
                        answers.questions[
                            PHOTO_QUESTION_ID
                        ]
                    )
                ) {

                    answers.questions[
                        PHOTO_QUESTION_ID
                    ] = [];
                }

                answers.questions[
                    PHOTO_QUESTION_ID
                ][i] = {

                    name:
                        file.name,

                    type:
                        file.type,

                    size:
                        file.size,

                    file:
                        file
                };

                status.textContent =
                    "✅ Selected: " +
                    file.name;

                status.style.color =
                    "#2e7d32";
            }
        );

        wrapper.appendChild(label);

        wrapper.appendChild(input);

        wrapper.appendChild(status);

        container.appendChild(wrapper);
    }

    optionsBox.appendChild(container);
}

function getCurrentQuestionAnswer() {

    if (
        surveyQuestions.length === 0
    ) {
        return null;
    }

    const question =
        surveyQuestions[currentQuestion];

    if (!question) return null;

    /*
     * LOCATION
     */

    if (
        question.type === "location"
    ) {

        return (
            answers.questions[
                LOCATION_QUESTION_ID
            ] || null
        );
    }

    /*
     * PHOTOS
     */

    if (
        question.type === "photos"
    ) {

        return (
            answers.questions[
                PHOTO_QUESTION_ID
            ] || []
        );
    }

    const inputs =
        document.querySelectorAll(
            'input[name="surveyQuestion_' +
            question.id +
            '"]'
        );

    if (
        question.type === "multiple"
    ) {

        const selected = [];

        inputs.forEach(
            function(input) {

                if (input.checked) {
                    selected.push(
                        input.value
                    );
                }
            }
        );

        return selected;
    }

    let selected = null;

    inputs.forEach(
        function(input) {

            if (input.checked) {
                selected =
                    input.value;
            }
        }
    );

    return selected;
}

function saveCurrentQuestionAnswer() {

    const question =
        surveyQuestions[currentQuestion];

    if (!question) return false;

    const answer =
        getCurrentQuestionAnswer();

    /*
     * LOCATION VALIDATION
     */

    if (
        question.type === "location"
    ) {

        if (
            !answer ||
            !answer.latitude ||
            !answer.longitude
        ) {

            showMessage(
                "📍 Please capture your live location before continuing."
            );

            return false;
        }

        answers.questions[
            LOCATION_QUESTION_ID
        ] = answer;

        return true;
    }

    /*
     * PHOTO VALIDATION
     */

    if (
        question.type === "photos"
    ) {

        if (
            !Array.isArray(answer) ||
            answer.length !== 4 ||
            answer.some(function(item) {
                return !item || !item.file;
            })
        ) {

            showMessage(
                "📷 Please upload all 4 required photos."
            );

            return false;
        }

        return true;
    }

    /*
     * NORMAL QUESTION
     */

    if (
        question.type === "multiple"
    ) {

        if (
            !Array.isArray(answer) ||
            answer.length === 0
        ) {

            showMessage(
                "Please select at least one option."
            );

            return false;
        }

    } else if (!answer) {

        showMessage(
            "Please select an option."
        );

        return false;
    }

    answers.questions[
        question.id
    ] = answer;

    return true;
}

function setupQuestionButtons() {

    const nextButton =
        document.getElementById(
            "nextButton"
        );

    const previousButton =
        document.getElementById(
            "previousButton"
        );

    const submitButton =
        document.getElementById(
            "submitSurvey"
        );

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function() {

                clearMessage();

                if (
                    !saveCurrentQuestionAnswer()
                ) {
                    return;
                }

                if (
                    currentQuestion <
                    surveyQuestions.length - 1
                ) {

                    currentQuestion++;

                    renderQuestion();
                }
            }
        );
    }

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function() {

                clearMessage();

                const question =
                    surveyQuestions[
                        currentQuestion
                    ];

                if (question) {

                    /*
                     * Permanent questions
                     * are already stored in answers.
                     */

                    if (
                        question.type !==
                        "location" &&
                        question.type !==
                        "photos"
                    ) {

                        const answer =
                            getCurrentQuestionAnswer();

                        if (
                            question.type ===
                            "multiple"
                        ) {

                            if (
                                Array.isArray(
                                    answer
                                ) &&
                                answer.length > 0
                            ) {

                                answers.questions[
                                    question.id
                                ] = answer;
                            }

                        } else if (answer) {

                            answers.questions[
                                question.id
                            ] = answer;
                        }
                    }
                }

                if (
                    currentQuestion > 0
                ) {

                    currentQuestion--;

                    renderQuestion();
                }
            }
        );
    }

    if (submitButton) {

        submitButton.addEventListener(
            "click",
            submitSurvey
        );
    }
}

function submitSurvey() {

    clearMessage();

    if (
        !dailyLimitLoaded ||
        DAILY_LIMIT <= 0
    ) {

        showMessage(
            "Daily limit is not loaded yet."
        );

        return;
    }

    if (!surveyStarted) {

        showMessage(
            "Please start the survey first."
        );

        return;
    }

    if (
        !saveCurrentQuestionAnswer()
    ) {
        return;
    }

    /*
     * Validate every question
     */

    for (
        let i = 0;
        i < surveyQuestions.length;
        i++
    ) {

        const question =
            surveyQuestions[i];

        const answer =
            answers.questions[
                question.id
            ];

        if (
            question.type ===
            "location"
        ) {

            if (
                !answer ||
                !answer.latitude ||
                !answer.longitude
            ) {

                currentQuestion = i;

                renderQuestion();

                showMessage(
                    "📍 Please capture live location before submitting."
                );

                return;
            }

            continue;
        }

        if (
            question.type ===
            "photos"
        ) {

            if (
                !Array.isArray(answer) ||
                answer.length !== 4 ||
                answer.some(function(item) {
                    return !item || !item.file;
                })
            ) {

                currentQuestion = i;

                renderQuestion();

                showMessage(
                    "📷 Please upload all 4 photos before submitting."
                );

                return;
            }

            continue;
        }

        if (
            question.type ===
            "multiple"
        ) {

            if (
                !Array.isArray(answer) ||
                answer.length === 0
            ) {

                currentQuestion = i;

                renderQuestion();

                showMessage(
                    "Please answer Question " +
                    (i + 1) +
                    " before submitting."
                );

                return;
            }

        } else if (!answer) {

            currentQuestion = i;

            renderQuestion();

            showMessage(
                "Please answer Question " +
                (i + 1) +
                " before submitting."
            );

            return;
        }
    }

    const user =
        firebase.auth().currentUser;

    if (!user) {

        showMessage(
            "Session expired. Please login again."
        );

        return;
    }

    const button =
        document.getElementById(
            "submitSurvey"
        );

    if (button) {

        button.disabled = true;

        button.textContent =
            "Saving Survey...";
    }

    getTodayCount(user)
        .then(function(count) {

            updateDailyProgress(count);

            if (
                count >= DAILY_LIMIT
            ) {

                throw new Error(
                    "Daily survey limit reached."
                );
            }

            /*
             * IMPORTANT:
             * Firebase Firestore cannot directly
             * store File objects.
             *
             * Therefore photos are saved as
             * metadata unless you already have
             * Firebase Storage upload logic.
             */

            const photoAnswer =
                answers.questions[
                    PHOTO_QUESTION_ID
                ] || [];

            const photoData =
                Array.isArray(photoAnswer)
                    ? photoAnswer.map(
                        function(photo) {

                            return {

                                name:
                                    photo.name ||
                                    "",

                                type:
                                    photo.type ||
                                    "",

                                size:
                                    Number(
                                        photo.size ||
                                        0
                                    )
                            };
                        }
                    )
                    : [];

            const cleanedAnswers = {};

            Object.keys(
                answers.questions
            ).forEach(
                function(key) {

                    if (
                        key ===
                        PHOTO_QUESTION_ID
                    ) {

                        cleanedAnswers[key] =
                            photoData;

                    } else {

                        cleanedAnswers[key] =
                            answers.questions[
                                key
                            ];
                    }
                }
            );

            const surveyData = {

                name:
                    answers.basic.name,

                mobile:
                    answers.basic.mobile,

                age:
                    answers.basic.age,

                gender:
                    answers.basic.gender,

                village:
                    answers.basic.village,

                district:
                    answers.basic.district ||
                    "",

                pincode:
                    answers.basic.pincode ||
                    "",

                answers:
                    cleanedAnswers,

                surveyorEmail:
                    user.email || "",

                surveyorUid:
                    user.uid || "",

                createdBy:
                    user.email || "",

                createdAt:
                    firebase.firestore
                    .FieldValue
                    .serverTimestamp()
            };

            return db.collection(
                "surveys"
            ).add(surveyData);

        })

        .then(function(docRef) {

            console.log(
                "Survey saved:",
                docRef.id
            );

            return getTodayCount(user);
        })

        .then(function(newCount) {

            updateDailyProgress(
                newCount
            );

            showSuccessMessage(
                "✅ Survey submitted successfully!"
            );

            resetSurveyForm();

            if (
                newCount >= DAILY_LIMIT
            ) {

                disableSurveyButtons();

                showMessage(
                    "✅ Survey saved. Daily limit reached."
                );
            }
        })

        .catch(function(error) {

            console.error(
                "Survey submission error:",
                error
            );

            showMessage(
                "❌ Survey could not be submitted: " +
                error.message
            );

            if (button) {

                button.disabled = false;

                button.textContent =
                    "Submit Survey";
            }
        });
}

function resetSurveyForm() {

    answers = {
        basic: {},
        questions: {}
    };

    currentQuestion = 0;

    surveyStarted = false;

    [
        "name",
        "mobile",
        "age",
        "gender",
        "village",
        "district",
        "pincode"
    ].forEach(function(id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });

    const basicStep =
        document.getElementById(
            "basicDetailsStep"
        );

    const questionStep =
        document.getElementById(
            "questionStep"
        );

    if (questionStep) {
        questionStep.classList.remove(
            "active"
        );
    }

    if (basicStep) {
        basicStep.classList.add(
            "active"
        );
    }

    const button =
        document.getElementById(
            "submitSurvey"
        );

    if (button) {

        button.disabled = false;

        button.textContent =
            "Submit Survey";

        button.style.display =
            "none";
    }

    const user =
        firebase.auth().currentUser;

    if (user) {

        getTodayCount(user)
            .then(function(count) {

                updateDailyProgress(
                    count
                );
            });
    }
}

function disableSurveyButtons() {

    const basicButton =
        document.getElementById(
            "basicNextButton"
        );

    const nextButton =
        document.getElementById(
            "nextButton"
        );

    const previousButton =
        document.getElementById(
            "previousButton"
        );

    const submitButton =
        document.getElementById(
            "submitSurvey"
        );

    if (basicButton) {
        basicButton.disabled = true;
    }

    if (nextButton) {
        nextButton.disabled = true;
    }

    if (previousButton) {
        previousButton.disabled = true;
    }

    if (submitButton) {
        submitButton.disabled = true;
    }
}

function enableSurveyButtons() {

    const basicButton =
        document.getElementById(
            "basicNextButton"
        );

    const nextButton =
        document.getElementById(
            "nextButton"
        );

    const previousButton =
        document.getElementById(
            "previousButton"
        );

    const submitButton =
        document.getElementById(
            "submitSurvey"
        );

    if (basicButton) {
        basicButton.disabled = false;
    }

    if (nextButton) {
        nextButton.disabled = false;
    }

    if (previousButton) {
        previousButton.disabled =
            currentQuestion === 0;
    }

    if (submitButton) {
        submitButton.disabled = false;
    }
}

function getValue(id) {

    const element =
        document.getElementById(id);

    if (!element) return "";

    return String(
        element.value || ""
    ).trim();
}

function showMessage(text) {

    message =
        document.getElementById(
            "message"
        );

    if (!message) return;

    message.classList.remove(
        "success-message"
    );

    message.textContent =
        text;

    message.style.color =
        "#c62828";
}

function showSuccessMessage(text) {

    message =
        document.getElementById(
            "message"
        );

    if (!message) return;

    message.classList.add(
        "success-message"
    );

    message.textContent =
        text;

    message.style.color =
        "#2e7d32";
}

function clearMessage() {

    const messageElement =
        document.getElementById(
            "message"
        );

    if (messageElement) {

        messageElement.textContent =
            "";

        messageElement.classList.remove(
            "success-message"
        );
    }
}

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSurveyPage
    );

} else {

    initializeSurveyPage();
}
