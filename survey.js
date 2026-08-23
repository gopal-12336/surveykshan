console.log("Survey JS Loaded - Final Version");

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

    box.style.background = "#fff";
    box.style.border = "1px solid #ddd";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.margin = "15px 0";
    box.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)";

    box.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            font-weight:bold;
            margin-bottom:8px;
        ">
            <span>📊 Today's Progress</span>
            <span id="dailyProgressText">0 / ${DAILY_LIMIT}</span>
        </div>

        <div style="
            width:100%;
            height:12px;
            background:#eeeeee;
            border-radius:20px;
            overflow:hidden;
        ">
            <div
                id="dailyProgressBar"
                style="
                    width:0%;
                    height:100%;
                    background:#1565c0;
                    transition:.4s;
                ">
            </div>
        </div>

        <div
            id="dailyRemainingText"
            style="
                margin-top:8px;
                font-size:13px;
                color:#555;
            ">
            Remaining today: ${DAILY_LIMIT}
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

    const remainingText =
        document.getElementById("dailyRemainingText");

    const progressBar =
        document.getElementById("dailyProgressBar");

    if (!progressText || !remainingText || !progressBar) {
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

            if (count >= DAILY_LIMIT) {

                disableSurveyButtons();

                showMessage(
                    "Daily survey limit reached."
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

    button.addEventListener(
        "click",
        function() {

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


            // =================================================
            // REQUIRED DETAILS
            // =================================================

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


            // =================================================
            // MOBILE VALIDATION
            // =================================================

            if (!/^[0-9]{10}$/.test(mobile)) {

                showMessage(
                    "❌ Mobile number must contain exactly 10 digits."
                );

                return;
            }


            // =================================================
            // AGE VALIDATION
            // =================================================

            const ageNumber = Number(age);

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


            const user =
                firebase.auth().currentUser;

            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );

                return;
            }


            // =================================================
            // CHECK DAILY LIMIT
            // =================================================

            getTodayCount(user)
                .then(function(todayCount) {

                    updateDailyProgress(todayCount);

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


                    // =================================================
                    // SAVE BASIC DETAILS TEMPORARILY
                    // =================================================

                    answers.basic = {

                        name: name,

                        mobile: mobile,

                        age: ageNumber,

                        gender: gender,

                        village: village,

                        assembly: assembly,

                        party: party

                    };


                    clearMessage();

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

    updateQuestionProgress();
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
        question.question;


    optionsBox.innerHTML = "";


    if (!answers.questions) {
        answers.questions = {};
    }


    const savedAnswer =
        answers.questions[currentQuestion];


    const type =
        question.type ||
        question.questionType ||
        "single";


    const options =
        Array.isArray(question.options)
            ? question.options
            : [];


    options.forEach(function(option) {

        const label =
            document.createElement("label");

        label.className =
            "option-label";


        const input =
            document.createElement("input");


        // =================================================
        // SINGLE / MULTIPLE
        // =================================================

        if (
            type === "multiple" ||
            type === "checkbox"
        ) {

            input.type = "checkbox";

            input.name =
                "surveyQuestion_" +
                currentQuestion;

        } else {

            input.type = "radio";

            input.name =
                "surveyQuestion_" +
                currentQuestion;
        }


        input.value = option;


        // =================================================
        // RESTORE SAVED ANSWER
        // =================================================

        if (
            Array.isArray(savedAnswer)
        ) {

            if (
                savedAnswer.includes(option)
            ) {

                input.checked = true;

                label.classList.add(
                    "selected"
                );
            }

        } else {

            if (
                savedAnswer === option
            ) {

                input.checked = true;

                label.classList.add(
                    "selected"
                );
            }
        }


        // =================================================
        // CHANGE
        // =================================================

        input.addEventListener(
            "change",
            function() {

                if (
                    type === "multiple" ||
                    type === "checkbox"
                ) {

                    const selected = [];

                    optionsBox
                        .querySelectorAll(
                            "input[type='checkbox']:checked"
                        )
                        .forEach(function(item) {

                            selected.push(
                                item.value
                            );

                        });

                    answers.questions[
                        currentQuestion
                    ] = selected;


                    label.classList.toggle(
                        "selected",
                        this.checked
                    );

                } else {

                    answers.questions[
                        currentQuestion
                    ] = this.value;


                    optionsBox
                        .querySelectorAll(
                            ".option-label"
                        )
                        .forEach(function(item) {

                            item.classList.remove(
                                "selected"
                            );

                        });


                    label.classList.add(
                        "selected"
                    );

                }

            }
        );


        label.appendChild(input);

        label.appendChild(
            document.createTextNode(
                " " + option
            )
        );

        optionsBox.appendChild(label);

    });


    // =================================================
    // PREVIOUS
    // =================================================

    if (previousButton) {

        previousButton.style.display =
            currentQuestion === 0
                ? "none"
                : "block";
    }


    // =================================================
    // NEXT / SUBMIT
    // =================================================

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


    if (!questions.length) {

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

                const answer =
                    answers.questions &&
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
                        "Please select an option."
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


// =====================================================
// CREATE UNIQUE SURVEY FINGERPRINT
// =====================================================

function createSurveyFingerprint() {

    const basic =
        answers.basic || {};

    const questions =
        answers.questions || {};


    const normalizedBasic = {

        name:
            String(basic.name || "")
                .trim()
                .toLowerCase(),

        mobile:
            String(basic.mobile || "")
                .trim(),

        age:
            String(basic.age || "")
                .trim(),

        gender:
            String(basic.gender || "")
                .trim()
                .toLowerCase(),

        village:
            String(basic.village || "")
                .trim()
                .toLowerCase(),

        assembly:
            String(basic.assembly || "")
                .trim()
                .toLowerCase(),

        party:
            String(basic.party || "")
                .trim()
                .toLowerCase()

    };


    const normalizedQuestions = {};


    Object.keys(questions)
        .sort(function(a,b) {
            return Number(a) - Number(b);
        })
        .forEach(function(key) {

            let value =
                questions[key];


            if (Array.isArray(value)) {

                value =
                    value
                        .map(function(item) {
                            return String(item)
                                .trim()
                                .toLowerCase();
                        })
                        .sort();

            } else {

                value =
                    String(value || "")
                        .trim()
                        .toLowerCase();
            }


            normalizedQuestions[key] =
                value;

        });


    const fingerprintString =
        JSON.stringify({
            basic: normalizedBasic,
            questions: normalizedQuestions
        });


    // Simple deterministic hash

    let hash = 0;

    for (
        let i = 0;
        i < fingerprintString.length;
        i++
    ) {

        hash =
            (
                (hash << 5) -
                hash +
                fingerprintString.charCodeAt(i)
            ) | 0;

    }


    return String(hash);
}


// =====================================================
// CHECK DUPLICATE SURVEY
// =====================================================

function checkDuplicateSurvey(fingerprint) {

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


    // =================================================
    // CHECK ALL QUESTIONS
    // =================================================

    for (
        let i = 0;
        i < questions.length;
        i++
    ) {

        const answer =
            answers.questions &&
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


    // =================================================
    // MOBILE CHECK AGAIN
    // =================================================

    const mobile =
        String(
            answers.basic.mobile || ""
        ).trim();


    if (!/^[0-9]{10}$/.test(mobile)) {

        showMessage(
            "❌ Mobile number must contain exactly 10 digits."
        );

        return;
    }


    submitBtn.disabled = true;

    submitBtn.textContent =
        "Checking...";


    // =================================================
    // CREATE FINGERPRINT
    // =================================================

    const fingerprint =
        createSurveyFingerprint();


    // =================================================
    // CHECK DUPLICATE
    // =================================================

    checkDuplicateSurvey(fingerprint)

        .then(function(isDuplicate) {

            if (isDuplicate) {

                throw new Error(
                    "❌ This complete survey has already been submitted. Duplicate submission is not allowed."
                );
            }


            // =================================================
            // DAILY LIMIT
            // =================================================

            return loadDailyLimit()
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


                    return true;

                });

        })


        .then(function() {

            submitBtn.textContent =
                "Submitting...";


            const questionAnswers = {};


            questions.forEach(
                function(question,index) {

                    questionAnswers[
                        "question_" +
                        (index + 1)
                    ] = {

                        question:
                            question.question,

                        answer:
                            answers.questions[index],

                        type:
                            question.type ||
                            "single"

                    };

                }
            );


            // =================================================
            // SAVE FIRESTORE
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

                    assembly:
                        answers.basic.assembly,

                    party:
                        answers.basic.party,

                    candidate:
                        "",

                    feedback:
                        "",

                    questions:
                        questionAnswers,

                    surveyFingerprint:
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
        initializeSurveyPage
    );

} else {

    initializeSurveyPage();

}
