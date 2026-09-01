console.log("Survey JS Loaded - PHOTO + FIRESTORE + CLOUDINARY FIXED VERSION");


/* =========================================================
   ADMIN
========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";


/* =========================================================
   CLOUDINARY CONFIG
========================================================= */

const CLOUDINARY_CLOUD_NAME = "pavz8wb1";
const CLOUDINARY_UPLOAD_PRESET = "survey_photos";

const CLOUDINARY_UPLOAD_URL =
    "https://api.cloudinary.com/v1_1/" +
    CLOUDINARY_CLOUD_NAME +
    "/image/upload";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let DAILY_LIMIT = 0;

let currentQuestion = 0;

let surveyQuestions = [];

let surveyStarted = false;

let submitBtn = null;

let message = null;

let dailyLimitLoaded = false;


/* =========================================================
   ANSWERS
========================================================= */

let answers = {
    basic: {},
    questions: {}
};


/* =========================================================
   IMPORTANT:
   PHOTO FILES MUST BE STORED OUTSIDE DOM
========================================================= */

let selectedSurveyPhotos = {
    photoVillage: null,
    photoProblem: null,
    photoPerson: null,
    photoSelfie: null
};


/* =========================================================
   PERMANENT QUESTIONS
========================================================= */

const LOCATION_QUESTION = {

    id: "__permanent_location__",

    type: "location",

    question:
        "📍 अपनी वर्तमान स्थिति का स्थान चुनें"

};


const PHOTO_QUESTION = {

    id: "__permanent_photos__",

    type: "photos",

    question:
        "📷 आवश्यक चार फोटो अपलोड करें"

};


/* =========================================================
   INITIALIZE
========================================================= */

function initializeSurveyPage() {

    console.log("Initializing Survey Page...");

    submitBtn =
        document.getElementById("submitSurvey");

    message =
        document.getElementById("message");

    setupBasicDetails();

    setupQuestionButtons();

    createDailyProgressUI();

    startAuthentication();
}


/* =========================================================
   DAILY PROGRESS UI
========================================================= */

function createDailyProgressUI() {

    if (document.getElementById("dailyProgressBox")) {
        return;
    }

    const box = document.createElement("div");

    box.id = "dailyProgressBox";

    box.style.cssText =
        "background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:15px;margin:15px 0;box-shadow:0 2px 8px rgba(0,0,0,.08);font-family:Arial,sans-serif;";

    const titleRow = document.createElement("div");

    titleRow.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:bold;";

    const title = document.createElement("span");

    title.textContent = "📊 Today's Progress";

    const progressText = document.createElement("span");

    progressText.id = "dailyProgressText";

    progressText.textContent = "0 / --";

    titleRow.append(
        title,
        progressText
    );

    const progressBackground =
        document.createElement("div");

    progressBackground.style.cssText =
        "width:100%;height:12px;background:#eee;border-radius:20px;overflow:hidden;";

    const progressBar =
        document.createElement("div");

    progressBar.id = "dailyProgressBar";

    progressBar.style.cssText =
        "width:0%;height:100%;background:#1565c0;transition:width .4s ease;";

    progressBackground.appendChild(
        progressBar
    );

    const remainingText =
        document.createElement("div");

    remainingText.id =
        "dailyRemainingText";

    remainingText.textContent =
        "Loading daily limit...";

    remainingText.style.cssText =
        "margin-top:8px;font-size:13px;color:#555;";

    box.append(
        titleRow,
        progressBackground,
        remainingText
    );

    const container =
        document.querySelector(".survey-box") ||
        document.querySelector(".container") ||
        document.body;

    const dailyLimitBox =
        document.getElementById("dailyLimitBox");

    if (dailyLimitBox) {

        dailyLimitBox.insertAdjacentElement(
            "afterend",
            box
        );

    } else if (container) {

        container.insertBefore(
            box,
            container.firstChild
        );

    }
}


/* =========================================================
   UPDATE DAILY PROGRESS
========================================================= */

function updateDailyProgress(count) {

    count = Number(count);

    if (
        !Number.isFinite(count) ||
        count < 0
    ) {
        count = 0;
    }

    const limit = Number(DAILY_LIMIT);

    if (
        !Number.isFinite(limit) ||
        limit <= 0
    ) {
        return;
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

        todayCount.textContent =
            count;

    }

    if (remainingCount) {

        remainingCount.textContent =
            remaining;

    }

    if (count >= limit) {

        disableSurveyButtons();

    }
}


/* =========================================================
   LOAD DAILY LIMIT
========================================================= */

function loadDailyLimit() {

    return db
        .collection("settings")
        .doc("config")
        .get()

        .then(function(doc) {

            if (!doc.exists) {

                throw new Error(
                    "Daily limit not configured."
                );

            }

            const value =
                Number(
                    (
                        doc.data() || {}
                    ).dailyLimit
                );

            if (
                !Number.isFinite(value) ||
                value <= 0
            ) {

                throw new Error(
                    "Invalid daily limit."
                );

            }

            DAILY_LIMIT = value;

            dailyLimitLoaded = true;

            console.log(
                "Daily Limit Loaded:",
                DAILY_LIMIT
            );

            return DAILY_LIMIT;

        })

        .catch(function(error) {

            console.error(
                "Daily limit loading error:",
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


/* =========================================================
   AUTHENTICATION
========================================================= */

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
                "Authentication error: " +
                error.message
            );

        });
}


/* =========================================================
   TODAY COUNT
========================================================= */

function getTodayCount(user) {

    if (
        !user ||
        !user.email
    ) {

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

            snapshot.forEach(
                function(doc) {

                    const date =
                        getFirestoreDate(
                            (
                                doc.data() || {}
                            ).createdAt
                        );

                    if (
                        date &&
                        date >= todayStart
                    ) {

                        count++;

                    }

                }
            );

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


/* =========================================================
   FIRESTORE DATE
========================================================= */

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

        return isNaN(date.getTime())
            ? null
            : date;

    }
    catch (error) {

        return null;

    }
}


/* =========================================================
   LOAD QUESTIONS
========================================================= */

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
        .orderBy("createdAt", "asc")
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
                "Questions load failed: " +
                error.message
            );

        });
}


/* =========================================================
   BUILD QUESTIONS
========================================================= */

function buildQuestionsFromSnapshot(snapshot) {

    surveyQuestions = [];

    snapshot.forEach(
        function(doc) {

            const data =
                doc.data() || {};

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

        }
    );

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

    surveyQuestions.push(
        LOCATION_QUESTION
    );

    surveyQuestions.push(
        PHOTO_QUESTION
    );

    console.log(
        "Questions loaded:",
        surveyQuestions
    );

    currentQuestion = 0;

    answers.questions = {};

    renderQuestion();
}


/* =========================================================
   BASIC DETAILS
========================================================= */

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

            const district =
                getValue("district");

            const pincode =
                getValue("pincode");

            if (
                !name ||
                !mobile ||
                !age ||
                !gender ||
                !village
            ) {

                showMessage(
                    "Please fill all required basic information."
                );

                return;

            }

            if (
                !/^[0-9]{10}$/.test(mobile)
            ) {

                showMessage(
                    "❌ Mobile number must contain exactly 10 digits."
                );

                return;

            }

            const ageNumber =
                Number(age);

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

            if (
                pincode &&
                !/^[0-9]{6}$/.test(pincode)
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

                        district: district,

                        pincode: pincode

                    };

                    answers.questions = {};

                    resetPhotoStorage();

                    currentQuestion = 0;

                    surveyStarted = true;

                    showQuestionPage();

                })

                .catch(function(error) {

                    console.error(
                        "Basic details error:",
                        error
                    );

                    showMessage(
                        "Unable to continue: " +
                        error.message
                    );

                });

        }
    );
}


/* =========================================================
   SHOW QUESTION PAGE
========================================================= */

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
            "Basic Details Step or Question Step not found."
        );

        return;

    }

    questionStep.style.display = "block";

    questionStep.style.position = "absolute";

    questionStep.style.left = "0";

    questionStep.style.top = "0";

    questionStep.style.width = "100%";

    questionStep.style.transform =
        "translateX(100%)";

    questionStep.style.opacity = "0";

    basicStep.style.position =
        "relative";

    basicStep.style.transform =
        "translateX(0)";

    basicStep.style.opacity = "1";

    basicStep.style.transition =
        "transform .45s ease, opacity .45s ease";

    questionStep.style.transition =
        "transform .45s ease, opacity .45s ease";

    void questionStep.offsetWidth;

    basicStep.style.transform =
        "translateX(-100%)";

    basicStep.style.opacity = "0";

    questionStep.style.transform =
        "translateX(0)";

    questionStep.style.opacity = "1";

    setTimeout(
        function() {

            basicStep.style.display =
                "none";

            basicStep.style.position =
                "relative";

            basicStep.style.left =
                "auto";

            basicStep.style.top =
                "auto";

            basicStep.style.width =
                "100%";

            questionStep.style.position =
                "relative";

            questionStep.style.left =
                "auto";

            questionStep.style.top =
                "auto";

            questionStep.style.width =
                "100%";

            basicStep.style.transform =
                "";

            basicStep.style.opacity =
                "";

            questionStep.style.transform =
                "";

            questionStep.style.opacity =
                "";

            renderQuestion();

        },
        450
    );
}


/* =========================================================
   RENDER QUESTION
========================================================= */

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

        optionsBox.innerHTML = "";

        return;

    }

    const question =
        surveyQuestions[
            currentQuestion
        ];

    if (!question) {
        return;
    }

    if (questionNumber) {

        questionNumber.textContent =
            "Question " +
            (currentQuestion + 1) +
            " of " +
            surveyQuestions.length;

    }

    if (
        question.type === "location"
    ) {

        renderLocationQuestion(
            questionText,
            optionsBox
        );

    }
    else if (
        question.type === "photos"
    ) {

        renderPhotoQuestion(
            questionText,
            optionsBox
        );

    }
    else {

        renderNormalQuestion(
            question,
            questionText,
            optionsBox
        );

    }

    if (previousButton) {

        previousButton.disabled =
            currentQuestion === 0;

    }

    const isLastQuestion =
        currentQuestion ===
        surveyQuestions.length - 1;

    if (nextButton) {

        nextButton.style.display =
            isLastQuestion
                ? "none"
                : "block";

    }

    if (submitButton) {

        submitButton.style.display =
            isLastQuestion
                ? "block"
                : "none";

        submitButton.disabled = false;

        submitButton.textContent =
            "Submit Survey";

    }
}


/* =========================================================
   NORMAL QUESTION
========================================================= */

function renderNormalQuestion(
    question,
    questionText,
    optionsBox
) {

    questionText.textContent =
        question.question;

    optionsBox.innerHTML = "";

    const savedAnswer =
        answers.questions[
            question.id
        ];

    (question.options || [])
        .forEach(
            function(option) {

                const label =
                    document.createElement(
                        "label"
                    );

                label.style.cssText =
                    "display:block;margin-bottom:10px;padding:13px;border:1px solid #ddd;border-radius:8px;cursor:pointer;background:#fff;";

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

                input.style.marginRight =
                    "10px";

                if (
                    question.type === "multiple"
                ) {

                    if (
                        Array.isArray(savedAnswer) &&
                        savedAnswer.includes(option)
                    ) {

                        input.checked = true;

                    }

                }
                else if (
                    savedAnswer === option
                ) {

                    input.checked = true;

                }

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


/* =========================================================
   LOCATION QUESTION
========================================================= */

function renderLocationQuestion(
    questionText,
    optionsBox
) {

    questionText.textContent =
        "📍 कृपया अपनी वर्तमान स्थिति का स्थान चुनें";

    optionsBox.innerHTML = "";

    const box =
        document.createElement("div");

    box.style.cssText =
        "text-align:center;padding:20px;border:1px solid #d7e3ef;border-radius:12px;background:#f8fbff;";

    const text =
        document.createElement("p");

    text.textContent =
        "नीचे दिए गए बटन पर क्लिक करते ही आपकी वर्तमान Live Location प्राप्त की जाएगी।";

    text.style.cssText =
        "font-size:15px;color:#555;";

    const button =
        document.createElement("button");

    button.type = "button";

    button.className = "primary";

    button.textContent =
        "📍 मेरी Live Location चुनें";

    const status =
        document.createElement("div");

    status.style.cssText =
        "margin-top:12px;font-weight:bold;color:#555;";

    const saved =
        answers.questions[
            LOCATION_QUESTION.id
        ];

    if (
        saved &&
        saved.latitude !== undefined &&
        saved.longitude !== undefined
    ) {

        status.textContent =
            "✅ Location captured";

        status.style.color =
            "#2e7d32";

    }

    button.addEventListener(
        "click",
        function() {

            button.disabled = true;

            button.textContent =
                "📍 Location प्राप्त हो रही है...";

            status.textContent = "";

            captureCurrentLocation()

                .then(
                    function(locationData) {

                        answers.questions[
                            LOCATION_QUESTION.id
                        ] = locationData;

                        status.textContent =
                            "✅ Live Location captured successfully";

                        status.style.color =
                            "#2e7d32";

                        button.textContent =
                            "✅ Location Captured";

                    }
                )

                .catch(
                    function(error) {

                        console.error(
                            "Location error:",
                            error
                        );

                        status.textContent =
                            "❌ " +
                            error.message;

                        status.style.color =
                            "#c62828";

                        button.disabled = false;

                        button.textContent =
                            "📍 मेरी Live Location चुनें";

                    }
                );

        }
    );

    box.append(
        text,
        button,
        status
    );

    optionsBox.appendChild(box);
}


/* =========================================================
   PHOTO QUESTION
========================================================= */

function renderPhotoQuestion(
    questionText,
    optionsBox
) {

    questionText.textContent =
        "📷 चार आवश्यक फोटो अपलोड करें";

    optionsBox.innerHTML = "";

    const box =
        document.createElement("div");

    box.style.cssText =
        "padding:18px;border:1px solid #d7e3ef;border-radius:12px;background:#f8fbff;";


    const photoDefinitions = [

        {
            id: "photoVillage",
            title: "1️⃣ गाँव की फोटो",
            description:
                "गाँव / क्षेत्र की सामान्य स्थिति की फोटो",
            capture: "environment"
        },

        {
            id: "photoProblem",
            title: "2️⃣ गाँव की समस्या की फोटो",
            description:
                "गाँव में दिखाई देने वाली प्रमुख समस्या की फोटो",
            capture: "environment"
        },

        {
            id: "photoPerson",
            title: "3️⃣ व्यक्ति की फोटो",
            description:
                "सर्वे से संबंधित व्यक्ति की फोटो",
            capture: "environment"
        },

        {
            id: "photoSelfie",
            title: "4️⃣ Respondent के साथ Selfie",
            description:
                "Respondent के साथ आपकी selfie",
            capture: "user"
        }

    ];


    photoDefinitions.forEach(
        function(item) {

            const wrapper =
                document.createElement("div");

            wrapper.style.cssText =
                "margin-bottom:15px;padding:14px;background:white;border:1px solid #ddd;border-radius:10px;";

            const label =
                document.createElement("label");

            label.textContent =
                item.title;

            label.style.cssText =
                "display:block;font-weight:bold;margin-bottom:5px;color:#1565c0;";

            const description =
                document.createElement("div");

            description.textContent =
                item.description;

            description.style.cssText =
                "font-size:13px;color:#666;margin-bottom:8px;";

            const input =
                document.createElement("input");

            input.type = "file";

            input.id = item.id;

            input.name = item.id;

            input.accept = "image/*";

            input.setAttribute(
                "capture",
                item.capture
            );

            input.style.cssText =
                "width:100%;padding:8px;border:1px solid #ccd5df;border-radius:8px;background:#fff;";


            const preview =
                document.createElement("div");

            preview.style.cssText =
                "margin-top:10px;font-size:13px;color:#2e7d32;";


            /*
             * IMPORTANT:
             * Existing selected photo state
             */

            const existingFile =
                selectedSurveyPhotos[
                    item.id
                ];

            if (existingFile) {

                preview.innerHTML =
                    "✅ Selected: <b>" +
                    escapeHtml(
                        existingFile.name
                    ) +
                    "</b>";

            }


            /*
             * PHOTO CHANGE
             */

            input.addEventListener(
                "change",
                function() {

                    if (
                        input.files &&
                        input.files.length > 0
                    ) {

                        const file =
                            input.files[0];


                        /*
                         * SAVE FILE OUTSIDE DOM
                         */

                        selectedSurveyPhotos[
                            item.id
                        ] = file;


                        /*
                         * ALSO SAVE PHOTO STATUS
                         */

                        answers.questions[
                            PHOTO_QUESTION.id
                        ] =
                            getRequiredPhotoFiles();


                        preview.innerHTML =
                            "✅ Selected: <b>" +
                            escapeHtml(
                                file.name
                            ) +
                            "</b>";

                        console.log(
                            "Photo stored:",
                            item.id,
                            file.name
                        );

                    }
                    else {

                        /*
                         * Do NOT delete old file
                         * unnecessarily.
                         */

                        if (
                            !selectedSurveyPhotos[
                                item.id
                            ]
                        ) {

                            preview.textContent =
                                "";

                        }

                    }

                }
            );


            const cameraNote =
                document.createElement("div");

            cameraNote.textContent =
                item.capture === "user"
                    ? "📱 मोबाइल पर यहाँ से कैमरा खोलकर Selfie भी ले सकते हैं।"
                    : "📱 मोबाइल पर यहाँ से कैमरा खोलकर फोटो भी ले सकते हैं।";

            cameraNote.style.cssText =
                "margin-top:6px;font-size:12px;color:#777;";


            wrapper.append(
                label,
                description,
                input,
                cameraNote,
                preview
            );

            box.appendChild(wrapper);

        }
    );


    const status =
        document.createElement("div");

    status.id =
        "photoSelectionStatus";

    status.style.cssText =
        "padding:12px;margin-top:8px;background:#fff;border-radius:8px;font-weight:bold;color:#1565c0;";

    updatePhotoSelectionStatus(
        status
    );

    box.appendChild(status);


    const note =
        document.createElement("div");

    note.textContent =
        "⚠️ चारों फोटो आवश्यक हैं। सभी फोटो चुनने के बाद Submit करें।";

    note.style.cssText =
        "font-weight:bold;color:#c62828;margin-top:10px;";

    box.appendChild(note);

    optionsBox.appendChild(box);
}


/* =========================================================
   UPDATE PHOTO STATUS
========================================================= */

function updatePhotoSelectionStatus(element) {

    if (!element) {
        return;
    }

    const files =
        getRequiredPhotoFiles();

    const count =
        files.length;

    if (count === 4) {

        element.textContent =
            "✅ 4 / 4 photos selected. You can submit the survey.";

        element.style.color =
            "#2e7d32";

        element.style.background =
            "#e8f5e9";

    }
    else {

        element.textContent =
            "📷 " +
            count +
            " / 4 photos selected";

        element.style.color =
            "#c62828";

        element.style.background =
            "#ffebee";

    }
}


/* =========================================================
   GET CURRENT QUESTION ANSWER
========================================================= */

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

    if (!question) {
        return null;
    }

    if (
        question.type === "location"
    ) {

        return answers.questions[
            LOCATION_QUESTION.id
        ] || null;

    }

    if (
        question.type === "photos"
    ) {

        return getRequiredPhotoFiles();

    }

    const inputs =
        document.querySelectorAll(
            'input[name="surveyQuestion_' +
            question.id +
            '"]'
        );

    if (
        question.type === "multiple"
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


/* =========================================================
   SAVE CURRENT QUESTION ANSWER
========================================================= */

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


    /* LOCATION */

    if (
        question.type === "location"
    ) {

        if (
            !answer ||
            answer.latitude === undefined ||
            answer.longitude === undefined
        ) {

            showMessage(
                "📍 Please capture your live location before continuing."
            );

            return false;

        }

        answers.questions[
            LOCATION_QUESTION.id
        ] = answer;

        return true;

    }


    /* PHOTOS */

    if (
        question.type === "photos"
    ) {

        const photoFiles =
            getRequiredPhotoFiles();

        if (
            photoFiles.length !== 4
        ) {

            showMessage(
                "📷 Please select all 4 required photos."
            );

            return false;

        }

        answers.questions[
            PHOTO_QUESTION.id
        ] = photoFiles;

        console.log(
            "4 photos saved in memory:",
            photoFiles
        );

        return true;

    }


    /* MULTIPLE */

    if (
        question.type === "multiple"
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

    /* SINGLE */

    else if (!answer) {

        showMessage(
            "Please select an option."
        );

        return false;

    }

    answers.questions[
        question.id
    ] = answer;

    return true;
}


/* =========================================================
   QUESTION BUTTONS
========================================================= */

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

                }

            }
        );

    }


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function() {

                clearMessage();

                const question =
                    surveyQuestions[
                        currentQuestion
                    ];

                if (question) {

                    if (
                        question.type === "photos"
                    ) {

                        const photos =
                            getRequiredPhotoFiles();

                        if (
                            photos.length > 0
                        ) {

                            answers.questions[
                                PHOTO_QUESTION.id
                            ] = photos;

                        }

                    }

                    else if (
                        question.type === "location"
                    ) {

                        /* Location already saved */

                    }

                    else {

                        const answer =
                            getCurrentQuestionAnswer();

                        if (
                            question.type ===
                            "multiple"
                        ) {

                            if (
                                Array.isArray(answer) &&
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

                }

                if (
                    currentQuestion > 0
                ) {

                    currentQuestion--;

                    renderQuestion();

                }

            }
        );

    }


    if (submitButton) {

        submitButton.addEventListener(
            "click",
            submitSurvey
        );

    }
}


/* =========================================================
   CAPTURE LOCATION
========================================================= */

function captureCurrentLocation() {

    return new Promise(
        function(resolve, reject) {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "Location is not supported by this browser."
                    )
                );

                return;

            }

            navigator.geolocation.getCurrentPosition(

                function(position) {

                    resolve({

                        latitude:
                            position.coords.latitude,

                        longitude:
                            position.coords.longitude,

                        accuracy:
                            position.coords.accuracy,

                        capturedAt:
                            new Date().toISOString()

                    });

                },

                function(error) {

                    let messageText =
                        "Unable to capture live location. Please allow location permission.";

                    if (
                        error &&
                        error.code === 1
                    ) {

                        messageText =
                            "Location permission denied. Please allow location access.";

                    }

                    reject(
                        new Error(
                            messageText
                        )
                    );

                },

                {

                    enableHighAccuracy: true,

                    timeout: 15000,

                    maximumAge: 0

                }

            );

        }
    );
}


/* =========================================================
   PHOTO STORAGE
========================================================= */

function resetPhotoStorage() {

    selectedSurveyPhotos = {

        photoVillage: null,

        photoProblem: null,

        photoPerson: null,

        photoSelfie: null

    };

}


/* =========================================================
   GET REQUIRED PHOTO FILES
========================================================= */

function getRequiredPhotoFiles() {

    const ids = [

        "photoVillage",

        "photoProblem",

        "photoPerson",

        "photoSelfie"

    ];

    const files = [];

    ids.forEach(
        function(id) {

            const file =
                selectedSurveyPhotos[id];

            if (
                file &&
                file instanceof File
            ) {

                files.push({

                    id: id,

                    file: file

                });

            }

        }
    );

    return files;
}


/* =========================================================
   CHECK ALL PHOTOS
========================================================= */

function hasAllRequiredPhotos() {

    return (
        selectedSurveyPhotos.photoVillage instanceof File &&
        selectedSurveyPhotos.photoProblem instanceof File &&
        selectedSurveyPhotos.photoPerson instanceof File &&
        selectedSurveyPhotos.photoSelfie instanceof File
    );
}


/* =========================================================
   CLOUDINARY UPLOAD ONE PHOTO
========================================================= */

function uploadSinglePhoto(
    file,
    surveyId,
    photoKey
) {

    if (
        !file ||
        !(file instanceof File)
    ) {

        return Promise.reject(
            new Error(
                "Invalid photo file: " +
                photoKey
            )
        );

    }

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );

    formData.append(
        "folder",
        "surveyPhotos/" + surveyId
    );

    /*
     * Extra context for Cloudinary
     */

    formData.append(
        "context",
        "survey_id=" +
        surveyId +
        "|photo_type=" +
        photoKey
    );


    console.log(
        "Uploading to Cloudinary:",
        photoKey,
        file.name
    );


    return fetch(
        CLOUDINARY_UPLOAD_URL,
        {

            method: "POST",

            body: formData

        }
    )

    .then(
        function(response) {

            return response
                .json()
                .then(
                    function(data) {

                        if (
                            !response.ok
                        ) {

                            console.error(
                                "Cloudinary response:",
                                data
                            );

                            throw new Error(
                                "Cloudinary upload failed for " +
                                photoKey +
                                ": " +
                                (
                                    data &&
                                    data.error &&
                                    data.error.message
                                        ? data.error.message
                                        : "Unknown Cloudinary error"
                                )
                            );

                        }

                        if (
                            !data ||
                            !data.secure_url
                        ) {

                            throw new Error(
                                "Cloudinary did not return secure_url for " +
                                photoKey
                            );

                        }

                        return {

                            url:
                                data.secure_url,

                            secure_url:
                                data.secure_url,

                            name:
                                file.name,

                            type:
                                file.type,

                            size:
                                file.size,

                            publicId:
                                data.public_id || "",

                            storagePath:
                                data.public_id || "",

                            resourceType:
                                data.resource_type || "image",

                            format:
                                data.format || "",

                            width:
                                data.width || null,

                            height:
                                data.height || null

                        };

                    }
                );

        }
    );
}


/* =========================================================
   UPLOAD ALL 4 PHOTOS
========================================================= */

function uploadSurveyPhotos(
    surveyId
) {

    if (
        !hasAllRequiredPhotos()
    ) {

        return Promise.reject(
            new Error(
                "All 4 required photos are not selected."
            )
        );

    }


    const photoMap = {

        photoVillage:
            selectedSurveyPhotos.photoVillage,

        photoProblem:
            selectedSurveyPhotos.photoProblem,

        photoPerson:
            selectedSurveyPhotos.photoPerson,

        photoSelfie:
            selectedSurveyPhotos.photoSelfie

    };


    const uploadPromises =
        Object.keys(photoMap)
            .map(
                function(photoKey) {

                    return uploadSinglePhoto(
                        photoMap[photoKey],
                        surveyId,
                        photoKey
                    )
                    .then(
                        function(photoData) {

                            return {

                                key:
                                    photoKey,

                                data:
                                    photoData

                            };

                        }
                    );

                }
            );


    return Promise.all(
        uploadPromises
    )

    .then(
        function(results) {

            const photos = {};

            results.forEach(
                function(result) {

                    photos[
                        result.key
                    ] =
                        result.data;

                }
            );

            console.log(
                "ALL CLOUDINARY PHOTOS UPLOADED:",
                photos
            );

            return photos;

        }
    );
}


/* =========================================================
   CLEAN ANSWERS FOR FIRESTORE
========================================================= */

function getCleanFirestoreAnswers() {

    const cleanAnswers = {};

    const source =
        answers.questions || {};

    Object.keys(source)
        .forEach(
            function(key) {

                if (
                    key ===
                    LOCATION_QUESTION.id
                ) {

                    return;

                }

                if (
                    key ===
                    PHOTO_QUESTION.id
                ) {

                    return;

                }

                if (
                    key.startsWith("__") &&
                    key.endsWith("__")
                ) {

                    return;

                }

                const value =
                    source[key];

                /*
                 * Never send File objects to Firestore.
                 */

                if (
                    value instanceof File
                ) {

                    return;

                }

                if (
                    Array.isArray(value)
                ) {

                    const containsFile =
                        value.some(
                            function(item) {

                                return (
                                    item &&
                                    item.file instanceof File
                                );

                            }
                        );

                    if (containsFile) {

                        return;

                    }

                }

                cleanAnswers[key] =
                    value;

            }
        );

    return cleanAnswers;
}


/* =========================================================
   SUBMIT SURVEY
========================================================= */

function submitSurvey() {

    clearMessage();

    console.log(
        "======================================"
    );

    console.log(
        "SUBMIT SURVEY STARTED"
    );

    console.log(
        "======================================"
    );


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


    /*
     * SAVE CURRENT QUESTION
     */

    if (
        surveyQuestions[currentQuestion]
    ) {

        if (
            !saveCurrentQuestionAnswer()
        ) {

            return;

        }

    }


    /*
     * CHECK PHOTOS FIRST
     */

    if (
        !hasAllRequiredPhotos()
    ) {

        const photoCount =
            getRequiredPhotoFiles().length;

        /*
         * Find photo question
         */

        const photoIndex =
            surveyQuestions.findIndex(
                function(question) {

                    return (
                        question.type ===
                        "photos"
                    );

                }
            );

        if (photoIndex >= 0) {

            currentQuestion =
                photoIndex;

            renderQuestion();

        }

        showMessage(
            "📷 Please select all 4 required photos. Currently " +
            photoCount +
            " / 4 selected."
        );

        return;

    }


    /*
     * VALIDATE ALL QUESTIONS
     */

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


        /*
         * LOCATION
         */

        if (
            question.type ===
            "location"
        ) {

            if (
                !answer ||
                answer.latitude === undefined ||
                answer.longitude === undefined
            ) {

                currentQuestion = i;

                renderQuestion();

                showMessage(
                    "📍 Please capture live location before submitting."
                );

                return;

            }

            continue;

        }


        /*
         * PHOTOS
         */

        if (
            question.type ===
            "photos"
        ) {

            if (
                !hasAllRequiredPhotos()
            ) {

                currentQuestion = i;

                renderQuestion();

                showMessage(
                    "📷 Please upload all 4 required photos before submitting."
                );

                return;

            }

            continue;

        }


        /*
         * MULTIPLE
         */

        if (
            question.type ===
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

        }


        /*
         * SINGLE
         */

        else {

            if (!answer) {

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

        button.disabled = true;

        button.textContent =
            "Checking...";

    }


    /*
     * CHECK DAILY LIMIT AGAIN
     */

    getTodayCount(user)

        .then(
            function(count) {

                updateDailyProgress(
                    count
                );

                if (
                    count >= DAILY_LIMIT
                ) {

                    throw new Error(
                        "Daily survey limit reached."
                    );

                }


                /*
                 * GET LOCATION
                 */

                const savedLocation =
                    answers.questions[
                        LOCATION_QUESTION.id
                    ];

                if (
                    savedLocation &&
                    savedLocation.latitude !== undefined &&
                    savedLocation.longitude !== undefined
                ) {

                    return savedLocation;

                }

                return captureCurrentLocation();

            }
        )


        /*
         * CREATE FIRESTORE DOC ID
         * BEFORE CLOUDINARY UPLOAD
         */

        .then(
            function(locationData) {

                answers.questions[
                    LOCATION_QUESTION.id
                ] =
                    locationData;


                /*
                 * Generate survey document
                 * without saving yet.
                 */

                const surveyDoc =
                    db.collection(
                        "surveys"
                    ).doc();


                const surveyId =
                    surveyDoc.id;


                console.log(
                    "Generated Survey ID:",
                    surveyId
                );


                if (button) {

                    button.textContent =
                        "Uploading Photos...";

                }


                /*
                 * Upload all 4 photos first.
                 */

                return uploadSurveyPhotos(
                    surveyId
                )

                .then(
                    function(photoData) {

                        return {

                            surveyDoc:
                                surveyDoc,

                            surveyId:
                                surveyId,

                            locationData:
                                locationData,

                            photoData:
                                photoData

                        };

                    }
                );

            }
        )


        /*
         * SAVE COMPLETE SURVEY TO FIRESTORE
         */

        .then(
            function(result) {

                const surveyDoc =
                    result.surveyDoc;

                const surveyId =
                    result.surveyId;

                const locationData =
                    result.locationData;

                const photoData =
                    result.photoData;


                if (button) {

                    button.textContent =
                        "Saving Survey...";

                }


                const cleanAnswers =
                    getCleanFirestoreAnswers();


                /*
                 * COMPLETE SURVEY DATA
                 */

                const surveyData = {

                    surveyId:
                        surveyId,

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
                        answers.basic.district || "",

                    pincode:
                        answers.basic.pincode || "",


                    /*
                     * NORMAL QUESTIONS
                     */

                    answers:
                        cleanAnswers,


                    /*
                     * SURVEYOR
                     */

                    surveyorEmail:
                        user.email || "",

                    surveyorUid:
                        user.uid || "",

                    createdBy:
                        user.email || "",


                    /*
                     * LOCATION
                     */

                    location:
                        locationData,

                    latitude:
                        locationData.latitude,

                    longitude:
                        locationData.longitude,

                    locationAccuracy:
                        locationData.accuracy,

                    locationCapturedAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),


                    /*
                     * CLOUDINARY PHOTOS
                     */

                    photos:
                        photoData,

                    photoCount:
                        Object.keys(
                            photoData
                        ).length,

                    photosUploadedAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),


                    /*
                     * CREATED TIME
                     */

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()

                };


                console.log(
                    "FINAL FIRESTORE DATA:",
                    surveyData
                );


                return surveyDoc
                    .set(
                        surveyData
                    )

                    .then(
                        function() {

                            console.log(
                                "Survey successfully saved to Firestore:",
                                surveyId
                            );

                            return surveyDoc;

                        }
                    );

            }
        )


        /*
         * COMPLETE
         */

        .then(
            function(docRef) {

                console.log(
                    "======================================"
                );

                console.log(
                    "SURVEY COMPLETED:",
                    docRef.id
                );

                console.log(
                    "======================================"
                );


                return getTodayCount(
                    user
                );

            }
        )


        .then(
            function(newCount) {

                updateDailyProgress(
                    newCount
                );


                showSuccessMessage(
                    "✅ Survey submitted successfully!"
                );


                console.log(
                    "Survey saved successfully."
                );


                resetSurveyForm();


                if (
                    newCount >= DAILY_LIMIT
                ) {

                    disableSurveyButtons();

                }

            }
        )


        .catch(
            function(error) {

                console.error(
                    "======================================"
                );

                console.error(
                    "SURVEY SUBMISSION ERROR:",
                    error
                );

                console.error(
                    "======================================"
                );


                showMessage(
                    "❌ Survey could not be submitted: " +
                    (
                        error &&
                        error.message
                            ? error.message
                            : String(error)
                    )
                );


                if (button) {

                    button.disabled = false;

                    button.textContent =
                        "Submit Survey";

                }

            }
        );

}


/* =========================================================
   RESET SURVEY
========================================================= */

function resetSurveyForm() {

    console.log(
        "Resetting survey form..."
    );


    answers = {

        basic: {},

        questions: {}

    };


    /*
     * VERY IMPORTANT
     */

    resetPhotoStorage();


    currentQuestion = 0;

    surveyStarted = false;


    [
        "name",
        "mobile",
        "age",
        "gender",
        "village",
        "district",
        "pincode"
    ]
    .forEach(
        function(id) {

            const element =
                document.getElementById(id);

            if (element) {

                element.value = "";

            }

        }
    );


    document
        .querySelectorAll(
            'input[type="file"]'
        )
        .forEach(
            function(input) {

                input.value = "";

            }
        );


    const basicStep =
        document.getElementById(
            "basicDetailsStep"
        );

    const questionStep =
        document.getElementById(
            "questionStep"
        );


    if (basicStep) {

        basicStep.style.display =
            "block";

        basicStep.style.position =
            "relative";

        basicStep.style.left =
            "auto";

        basicStep.style.top =
            "auto";

        basicStep.style.width =
            "100%";

        basicStep.style.transform =
            "";

        basicStep.style.opacity =
            "1";

        basicStep.classList.add(
            "active"
        );

    }


    if (questionStep) {

        questionStep.style.display =
            "none";

        questionStep.style.position =
            "relative";

        questionStep.style.left =
            "auto";

        questionStep.style.top =
            "auto";

        questionStep.style.width =
            "100%";

        questionStep.style.transform =
            "";

        questionStep.style.opacity =
            "";

        questionStep.classList.remove(
            "active"
        );

    }


    const button =
        document.getElementById(
            "submitSurvey"
        );


    if (button) {

        button.disabled = false;

        button.textContent =
            "Submit Survey";

        button.style.display =
            "none";

    }


    const nextButton =
        document.getElementById(
            "nextButton"
        );


    if (nextButton) {

        nextButton.style.display =
            "block";

        nextButton.disabled =
            false;

    }


    const previousButton =
        document.getElementById(
            "previousButton"
        );


    if (previousButton) {

        previousButton.disabled =
            true;

    }


    const user =
        firebase.auth()
            .currentUser;


    if (user) {

        getTodayCount(user)

            .then(
                function(count) {

                    updateDailyProgress(
                        count
                    );

                    if (
                        count < DAILY_LIMIT
                    ) {

                        enableSurveyButtons();

                    }

                }
            );

    }


    console.log(
        "Survey form reset successfully."
    );
}


/* =========================================================
   DISABLE BUTTONS
========================================================= */

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


    if (basicButton) {

        basicButton.disabled = true;

    }

    if (nextButton) {

        nextButton.disabled = true;

    }

    if (previousButton) {

        previousButton.disabled = true;

    }

    if (submitButton) {

        submitButton.disabled = true;

    }
}


/* =========================================================
   ENABLE BUTTONS
========================================================= */

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


    if (basicButton) {

        basicButton.disabled = false;

    }

    if (nextButton) {

        nextButton.disabled = false;

    }

    if (previousButton) {

        previousButton.disabled =
            currentQuestion === 0;

    }

    if (submitButton) {

        submitButton.disabled = false;

    }
}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(id) {

    const element =
        document.getElementById(id);

    if (!element) {

        return "";

    }

    return String(
        element.value || ""
    ).trim();
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text) {

    message =
        document.getElementById(
            "message"
        );

    if (!message) {

        return;

    }

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

    if (!message) {

        return;

    }

    message.classList.add(
        "success-message"
    );

    message.textContent =
        text;

    message.style.color =
        "#2e7d32";
}


function clearMessage() {

    const messageElement =
        document.getElementById(
            "message"
        );

    if (messageElement) {

        messageElement.textContent =
            "";

        messageElement.classList.remove(
            "success-message"
        );

    }
}


/* =========================================================
   START
========================================================= */

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
