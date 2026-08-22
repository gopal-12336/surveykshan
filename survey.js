console.log("Survey JS Loaded - Final Multi-Step Version");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 20;
let currentQuestion = 0;
let answers = {};
let submitBtn = null;
let message = null;


// =====================================================
// INITIALIZE
// =====================================================

function initializeSurveyPage() {

    submitBtn = document.getElementById("submitSurvey");
    message = document.getElementById("message");

    createDailyProgressUI();
    startAuthentication();
    setupBasicDetails();
    setupQuestionButtons();

}


// =====================================================
// DAILY PROGRESS UI
// =====================================================

function createDailyProgressUI() {

    if (document.getElementById("dailyProgressBox")) {
        return;
    }

    const box = document.createElement("div");

    box.id = "dailyProgressBox";

    box.style.background = "#fff";
    box.style.border = "1px solid #ddd";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.marginBottom = "20px";

    box.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            font-weight:bold;
            margin-bottom:8px;
        ">
            <span>📊 Today's Progress</span>
            <span id="dailyProgressText">0 / 20</span>
        </div>

        <div style="
            width:100%;
            height:12px;
            background:#eee;
            border-radius:20px;
            overflow:hidden;
        ">
            <div id="dailyProgressBar"
                style="
                    width:0%;
                    height:100%;
                    background:#1565c0;
                    transition:.3s;
                ">
            </div>
        </div>

        <div id="dailyRemainingText"
            style="
                margin-top:8px;
                font-size:13px;
                color:#555;
            ">
            Remaining today: 20
        </div>
    `;

    const container = document.querySelector(".login-box");

    if (container) {
        container.insertBefore(box, container.firstChild);
    }
}


// =====================================================
// UPDATE DAILY PROGRESS
// =====================================================

function updateDailyProgress(count) {

    const progressText =
        document.getElementById("dailyProgressText");

    const progressBar =
        document.getElementById("dailyProgressBar");

    const remainingText =
        document.getElementById("dailyRemainingText");

    if (!progressText || !progressBar || !remainingText) {
        return;
    }

    count = Number(count) || 0;

    const remaining =
        Math.max(DAILY_LIMIT - count, 0);

    const percentage =
        Math.min((count / DAILY_LIMIT) * 100, 100);

    progressText.textContent =
        count + " / " + DAILY_LIMIT;

    remainingText.textContent =
        remaining > 0
            ? "Remaining today: " + remaining
            : "Daily limit reached";

    progressBar.style.width =
        percentage + "%";

    if (count >= DAILY_LIMIT) {

        progressBar.style.background = "#c62828";

    } else if (percentage >= 80) {

        progressBar.style.background = "#ef6c00";

    } else {

        progressBar.style.background = "#1565c0";
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
                    Number(doc.data().dailyLimit);

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
                .onAuthStateChanged(function(user) {

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

                            checkDailyLimit(user);

                        });

                });

        })

        .catch(function(error) {

            console.error(error);

        });
}


// =====================================================
// GET TODAY COUNT
// =====================================================

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

                    } else if (
                        data.createdAt.seconds
                    ) {

                        date =
                            new Date(
                                data.createdAt.seconds * 1000
                            );
                    }

                } catch (e) {

                    return;
                }

                if (date && date >= todayStart) {
                    count++;
                }

            });

            return count;

        });
}


// =====================================================
// CHECK DAILY LIMIT
// =====================================================

function checkDailyLimit(user) {

    getTodayCount(user)

        .then(function(count) {

            updateDailyProgress(count);

            if (count >= DAILY_LIMIT) {

                disableSurveyButtons();

                showMessage(
                    "Daily limit reached."
                );

            } else {

                enableSurveyButtons();

            }

        })

        .catch(function(error) {

            console.error(error);

            enableSurveyButtons();

        });
}


// =====================================================
// ENABLE BUTTONS
// =====================================================

function enableSurveyButtons() {

    const basicNext =
        document.getElementById("basicNextButton");

    if (basicNext) {
        basicNext.disabled = false;
    }

    if (submitBtn) {

        submitBtn.disabled = false;

        submitBtn.textContent =
            "Submit Survey";
    }
}


// =====================================================
// DISABLE BUTTONS
// =====================================================

function disableSurveyButtons() {

    const buttons = [
        "basicNextButton",
        "nextButton",
        "previousButton"
    ];

    buttons.forEach(function(id) {

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


// =====================================================
// BASIC DETAILS
// =====================================================

function setupBasicDetails() {

    const button =
        document.getElementById("basicNextButton");

    if (!button) {
        return;
    }

    button.addEventListener("click", function() {

        const name =
            document.getElementById("name").value.trim();

        const mobile =
            document.getElementById("mobile").value.trim();

        const age =
            document.getElementById("age").value.trim();

        const gender =
            document.getElementById("gender").value;

        const village =
            document.getElementById("village").value.trim();

        const assembly =
            document.getElementById("assembly").value.trim();

        const party =
            document.getElementById("party").value;

        const candidate =
            document.getElementById("candidate").value.trim();


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

                updateDailyProgress(count);

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


                answers.questions = {};

                currentQuestion = 0;

                showQuestionPage();

            });

    });
}


// =====================================================
// GET QUESTIONS
// =====================================================

function getQuestions() {

    if (
        typeof SURVEY_QUESTIONS === "undefined"
    ) {

        console.error(
            "questions.js not loaded."
        );

        return [];
    }

    return Array.isArray(SURVEY_QUESTIONS)
        ? SURVEY_QUESTIONS
        : [];
}


// =====================================================
// SHOW QUESTION PAGE
// =====================================================

function showQuestionPage() {

    const basicStep =
        document.getElementById("basicDetailsStep");

    const questionStep =
        document.getElementById("questionStep");

    if (basicStep) {
        basicStep.classList.remove("active");
    }

    if (questionStep) {
        questionStep.classList.add("active");
    }

    renderQuestion();
}


// =====================================================
// RENDER QUESTION
// =====================================================

function renderQuestion() {

    const questions = getQuestions();

    const questionText =
        document.getElementById("questionText");

    const questionNumber =
        document.getElementById("questionNumber");

    const optionsBox =
        document.getElementById("questionOptions");

    const nextButton =
        document.getElementById("nextButton");

    const previousButton =
        document.getElementById("previousButton");

    const submitButton =
        document.getElementById("submitSurvey");


    if (!questionText || !optionsBox) {
        return;
    }


    if (questions.length === 0) {

        questionText.textContent =
            "No questions found.";

        optionsBox.innerHTML = "";

        if (nextButton) {
            nextButton.style.display = "none";
        }

        if (submitButton) {
            submitButton.style.display = "block";
        }

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
        question.question || "";


    optionsBox.innerHTML = "";


    if (!answers.questions) {
        answers.questions = {};
    }


    /*
    =====================================================
    IMPORTANT:
    QUESTION TYPE CHECK
    =====================================================
    */

    const type =
        question.type || "radio";


    // =================================================
    // TEXT ANSWER
    // =================================================

    if (type === "text") {

        const textarea =
            document.createElement("textarea");

        textarea.style.width = "100%";
        textarea.style.minHeight = "120px";
        textarea.style.padding = "12px";
        textarea.style.border = "1px solid #ccc";
        textarea.style.borderRadius = "8px";
        textarea.style.fontSize = "16px";
        textarea.placeholder =
            "Type your answer...";

        textarea.value =
            answers.questions[currentQuestion] || "";

        textarea.addEventListener("input", function() {

            answers.questions[currentQuestion] =
                this.value;

        });

        optionsBox.appendChild(textarea);

    }


    // =================================================
    // MULTIPLE CHOICE
    // =================================================

    else if (type === "checkbox") {

        const saved =
            Array.isArray(
                answers.questions[currentQuestion]
            )
                ? answers.questions[currentQuestion]
                : [];


        (question.options || [])
            .forEach(function(option) {

                const label =
                    document.createElement("label");

                label.className =
                    "option-label";


                const input =
                    document.createElement("input");

                input.type = "checkbox";

                input.name =
                    "surveyQuestion";

                input.value =
                    option;


                if (saved.includes(option)) {

                    input.checked = true;

                    label.classList.add(
                        "selected"
                    );
                }


                input.addEventListener(
                    "change",
                    function() {

                        let selected =
                            Array.isArray(
                                answers.questions[
                                    currentQuestion
                                ]
                            )
                                ? answers.questions[
                                    currentQuestion
                                ]
                                : [];


                        if (this.checked) {

                            if (
                                !selected.includes(
                                    this.value
                                )
                            ) {

                                selected.push(
                                    this.value
                                );
                            }

                            label.classList.add(
                                "selected"
                            );

                        } else {

                            selected =
                                selected.filter(
                                    function(item) {
                                        return item !==
                                            input.value;
                                    }
                                );

                            label.classList.remove(
                                "selected"
                            );
                        }


                        answers.questions[
                            currentQuestion
                        ] = selected;

                    }
                );


                label.appendChild(input);

                label.appendChild(
                    document.createTextNode(
                        option
                    )
                );

                optionsBox.appendChild(label);

            });

    }


    // =================================================
    // SINGLE CHOICE
    // =================================================

    else {

        const saved =
            answers.questions[currentQuestion] || "";


        (question.options || [])
            .forEach(function(option) {

                const label =
                    document.createElement("label");

                label.className =
                    "option-label";


                const input =
                    document.createElement("input");

                input.type = "radio";

                input.name =
                    "surveyQuestion";

                input.value =
                    option;


                if (saved === option) {

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
                );


                label.appendChild(input);

                label.appendChild(
                    document.createTextNode(
                        option
                    )
                );

                optionsBox.appendChild(label);

            });
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
        questions.length - 1
    ) {

        if (nextButton) {
            nextButton.style.display = "none";
        }

        if (submitButton) {
            submitButton.style.display = "block";
        }

    } else {

        if (nextButton) {
            nextButton.style.display = "block";
        }

        if (submitButton) {
            submitButton.style.display = "none";
        }
    }


    updateQuestionProgress();
}


// =====================================================
// VALIDATE ANSWER
// =====================================================

function hasAnswer(index) {

    const answer =
        answers.questions &&
        answers.questions[index];


    if (Array.isArray(answer)) {

        return answer.length > 0;

    }


    return (
        answer !== undefined &&
        answer !== null &&
        String(answer).trim() !== ""
    );
}


// =====================================================
// QUESTION PROGRESS
// =====================================================

function updateQuestionProgress() {

    const questions =
        getQuestions();

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


    if (questions.length === 0) {

        progressBar.style.width = "100%";

        return;
    }


    const percentage =
        ((currentQuestion + 1) /
            questions.length) * 100;


    progressBar.style.width =
        percentage + "%";


    if (progressText) {

        progressText.textContent =
            "Question " +
            (currentQuestion + 1) +
            " / " +
            questions.length;
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
        document.getElementById("nextButton");

    const previousButton =
        document.getElementById("previousButton");


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function() {

                const questions =
                    getQuestions();


                if (!hasAnswer(currentQuestion)) {

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


    // CHECK ALL QUESTIONS

    for (
        let i = 0;
        i < questions.length;
        i++
    ) {

        if (!hasAnswer(i)) {

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


    loadDailyLimit()

        .then(function() {

            return getTodayCount(user);

        })

        .then(function(count) {

            updateDailyProgress(count);


            if (count >= DAILY_LIMIT) {

                throw new Error(
                    "Daily limit of " +
                    DAILY_LIMIT +
                    " surveys reached."
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
                            question.type ||
                            "radio",

                        answer:
                            answers.questions[index]

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

        })

        .then(function() {

            showMessage(
                "✅ Survey submitted successfully!",
                true
            );


            answers = {};

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


            const progressText =
                document.getElementById(
                    "questionProgress"
                );

            const stepTitle =
                document.getElementById(
                    "stepTitle"
                );


            if (progressText) {

                progressText.textContent =
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


            return getTodayCount(user);

        })

        .then(function(count) {

            updateDailyProgress(count);


            if (count >= DAILY_LIMIT) {

                disableSurveyButtons();

            } else {

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

                submitBtn.disabled = false;

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


    ids.forEach(function(id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });


    const gender =
        document.getElementById("gender");

    if (gender) {
        gender.value = "";
    }


    const party =
        document.getElementById("party");

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

    message.textContent = text;

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


// =====================================================
// START
// =====================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSurveyPage
    );

} else {

    initializeSurveyPage();
}
