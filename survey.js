console.log("Survey JS Loaded - FIXED VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 0;
let currentQuestion = 0;
let surveyQuestions = [];
let answers = {
    basic: {},
    questions: {}
};

let surveyStarted = false;
let message = null;
let dailyLimitLoaded = false;


// =====================================================
// INITIALIZE
// =====================================================

function initializeSurveyPage() {

    console.log("Initializing Survey Page...");

    message = document.getElementById("message");

    setupBasicDetails();
    setupQuestionButtons();
    createDailyProgressUI();
    startAuthentication();
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

    box.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:8px;
            font-weight:bold;
        ">
            <span>📊 Today's Progress</span>
            <span id="dailyProgressText">0 / --</span>
        </div>

        <div style="
            width:100%;
            height:12px;
            background:#eee;
            border-radius:20px;
            overflow:hidden;
        ">
            <div
                id="dailyProgressBar"
                style="
                    width:0%;
                    height:100%;
                    background:#1565c0;
                    transition:width .4s ease;
                "
            ></div>
        </div>

        <div
            id="dailyRemainingText"
            style="
                margin-top:8px;
                font-size:13px;
                color:#555;
            "
        >
            Loading daily limit...
        </div>
    `;

    const dailyLimitBox =
        document.getElementById("dailyLimitBox");

    if (dailyLimitBox) {

        dailyLimitBox.insertAdjacentElement(
            "afterend",
            box
        );

    }

}


// =====================================================
// UPDATE DAILY PROGRESS
// =====================================================

function updateDailyProgress(count) {

    count = Number(count);

    if (!Number.isFinite(count) || count < 0) {
        count = 0;
    }

    const limit = Number(DAILY_LIMIT);

    if (!Number.isFinite(limit) || limit <= 0) {
        return;
    }

    const remaining =
        Math.max(limit - count, 0);

    const percentage =
        Math.min((count / limit) * 100, 100);

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

    const todayCount =
        document.getElementById(
            "todayCount"
        );

    const remainingCount =
        document.getElementById(
            "remainingCount"
        );


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

        progressBar.style.width =
            percentage + "%";

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

}


// =====================================================
// LOAD DAILY LIMIT
// =====================================================

function loadDailyLimit() {

    return db
        .collection("settings")
        .doc("config")
        .get()

        .then(function(doc) {

            if (!doc.exists) {

                throw new Error(
                    "Daily limit settings not found."
                );

            }

            const value =
                Number(
                    (doc.data() || {}).dailyLimit
                );

            if (
                !Number.isFinite(value) ||
                value <= 0
            ) {

                throw new Error(
                    "Invalid daily survey limit."
                );

            }

            DAILY_LIMIT = value;

            dailyLimitLoaded = true;

            console.log(
                "Daily Limit:",
                DAILY_LIMIT
            );

            return DAILY_LIMIT;

        })

        .catch(function(error) {

            console.error(
                "Daily limit error:",
                error
            );

            dailyLimitLoaded = false;
            DAILY_LIMIT = 0;

            showMessage(
                "Unable to load daily survey limit."
            );

            throw error;

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


                    // ADMIN → ADMIN PANEL

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
                                    "🚫 Daily survey limit reached."
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

                });

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


// =====================================================
// TODAY COUNT
// =====================================================

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


    return db
        .collection("surveys")
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


// =====================================================
// FIRESTORE DATE
// =====================================================

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

        const date =
            new Date(value);

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }

    catch (error) {

        return null;

    }

}


// =====================================================
// LOAD QUESTIONS
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
        .orderBy(
            "createdAt",
            "asc"
        )
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

            return db
                .collection("questions")
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
                "Questions load failed."
            );

        });

}


// =====================================================
// BUILD QUESTIONS
// =====================================================

function buildQuestionsFromSnapshot(
    snapshot
) {

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


        const options =
            data.options

                .map(function(option) {

                    return String(
                        option
                    ).trim();

                })

                .filter(function(option) {

                    return option !== "";

                });


        if (options.length < 2) {
            return;
        }


        surveyQuestions.push({

            id: doc.id,

            question:
                String(
                    data.question
                ).trim(),

            type:
                data.type === "multiple"
                    ? "multiple"
                    : "single",

            options: options,

            createdAt:
                data.createdAt || null

        });

    });


    surveyQuestions.sort(
        function(a, b) {

            const dateA =
                getFirestoreDate(
                    a.createdAt
                );

            const dateB =
                getFirestoreDate(
                    b.createdAt
                );


            if (
                dateA &&
                dateB
            ) {

                return (
                    dateA.getTime() -
                    dateB.getTime()
                );

            }


            if (
                dateA &&
                !dateB
            ) {

                return -1;

            }


            if (
                !dateA &&
                dateB
            ) {

                return 1;

            }


            return 0;

        }
    );


    console.log(
        "Questions loaded:",
        surveyQuestions
    );


    if (
        surveyQuestions.length === 0
    ) {

        showMessage(
            "No questions available. Please add questions from Admin Panel."
        );

        return;

    }


    currentQuestion = 0;

    answers.questions = {};

    renderQuestion();

}


// =====================================================
// BASIC DETAILS
// =====================================================

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

            const assembly =
                getValue("assembly");

            const district =
                getValue("district");

            const pincode =
                getValue("pincode");


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
                !Number.isFinite(
                    ageNumber
                ) ||
                ageNumber < 1 ||
                ageNumber > 120
            ) {

                showMessage(
                    "❌ Please enter a valid age."
                );

                return;

            }


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
                firebase.auth()
                    .currentUser;


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

                        assembly: assembly,

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
                        error
                    );

                    showMessage(
                        "Unable to continue."
                    );

                });

        }
    );

}


// =====================================================
// SHOW QUESTION PAGE
// IMPORTANT FIX:
// NO ABSOLUTE POSITION
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


    if (
        !basicStep ||
        !questionStep
    ) {

        console.error(
            "Survey steps not found."
        );

        return;

    }


    // Basic hide

    basicStep.style.display =
        "none";


    // Question show

    questionStep.style.display =
        "block";


    questionStep.style.position =
        "relative";

    questionStep.style.left =
        "auto";

    questionStep.style.top =
        "auto";

    questionStep.style.transform =
        "none";

    questionStep.style.opacity =
        "1";


    renderQuestion();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

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

        optionsBox.innerHTML =
            "";

        return;

    }


    const question =
        surveyQuestions[
            currentQuestion
        ];


    if (!question) return;


    // QUESTION NUMBER

    if (questionNumber) {

        questionNumber.textContent =
            "Question " +
            (currentQuestion + 1) +
            " of " +
            surveyQuestions.length;

    }


    // QUESTION

    questionText.textContent =
        question.question;


    // CLEAR OPTIONS

    optionsBox.innerHTML =
        "";


    const savedAnswer =
        answers.questions[
            question.id
        ];


    // OPTIONS

    question.options.forEach(
        function(option) {

            const label =
                document.createElement(
                    "label"
                );


            label.style.cssText =
                `
                display:flex;
                align-items:center;
                gap:12px;
                width:100%;
                margin-bottom:12px;
                padding:18px 14px;
                border:1px solid #ddd;
                border-radius:9px;
                cursor:pointer;
                background:#fff;
                font-weight:bold;
                font-size:16px;
                box-sizing:border-box;
                `;


            const input =
                document.createElement(
                    "input"
                );


            input.type =
                question.type === "multiple"
                    ? "checkbox"
                    : "radio";


            input.name =
                "surveyQuestion_" +
                question.id;


            input.value =
                option;


            input.style.cssText =
                `
                width:22px;
                height:22px;
                flex:0 0 22px;
                margin:0;
                `;


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

                    input.checked =
                        true;

                }

            }
            else {

                if (
                    savedAnswer ===
                    option
                ) {

                    input.checked =
                        true;

                }

            }


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


    // PREVIOUS

    if (previousButton) {

        previousButton.disabled =
            currentQuestion === 0;

    }


    const isLastQuestion =
        currentQuestion ===
        surveyQuestions.length - 1;


    // NEXT

    if (nextButton) {

        if (isLastQuestion) {

            nextButton.style.display =
                "none";

        }
        else {

            nextButton.style.display =
                "block";

            nextButton.disabled =
                false;

        }

    }


    // SUBMIT

    if (submitButton) {

        if (isLastQuestion) {

            submitButton.style.display =
                "block";

            submitButton.style.visibility =
                "visible";

            submitButton.style.opacity =
                "1";

            submitButton.disabled =
                false;

        }
        else {

            submitButton.style.display =
                "none";

        }

    }

}


// =====================================================
// CURRENT ANSWER
// =====================================================

function getCurrentQuestionAnswer() {

    if (
        surveyQuestions.length === 0
    ) {

        return null;

    }


    const question =
        surveyQuestions[
            currentQuestion
        ];


    if (!question) return null;


    const inputs =
        document.querySelectorAll(
            'input[name="surveyQuestion_' +
            question.id +
            '"]'
        );


    if (
        question.type ===
        "multiple"
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


// =====================================================
// SAVE ANSWER
// =====================================================

function saveCurrentQuestionAnswer() {

    const question =
        surveyQuestions[
            currentQuestion
        ];


    if (!question) {

        return false;

    }


    const answer =
        getCurrentQuestionAnswer();


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

            return false;

        }

    }
    else {

        if (!answer) {

            showMessage(
                "Please select an option."
            );

            return false;

        }

    }


    answers.questions[
        question.id
    ] = answer;


    return true;

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

    const submitButton =
        document.getElementById(
            "submitSurvey"
        );


    // NEXT

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

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                }

            }
        );

    }


    // PREVIOUS

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function() {

                clearMessage();


                if (
                    currentQuestion <= 0
                ) {

                    return;

                }


                const question =
                    surveyQuestions[
                        currentQuestion
                    ];


                if (question) {

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

                    }
                    else if (answer) {

                        answers.questions[
                            question.id
                        ] = answer;

                    }

                }


                currentQuestion--;

                renderQuestion();


                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }


    // SUBMIT

    if (submitButton) {

        submitButton.addEventListener(
            "click",
            submitSurvey
        );

    }

}


// =====================================================
// SUBMIT SURVEY
// =====================================================

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


    // CHECK EVERY QUESTION

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
            "multiple"
        ) {

            if (
                !Array.isArray(answer) ||
                answer.length === 0
            ) {

                currentQuestion =
                    i;

                renderQuestion();

                showMessage(
                    "Please answer Question " +
                    (i + 1) +
                    " before submitting."
                );

                return;

            }

        }
        else {

            if (!answer) {

                currentQuestion =
                    i;

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


    const user =
        firebase.auth()
            .currentUser;


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

        button.disabled =
            true;

        button.textContent =
            "Saving Survey...";

    }


    getTodayCount(user)

        .then(function(count) {

            if (
                count >= DAILY_LIMIT
            ) {

                throw new Error(
                    "Daily survey limit reached."
                );

            }


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

                assembly:
                    answers.basic.assembly || "",

                district:
                    answers.basic.district || "",

                pincode:
                    answers.basic.pincode || "",

                answers:
                    answers.questions,

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


            return db
                .collection("surveys")
                .add(surveyData);

        })


        .then(function(docRef) {

            console.log(
                "Survey saved:",
                docRef.id
            );


            return getTodayCount(
                user
            );

        })


        .then(function(newCount) {

            updateDailyProgress(
                newCount
            );


            // SUCCESS

            showSuccessMessage(
                "✅ Survey submitted successfully!"
            );


            // IMPORTANT:
            // Return to basic form

            resetSurveyForm();


            if (
                newCount >= DAILY_LIMIT
            ) {

                disableSurveyButtons();

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

                button.disabled =
                    false;

                button.textContent =
                    "Submit Survey";

            }

        });

}


// =====================================================
// RESET FORM AFTER SUBMIT
// IMPORTANT FIX
// =====================================================

function resetSurveyForm() {

    console.log(
        "Resetting survey form..."
    );


    answers = {
        basic: {},
        questions: {}
    };


    currentQuestion = 0;

    surveyStarted = false;


    // CLEAR BASIC INPUTS

    [
        "name",
        "mobile",
        "age",
        "gender",
        "village",
        "assembly",
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


    // IMPORTANT:
    // Completely restore original layout

    if (questionStep) {

        questionStep.style.display =
            "none";

        questionStep.style.position =
            "";

        questionStep.style.left =
            "";

        questionStep.style.top =
            "";

        questionStep.style.width =
            "";

        questionStep.style.transform =
            "";

        questionStep.style.opacity =
            "";

    }


    if (basicStep) {

        basicStep.style.display =
            "block";

        basicStep.style.position =
            "";

        basicStep.style.left =
            "";

        basicStep.style.top =
            "";

        basicStep.style.width =
            "";

        basicStep.style.transform =
            "";

        basicStep.style.opacity =
            "";

    }


    // RESET BUTTONS

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

        nextButton.style.display =
            "block";

        nextButton.disabled =
            false;

    }


    if (previousButton) {

        previousButton.style.display =
            "block";

        previousButton.disabled =
            true;

    }


    if (submitButton) {

        submitButton.style.display =
            "none";

        submitButton.disabled =
            false;

        submitButton.textContent =
            "Submit Survey";

    }


    // CLEAR QUESTION AREA

    const questionOptions =
        document.getElementById(
            "questionOptions"
        );

    if (questionOptions) {

        questionOptions.innerHTML =
            "";

    }


    const questionText =
        document.getElementById(
            "questionText"
        );

    if (questionText) {

        questionText.textContent =
            "Loading questions...";

    }


    // UPDATE COUNT

    const user =
        firebase.auth()
            .currentUser;


    if (user) {

        getTodayCount(user)
            .then(function(count) {

                updateDailyProgress(
                    count
                );

            });

    }


    // SCROLL BACK TO TOP

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    console.log(
        "Survey form reset successfully."
    );

}


// =====================================================
// DISABLE BUTTONS
// =====================================================

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


    if (basicButton)
        basicButton.disabled =
            true;


    if (nextButton)
        nextButton.disabled =
            true;


    if (previousButton)
        previousButton.disabled =
            true;


    if (submitButton)
        submitButton.disabled =
            true;

}


// =====================================================
// ENABLE BUTTONS
// =====================================================

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


    if (basicButton)
        basicButton.disabled =
            false;


    if (nextButton)
        nextButton.disabled =
            false;


    if (previousButton)
        previousButton.disabled =
            currentQuestion === 0;


    if (submitButton)
        submitButton.disabled =
            false;

}


// =====================================================
// GET VALUE
// =====================================================

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) return "";


    return String(
        element.value || ""
    ).trim();

}


// =====================================================
// MESSAGE
// =====================================================

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

    const element =
        document.getElementById(
            "message"
        );


    if (element) {

        element.textContent =
            "";

        element.classList.remove(
            "success-message"
        );

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

}
else {

    initializeSurveyPage();

}
