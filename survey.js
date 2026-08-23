console.log("Survey JS Loaded - Final Version");

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

    submitBtn = document.getElementById("submitSurvey");
    message = document.getElementById("message");

    createDailyProgressUI();

    setupBasicDetails();

    setupQuestionButtons();

    startAuthentication();

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
    box.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";

    const titleRow = document.createElement("div");

    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.fontWeight = "bold";
    titleRow.style.marginBottom = "8px";

    const title = document.createElement("span");

    title.textContent = "📊 Today's Progress";

    const progressText = document.createElement("span");

    progressText.id = "dailyProgressText";
    progressText.textContent = "0 / 20";

    titleRow.appendChild(title);
    titleRow.appendChild(progressText);

    const background = document.createElement("div");

    background.style.width = "100%";
    background.style.height = "12px";
    background.style.background = "#eeeeee";
    background.style.borderRadius = "20px";
    background.style.overflow = "hidden";

    const bar = document.createElement("div");

    bar.id = "dailyProgressBar";

    bar.style.width = "0%";
    bar.style.height = "100%";
    bar.style.background = "#1565c0";
    bar.style.transition = "width .4s ease";

    background.appendChild(bar);

    const remaining = document.createElement("div");

    remaining.id = "dailyRemainingText";

    remaining.textContent =
        "Remaining today: 20";

    remaining.style.marginTop = "8px";
    remaining.style.fontSize = "13px";
    remaining.style.color = "#555";

    box.appendChild(titleRow);
    box.appendChild(background);
    box.appendChild(remaining);

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
        document.getElementById("dailyProgressText");

    const remainingText =
        document.getElementById("dailyRemainingText");

    const progressBar =
        document.getElementById("dailyProgressBar");

    if (
        !progressText ||
        !remainingText ||
        !progressBar
    ) {
        return;
    }

    count = Number(count) || 0;

    const remaining =
        Math.max(
            DAILY_LIMIT - count,
            0
        );

    const percentage =
        Math.min(
            (count / DAILY_LIMIT) * 100,
            100
        );

    progressText.textContent =
        count + " / " + DAILY_LIMIT;

    if (remaining > 0) {

        remainingText.textContent =
            "Remaining today: " + remaining;

    } else {

        remainingText.textContent =
            "Daily survey limit reached.";
    }

    progressBar.style.width =
        percentage + "%";

    if (count >= DAILY_LIMIT) {

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
                "Daily limit error:",
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

                                checkDailyLimit(user);

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
                "Authentication error. Please login again."
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

                    } else if (
                        data.createdAt.seconds
                    ) {

                        date =
                            new Date(
                                data.createdAt.seconds * 1000
                            );
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

            } else {

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

            console.error(
                "Daily limit check error:",
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
        document.getElementById("basicNextButton");

    const next =
        document.getElementById("nextButton");

    const previous =
        document.getElementById("previousButton");

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
        document.getElementById("basicNextButton");

    const next =
        document.getElementById("nextButton");

    const previous =
        document.getElementById("previousButton");

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

            const nameElement =
                document.getElementById("name");

            const mobileElement =
                document.getElementById("mobile");

            const ageElement =
                document.getElementById("age");

            const genderElement =
                document.getElementById("gender");

            const villageElement =
                document.getElementById("village");

            const districtElement =
                document.getElementById("district");

            const pincodeElement =
                document.getElementById("pincode");


            const name =
                nameElement ?
                nameElement.value.trim() :
                "";

            const mobile =
                mobileElement ?
                mobileElement.value.trim() :
                "";

            const age =
                ageElement ?
                ageElement.value.trim() :
                "";

            const gender =
                genderElement ?
                genderElement.value :
                "";

            const village =
                villageElement ?
                villageElement.value.trim() :
                "";

            const district =
                districtElement ?
                districtElement.value.trim() :
                "";

            const pincode =
                pincodeElement ?
                pincodeElement.value.trim() :
                "";


            // ===============================
            // REQUIRED FIELDS
            // ===============================

            if (!name) {

                showMessage(
                    "Please enter Full Name."
                );

                return;
            }

            if (!mobile) {

                showMessage(
                    "Please enter Mobile Number."
                );

                return;
            }

            // EXACTLY 10 DIGITS

            if (!/^[0-9]{10}$/.test(mobile)) {

                showMessage(
                    "Mobile Number must be exactly 10 digits."
                );

                return;
            }

            if (!age) {

                showMessage(
                    "Please enter Age."
                );

                return;
            }

            const ageNumber =
                Number(age);

            if (
                !Number.isFinite(ageNumber) ||
                ageNumber < 18 ||
                ageNumber > 120
            ) {

                showMessage(
                    "Please enter a valid age between 18 and 120."
                );

                return;
            }

            if (!gender) {

                showMessage(
                    "Please select Gender."
                );

                return;
            }

            if (!village) {

                showMessage(
                    "Please enter Village / City."
                );

                return;
            }

            if (!district) {

                showMessage(
                    "Please enter District."
                );

                return;
            }

            if (!pincode) {

                showMessage(
                    "Please enter PIN Code."
                );

                return;
            }

            // EXACTLY 6 DIGITS

            if (!/^[0-9]{6}$/.test(pincode)) {

                showMessage(
                    "PIN Code must be exactly 6 digits."
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


            button.disabled = true;
            button.textContent = "Checking...";


            getTodayCount(user)

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


                    answers.basic = {

                        name: name,

                        mobile: mobile,

                        age: ageNumber,

                        gender: gender,

                        village: village,

                        district: district,

                        pincode: pincode

                    };


                    showQuestionPage();

                })

                .catch(function(error) {

                    console.error(
                        "Basic details error:",
                        error
                    );

                    showMessage(
                        error.message ||
                        "Unable to continue."
                    );

                })

                .finally(function() {

                    button.disabled = false;

                    button.textContent =
                        "Next →";

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
            "SURVEY_QUESTIONS not found."
        );

        return [];
    }

    if (
        !Array.isArray(
            SURVEY_QUESTIONS
        )
    ) {

        console.error(
            "SURVEY_QUESTIONS is not an array."
        );

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


    if (!answers.questions) {
        answers.questions = {};
    }


    let savedAnswer =
        answers.questions[
            currentQuestion
        ];


    const type =
        question.type ||
        "single";


    if (
        !Array.isArray(question.options)
    ) {

        question.options = [];
    }


    question.options.forEach(
        function(option, index) {

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


            // =========================================
            // SINGLE / MULTIPLE
            // =========================================

            if (
                type === "multiple"
            ) {

                input.type =
                    "checkbox";

            } else {

                input.type =
                    "radio";
            }


            input.name =
                "surveyQuestion_" +
                currentQuestion;


            input.value =
                option;


            // =========================================
            // RESTORE SAVED ANSWER
            // =========================================

            if (
                type === "multiple"
            ) {

                if (
                    Array.isArray(savedAnswer) &&
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


            // =========================================
            // CHANGE EVENT
            // =========================================

            input.addEventListener(
                "change",
                function() {

                    if (
                        type === "multiple"
                    ) {

                        let selected = [];

                        const allInputs =
                            optionsBox.querySelectorAll(
                                'input[type="checkbox"]'
                            );

                        allInputs.forEach(
                            function(item) {

                                if (
                                    item.checked
                                ) {

                                    selected.push(
                                        item.value
                                    );
                                }

                            }
                        );


                        answers.questions[
                            currentQuestion
                        ] = selected;


                        if (
                            this.checked
                        ) {

                            label.classList.add(
                                "selected"
                            );

                        } else {

                            label.classList.remove(
                                "selected"
                            );
                        }

                    } else {

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


            label.appendChild(input);


            const text =
                document.createTextNode(
                    " " + option
                );


            label.appendChild(text);


            optionsBox.appendChild(label);

        }
    );


    // =========================================
    // PREVIOUS BUTTON
    // =========================================

    if (previousButton) {

        previousButton.style.display =
            currentQuestion === 0
                ? "none"
                : "block";
    }


    // =========================================
    // LAST QUESTION
    // =========================================

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
// CHECK CURRENT ANSWER
// =====================================================

function hasCurrentAnswer() {

    const question =
        getQuestions()[currentQuestion];

    if (!question) {
        return false;
    }


    const answer =
        answers.questions[
            currentQuestion
        ];


    if (
        question.type ===
        "multiple"
    ) {

        return (
            Array.isArray(answer) &&
            answer.length > 0
        );
    }


    return (
        typeof answer === "string" &&
        answer.trim() !== ""
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


    if (
        questions.length === 0
    ) {

        progressBar.style.width =
            "0%";

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

                clearMessage();


                if (
                    !hasCurrentAnswer()
                ) {

                    showMessage(
                        "Please select an option before continuing."
                    );

                    return;
                }


                const questions =
                    getQuestions();


                if (
                    currentQuestion <
                    questions.length - 1
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


                if (
                    currentQuestion > 0
                ) {

                    currentQuestion--;

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
// DUPLICATE SURVEY CHECK
// =====================================================

function checkDuplicateSurvey() {

    const mobile =
        answers.basic.mobile;


    return db.collection("surveys")
        .where(
            "mobile",
            "==",
            mobile
        )
        .get()

        .then(function(snapshot) {

            if (snapshot.empty) {

                return false;
            }


            const currentQuestions =
                answers.questions || {};


            let duplicateFound =
                false;


            snapshot.forEach(
                function(doc) {

                    const data =
                        doc.data();


                    // =================================
                    // COMPARE BASIC INFORMATION
                    // =================================

                    if (
                        String(data.name || "")
                            .trim()
                            .toLowerCase() !==
                        String(answers.basic.name || "")
                            .trim()
                            .toLowerCase()
                    ) {

                        return;
                    }


                    if (
                        String(data.age || "") !==
                        String(answers.basic.age || "")
                    ) {

                        return;
                    }


                    if (
                        String(data.gender || "")
                            .trim()
                            .toLowerCase() !==
                        String(answers.basic.gender || "")
                            .trim()
                            .toLowerCase()
                    ) {

                        return;
                    }


                    if (
                        String(data.village || "")
                            .trim()
                            .toLowerCase() !==
                        String(answers.basic.village || "")
                            .trim()
                            .toLowerCase()
                    ) {

                        return;
                    }


                    if (
                        String(data.district || "")
                            .trim()
                            .toLowerCase() !==
                        String(answers.basic.district || "")
                            .trim()
                            .toLowerCase()
                    ) {

                        return;
                    }


                    if (
                        String(data.pincode || "") !==
                        String(answers.basic.pincode || "")
                    ) {

                        return;
                    }


                    // =================================
                    // COMPARE QUESTIONS
                    // =================================

                    const oldQuestions =
                        data.questions || {};


                    const oldKeys =
                        Object.keys(
                            oldQuestions
                        );


                    const newKeys =
                        Object.keys(
                            currentQuestions
                        );


                    if (
                        oldKeys.length !==
                        newKeys.length
                    ) {

                        return;
                    }


                    let sameAnswers =
                        true;


                    for (
                        let i = 0;
                        i < newKeys.length;
                        i++
                    ) {

                        const key =
                            newKeys[i];


                        const oldData =
                            oldQuestions[key];


                        const newAnswer =
                            currentQuestions[key];


                        if (!oldData) {

                            sameAnswers =
                                false;

                            break;
                        }


                        const oldAnswer =
                            oldData.answer;


                        if (
                            Array.isArray(
                                oldAnswer
                            ) &&
                            Array.isArray(
                                newAnswer
                            )
                        ) {

                            const oldSorted =
                                [...oldAnswer]
                                    .sort();

                            const newSorted =
                                [...newAnswer]
                                    .sort();


                            if (
                                JSON.stringify(
                                    oldSorted
                                ) !==
                                JSON.stringify(
                                    newSorted
                                )
                            ) {

                                sameAnswers =
                                    false;

                                break;
                            }

                        } else {

                            if (
                                String(
                                    oldAnswer
                                ) !==
                                String(
                                    newAnswer
                                )
                            ) {

                                sameAnswers =
                                    false;

                                break;
                            }
                        }

                    }


                    if (sameAnswers) {

                        duplicateFound =
                            true;
                    }

                }
            );


            return duplicateFound;

        });
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


    // =============================================
    // CHECK ALL QUESTIONS
    // =============================================

    for (
        let i = 0;
        i < questions.length;
        i++
    ) {

        const answer =
            answers.questions[i];


        if (
            questions[i].type ===
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

        } else {

            if (
                !answer
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

    }


    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.textContent =
            "Checking...";
    }


    // =============================================
    // DAILY LIMIT
    // =============================================

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


            // =====================================
            // DUPLICATE CHECK
            // =====================================

            return checkDuplicateSurvey();

        })

        .then(function(isDuplicate) {

            if (isDuplicate) {

                throw new Error(
                    "This survey has already been submitted. Duplicate survey is not allowed."
                );
            }


            if (submitBtn) {

                submitBtn.textContent =
                    "Submitting...";
            }


            // =====================================
            // PREPARE QUESTIONS
            // =====================================

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
                            "single",

                        answer:
                            answers.questions[
                                index
                            ]

                    };

                }
            );


            // =====================================
            // SAVE FIRESTORE
            // =====================================

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

                district:
                    answers.basic.district,

                pincode:
                    answers.basic.pincode,

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

} else {

    initializeSurveyPage();

}
