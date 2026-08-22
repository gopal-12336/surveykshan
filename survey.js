console.log("Surveykshan Survey JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 20;

let currentQuestion = 0;
let answers = {
    basic: {},
    questions: {}
};

let submitBtn = null;
let message = null;


/* =====================================================
   INITIALIZE
===================================================== */

function initializeSurveyPage() {

    submitBtn = document.getElementById("submitSurvey");
    message = document.getElementById("message");

    startAuthentication();

    setupBasicDetails();

    setupQuestionButtons();

    loadDailyLimit();

}


/* =====================================================
   AUTHENTICATION
===================================================== */

function startAuthentication() {

    firebase.auth().onAuthStateChanged(function(user) {

        if (!user) {

            window.location.href = "index.html";
            return;

        }

        if (
            user.email &&
            user.email.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
        ) {

            window.location.href = "admin.html";
            return;

        }

        console.log("Surveyor:", user.email);

        checkDailyLimit(user);

    });

}


/* =====================================================
   DAILY LIMIT
===================================================== */

function loadDailyLimit() {

    return db.collection("settings")
        .doc("config")
        .get()

        .then(function(doc) {

            if (doc.exists) {

                const data = doc.data();

                const value =
                    Number(data.dailyLimit);

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


/* =====================================================
   GET TODAY COUNT
===================================================== */

function getTodayCount(user) {

    const todayStart = new Date();

    todayStart.setHours(0, 0, 0, 0);


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

                const data = doc.data();

                if (!data.createdAt) {
                    return;
                }

                let date = null;

                try {

                    if (
                        typeof data.createdAt.toDate ===
                        "function"
                    ) {

                        date =
                            data.createdAt.toDate();

                    }

                }
                catch(error) {

                    return;

                }


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


/* =====================================================
   DAILY LIMIT CHECK
===================================================== */

function checkDailyLimit(user) {

    getTodayCount(user)

        .then(function(count) {

            if (count >= DAILY_LIMIT) {

                disableSurveyButtons();

                showMessage(
                    "Daily limit of " +
                    DAILY_LIMIT +
                    " surveys reached."
                );

            }
            else {

                enableSurveyButtons();

                showMessage(
                    "Today's Surveys: " +
                    count +
                    " / " +
                    DAILY_LIMIT,
                    true
                );

            }

        })

        .catch(function(error) {

            console.error(error);

            enableSurveyButtons();

        });

}


/* =====================================================
   BUTTON ENABLE / DISABLE
===================================================== */

function disableSurveyButtons() {

    const buttons = [

        "basicNextButton",
        "nextButton",
        "previousButton",
        "submitSurvey"

    ];

    buttons.forEach(function(id) {

        const button =
            document.getElementById(id);

        if (button) {

            button.disabled = true;

        }

    });


    if (submitBtn) {

        submitBtn.textContent =
            "Daily Limit Reached";

    }

}


function enableSurveyButtons() {

    const buttons = [

        "basicNextButton",
        "nextButton",
        "previousButton",
        "submitSurvey"

    ];

    buttons.forEach(function(id) {

        const button =
            document.getElementById(id);

        if (button) {

            button.disabled = false;

        }

    });


    if (submitBtn) {

        submitBtn.textContent =
            "Submit Survey";

    }

}


/* =====================================================
   BASIC DETAILS
===================================================== */

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
                document.getElementById("name")
                .value.trim();

            const mobile =
                document.getElementById("mobile")
                .value.trim();

            const age =
                document.getElementById("age")
                .value.trim();

            const gender =
                document.getElementById("gender")
                .value;

            const village =
                document.getElementById("village")
                .value.trim();

            const assembly =
                document.getElementById("assembly")
                .value.trim();

            const party =
                document.getElementById("party")
                .value;

            const candidate =
                document.getElementById("candidate")
                .value.trim();


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

                .then(function(count) {

                    if (count >= DAILY_LIMIT) {

                        disableSurveyButtons();

                        showMessage(
                            "Daily limit reached."
                        );

                        return;

                    }


                    answers.basic = {

                        name: name,

                        mobile: mobile,

                        age: age,

                        gender: gender,

                        village: village,

                        assembly: assembly,

                        party: party,

                        candidate: candidate

                    };


                    currentQuestion = 0;

                    showQuestionPage();

                })

                .catch(function(error) {

                    console.error(error);

                    showMessage(
                        "Unable to check daily limit."
                    );

                });

        }
    );

}


/* =====================================================
   GET QUESTIONS FROM FIREBASE
===================================================== */

function getQuestions() {

    return db.collection("questions")
        .orderBy("createdAt", "asc")
        .get()

        .then(function(snapshot) {

            const questions = [];

            snapshot.forEach(function(doc) {

                const data = doc.data();

                questions.push({

                    id: doc.id,

                    question:
                        data.question || "",

                    type:
                        data.type || "radio",

                    options:
                        Array.isArray(data.options)
                        ? data.options
                        : []

                });

            });

            return questions;

        })

        .catch(function(error) {

            console.error(
                "Question loading error:",
                error
            );

            return [];

        });

}


/* =====================================================
   SHOW QUESTION PAGE
===================================================== */

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

        basicStep.classList.remove("active");

    }


    if (questionStep) {

        questionStep.classList.add("active");

    }


    renderQuestion();

}


/* =====================================================
   RENDER QUESTION
===================================================== */

function renderQuestion() {

    getQuestions()

        .then(function(questions) {

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


            if (!questionText || !optionsBox) {
                return;
            }


            /* NO QUESTIONS */

            if (questions.length === 0) {

                questionNumber.textContent =
                    "";

                questionText.textContent =
                    "No questions available.";

                optionsBox.innerHTML = "";

                if (nextButton) {
                    nextButton.style.display = "none";
                }

                if (previousButton) {
                    previousButton.style.display = "none";
                }

                if (submitButton) {
                    submitButton.style.display = "none";
                }

                updateProgress(0, 0);

                return;

            }


            if (currentQuestion < 0) {
                currentQuestion = 0;
            }


            if (
                currentQuestion >=
                questions.length
            ) {

                currentQuestion =
                    questions.length - 1;

            }


            const question =
                questions[currentQuestion];


            questionNumber.textContent =
                "Question " +
                (currentQuestion + 1) +
                " of " +
                questions.length;


            questionText.textContent =
                question.question;


            optionsBox.innerHTML = "";


            const savedAnswer =
                answers.questions[
                    currentQuestion
                ];


            /* =================================================
               TEXT QUESTION
            ================================================= */

            if (question.type === "text") {

                const textarea =
                    document.createElement(
                        "textarea"
                    );

                textarea.style.width = "100%";
                textarea.style.minHeight = "120px";
                textarea.style.padding = "12px";
                textarea.style.border =
                    "1px solid #ccc";
                textarea.style.borderRadius =
                    "8px";
                textarea.style.fontSize =
                    "16px";
                textarea.placeholder =
                    "Type your answer here...";


                textarea.value =
                    savedAnswer || "";


                textarea.addEventListener(
                    "input",
                    function() {

                        answers.questions[
                            currentQuestion
                        ] = this.value.trim();

                    }
                );


                optionsBox.appendChild(
                    textarea
                );

            }


            /* =================================================
               SINGLE CHOICE
            ================================================= */

            else if (question.type === "radio") {

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

                        input.type = "radio";

                        input.name =
                            "surveyQuestion";

                        input.value =
                            option;


                        if (
                            savedAnswer ===
                            option
                        ) {

                            input.checked = true;

                            label.classList.add(
                                "selected"
                            );

                        }


                        input.addEventListener(
                            "change",
                            function() {

                                answers.questions[
                                    currentQuestion
                                ] = this.value;


                                document
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


            /* =================================================
               MULTIPLE CHOICE
            ================================================= */

            else if (
                question.type === "checkbox"
            ) {

                let selectedAnswers =
                    Array.isArray(savedAnswer)
                    ? savedAnswer
                    : [];


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

                        input.type = "checkbox";

                        input.value = option;


                        if (
                            selectedAnswers.includes(
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

                                let current =
                                    answers.questions[
                                        currentQuestion
                                    ];


                                if (
                                    !Array.isArray(
                                        current
                                    )
                                ) {

                                    current = [];

                                }


                                if (this.checked) {

                                    if (
                                        !current.includes(
                                            this.value
                                        )
                                    ) {

                                        current.push(
                                            this.value
                                        );

                                    }

                                    label.classList.add(
                                        "selected"
                                    );

                                }
                                else {

                                    current =
                                        current.filter(
                                            function(item) {

                                                return item !==
                                                    this.value;

                                            }.bind(this)
                                        );

                                    label.classList.remove(
                                        "selected"
                                    );

                                }


                                answers.questions[
                                    currentQuestion
                                ] = current;

                            }
                        );


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


            /* =================================================
               BUTTON DISPLAY
            ================================================= */

            if (previousButton) {

                previousButton.style.display =
                    currentQuestion === 0
                    ? "none"
                    : "block";

            }


            if (
                currentQuestion ===
                questions.length - 1
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


            updateProgress(
                currentQuestion + 1,
                questions.length
            );

        });

}


/* =====================================================
   PROGRESS
===================================================== */

function updateProgress(
    current,
    total
) {

    const bar =
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


    if (!bar) {
        return;
    }


    if (total === 0) {

        bar.style.width = "0%";

        return;

    }


    const percentage =
        (current / total) * 100;


    bar.style.width =
        percentage + "%";


    if (progressText) {

        progressText.textContent =
            "Question " +
            current +
            " / " +
            total;

    }


    if (stepTitle) {

        stepTitle.textContent =
            "Survey Questions";

    }

}


/* =====================================================
   QUESTION BUTTONS
===================================================== */

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

                getQuestions()

                    .then(function(questions) {

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
                            questions.length - 1
                        ) {

                            currentQuestion++;

                            clearMessage();

                            renderQuestion();

                        }

                    });

            }
        );

    }


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function() {

                if (currentQuestion > 0) {

                    currentQuestion--;

                    clearMessage();

                    renderQuestion();

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


/* =====================================================
   SUBMIT SURVEY
===================================================== */

function submitCompleteSurvey() {

    const user =
        firebase.auth().currentUser;


    if (!user) {

        showMessage(
            "Session expired. Please login again."
        );

        return;

    }


    getQuestions()

        .then(function(questions) {

            /* CHECK ALL ANSWERS */

            for (
                let i = 0;
                i < questions.length;
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

                    return Promise.reject({
                        validation: true
                    });

                }

            }


            submitBtn.disabled = true;

            submitBtn.textContent =
                "Submitting...";


            return getTodayCount(user)

                .then(function(todayCount) {

                    if (
                        todayCount >=
                        DAILY_LIMIT
                    ) {

                        throw new Error(
                            "Daily limit reached."
                        );

                    }


                    const questionAnswers = {};


                    questions.forEach(
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

                            assembly:
                                answers.basic.assembly,

                            party:
                                answers.basic.party,

                            candidate:
                                answers.basic.candidate,

                            feedback: "",

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


            const progressBar =
                document.getElementById(
                    "surveyProgressBar"
                );


            if (progressBar) {

                progressBar.style.width =
                    "0%";

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


            return getTodayCount(user);

        })

        .then(function(newCount) {

            if (newCount >= DAILY_LIMIT) {

                disableSurveyButtons();

                showMessage(
                    "Survey submitted successfully. Daily limit reached.",
                    true
                );

            }
            else {

                enableSurveyButtons();

                const basicNext =
                    document.getElementById(
                        "basicNextButton"
                    );

                if (basicNext) {

                    basicNext.disabled =
                        false;

                }

            }

        })

        .catch(function(error) {

            if (error && error.validation) {
                return;
            }


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


/* =====================================================
   CLEAR BASIC FORM
===================================================== */

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


    ids.forEach(function(id) {

        const element =
            document.getElementById(id);

        if (element) {

            element.value = "";

        }

    });


    const gender =
        document.getElementById(
            "gender"
        );

    if (gender) {

        gender.value = "";

    }


    const party =
        document.getElementById(
            "party"
        );

    if (party) {

        party.value = "";

    }

}


/* =====================================================
   MESSAGE
===================================================== */

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

        message.textContent = "";

    }

}


/* =====================================================
   START
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSurveyPage
    );

}
else {

    initializeSurveyPage();

}
