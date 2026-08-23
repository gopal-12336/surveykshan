console.log("Surveykshan - Survey JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 20;
let currentQuestion = 0;

let answers = {
    basic: {},
    questions: {}
};

let submitBtn = null;
let message = null;


// =====================================================
// START
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    submitBtn = document.getElementById("submitSurvey");
    message = document.getElementById("message");

    startAuthentication();
    setupBasicDetails();
    setupQuestionButtons();

});


// =====================================================
// AUTHENTICATION
// =====================================================

function startAuthentication() {

    firebase.auth().onAuthStateChanged(function (user) {

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

        loadDailyLimit().then(function () {
            checkDailyLimit(user);
        });

    });

}


// =====================================================
// DAILY LIMIT
// =====================================================

function loadDailyLimit() {

    return db.collection("settings")
        .doc("config")
        .get()
        .then(function (doc) {

            if (doc.exists) {

                const value =
                    Number(doc.data().dailyLimit);

                if (
                    Number.isFinite(value) &&
                    value > 0
                ) {
                    DAILY_LIMIT = value;
                }
            }

        })
        .catch(function (error) {

            console.error(
                "Daily Limit Error:",
                error
            );

        });

}


function getTodayCount(user) {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return db.collection("surveys")
        .where(
            "surveyorEmail",
            "==",
            user.email
        )
        .get()
        .then(function (snapshot) {

            let count = 0;

            snapshot.forEach(function (doc) {

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

                } catch (e) {
                    return;
                }

                if (date && date >= today) {
                    count++;
                }

            });

            return count;

        });

}


function checkDailyLimit(user) {

    getTodayCount(user)
        .then(function (count) {

            updateDailyProgress(count);

            if (count >= DAILY_LIMIT) {

                disableSurveyButtons();

                showMessage(
                    "Today's survey limit has been reached."
                );

            } else {

                enableSurveyButtons();

            }

        })
        .catch(function (error) {

            console.error(error);

        });

}


// =====================================================
// DAILY PROGRESS
// =====================================================

function updateDailyProgress(count) {

    let box =
        document.getElementById("dailyProgressBox");

    if (!box) {
        return;
    }

    box.innerHTML = `

        <div style="
            background:#fff;
            border:1px solid #ddd;
            border-radius:10px;
            padding:12px;
            margin-bottom:15px;
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                font-weight:bold;
                margin-bottom:7px;
            ">

                <span>📊 Today's Progress</span>

                <span>
                    ${count} / ${DAILY_LIMIT}
                </span>

            </div>

            <div style="
                width:100%;
                height:10px;
                background:#eee;
                border-radius:20px;
                overflow:hidden;
            ">

                <div style="
                    width:${Math.min(
                        (count / DAILY_LIMIT) * 100,
                        100
                    )}%;
                    height:100%;
                    background:#1565c0;
                "></div>

            </div>

            <div style="
                margin-top:7px;
                font-size:13px;
                color:#555;
            ">

                Remaining today:
                ${Math.max(
                    DAILY_LIMIT - count,
                    0
                )}

            </div>

        </div>

    `;

}


// =====================================================
// BUTTON CONTROL
// =====================================================

function disableSurveyButtons() {

    [
        "basicNextButton",
        "nextButton",
        "previousButton"
    ].forEach(function (id) {

        const button =
            document.getElementById(id);

        if (button) {
            button.disabled = true;
        }

    });

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent =
            "Daily Limit Reached";
    }

}


function enableSurveyButtons() {

    [
        "basicNextButton",
        "nextButton",
        "previousButton"
    ].forEach(function (id) {

        const button =
            document.getElementById(id);

        if (button) {
            button.disabled = false;
        }

    });

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent =
            "Submit Survey";
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
        function () {

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
                    "Please fill all required details."
                );

                return;

            }


            answers.basic = {

                name,
                mobile,
                age,
                gender,
                village,
                assembly,
                party,
                candidate

            };


            showQuestionPage();

        }
    );

}


// =====================================================
// GET QUESTIONS
// =====================================================

function getQuestions() {

    if (
        typeof SURVEY_QUESTIONS ===
        "undefined"
    ) {

        console.error(
            "questions.js not loaded."
        );

        return [];

    }

    return Array.isArray(
        SURVEY_QUESTIONS
    )
        ? SURVEY_QUESTIONS
        : [];

}


// =====================================================
// SHOW QUESTION PAGE
// =====================================================

function showQuestionPage() {

    const basic =
        document.getElementById(
            "basicDetailsStep"
        );

    const question =
        document.getElementById(
            "questionStep"
        );


    if (basic) {
        basic.classList.remove("active");
    }

    if (question) {
        question.classList.add("active");
    }


    currentQuestion = 0;

    renderQuestion();

}


// =====================================================
// RENDER QUESTION
// =====================================================

function renderQuestion() {

    const questions =
        getQuestions();

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


    if (questions.length === 0) {

        questionText.textContent =
            "No questions available.";

        optionsBox.innerHTML = "";

        return;

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


    const type =
        question.type || "radio";


    let savedAnswer =
        answers.questions[
            currentQuestion
        ];


    // =================================================
    // RADIO / CHECKBOX
    // =================================================

    if (
        type === "radio" ||
        type === "checkbox"
    ) {

        const selectedValues =
            Array.isArray(savedAnswer)
                ? savedAnswer
                : (
                    savedAnswer
                    ? [savedAnswer]
                    : []
                );


        (question.options || [])
            .forEach(function (option, index) {

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
                    type;

                input.name =
                    type === "radio"
                        ? "surveyQuestion"
                        : "surveyQuestion_" +
                          currentQuestion;

                input.value =
                    option;


                if (
                    selectedValues.includes(
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
                    function () {

                        if (type === "radio") {

                            answers.questions[
                                currentQuestion
                            ] =
                                this.value;


                            const labels =
                                optionsBox
                                .querySelectorAll(
                                    ".option-label"
                                );

                            labels.forEach(
                                function (item) {

                                    item.classList.remove(
                                        "selected"
                                    );

                                }
                            );


                            label.classList.add(
                                "selected"
                            );

                        }


                        else {

                            let selected = [];

                            optionsBox
                                .querySelectorAll(
                                    "input[type='checkbox']:checked"
                                )
                                .forEach(
                                    function (checkbox) {

                                        selected.push(
                                            checkbox.value
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

                            } else {

                                label.classList.remove(
                                    "selected"
                                );

                            }

                        }

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

            });

    }


    // =================================================
    // TEXT ANSWER
    // =================================================

    else if (type === "text") {

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
        textarea.style.boxSizing =
            "border-box";

        textarea.placeholder =
            "Type your answer here...";

        textarea.value =
            savedAnswer || "";


        textarea.addEventListener(
            "input",
            function () {

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
    // BUTTONS
    // =================================================

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


    updateQuestionProgress();

}


// =====================================================
// QUESTION PROGRESS
// =====================================================

function updateQuestionProgress() {

    const questions =
        getQuestions();

    const bar =
        document.getElementById(
            "surveyProgressBar"
        );

    const progress =
        document.getElementById(
            "questionProgress"
        );

    const title =
        document.getElementById(
            "stepTitle"
        );


    if (!bar) {
        return;
    }


    if (questions.length === 0) {

        bar.style.width = "0%";

        return;

    }


    const percent =
        (
            (currentQuestion + 1) /
            questions.length
        ) * 100;


    bar.style.width =
        percent + "%";


    if (progress) {

        progress.textContent =
            "Question " +
            (currentQuestion + 1) +
            " / " +
            questions.length;

    }


    if (title) {

        title.textContent =
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
            function () {

                const questions =
                    getQuestions();

                const answer =
                    answers.questions[
                        currentQuestion
                    ];


                if (
                    !answer ||
                    (
                        Array.isArray(answer) &&
                        answer.length === 0
                    )
                ) {

                    showMessage(
                        "Please select an option before continuing."
                    );

                    return;

                }


                if (
                    currentQuestion <
                    questions.length - 1
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
            function () {

                if (currentQuestion > 0) {

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


    const questions =
        getQuestions();


    // Check every question

    for (
        let i = 0;
        i < questions.length;
        i++
    ) {

        const answer =
            answers.questions[i];


        if (
            !answer ||
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


    submitBtn.disabled = true;

    submitBtn.textContent =
        "Submitting...";


    getTodayCount(user)

        .then(function (todayCount) {

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


            const questionAnswers = {};


            questions.forEach(
                function (question, index) {

                    questionAnswers[
                        "question_" +
                        (index + 1)
                    ] = {

                        question:
                            question.question,

                        type:
                            question.type ||
                            "radio",

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


        .then(function () {

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


            const progress =
                document.getElementById(
                    "questionProgress"
                );

            const title =
                document.getElementById(
                    "stepTitle"
                );

            const bar =
                document.getElementById(
                    "surveyProgressBar"
                );


            if (progress) {
                progress.textContent =
                    "Basic Details";
            }


            if (title) {
                title.textContent =
                    "Respondent Details";
            }


            if (bar) {
                bar.style.width =
                    "0%";
            }


            return getTodayCount(user);

        })


        .then(function (newCount) {

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

        })


        .catch(function (error) {

            console.error(
                "Survey Submit Error:",
                error
            );


            showMessage(
                error.message ||
                "Survey submission failed."
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
// CLEAR FORM
// =====================================================

function clearBasicForm() {

    [
        "name",
        "mobile",
        "age",
        "village",
        "assembly",
        "candidate"
    ].forEach(function (id) {

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


// =====================================================
// MESSAGE
// =====================================================

function showMessage(text, success) {

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
