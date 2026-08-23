console.log("Survey JS Loaded - Firestore Dynamic Questions");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 20;

let currentQuestion = 0;
let answers = {
    basic: {},
    questions: {}
};

let surveyQuestions = [];

let submitBtn = null;
let message = null;

let surveyStarted = false;


// =====================================================
// INITIALIZE
// =====================================================

function initializeSurveyPage() {

    submitBtn =
        document.getElementById("submitSurvey");

    message =
        document.getElementById("message");

    setupBasicDetails();

    setupQuestionButtons();

    createDailyProgressUI();

    startAuthentication();
}


// =====================================================
// DAILY PROGRESS UI
// =====================================================

function createDailyProgressUI() {

    if (
        document.getElementById("dailyProgressBox")
    ) {
        return;
    }

    const oldBox =
        document.getElementById("dailyProgressBox");

    if (oldBox) {
        return;
    }

    const box =
        document.createElement("div");

    box.id = "dailyProgressBox";

    box.style.background = "#ffffff";
    box.style.border = "1px solid #e0e0e0";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.margin = "15px 0";
    box.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.08)";

    const titleRow =
        document.createElement("div");

    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";
    titleRow.style.marginBottom = "8px";
    titleRow.style.fontWeight = "bold";

    const title =
        document.createElement("span");

    title.textContent =
        "📊 Today's Progress";

    const progressText =
        document.createElement("span");

    progressText.id =
        "dailyProgressText";

    progressText.textContent =
        "0 / 20";

    titleRow.appendChild(title);
    titleRow.appendChild(progressText);


    const progressBackground =
        document.createElement("div");

    progressBackground.style.width = "100%";
    progressBackground.style.height = "12px";
    progressBackground.style.background = "#eeeeee";
    progressBackground.style.borderRadius = "20px";
    progressBackground.style.overflow = "hidden";


    const progressBar =
        document.createElement("div");

    progressBar.id =
        "dailyProgressBar";

    progressBar.style.width = "0%";
    progressBar.style.height = "100%";
    progressBar.style.background = "#1565c0";
    progressBar.style.transition =
        "width 0.4s ease";

    progressBackground.appendChild(
        progressBar
    );


    const remainingText =
        document.createElement("div");

    remainingText.id =
        "dailyRemainingText";

    remainingText.textContent =
        "Remaining today: 20";

    remainingText.style.marginTop = "8px";
    remainingText.style.fontSize = "13px";
    remainingText.style.color = "#555";


    box.appendChild(titleRow);
    box.appendChild(progressBackground);
    box.appendChild(remainingText);


    const container =
        document.querySelector(".login-box");

    if (container) {

        container.insertBefore(
            box,
            container.firstChild
        );

    }

}


// =====================================================
// UPDATE DAILY PROGRESS
// =====================================================

function updateDailyProgress(count) {

    const progressText =
        document.getElementById(
            "dailyProgressText"
        );

    const remainingText =
        document.getElementById(
            "dailyRemainingText"
        );

    const progressBar =
        document.getElementById(
            "dailyProgressBar"
        );

    if (
        !progressText ||
        !remainingText ||
        !progressBar
    ) {
        return;
    }


    count = Number(count);

    if (!Number.isFinite(count) || count < 0) {
        count = 0;
    }


    const limit =
        Number(DAILY_LIMIT) > 0
        ? Number(DAILY_LIMIT)
        : 20;


    const remaining =
        Math.max(limit - count, 0);


    const percentage =
        Math.min(
            (count / limit) * 100,
            100
        );


    progressText.textContent =
        count + " / " + limit;


    remainingText.textContent =
        remaining > 0
        ? "Remaining today: " + remaining
        : "Daily limit reached";


    progressBar.style.width =
        percentage + "%";


    if (count >= limit) {

        progressBar.style.background =
            "#c62828";

    }

    else if (percentage >= 80) {

        progressBar.style.background =
            "#ef6c00";

    }

    else {

        progressBar.style.background =
            "#1565c0";

    }

}


// =====================================================
// LOAD DAILY LIMIT
// =====================================================

function loadDailyLimit() {

    return db.collection("settings")
        .doc("config")
        .get()

        .then(function(doc) {

            if (doc.exists) {

                const value =
                    Number(
                        doc.data().dailyLimit
                    );

                if (
                    Number.isFinite(value) &&
                    value > 0
                ) {

                    DAILY_LIMIT = value;

                }

            }

        })

        .catch(function(error) {

            console.error(
                "Daily limit error:",
                error
            );

        });

}


// =====================================================
// AUTHENTICATION
// =====================================================

function startAuthentication() {

    firebase.auth()
        .setPersistence(
            firebase.auth.Auth.Persistence.SESSION
        )

        .then(function() {

            firebase.auth()
                .onAuthStateChanged(
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


                        console.log(
                            "Surveyor logged in:",
                            user.email
                        );


                        loadDailyLimit()

                        .then(function() {

                            return getTodayCount(
                                user
                            );

                        })

                        .then(function(count) {

                            updateDailyProgress(
                                count
                            );


                            if (
                                count >=
                                DAILY_LIMIT
                            ) {

                                disableSurveyButtons();

                                showMessage(
                                    "Daily survey limit reached."
                                );

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

                            showMessage(
                                "Unable to load survey. " +
                                error.message
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

        });

}


// =====================================================
// LOAD QUESTIONS FROM FIRESTORE
// =====================================================

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
        .get()

        .then(function(snapshot) {

            surveyQuestions = [];


            snapshot.forEach(function(doc) {

                const data =
                    doc.data();


                if (
                    !data.question ||
                    !Array.isArray(data.options)
                ) {
                    return;
                }


                surveyQuestions.push({

                    id: doc.id,

                    question:
                        String(
                            data.question
                        ),

                    type:
                        data.type === "multiple"
                        ? "multiple"
                        : "single",

                    options:
                        data.options.filter(
                            function(option) {
                                return String(option).trim() !== "";
                            }
                        )

                });

            });


            console.log(
                "Firestore Questions:",
                surveyQuestions
            );


            if (
                surveyQuestions.length === 0
            ) {

                showMessage(
                    "No questions available. Please add questions from Admin Panel."
                );

                if (questionText) {

                    questionText.textContent =
                        "No questions found.";

                }

                return;
            }


            currentQuestion = 0;

            answers.questions = {};

            renderQuestion();

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


            if (questionText) {

                questionText.textContent =
                    "Unable to load questions.";

            }

        });

}


// =====================================================
// GET TODAY COUNT
// =====================================================

function getTodayCount(user) {

    if (!user) {
        return Promise.resolve(0);
    }


    const todayStart =
        new Date();

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

                const data =
                    doc.data();


                const date =
                    getFirestoreDate(
                        data.createdAt
                    );


                if (
                    date &&
                    date >= todayStart
                ) {

                    count++;

                }

            });


            return count;

        });

}


// =====================================================
// FIRESTORE DATE
// =====================================================

function getFirestoreDate(value) {

    if (!value) {
        return null;
    }


    try {

        if (
            typeof value.toDate ===
            "function"
        ) {

            return value.toDate();

        }


        if (
            value.seconds
        ) {

            return new Date(
                value.seconds * 1000
            );

        }


        const date =
            new Date(value);


        return isNaN(date.getTime())
            ? null
            : date;

    }

    catch(error) {

        return null;

    }

}


// =====================================================
// BASIC DETAILS
// =====================================================

function setupBasicDetails() {

    const button =
        document.getElementById(
            "basicNextButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function() {

            clearMessage();


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


            // =========================
            // REQUIRED FIELDS
            // =========================

            if (
                !name ||
                !mobile ||
                !age ||
                !gender ||
                !village ||
                !district ||
                !pincode
            ) {

                showMessage(
                    "Please fill all basic information."
                );

                return;
            }


            // =========================
            // MOBILE VALIDATION
            // =========================

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


            // =========================
            // AGE VALIDATION
            // =========================

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


            // =========================
            // PINCODE VALIDATION
            // =========================

            if (
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

                updateDailyProgress(
                    count
                );


                if (
                    count >=
                    DAILY_LIMIT
                ) {

                    disableSurveyButtons();

                    showMessage(
                        "Daily limit reached."
                    );

                    return;
                }


                answers.basic = {

                    name:
                        name,

                    mobile:
                        mobile,

                    age:
                        age,

                    gender:
                        gender,

                    village:
                        village,

                    district:
                        district,

                    pincode:
                        pincode

                };


                answers.questions = {};

                currentQuestion = 0;

                surveyStarted = true;


                showQuestionPage();

            })

            .catch(function(error) {

                console.error(
                    "Basic detail error:",
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


// =====================================================
// SHOW QUESTION PAGE
// =====================================================

function showQuestionPage() {

    const basicStep =
        document.getElementById(
            "basicDetailsStep"
        );

    const questionStep =
        document.getElementById(
            "questionStep"
        );


    if (basicStep) {

        basicStep.classList.remove(
            "active"
        );

    }


    if (questionStep) {

        questionStep.classList.add(
            "active"
        );

    }


    renderQuestion();

}


// =====================================================
// RENDER QUESTION
// =====================================================

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
        surveyQuestions[
            currentQuestion
        ];


    if (!question) {
        return;
    }


    questionNumber.textContent =
        "Question " +
        (currentQuestion + 1) +
        " of " +
        surveyQuestions.length;


    questionText.textContent =
        question.question;


    optionsBox.innerHTML = "";


    let savedAnswer =
        answers.questions[
            currentQuestion
        ];


    // =================================================
    // MULTIPLE CHOICE
    // =================================================

    if (
        question.type === "multiple"
    ) {

        if (
            !Array.isArray(savedAnswer)
        ) {

            savedAnswer = [];

        }


        question.options.forEach(
            function(option) {

                const label =
                    document.createElement(
                        "label"
                    );

                label.className =
                    "option-label";


                const input =
                    document.createElement(
                        "input"
                    );

                input.type =
                    "checkbox";

                input.name =
                    "surveyQuestion";

                input.value =
                    option;


                if (
                    savedAnswer.includes(
                        option
                    )
                ) {

                    input.checked = true;

                    label.classList.add(
                        "selected"
                    );

                }


                input.addEventListener(
                    "change",
                    function() {

                        let selected = [];


                        optionsBox
                        .querySelectorAll(
                            "input[type='checkbox']:checked"
                        )
                        .forEach(
                            function(item) {

                                selected.push(
                                    item.value
                                );

                            }
                        );


                        answers.questions[
                            currentQuestion
                        ] = selected;


                        if (this.checked) {

                            label.classList.add(
                                "selected"
                            );

                        }

                        else {

                            label.classList.remove(
                                "selected"
                            );

                        }

                    }
                );


                label.appendChild(
                    input
                );


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


    // =================================================
    // SINGLE CHOICE
    // =================================================

    else {

        question.options.forEach(
            function(option) {

                const label =
                    document.createElement(
                        "label"
                    );

                label.className =
                    "option-label";


                const input =
                    document.createElement(
                        "input"
                    );

                input.type =
                    "radio";

                input.name =
                    "surveyQuestion";

                input.value =
                    option;


                if (
                    savedAnswer ===
                    option
                ) {

                    input.checked =
                        true;

                    label.classList.add(
                        "selected"
                    );

                }


                input.addEventListener(
                    "change",
                    function() {

                        answers.questions[
                            currentQuestion
                        ] =
                            this.value;


                        optionsBox
                        .querySelectorAll(
                            ".option-label"
                        )
                        .forEach(
                            function(item) {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                        label.classList.add(
                            "selected"
                        );

                    }
                );


                label.appendChild(
                    input
                );


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


    // =================================================
    // BUTTON VISIBILITY
    // =================================================

    if (previousButton) {

        previousButton.style.display =
            currentQuestion === 0
            ? "none"
            : "block";

    }


    if (
        currentQuestion ===
        surveyQuestions.length - 1
    ) {

        if (nextButton) {

            nextButton.style.display =
                "none";

        }


        if (submitButton) {

            submitButton.style.display =
                "block";

        }

    }

    else {

        if (nextButton) {

            nextButton.style.display =
                "block";

        }


        if (submitButton) {

            submitButton.style.display =
                "none";

        }

    }


    updateQuestionProgress();

}


// =====================================================
// QUESTION PROGRESS
// =====================================================

function updateQuestionProgress() {

    const progressBar =
        document.getElementById(
            "surveyProgressBar"
        );

    const progressText =
        document.getElementById(
            "questionProgress"
        );

    const stepTitle =
        document.getElementById(
            "stepTitle"
        );


    if (!progressBar) {
        return;
    }


    if (
        surveyQuestions.length === 0
    ) {

        progressBar.style.width =
            "0%";

        return;

    }


    const percentage =
        (
            (currentQuestion + 1) /
            surveyQuestions.length
        ) * 100;


    progressBar.style.width =
        percentage + "%";


    if (progressText) {

        progressText.textContent =
            "Question " +
            (currentQuestion + 1) +
            " / " +
            surveyQuestions.length;

    }


    if (stepTitle) {

        stepTitle.textContent =
            "Survey Questions";

    }

}


// =====================================================
// QUESTION BUTTONS
// =====================================================

function setupQuestionButtons() {

    const nextButton =
        document.getElementById(
            "nextButton"
        );

    const previousButton =
        document.getElementById(
            "previousButton"
        );


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function() {

                const question =
                    surveyQuestions[
                        currentQuestion
                    ];


                if (!question) {
                    return;
                }


                const answer =
                    answers.questions[
                        currentQuestion
                    ];


                if (
                    question.type ===
                    "multiple"
                ) {

                    if (
                        !Array.isArray(answer) ||
                        answer.length === 0
                    ) {

                        showMessage(
                            "Please select at least one option."
                        );

                        return;

                    }

                }

                else {

                    if (
                        !answer
                    ) {

                        showMessage(
                            "Please select an option before continuing."
                        );

                        return;

                    }

                }


                if (
                    currentQuestion <
                    surveyQuestions.length - 1
                ) {

                    currentQuestion++;

                    renderQuestion();

                    clearMessage();

                }

            }
        );

    }


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function() {

                if (
                    currentQuestion > 0
                ) {

                    currentQuestion--;

                    renderQuestion();

                    clearMessage();

                }

            }
        );

    }


    if (submitBtn) {

        submitBtn.addEventListener(
            "click",
            submitCompleteSurvey
        );

    }

}


// =====================================================
// CREATE UNIQUE SURVEY FINGERPRINT
// =====================================================

function createSurveyFingerprint() {

    const basic =
        answers.basic || {};

    const questions =
        answers.questions || {};


    const normalizedQuestions =
        surveyQuestions.map(
            function(question,index) {

                let answer =
                    questions[index];


                if (
                    Array.isArray(answer)
                ) {

                    answer =
                        answer
                        .map(
                            function(item) {
                                return String(item)
                                    .trim()
                                    .toLowerCase();
                            }
                        )
                        .sort()
                        .join("|");

                }

                else {

                    answer =
                        String(
                            answer || ""
                        )
                        .trim()
                        .toLowerCase();

                }


                return {
                    question:
                        String(
                            question.question
                        )
                        .trim()
                        .toLowerCase(),

                    answer:
                        answer

                };

            }
        );


    const raw =
        JSON.stringify({

            name:
                String(
                    basic.name || ""
                )
                .trim()
                .toLowerCase(),

            mobile:
                String(
                    basic.mobile || ""
                )
                .trim(),

            age:
                String(
                    basic.age || ""
                )
                .trim(),

            gender:
                String(
                    basic.gender || ""
                )
                .trim()
                .toLowerCase(),

            village:
                String(
                    basic.village || ""
                )
                .trim()
                .toLowerCase(),

            district:
                String(
                    basic.district || ""
                )
                .trim()
                .toLowerCase(),

            pincode:
                String(
                    basic.pincode || ""
                )
                .trim(),

            questions:
                normalizedQuestions

        });


    return simpleHash(raw);

}


// =====================================================
// SIMPLE HASH
// =====================================================

function simpleHash(text) {

    let hash = 0;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        hash =
            (
                (
                    hash << 5
                ) -
                hash
            ) +
            text.charCodeAt(i);


        hash |= 0;

    }


    return (
        "survey_" +
        Math.abs(hash)
        .toString(16)
    );

}


// =====================================================
// CHECK DUPLICATE SURVEY
// =====================================================

function checkDuplicateSurvey(
    fingerprint
) {

    return db.collection("surveys")
        .where(
            "fingerprint",
            "==",
            fingerprint
        )
        .limit(1)
        .get()

        .then(function(snapshot) {

            return !snapshot.empty;

        });

}


// =====================================================
// SUBMIT COMPLETE SURVEY
// =====================================================

function submitCompleteSurvey() {

    const user =
        firebase.auth().currentUser;


    if (!user) {

        showMessage(
            "Session expired. Please login again."
        );

        return;

    }


    if (
        surveyQuestions.length === 0
    ) {

        showMessage(
            "No questions available."
        );

        return;

    }


    // =================================================
    // CHECK ALL ANSWERS
    // =================================================

    for (
        let i = 0;
        i < surveyQuestions.length;
        i++
    ) {

        const question =
            surveyQuestions[i];


        const answer =
            answers.questions[i];


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
                    (i + 1)
                );

                return;

            }

        }

        else {

            if (!answer) {

                currentQuestion = i;

                renderQuestion();

                showMessage(
                    "Please answer Question " +
                    (i + 1)
                );

                return;

            }

        }

    }


    submitBtn.disabled = true;

    submitBtn.textContent =
        "Checking...";


    const fingerprint =
        createSurveyFingerprint();


    // =================================================
    // CHECK DAILY LIMIT
    // =================================================

    loadDailyLimit()

    .then(function() {

        return getTodayCount(
            user
        );

    })

    .then(function(todayCount) {

        updateDailyProgress(
            todayCount
        );


        if (
            todayCount >=
            DAILY_LIMIT
        ) {

            throw new Error(
                "Daily survey limit reached."
            );

        }


        // =================================================
        // CHECK DUPLICATE
        // =================================================

        return checkDuplicateSurvey(
            fingerprint
        );

    })

    .then(function(isDuplicate) {

        if (isDuplicate) {

            throw new Error(
                "❌ This complete survey has already been submitted. Duplicate survey is not allowed."
            );

        }


        // =================================================
        // PREPARE ANSWERS
        // =================================================

        const questionAnswers =
            {};


        surveyQuestions.forEach(
            function(question,index) {

                let answer =
                    answers.questions[index];


                if (
                    Array.isArray(answer)
                ) {

                    answer =
                        answer.slice();

                }


                questionAnswers[
                    "question_" +
                    (index + 1)
                ] = {

                    question:
                        question.question,

                    type:
                        question.type,

                    answer:
                        answer

                };

            }
        );


        submitBtn.textContent =
            "Submitting...";


        // =================================================
        // SAVE SURVEY
        // =================================================

        return db.collection("surveys")
            .add({

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
                    answers.basic.district,

                pincode:
                    answers.basic.pincode,

                questions:
                    questionAnswers,

                fingerprint:
                    fingerprint,

                surveyorEmail:
                    user.email,

                surveyorId:
                    user.uid,

                createdAt:
                    firebase.firestore
                    .FieldValue
                    .serverTimestamp()

            });

    })


    .then(function() {

        showMessage(
            "✅ Survey submitted successfully!",
            true
        );


        answers = {
            basic: {},
            questions: {}
        };


        currentQuestion = 0;

        surveyStarted = false;


        clearBasicForm();


        const questionStep =
            document.getElementById(
                "questionStep"
            );

        const basicStep =
            document.getElementById(
                "basicDetailsStep"
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


        const questionProgress =
            document.getElementById(
                "questionProgress"
            );


        const stepTitle =
            document.getElementById(
                "stepTitle"
            );


        if (questionProgress) {

            questionProgress.textContent =
                "Basic Details";

        }


        if (stepTitle) {

            stepTitle.textContent =
                "Respondent Details";

        }


        const progressBar =
            document.getElementById(
                "surveyProgressBar"
            );


        if (progressBar) {

            progressBar.style.width =
                "0%";

        }


        return getTodayCount(
            user
        );

    })


    .then(function(newCount) {

        updateDailyProgress(
            newCount
        );


        if (
            newCount >=
            DAILY_LIMIT
        ) {

            disableSurveyButtons();

        }

        else {

            enableSurveyButtons();

        }


        if (submitBtn) {

            submitBtn.textContent =
                "Submit Survey";

        }

    })


    .catch(function(error) {

        console.error(
            "Survey Submit Error:",
            error
        );


        showMessage(
            error.message ||
            "Survey submit failed."
        );


        if (submitBtn) {

            submitBtn.disabled =
                false;

            submitBtn.textContent =
                "Submit Survey";

        }

    });

}


// =====================================================
// CLEAR BASIC FORM
// =====================================================

function clearBasicForm() {

    const ids = [

        "name",
        "mobile",
        "age",
        "village",
        "district",
        "pincode"

    ];


    ids.forEach(
        function(id) {

            const element =
                document.getElementById(
                    id
                );

            if (element) {

                element.value = "";

            }

        }
    );


    const gender =
        document.getElementById(
            "gender"
        );


    if (gender) {

        gender.value = "";

    }

}


// =====================================================
// ENABLE BUTTONS
// =====================================================

function enableSurveyButtons() {

    const basicNext =
        document.getElementById(
            "basicNextButton"
        );


    const next =
        document.getElementById(
            "nextButton"
        );


    const previous =
        document.getElementById(
            "previousButton"
        );


    if (basicNext) {

        basicNext.disabled =
            false;

    }


    if (next) {

        next.disabled =
            false;

    }


    if (previous) {

        previous.disabled =
            false;

    }


    if (submitBtn) {

        submitBtn.disabled =
            false;

        submitBtn.textContent =
            "Submit Survey";

    }

}


// =====================================================
// DISABLE BUTTONS
// =====================================================

function disableSurveyButtons() {

    const basicNext =
        document.getElementById(
            "basicNextButton"
        );


    const next =
        document.getElementById(
            "nextButton"
        );


    const previous =
        document.getElementById(
            "previousButton"
        );


    if (basicNext) {

        basicNext.disabled =
            true;

    }


    if (next) {

        next.disabled =
            true;

    }


    if (previous) {

        previous.disabled =
            true;

    }


    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.textContent =
            "Daily Limit Reached";

    }

}


// =====================================================
// GET INPUT VALUE
// =====================================================

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        return "";

    }


    return String(
        element.value || ""
    ).trim();

}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    text,
    success
) {

    if (!message) {

        message =
            document.getElementById(
                "message"
            );

    }


    if (!message) {

        return;

    }


    message.textContent =
        text;


    message.style.color =
        success === true
        ? "green"
        : "red";

}


function clearMessage() {

    if (!message) {

        return;

    }


    message.textContent =
        "";

}


// =====================================================
// START
// =====================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            initializeSurveyPage();

        }
    );

}

else {

    initializeSurveyPage();

}
