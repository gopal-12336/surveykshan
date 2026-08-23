console.log("Survey JS Loaded - Dynamic Firestore Questions");

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


// =====================================================
// INITIALIZE
// =====================================================

function initializeSurveyPage() {

    console.log("Initializing Survey Page...");

    submitBtn =
        document.getElementById("submitSurvey");

    message =
        document.getElementById("message");

    createDailyProgressUI();

    setupBasicDetails();

    setupQuestionButtons();

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

    const box =
        document.createElement("div");

    box.id = "dailyProgressBox";

    box.style.backgroundColor = "#ffffff";
    box.style.border = "1px solid #e0e0e0";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.margin = "15px 0";
    box.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.08)";


    const titleRow =
        document.createElement("div");

    titleRow.style.display = "flex";
    titleRow.style.justifyContent =
        "space-between";
    titleRow.style.alignItems =
        "center";
    titleRow.style.marginBottom = "8px";
    titleRow.style.fontSize = "15px";
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

    progressBackground.style.width =
        "100%";

    progressBackground.style.height =
        "12px";

    progressBackground.style.backgroundColor =
        "#eeeeee";

    progressBackground.style.borderRadius =
        "20px";

    progressBackground.style.overflow =
        "hidden";


    const progressBar =
        document.createElement("div");

    progressBar.id =
        "dailyProgressBar";

    progressBar.style.width =
        "0%";

    progressBar.style.height =
        "100%";

    progressBar.style.backgroundColor =
        "#1565c0";

    progressBar.style.borderRadius =
        "20px";

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

    remainingText.style.marginTop =
        "8px";

    remainingText.style.fontSize =
        "13px";

    remainingText.style.color =
        "#555555";


    box.appendChild(titleRow);
    box.appendChild(progressBackground);
    box.appendChild(remainingText);


    const container =
        document.querySelector(
            ".login-box"
        );


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

function updateDailyProgress(todayCount) {

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


    const limit =
        Number(DAILY_LIMIT) > 0
            ? Number(DAILY_LIMIT)
            : 20;


    let count =
        Number(todayCount);


    if (
        !Number.isFinite(count) ||
        count < 0
    ) {
        count = 0;
    }


    const remaining =
        Math.max(
            limit - count,
            0
        );


    const percentage =
        Math.min(
            (count / limit) * 100,
            100
        );


    progressText.textContent =
        count + " / " + limit;


    if (remaining > 0) {

        remainingText.textContent =
            "Remaining today: " +
            remaining;

    } else {

        remainingText.textContent =
            "Daily limit reached";
    }


    progressBar.style.width =
        percentage + "%";


    if (count >= limit) {

        progressBar.style.backgroundColor =
            "#c62828";

        progressText.style.color =
            "#c62828";

        remainingText.style.color =
            "#c62828";

    }

    else if (percentage >= 80) {

        progressBar.style.backgroundColor =
            "#ef6c00";

        progressText.style.color =
            "#ef6c00";

        remainingText.style.color =
            "#555555";

    }

    else {

        progressBar.style.backgroundColor =
            "#1565c0";

        progressText.style.color =
            "#1565c0";

        remainingText.style.color =
            "#555555";
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

                const data =
                    doc.data();

                const value =
                    Number(
                        data.dailyLimit
                    );

                if (
                    Number.isFinite(value) &&
                    value > 0
                ) {

                    DAILY_LIMIT =
                        value;
                }
            }

            console.log(
                "Daily Limit:",
                DAILY_LIMIT
            );

        })

        .catch(function(error) {

            console.error(
                "Daily Limit Error:",
                error
            );

            DAILY_LIMIT = 20;

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
                            user.email
                                .toLowerCase() ===
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

                                return loadQuestionsFromFirestore();

                            })

                            .then(function() {

                                checkDailyLimit(
                                    user
                                );

                            })

                            .catch(function(error) {

                                console.error(
                                    "Survey Initialization Error:",
                                    error
                                );

                                showMessage(
                                    error.message ||
                                    "Unable to load survey."
                                );

                            });

                    }
                );

        })

        .catch(function(error) {

            console.error(
                "Auth Persistence Error:",
                error
            );

        });
}


// =====================================================
// LOAD QUESTIONS FROM FIRESTORE
// =====================================================

function loadQuestionsFromFirestore() {

    console.log(
        "Loading questions from Firestore..."
    );


    return db.collection("questions")
        .get()

        .then(function(snapshot) {

            surveyQuestions = [];


            snapshot.forEach(function(doc) {

                const data =
                    doc.data();


                surveyQuestions.push({

                    id: doc.id,

                    question:
                        data.question || "",

                    type:
                        data.type || "single",

                    options:
                        Array.isArray(
                            data.options
                        )
                            ? data.options
                            : [],

                    createdAt:
                        data.createdAt || null

                });

            });


            // Sort by creation time if available

            surveyQuestions.sort(
                function(a, b) {

                    if (
                        a.createdAt &&
                        b.createdAt &&
                        typeof a.createdAt.toMillis ===
                        "function" &&
                        typeof b.createdAt.toMillis ===
                        "function"
                    ) {

                        return (
                            a.createdAt.toMillis() -
                            b.createdAt.toMillis()
                        );

                    }

                    return 0;

                }
            );


            console.log(
                "Firestore Questions Loaded:",
                surveyQuestions.length
            );


            if (
                surveyQuestions.length === 0
            ) {

                showMessage(
                    "No questions found. Please add questions from Admin Panel."
                );

            }


            renderQuestion();

        })

        .catch(function(error) {

            console.error(
                "Question Loading Error:",
                error
            );


            surveyQuestions = [];


            showMessage(
                "Unable to load questions: " +
                error.message
            );


            renderQuestion();

            throw error;

        });

}


// =====================================================
// GET TODAY COUNT
// =====================================================

function getTodayCount(user) {

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

            let todayCount = 0;


            snapshot.forEach(
                function(doc) {

                    const data =
                        doc.data();


                    if (!data.createdAt) {
                        return;
                    }


                    let date = null;


                    try {

                        if (
                            typeof data
                                .createdAt
                                .toDate ===
                            "function"
                        ) {

                            date =
                                data.createdAt
                                    .toDate();

                        }

                        else if (
                            data.createdAt.seconds
                        ) {

                            date =
                                new Date(
                                    data.createdAt.seconds *
                                    1000
                                );
                        }

                    }

                    catch(error) {

                        return;

                    }


                    if (
                        date &&
                        date >= todayStart
                    ) {

                        todayCount++;

                    }

                }
            );


            return todayCount;

        });

}


// =====================================================
// CHECK DAILY LIMIT
// =====================================================

function checkDailyLimit(user) {

    getTodayCount(user)

        .then(function(todayCount) {

            updateDailyProgress(
                todayCount
            );


            if (
                todayCount >=
                DAILY_LIMIT
            ) {

                showMessage(
                    todayCount +
                    " surveys completed today. Daily limit reached."
                );


                disableSurveyButtons();

                return;
            }


            enableSurveyButtons();


            showMessage(
                "Today's Surveys: " +
                todayCount +
                " / " +
                DAILY_LIMIT,
                true
            );

        })

        .catch(function(error) {

            console.error(
                "Daily Limit Error:",
                error
            );


            enableSurveyButtons();


            showMessage(
                "Unable to check today's survey count."
            );

        });

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
        basicNext.disabled = false;
    }

    if (next) {
        next.disabled = false;
    }

    if (previous) {
        previous.disabled = false;
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
        basicNext.disabled = true;
    }

    if (next) {
        next.disabled = true;
    }

    if (previous) {
        previous.disabled = true;
    }


    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.textContent =
            "Daily Limit Reached";

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

            const name =
                document.getElementById(
                    "name"
                ).value.trim();


            const mobile =
                document.getElementById(
                    "mobile"
                ).value.trim();


            const age =
                document.getElementById(
                    "age"
                ).value.trim();


            const gender =
                document.getElementById(
                    "gender"
                ).value;


            const village =
                document.getElementById(
                    "village"
                ).value.trim();


            const assembly =
                document.getElementById(
                    "assembly"
                ).value.trim();


            const party =
                document.getElementById(
                    "party"
                ).value;


            const candidate =
                document.getElementById(
                    "candidate"
                ).value.trim();


            if (
                !name ||
                !mobile ||
                !age ||
                !gender ||
                !village ||
                !assembly ||
                !party
            ) {

                showMessage(
                    "Please fill all required basic details."
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

                .then(function(todayCount) {

                    updateDailyProgress(
                        todayCount
                    );


                    if (
                        todayCount >=
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

                        assembly:
                            assembly,

                        party:
                            party,

                        candidate:
                            candidate

                    };


                    showQuestionPage();

                })

                .catch(function(error) {

                    console.error(
                        "Basic Details Error:",
                        error
                    );


                    showMessage(
                        "Unable to check daily limit."
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


    currentQuestion = 0;

    answers.questions = {};

    renderQuestion();

    updateQuestionProgress();

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


    // NO QUESTIONS

    if (
        surveyQuestions.length === 0
    ) {

        questionText.textContent =
            "No questions available.";

        optionsBox.innerHTML =
            "<p>Please ask admin to add questions.</p>";


        if (nextButton) {
            nextButton.style.display =
                "none";
        }


        if (previousButton) {
            previousButton.style.display =
                "none";
        }


        if (submitButton) {
            submitButton.style.display =
                "none";
        }


        return;

    }


    if (
        currentQuestion < 0
    ) {

        currentQuestion = 0;

    }


    if (
        currentQuestion >=
        surveyQuestions.length
    ) {

        currentQuestion =
            surveyQuestions.length - 1;

    }


    const question =
        surveyQuestions[
            currentQuestion
        ];


    questionNumber.textContent =
        "Question " +
        (currentQuestion + 1) +
        " of " +
        surveyQuestions.length;


    questionText.textContent =
        question.question;


    optionsBox.innerHTML =
        "";


    const savedAnswer =
        answers.questions[
            currentQuestion
        ];


    // =================================================
    // TEXT QUESTION
    // =================================================

    if (
        question.type === "text"
    ) {

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.style.width =
            "100%";

        textarea.style.minHeight =
            "120px";

        textarea.style.padding =
            "12px";

        textarea.style.border =
            "2px solid #ddd";

        textarea.style.borderRadius =
            "10px";

        textarea.style.boxSizing =
            "border-box";

        textarea.placeholder =
            "Type your answer here...";


        textarea.value =
            savedAnswer || "";


        textarea.addEventListener(
            "input",
            function() {

                answers.questions[
                    currentQuestion
                ] =
                    this.value.trim();

            }
        );


        optionsBox.appendChild(
            textarea
        );

    }


    // =================================================
    // SINGLE / MULTIPLE QUESTION
    // =================================================

    else {

        const isMultiple =
            question.type === "multiple" ||
            question.type === "checkbox";


        let selectedValues = [];


        if (Array.isArray(savedAnswer)) {

            selectedValues =
                savedAnswer;

        }

        else if (
            savedAnswer
        ) {

            selectedValues =
                [savedAnswer];

        }


        const options =
            Array.isArray(
                question.options
            )
                ? question.options
                : [];


        options.forEach(
            function(option, index) {

                const label =
                    document.createElement(
                        "label"
                    );


                label.className =
                    "option-label";


                label.style.display =
                    "flex";

                label.style.alignItems =
                    "center";

                label.style.gap =
                    "10px";

                label.style.cursor =
                    "pointer";


                const input =
                    document.createElement(
                        "input"
                    );


                input.type =
                    isMultiple
                        ? "checkbox"
                        : "radio";


                input.name =
                    "surveyQuestion";


                input.value =
                    option;


                input.style.width =
                    "auto";


                input.style.margin =
                    "0";


                input.style.flexShrink =
                    "0";


                if (
                    selectedValues.includes(
                        option
                    )
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

                        if (isMultiple) {

                            let values =
                                Array.isArray(
                                    answers.questions[
                                        currentQuestion
                                    ]
                                )
                                    ? answers.questions[
                                        currentQuestion
                                    ]
                                    : [];


                            if (
                                this.checked
                            ) {

                                if (
                                    !values.includes(
                                        this.value
                                    )
                                ) {

                                    values.push(
                                        this.value
                                    );

                                }

                                label.classList.add(
                                    "selected"
                                );

                            }

                            else {

                                values =
                                    values.filter(
                                        function(value) {

                                            return value !==
                                                this.value;

                                        }
                                    );

                                label.classList.remove(
                                    "selected"
                                );

                            }


                            answers.questions[
                                currentQuestion
                            ] =
                                values;


                        }

                        else {

                            answers.questions[
                                currentQuestion
                            ] =
                                this.value;


                            const labels =
                                optionsBox.querySelectorAll(
                                    ".option-label"
                                );


                            labels.forEach(
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

                    }
                );


                label.appendChild(
                    input
                );


                const text =
                    document.createTextNode(
                        option
                    );


                label.appendChild(
                    text
                );


                optionsBox.appendChild(
                    label
                );

            }
        );


        if (
            options.length === 0
        ) {

            optionsBox.innerHTML =
                "<p>No options available for this question.</p>";

        }

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

                const answer =
                    answers.questions[
                        currentQuestion
                    ];


                if (
                    answer === undefined ||
                    answer === null ||
                    answer === "" ||
                    (
                        Array.isArray(answer) &&
                        answer.length === 0
                    )
                ) {

                    showMessage(
                        "Please answer this question before continuing."
                    );

                    return;

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
// SUBMIT SURVEY
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
            "No survey questions available."
        );

        return;

    }


    // CHECK ALL QUESTIONS

    for (
        let i = 0;
        i < surveyQuestions.length;
        i++
    ) {

        const answer =
            answers.questions[i];


        if (
            answer === undefined ||
            answer === null ||
            answer === "" ||
            (
                Array.isArray(answer) &&
                answer.length === 0
            )
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

    }


    submitBtn.disabled =
        true;

    submitBtn.textContent =
        "Submitting...";


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
                    "Daily limit of " +
                    DAILY_LIMIT +
                    " surveys reached."
                );

            }


            const questionAnswers =
                {};


            surveyQuestions.forEach(
                function(question, index) {

                    questionAnswers[
                        "question_" +
                        (index + 1)
                    ] = {

                        question:
                            question.question,

                        type:
                            question.type,

                        answer:
                            answers.questions[
                                index
                            ]

                    };

                }
            );


            return db.collection(
                "surveys"
            )
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

                assembly:
                    answers.basic.assembly,

                party:
                    answers.basic.party,

                candidate:
                    answers.basic.candidate,

                feedback:
                    "",

                questions:
                    questionAnswers,

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


                showMessage(
                    "Survey submitted successfully. Daily limit reached.",
                    true
                );

            }

            else {

                enableSurveyButtons();

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
        "assembly",
        "candidate",
        "feedback"

    ];


    ids.forEach(
        function(id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.value =
                    "";

            }

        }
    );


    const gender =
        document.getElementById(
            "gender"
        );


    if (gender) {

        gender.value =
            "";

    }


    const party =
        document.getElementById(
            "party"
        );


    if (party) {

        party.value =
            "";

    }

}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    text,
    success
) {

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

    if (message) {

        message.textContent =
            "";

    }

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
