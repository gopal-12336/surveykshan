console.log("Survey JS Loaded - Daily Limit + Dynamic Questions");

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

    submitBtn = document.getElementById("submitSurvey");
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

    box.style.background = "#ffffff";
    box.style.border = "1px solid #e0e0e0";
    box.style.borderRadius = "12px";
    box.style.padding = "15px";
    box.style.margin = "15px 0";
    box.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
    box.style.fontFamily = "Arial,sans-serif";

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
    progressText.textContent = "0 / 20";

    titleRow.appendChild(title);
    titleRow.appendChild(progressText);


    const progressBackground = document.createElement("div");

    progressBackground.style.width = "100%";
    progressBackground.style.height = "12px";
    progressBackground.style.background = "#eeeeee";
    progressBackground.style.borderRadius = "20px";
    progressBackground.style.overflow = "hidden";


    const progressBar = document.createElement("div");

    progressBar.id = "dailyProgressBar";

    progressBar.style.width = "0%";
    progressBar.style.height = "100%";
    progressBar.style.background = "#1565c0";
    progressBar.style.transition = "width 0.4s ease";

    progressBackground.appendChild(progressBar);


    const remainingText = document.createElement("div");

    remainingText.id = "dailyRemainingText";

    remainingText.textContent =
        "Remaining today: 20";

    remainingText.style.marginTop = "8px";
    remainingText.style.fontSize = "13px";
    remainingText.style.color = "#555";


    box.appendChild(titleRow);
    box.appendChild(progressBackground);
    box.appendChild(remainingText);


    const container =
        document.querySelector(".login-box") ||
        document.querySelector(".container") ||
        document.body;


    if (container) {

        /*
         * If survey.html already contains
         * dailyLimitBox, put our progress
         * box after it.
         */

        const dailyLimitBox =
            document.getElementById(
                "dailyLimitBox"
            );

        if (dailyLimitBox) {

            dailyLimitBox.insertAdjacentElement(
                "afterend",
                box
            );

        } else {

            container.insertBefore(
                box,
                container.firstChild
            );

        }

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

    const todayCount =
        document.getElementById(
            "todayCount"
        );

    const remainingCount =
        document.getElementById(
            "remainingCount"
        );


    count = Number(count);

    if (
        !Number.isFinite(count) ||
        count < 0
    ) {
        count = 0;
    }


    const limit =
        Number(DAILY_LIMIT) > 0
            ? Number(DAILY_LIMIT)
            : 20;


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


    if (progressText) {

        progressText.textContent =
            count + " / " + limit;

    }


    if (remainingText) {

        remainingText.textContent =
            remaining > 0
                ? "Remaining today: " + remaining
                : "🚫 Daily limit reached";

    }


    if (progressBar) {

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


    /*
     * survey.html वाला simple counter
     */

    if (todayCount) {

        todayCount.textContent =
            count;

    }


    if (remainingCount) {

        remainingCount.textContent =
            remaining;

    }


    /*
     * Disable submit if limit reached.
     */

    if (count >= limit) {

        disableSurveyButtons();

    }

    else {

        enableSurveyButtons();

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

            if (
                doc.exists &&
                doc.data().dailyLimit !== undefined
            ) {

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

                else {

                    DAILY_LIMIT = 20;

                }

            }

            else {

                DAILY_LIMIT = 20;

            }

        })

        .catch(function(error) {

            console.warn(
                "Daily limit loading failed:",
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


                        /*
                         * Admin should go to admin panel.
                         */

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
                                    count >= DAILY_LIMIT
                                ) {

                                    showMessage(
                                        "🚫 Daily survey limit reached. You cannot submit more surveys today."
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

                                showMessage(
                                    "Unable to load survey: " +
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
// GET TODAY COUNT
// =====================================================

function getTodayCount(user) {

    if (!user || !user.email) {

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


    /*
     * We use surveyorEmail.
     *
     * New submissions created by this
     * survey.js will contain surveyorEmail.
     */

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

        })

        .catch(function(error) {

            /*
             * Old records may not contain
             * surveyorEmail.
             */

            console.warn(
                "Surveyor count error:",
                error
            );

            return 0;

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

    catch(error) {

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
                "Ordered loading failed:",
                error
            );


            /*
             * Fallback.
             */

            db.collection("questions")
                .get()

                .then(function(snapshot) {

                    buildQuestionsFromSnapshot(
                        snapshot
                    );

                })

                .catch(function(error2) {

                    console.error(
                        "Question loading error:",
                        error2
                    );

                    showMessage(
                        "Questions load failed: " +
                        error2.message
                    );

                });

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
            !Array.isArray(
                data.options
            )
        ) {

            return;

        }


        const cleanOptions =
            data.options
                .map(function(option) {

                    return String(
                        option
                    ).trim();

                })
                .filter(function(option) {

                    return option !== "";

                });


        if (
            cleanOptions.length < 2
        ) {

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

            options:
                cleanOptions,

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


            if (dateA && dateB) {

                return (
                    dateA.getTime() -
                    dateB.getTime()
                );

            }


            if (dateA && !dateB) {
                return -1;
            }


            if (!dateA && dateB) {
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


    if (!button) {

        console.log(
            "basicNextButton not found"
        );

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

            const assembly =
                getValue("assembly");

            const district =
                getValue("district");

            const pincode =
                getValue("pincode");


            /*
             * Assembly is used if present.
             * District/pincode remain optional
             * for compatibility with old form.
             */

            if (
                !name ||
                !mobile ||
                !age ||
                !gender ||
                !village ||
                !assembly
            ) {

                showMessage(
                    "Please fill all required fields."
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
                pincode &&
                !/^[0-9]{6}$/.test(
                    pincode
                )
            ) {

                showMessage(
                    "❌ Please enter a valid 6 digit PIN code."
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


            /*
             * Check limit AGAIN immediately
             * before starting survey.
             */

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

                        age: age,

                        gender: gender,

                        village: village,

                        assembly: assembly,

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

                    console.error(error);

      
