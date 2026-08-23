console.log("Surveykshan Survey JS Loaded - Final Version");

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

    if (document.getElementById("dailyProgressBox")) {
        return;
    }

    const box = document.createElement("div");

    box.id = "dailyProgressBox";

    box.style.background = "#ffffff";
    box.style.border = "1px solid #e0e0e0";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.margin = "15px 0";
    box.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.08)";

    const titleRow = document.createElement("div");

    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";
    titleRow.style.marginBottom = "8px";
    titleRow.style.fontWeight = "bold";

    const title = document.createElement("span");

    title.textContent = "📊 Today's Progress";

    const progressText = document.createElement("span");

    progressText.id = "dailyProgressText";

    progressText.textContent =
        "0 / " + DAILY_LIMIT;

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

    progressBar.id = "dailyProgressBar";

    progressBar.style.width = "0%";
    progressBar.style.height = "100%";
    progressBar.style.background = "#1565c0";
    progressBar.style.transition =
        "width 0.4s ease";


    progressBackground.appendChild(progressBar);


    const remainingText =
        document.createElement("div");

    remainingText.id =
        "dailyRemainingText";

    remainingText.textContent =
        "Remaining today: " + DAILY_LIMIT;

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


    count = Number(count) || 0;

    const limit =
        Number(DAILY_LIMIT) || 20;

    const remaining =
        Math.max(limit - count, 0);

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
            "Daily survey limit reached.";

    }


    progressBar.style.width =
        percentage + "%";


    if (count >= limit) {

        progressBar.style.background =
            "#c62828";

    } else if (percentage >= 80) {

        progressBar.style.background =
            "#ef6c00";

    } else {

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

                                checkDailyLimit(
                                    user
                                );

                            });

                    }
                );

        })

        .catch(function(error) {

            console.error(
                "Authentication Error:",
                error
            );

        });

}


// =====================================================
// GET TODAY COUNT
// =====================================================

function getTodayCount(user) {

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

                } catch (error) {

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


// =====================================================
// CHECK DAILY LIMIT
// =====================================================

function checkDailyLimit(user) {

    getTodayCount(user)

        .then(function(count) {

            updateDailyProgress(count);


            if (
                count >= DAILY_LIMIT
            ) {

                disableSurveyButtons();

                showMessage(
                    "Daily survey limit reached."
                );

                return;
            }


            enableSurveyButtons();

        })

        .catch(function(error) {

            console.error(
                "Daily Count Error:",
                error
            );

            enableSurveyButtons();

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

        submitBtn.disabled = true;

        submitBtn.textContent =
            "Daily Limit Reached";

    }

}


// =====================================================
// MOBILE VALIDATION
// =====================================================

function validateMobile(mobile) {

    return /^[0-9]{10}$/.test(mobile);

}


// =====================================================
// PIN CODE VALIDATION
// =====================================================

function validatePincode(pincode) {

    return /^[0-9]{6}$/.test(pincode);

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


            const district =
                document.getElementById(
                    "district"
                ).value.trim();


            const pincode =
                document.getElementById(
                    "pincode"
                ).value.trim();


            // NAME

            if (!name) {

                showMessage(
                    "Please enter full name."
                );

                return;

            }


            // MOBILE

            if (!validateMobile(mobile)) {

                showMessage(
                    "Please enter a valid 10 digit mobile number."
                );

                return;

            }


            // AGE

            if (
                !age ||
                Number(age) < 1 ||
                Number(age) > 120
            ) {

                showMessage(
                    "Please enter a valid age."
                );

                return;

            }


            // GENDER

            if (!gender) {

                showMessage(
                    "Please select gender."
                );

                return;

            }


            // VILLAGE

            if (!village) {

                showMessage(
                    "Please enter Village / City."
                );

                return;

            }


            // DISTRICT

            if (!district) {

                showMessage(
                    "Please enter District."
                );

                return;

            }


            // PIN CODE

            if (!validatePincode(pincode)) {

                showMessage(
                    "Please enter a valid 6 digit PIN Code."
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
                        count >= DAILY_LIMIT
                    ) {

                        disableSurveyButtons();

                        showMessage(
                            "Daily survey limit reached."
                        );

                        return;

                    }


                    answers.basic = {

                        name: name,

                        mobile: mobile,

                        age: age,

                        gender: gender,

                        village: village,

                        district: district,

                        pincode: pincode

                    };


                    showQuestionPage();

                })

                .catch(function(error) {

                    console.error(
                        "Basic Details Error:",
                        error
                    );

                    showMessage(
                        "Unable to continue. Please try again."
                    );

                });

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


    if (
        !Array.isArray(
            SURVEY_QUESTIONS
        )
    ) {

        return [];

    }


    return SURVEY_QUESTIONS;

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


    if (
        !questionText ||
        !optionsBox
    ) {

        return;

    }


    if (questions.length === 0) {

        questionText.textContent =
            "No questions available.";

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


    if (!answers.questions) {

        answers.questions = {};

    }


    const savedAnswer =
        answers.questions[
            currentQuestion
        ];


    const type =
        question.type ||
        "single";


    // =================================================
    // MULTIPLE CHOICE
    // =================================================

    if (
        type === "multiple" ||
        type === "checkbox"
    ) {

        const savedValues =
            Array.isArray(savedAnswer)
                ? savedAnswer
                : [];


        (question.options || [])
            .forEach(function(option) {

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


                input.value =
                    option;


                if (
                    savedValues.includes(
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

                        let selected =
                            [];


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

                        } else {

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

            });


    }

    // =================================================
    // SINGLE CHOICE
    // =================================================

    else {

        (question.options || [])
            .forEach(function(option) {

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

            });

    }


    // =================================================
    // BUTTON DISPLAY
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

        progressBar.style.width =
            "100%";

        return;

    }


    const percentage =
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
// CHECK CURRENT ANSWER
// =====================================================

function hasCurrentAnswer() {

    const answer =
        answers.questions[
            currentQuestion
        ];


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

                const questions =
                    getQuestions();


                if (!hasCurrentAnswer()) {

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
// NORMALIZE VALUE
// =====================================================

function normalizeValue(value) {

    if (Array.isArray(value)) {

        return value
            .map(function(item) {

                return String(item)
                    .trim()
                    .toLowerCase();

            })
            .sort()
            .join("|");

    }


    return String(
        value === undefined ||
        value === null
            ? ""
            : value
    )
    .trim()
    .toLowerCase();

}


// =====================================================
// CREATE SURVEY FINGERPRINT
// =====================================================

function createSurveyFingerprint(
    basic,
    questionAnswers
) {

    let parts = [

        basic.mobile,

        basic.name,

        basic.age,

        basic.gender,

        basic.village,

        basic.district,

        basic.pincode

    ];


    questionAnswers.forEach(
        function(answer) {

            parts.push(
                normalizeValue(answer)
            );

        }
    );


    return parts
        .join("||")
        .toLowerCase()
        .replace(/\s+/g, " ");

}


// =====================================================
// CHECK DUPLICATE SURVEY
// =====================================================

function checkDuplicateSurvey(
    fingerprint
) {

    return db.collection("surveys")
        .where(
            "surveyFingerprint",
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


    const questions =
        getQuestions();


    // CHECK ALL QUESTIONS

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
            (
                Array.isArray(answer) &&
                answer.length === 0
            ) ||
            (
                !Array.isArray(answer) &&
                String(answer).trim() === ""
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


    if (submitBtn) {

        submitBtn.disabled = true;

        submitBtn.textContent =
            "Checking...";

    }


    loadDailyLimit()

        .then(function() {

            return getTodayCount(user);

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


            const questionAnswers = [];


            questions.forEach(
                function(question, index) {

                    questionAnswers.push({

                        question:
                            question.question,

                        answer:
                            answers.questions[index]

                    });

                }
            );


            const fingerprint =
                createSurveyFingerprint(
                    answers.basic,
                    questionAnswers.map(
                        function(item) {
                            return item.answer;
                        }
                    )
                );


            if (submitBtn) {

                submitBtn.textContent =
                    "Checking Duplicate...";

            }


            return checkDuplicateSurvey(
                fingerprint
            )

            .then(function(isDuplicate) {

                if (isDuplicate) {

                    throw new Error(
                        "This exact survey has already been submitted. Duplicate survey is not allowed."
                    );

                }


                return {

                    questionAnswers:
                        questionAnswers,

                    fingerprint:
                        fingerprint

                };

            });

        })


        .then(function(result) {

            if (submitBtn) {

                submitBtn.textContent =
                    "Submitting...";

            }


            const basic =
                answers.basic;


            return db.collection("surveys")
                .add({

                    name:
                        basic.name,

                    mobile:
                        basic.mobile,

                    age:
                        basic.age,

                    gender:
                        basic.gender,

                    village:
                        basic.village,

                    district:
                        basic.district,

                    pincode:
                        basic.pincode,

                    questions:
                        result.questionAnswers,

                    surveyFingerprint:
                        result.fingerprint,

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


// =====================================================
// CLEAR MESSAGE
// =====================================================

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

} else {

    initializeSurveyPage();

}
