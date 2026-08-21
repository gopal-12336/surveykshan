console.log("Survey JS Loaded - Multi Step Version");

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

    submitBtn =
        document.getElementById("submitSurvey");

    message =
        document.getElementById("message");

    createDailyProgressUI();

    startAuthentication();

    setupBasicDetails();

    setupQuestionButtons();

    renderQuestion();
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

    var box =
        document.createElement("div");

    box.id = "dailyProgressBox";

    box.style.backgroundColor = "#ffffff";
    box.style.border = "1px solid #e0e0e0";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.margin = "15px 0";
    box.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.08)";

    var titleRow =
        document.createElement("div");

    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";
    titleRow.style.marginBottom = "8px";
    titleRow.style.fontSize = "15px";
    titleRow.style.fontWeight = "bold";

    var title =
        document.createElement("span");

    title.textContent =
        "📊 Today's Progress";

    var progressText =
        document.createElement("span");

    progressText.id =
        "dailyProgressText";

    progressText.textContent =
        "0 / 20";

    titleRow.appendChild(title);
    titleRow.appendChild(progressText);

    var progressBackground =
        document.createElement("div");

    progressBackground.style.width = "100%";
    progressBackground.style.height = "12px";
    progressBackground.style.backgroundColor = "#eeeeee";
    progressBackground.style.borderRadius = "20px";
    progressBackground.style.overflow = "hidden";

    var progressBar =
        document.createElement("div");

    progressBar.id =
        "dailyProgressBar";

    progressBar.style.width = "0%";
    progressBar.style.height = "100%";
    progressBar.style.backgroundColor = "#1565c0";
    progressBar.style.borderRadius = "20px";
    progressBar.style.transition =
        "width 0.4s ease";

    progressBackground.appendChild(progressBar);

    var remainingText =
        document.createElement("div");

    remainingText.id =
        "dailyRemainingText";

    remainingText.textContent =
        "Remaining today: 20";

    remainingText.style.marginTop = "8px";
    remainingText.style.fontSize = "13px";
    remainingText.style.color = "#555555";

    box.appendChild(titleRow);
    box.appendChild(progressBackground);
    box.appendChild(remainingText);

    var container =
        document.querySelector(".login-box");

    if (container) {

        container.insertBefore(
            box,
            container.firstChild
        );

    } else {

        document.body.insertBefore(
            box,
            document.body.firstChild
        );
    }
}


// =====================================================
// UPDATE DAILY PROGRESS
// =====================================================

function updateDailyProgress(todayCount) {

    var progressText =
        document.getElementById(
            "dailyProgressText"
        );

    var remainingText =
        document.getElementById(
            "dailyRemainingText"
        );

    var progressBar =
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

    var limit =
        Number(DAILY_LIMIT);

    if (
        !Number.isFinite(limit) ||
        limit <= 0
    ) {
        limit = 20;
    }

    var count =
        Number(todayCount);

    if (
        !Number.isFinite(count) ||
        count < 0
    ) {
        count = 0;
    }

    var remaining =
        Math.max(
            limit - count,
            0
        );

    var percentage =
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

    } else if (percentage >= 80) {

        progressBar.style.backgroundColor =
            "#ef6c00";

        progressText.style.color =
            "#ef6c00";

        remainingText.style.color =
            "#555555";

    } else {

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

                var data =
                    doc.data();

                var value =
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
                "Daily Limit Load Error:",
                error
            );

            if (
                !DAILY_LIMIT ||
                DAILY_LIMIT <= 0
            ) {
                DAILY_LIMIT = 20;
            }
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

                                checkDailyLimit(
                                    user
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
// GET TODAY COUNT
// =====================================================

function getTodayCount(user) {

    var todayStart =
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

            var todayCount = 0;

            snapshot.forEach(
                function(doc) {

                    var data =
                        doc.data();

                    if (!data.createdAt) {
                        return;
                    }

                    var date = null;

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

                        } else if (
                            data.createdAt.seconds
                        ) {

                            date =
                                new Date(
                                    data.createdAt.seconds *
                                    1000
                                );
                        }

                    } catch(error) {

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

            console.log(
                "Today's Surveys:",
                todayCount,
                "/",
                DAILY_LIMIT
            );

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
// ENABLE / DISABLE BUTTONS
// =====================================================

function disableSurveyButtons() {

    var basicNext =
        document.getElementById(
            "basicNextButton"
        );

    var next =
        document.getElementById(
            "nextButton"
        );

    var previous =
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

        submitBtn.disabled = true;

        submitBtn.textContent =
            "Daily Limit Reached";
    }
}


function enableSurveyButtons() {

    var basicNext =
        document.getElementById(
            "basicNextButton"
        );

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
// BASIC DETAILS
// =====================================================

function setupBasicDetails() {

    var button =
        document.getElementById(
            "basicNextButton"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        function() {

            var name =
                document.getElementById(
                    "name"
                ).value.trim();

            var mobile =
                document.getElementById(
                    "mobile"
                ).value.trim();

            var age =
                document.getElementById(
                    "age"
                ).value.trim();

            var gender =
                document.getElementById(
                    "gender"
                ).value;

            var village =
                document.getElementById(
                    "village"
                ).value.trim();

            var assembly =
                document.getElementById(
                    "assembly"
                ).value.trim();

            var party =
                document.getElementById(
                    "party"
                ).value;

            var candidate =
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


            var user =
                firebase.auth().currentUser;

            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );

                return;
            }


            // Check daily limit before moving ahead

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

                        name: name,

                        mobile: mobile,

                        age: age,

                        gender: gender,

                        village: village,

                        assembly: assembly,

                        party: party,

                        candidate: candidate
                    };


                    showQuestionPage();

                })

                .catch(function(error) {

                    console.error(
                        "Basic Detail Check Error:",
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
// QUESTIONS SETUP
// =====================================================

function getQuestions() {

    if (
        typeof SURVEY_QUESTIONS ===
        "undefined"
    ) {

        console.error(
            "SURVEY_QUESTIONS not found. Check questions.js"
        );

        return [];
    }

    if (
        !Array.isArray(
            SURVEY_QUESTIONS
        )
    ) {

        console.error(
            "SURVEY_QUESTIONS must be an array."
        );

        return [];
    }

    return SURVEY_QUESTIONS;
}


// =====================================================
// SHOW QUESTION PAGE
// =====================================================

function showQuestionPage() {

    var basicStep =
        document.getElementById(
            "basicDetailsStep"
        );

    var questionStep =
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

    renderQuestion();

    updateQuestionProgress();
}


// =====================================================
// RENDER QUESTION
// =====================================================

function renderQuestion() {

    var questions =
        getQuestions();

    var questionText =
        document.getElementById(
            "questionText"
        );

    var questionNumber =
        document.getElementById(
            "questionNumber"
        );

    var optionsBox =
        document.getElementById(
            "questionOptions"
        );

    var nextButton =
        document.getElementById(
            "nextButton"
        );

    var previousButton =
        document.getElementById(
            "previousButton"
        );

    var submitButton =
        document.getElementById(
            "submitSurvey"
        );


    if (
        !questionText ||
        !optionsBox
    ) {
        return;
    }


    if (questions.length === 0) {

        questionText.textContent =
            "No questions found.";

        optionsBox.innerHTML = "";

        if (nextButton) {
            nextButton.style.display =
                "none";
        }

        if (submitButton) {
            submitButton.style.display =
                "block";
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
        questions.length
    ) {
        currentQuestion =
            questions.length - 1;
    }


    var question =
        questions[currentQuestion];


    questionNumber.textContent =
        "Question " +
        (currentQuestion + 1) +
        " of " +
        questions.length;


    questionText.textContent =
        question.question;


    optionsBox.innerHTML = "";


    var savedAnswer =
        answers.questions &&
        answers.questions[currentQuestion];


    if (
        !answers.questions
    ) {
        answers.questions = {};
    }


    if (
        !Array.isArray(
            question.options
        )
    ) {

        question.options = [];
    }


    question.options.forEach(
        function(option, index) {

            var label =
                document.createElement(
                    "label"
                );

            label.className =
                "option-label";


            var input =
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


                    var labels =
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


            label.appendChild(
                input
            );

            var text =
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

    } else {

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

    var questions =
        getQuestions();

    var progressBar =
        document.getElementById(
            "surveyProgressBar"
        );

    var progressText =
        document.getElementById(
            "questionProgress"
        );

    var stepTitle =
        document.getElementById(
            "stepTitle"
        );


    if (
        !progressBar
    ) {
        return;
    }


    if (
        questions.length === 0
    ) {

        progressBar.style.width =
            "100%";

        return;
    }


    var percentage =
        (
            (currentQuestion + 1) /
            questions.length
        ) * 100;


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

    var nextButton =
        document.getElementById(
            "nextButton"
        );

    var previousButton =
        document.getElementById(
            "previousButton"
        );


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function() {

                var questions =
                    getQuestions();

                var answer =
                    answers.questions &&
                    answers.questions[
                        currentQuestion
                    ];


                if (!answer) {

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
// SUBMIT COMPLETE SURVEY
// =====================================================

function submitCompleteSurvey() {

    var user =
        firebase.auth().currentUser;


    if (!user) {

        showMessage(
            "Session expired. Please login again."
        );

        return;
    }


    var questions =
        getQuestions();


    // Check all questions

    for (
        var i = 0;
        i < questions.length;
        i++
    ) {

        if (
            !answers.questions ||
            !answers.questions[i]
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
        "Checking...";


    // Reload latest daily limit

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


            submitBtn.textContent =
                "Submitting...";


            var questionAnswers =
                {};


            questions.forEach(
                function(question, index) {

                    questionAnswers[
                        "question_" +
                        (index + 1)
                    ] = {

                        question:
                            question.question,

                        answer:
                            answers.questions[index]

                    };

                }
            );


            // SAVE TO FIRESTORE

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


            // CLEAR EVERYTHING

            answers = {};

            currentQuestion = 0;


            clearBasicForm();


            var questionStep =
                document.getElementById(
                    "questionStep"
                );

            var basicStep =
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


            var questionProgress =
                document.getElementById(
                    "questionProgress"
                );

            var stepTitle =
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


            var progressBar =
                document.getElementById(
                    "surveyProgressBar"
                );


            if (progressBar) {

                progressBar.style.width =
                    "0%";
            }


            // REFRESH DAILY COUNT

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

            } else {

                enableSurveyButtons();

                var basicNext =
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

    var ids = [

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

            var element =
                document.getElementById(
                    id
                );

            if (element) {
                element.value = "";
            }

        }
    );


    var gender =
        document.getElementById(
            "gender"
        );

    if (gender) {
        gender.value = "";
    }


    var party =
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

} else {

    initializeSurveyPage();

}
