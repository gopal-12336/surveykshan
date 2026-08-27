console.log("Survey JS Loaded - FINAL FIXED VERSION");

/* =========================================================
   ADMIN
========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let DAILY_LIMIT = 0;

let currentQuestion = 0;

let surveyQuestions = [];

let answers = {
    basic: {},
    questions: {}
};

let surveyStarted = false;

let submitBtn = null;

let message = null;

let dailyLimitLoaded = false;

let firebaseStorageReady = false;


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
   FIREBASE STORAGE
========================================================= */

function loadFirebaseStorageSDK() {

    return new Promise(function(resolve) {

        try {

            if (
                typeof firebase !== "undefined" &&
                firebase.storage &&
                typeof firebase.storage === "function"
            ) {

                try {

                    firebase.storage();

                    firebaseStorageReady = true;

                    console.log(
                        "Firebase Storage Ready"
                    );

                    resolve(true);

                    return;

                }
                catch(error) {

                    console.warn(
                        "Existing Firebase Storage initialization failed:",
                        error
                    );

                }

            }

        }
        catch(error) {

            console.warn(
                "Firebase Storage check failed:",
                error
            );

        }


        const existing =
            document.querySelector(
                'script[data-firebase-storage="true"]'
            );


        if(existing) {

            if(
                firebaseStorageReady
            ) {

                resolve(true);

                return;

            }


            existing.addEventListener(
                "load",
                function() {

                    try {

                        firebase.storage();

                        firebaseStorageReady = true;

                        console.log(
                            "Firebase Storage Loaded"
                        );

                        resolve(true);

                    }
                    catch(error) {

                        console.error(
                            "Storage initialization error:",
                            error
                        );

                        resolve(false);

                    }

                },
                {
                    once:true
                }
            );


            existing.addEventListener(
                "error",
                function() {

                    resolve(false);

                },
                {
                    once:true
                }
            );


            return;

        }


        const script =
            document.createElement(
                "script"
            );


        script.src =
            "https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js";


        script.async =
            false;


        script.setAttribute(
            "data-firebase-storage",
            "true"
        );


        script.onload =
            function() {

                try {

                    firebase.storage();

                    firebaseStorageReady =
                        true;

                    console.log(
                        "Firebase Storage SDK Loaded Successfully"
                    );

                    resolve(true);

                }
                catch(error) {

                    console.error(
                        "Storage initialization error:",
                        error
                    );

                    resolve(false);

                }

            };


        script.onerror =
            function() {

                console.error(
                    "Firebase Storage SDK could not be loaded."
                );

                resolve(false);

            };


        document.head.appendChild(
            script
        );

    });

}


/* =========================================================
   INITIALIZE
========================================================= */

function initializeSurveyPage() {

    console.log(
        "Initializing Survey Page..."
    );


    submitBtn =
        document.getElementById(
            "submitSurvey"
        );


    message =
        document.getElementById(
            "message"
        );


    setupBasicDetails();

    setupQuestionButtons();

    createDailyProgressUI();

    startAuthentication();

}


/* =========================================================
   DAILY PROGRESS UI
========================================================= */

function createDailyProgressUI() {

    if(
        document.getElementById(
            "dailyProgressBox"
        )
    ) {

        return;

    }


    const box =
        document.createElement(
            "div"
        );


    box.id =
        "dailyProgressBox";


    box.style.cssText =
        "background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:15px;margin:15px 0;box-shadow:0 2px 8px rgba(0,0,0,.08);font-family:Arial,sans-serif;";


    const titleRow =
        document.createElement(
            "div"
        );


    titleRow.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:bold;";


    const title =
        document.createElement(
            "span"
        );


    title.textContent =
        "📊 Today's Progress";


    const progressText =
        document.createElement(
            "span"
        );


    progressText.id =
        "dailyProgressText";


    progressText.textContent =
        "0 / --";


    titleRow.append(
        title,
        progressText
    );


    const progressBackground =
        document.createElement(
            "div"
        );


    progressBackground.style.cssText =
        "width:100%;height:12px;background:#eee;border-radius:20px;overflow:hidden;";


    const progressBar =
        document.createElement(
            "div"
        );


    progressBar.id =
        "dailyProgressBar";


    progressBar.style.cssText =
        "width:0%;height:100%;background:#1565c0;transition:width .4s ease;";


    progressBackground.appendChild(
        progressBar
    );


    const remainingText =
        document.createElement(
            "div"
        );


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
        document.querySelector(
            ".survey-box"
        ) ||
        document.querySelector(
            ".container"
        ) ||
        document.body;


    const dailyLimitBox =
        document.getElementById(
            "dailyLimitBox"
        );


    if(dailyLimitBox) {

        dailyLimitBox.insertAdjacentElement(
            "afterend",
            box
        );

    }
    else if(container) {

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

    count =
        Number(count);


    if(
        !Number.isFinite(count) ||
        count < 0
    ) {

        count =
            0;

    }


    const limit =
        Number(
            DAILY_LIMIT
        );


    if(
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


    if(progressText) {

        progressText.textContent =
            count +
            " / " +
            limit;

    }


    if(remainingText) {

        remainingText.textContent =
            remaining <= 0
                ? "🚫 Daily limit reached"
                : "Remaining today: " +
                  remaining;

    }


    if(progressBar) {

        progressBar.style.width =
            percentage +
            "%";


        progressBar.style.background =
            count >= limit
                ? "#c62828"
                : percentage >= 80
                    ? "#ef6c00"
                    : "#1565c0";

    }


    if(todayCount) {

        todayCount.textContent =
            count;

    }


    if(remainingCount) {

        remainingCount.textContent =
            remaining;

    }


    if(
        count >= limit
    ) {

        disableSurveyButtons();

    }

}


/* =========================================================
   LOAD DAILY LIMIT
========================================================= */

function loadDailyLimit() {

    return db
        .collection(
            "settings"
        )
        .doc(
            "config"
        )
        .get()

        .then(function(doc) {

            if(!doc.exists) {

                throw new Error(
                    "Daily limit not configured."
                );

            }


            const value =
                Number(
                    (
                        doc.data() ||
                        {}
                    ).dailyLimit
                );


            if(
                !Number.isFinite(value) ||
                value <= 0
            ) {

                throw new Error(
                    "Invalid daily limit."
                );

            }


            DAILY_LIMIT =
                value;


            dailyLimitLoaded =
                true;


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


            dailyLimitLoaded =
                false;


            DAILY_LIMIT =
                0;


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

                        if(!user) {

                            window.location.replace(
                                "index.html"
                            );

                            return;

                        }


                        if(
                            user.email &&
                            user.email
                                .toLowerCase() ===
                            ADMIN_EMAIL
                                .toLowerCase()
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


                        Promise.all([

                            loadDailyLimit(),

                            loadFirebaseStorageSDK()

                        ])

                        .then(function() {

                            return getTodayCount(
                                user
                            );

                        })

                        .then(function(count) {

                            updateDailyProgress(
                                count
                            );


                            if(
                                count >=
                                DAILY_LIMIT
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

    if(
        !user ||
        !user.email
    ) {

        return Promise.resolve(
            0
        );

    }


    const todayStart =
        new Date();


    todayStart.setHours(
        0,
        0,
        0,
        0
    );


    return db
        .collection(
            "surveys"
        )
        .where(
            "surveyorEmail",
            "==",
            user.email
        )
        .get()

        .then(function(snapshot) {

            let count =
                0;


            snapshot.forEach(
                function(doc) {

                    const date =
                        getFirestoreDate(
                            (
                                doc.data() ||
                                {}
                            ).createdAt
                        );


                    if(
                        date &&
                        date >=
                        todayStart
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

    if(!value) {

        return null;

    }


    try {

        if(
            typeof value.toDate ===
            "function"
        ) {

            return value.toDate();

        }


        if(
            value.seconds !==
            undefined
        ) {

            return new Date(
                value.seconds *
                1000
            );

        }


        const date =
            new Date(
                value
            );


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


/* =========================================================
   LOAD QUESTIONS
========================================================= */

function loadQuestionsFromFirestore() {

    const questionText =
        document.getElementById(
            "questionText"
        );


    if(questionText) {

        questionText.textContent =
            "Loading questions...";

    }


    db.collection(
        "questions"
    )
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
            .collection(
                "questions"
            )
            .get();

    })

    .then(function(snapshot) {

        if(
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

function buildQuestionsFromSnapshot(
    snapshot
) {

    surveyQuestions =
        [];


    snapshot.forEach(
        function(doc) {

            const data =
                doc.data();


            if(
                !data.question ||
                !Array.isArray(
                    data.options
                )
            ) {

                return;

            }


            const options =
                data.options
                    .map(
                        function(option) {

                            return String(
                                option
                            ).trim();

                        }
                    )
                    .filter(
                        function(option) {

                            return option !== "";

                        }
                    );


            if(
                options.length < 2
            ) {

                return;

            }


            surveyQuestions.push({

                id:
                    doc.id,

                question:
                    String(
                        data.question
                    ).trim(),

                type:
                    data.type ===
                    "multiple"
                        ? "multiple"
                        : "single",

                options:
                    options,

                createdAt:
                    data.createdAt ||
                    null

            });

        }
    );


    surveyQuestions.sort(
        function(a,b) {

            const dateA =
                getFirestoreDate(
                    a.createdAt
                );


            const dateB =
                getFirestoreDate(
                    b.createdAt
                );


            if(
                dateA &&
                dateB
            ) {

                return (
                    dateA.getTime() -
                    dateB.getTime()
                );

            }


            if(
                dateA &&
                !dateB
            ) {

                return -1;

            }


            if(
                !dateA &&
                dateB
            ) {

                return 1;

            }


            return 0;

        }
    );


    /*
     * IMPORTANT:
     * Permanent questions ALWAYS LAST
     */

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


    currentQuestion =
        0;


    answers.questions =
        {};


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


    if(!button) {

        return;

    }


    button.addEventListener(
        "click",
        function() {

            clearMessage();


            if(
                !dailyLimitLoaded ||
                DAILY_LIMIT <= 0
            ) {

                showMessage(
                    "Daily limit is still loading. Please wait."
                );

                return;

            }


            const name =
                getValue(
                    "name"
                );


            const mobile =
                getValue(
                    "mobile"
                );


            const age =
                getValue(
                    "age"
                );


            const gender =
                getValue(
                    "gender"
                );


            const village =
                getValue(
                    "village"
                );


            const district =
                getValue(
                    "district"
                );


            const pincode =
                getValue(
                    "pincode"
                );


            if(
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


            if(
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
                Number(
                    age
                );


            if(
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


            if(
                pincode &&
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


            if(!user) {

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


                    if(
                        count >=
                        DAILY_LIMIT
                    ) {

                        disableSurveyButtons();


                        showMessage(
                            "🚫 Daily survey limit reached."
                        );


                        return;

                    }


                    answers.basic = {

                        name:
                            name,

                        mobile:
                            mobile,

                        age:
                            ageNumber,

                        gender:
                            gender,

                        village:
                            village,

                        district:
                            district,

                        pincode:
                            pincode

                    };


                    answers.questions =
                        {};


                    currentQuestion =
                        0;


                    surveyStarted =
                        true;


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


    if(
        !basicStep ||
        !questionStep
    ) {

        console.error(
            "Basic Details Step or Question Step not found."
        );

        return;

    }


    questionStep.style.display =
        "block";


    questionStep.style.position =
        "absolute";


    questionStep.style.left =
        "0";


    questionStep.style.top =
        "0";


    questionStep.style.width =
        "100%";


    questionStep.style.transform =
        "translateX(100%)";


    questionStep.style.opacity =
        "0";


    basicStep.style.position =
        "relative";


    basicStep.style.transform =
        "translateX(0)";


    basicStep.style.opacity =
        "1";


    basicStep.style.transition =
        "transform .45s ease, opacity .45s ease";


    questionStep.style.transition =
        "transform .45s ease, opacity .45s ease";


    void questionStep.offsetWidth;


    basicStep.style.transform =
        "translateX(-100%)";


    basicStep.style.opacity =
        "0";


    questionStep.style.transform =
        "translateX(0)";


    questionStep.style.opacity =
        "1";


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


    if(
        !questionText ||
        !optionsBox
    ) {

        return;

    }


    if(
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


    if(!question) {

        return;

    }


    if(questionNumber) {

        questionNumber.textContent =
            "Question " +
            (currentQuestion + 1) +
            " of " +
            surveyQuestions.length;

    }


    if(
        question.type ===
        "location"
    ) {

        renderLocationQuestion(
            questionText,
            optionsBox
        );

    }
    else if(
        question.type ===
        "photos"
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


    if(previousButton) {

        previousButton.disabled =
            currentQuestion === 0;

    }


    const isLastQuestion =
        currentQuestion ===
        surveyQuestions.length - 1;


    if(nextButton) {

        nextButton.style.display =
            isLastQuestion
                ? "none"
                : "block";

    }


    if(submitButton) {

        submitButton.style.display =
            isLastQuestion
                ? "block"
                : "none";

        submitButton.disabled =
            false;

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


    optionsBox.innerHTML =
        "";


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
                    question.type ===
                    "multiple"
                        ? "checkbox"
                        : "radio";


                input.name =
                    "surveyQuestion_" +
                    question.id;


                input.value =
                    option;


                input.style.marginRight =
                    "10px";


                if(
                    question.type ===
                    "multiple"
                ) {

                    if(
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
                else if(
                    savedAnswer ===
                    option
                ) {

                    input.checked =
                        true;

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


    optionsBox.innerHTML =
        "";


    const box =
        document.createElement(
            "div"
        );


    box.style.cssText =
        "text-align:center;padding:20px;border:1px solid #d7e3ef;border-radius:12px;background:#f8fbff;";


    const text =
        document.createElement(
            "p"
        );


    text.textContent =
        "नीचे दिए गए बटन पर क्लिक करते ही आपकी वर्तमान Live Location प्राप्त की जाएगी।";


    text.style.cssText =
        "font-size:15px;color:#555;";


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "primary";


    button.textContent =
        "📍 मेरी Live Location चुनें";


    const status =
        document.createElement(
            "div"
        );


    status.style.cssText =
        "margin-top:12px;font-weight:bold;color:#555;";


    const saved =
        answers.questions[
            LOCATION_QUESTION.id
        ];


    if(
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

            button.disabled =
                true;


            button.textContent =
                "📍 Location प्राप्त हो रही है...";


            status.textContent =
                "";


            captureCurrentLocation()

                .then(
                    function(locationData) {

                        answers.questions[
                            LOCATION_QUESTION.id
                        ] =
                            locationData;


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


                        button.disabled =
                            false;


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


    optionsBox.appendChild(
        box
    );

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


    optionsBox.innerHTML =
        "";


    const box =
        document.createElement(
            "div"
        );


    box.style.cssText =
        "padding:18px;border:1px solid #d7e3ef;border-radius:12px;background:#f8fbff;";


    const photoDefinitions = [

        {

            id:
                "photoVillage",

            title:
                "1️⃣ गाँव की फोटो",

            description:
                "गाँव / क्षेत्र की सामान्य स्थिति की फोटो",

            capture:
                "environment"

        },

        {

            id:
                "photoProblem",

            title:
                "2️⃣ गाँव की समस्या की फोटो",

            description:
                "गाँव में दिखाई देने वाली प्रमुख समस्या की फोटो",

            capture:
                "environment"

        },

        {

            id:
                "photoPerson",

            title:
                "3️⃣ व्यक्ति की फोटो",

            description:
                "सर्वे से संबंधित व्यक्ति की फोटो",

            capture:
                "environment"

        },

        {

            id:
                "photoSelfie",

            title:
                "4️⃣ Respondent के साथ Selfie",

            description:
                "Respondent के साथ आपकी selfie",

            capture:
                "user"

        }

    ];


    photoDefinitions.forEach(
        function(item) {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.style.cssText =
                "margin-bottom:15px;padding:14px;background:white;border:1px solid #ddd;border-radius:10px;";


            const label =
                document.createElement(
                    "label"
                );


            label.textContent =
                item.title;


            label.style.cssText =
                "display:block;font-weight:bold;margin-bottom:5px;color:#1565c0;";


            const description =
                document.createElement(
                    "div"
                );


            description.textContent =
                item.description;


            description.style.cssText =
                "font-size:13px;color:#666;margin-bottom:8px;";


            const input =
                document.createElement(
                    "input"
                );


            input.type =
                "file";


            input.id =
                item.id;


            input.name =
                item.id;


            input.accept =
                "image/*";


            /*
             * IMPORTANT:
             * Mobile browsers can offer
             * camera option.
             */

            input.setAttribute(
                "capture",
                item.capture
            );


            input.style.cssText =
                "width:100%;padding:8px;border:1px solid #ccd5df;border-radius:8px;background:#fff;";


            const cameraNote =
                document.createElement(
                    "div"
                );


            cameraNote.textContent =
                item.capture === "user"
                    ? "📱 मोबाइल पर यहाँ से कैमरा खोलकर Selfie भी ले सकते हैं।"
                    : "📱 मोबाइल पर यहाँ से कैमरा खोलकर फोटो भी ले सकते हैं।";


            cameraNote.style.cssText =
                "margin-top:6px;font-size:12px;color:#777;";


            const preview =
                document.createElement(
                    "div"
                );


            preview.style.cssText =
                "margin-top:8px;font-size:13px;color:#2e7d32;";


            input.addEventListener(
                "change",
                function() {

                    if(
                        input.files &&
                        input.files.length
                    ) {

                        const file =
                            input.files[0];


                        preview.textContent =
                            "✅ Selected: " +
                            file.name;

                    }
                    else {

                        preview.textContent =
                            "";

                    }

                }
            );


            wrapper.append(
                label,
                description,
                input,
                cameraNote,
                preview
            );


            box.appendChild(
                wrapper
            );

        }
    );


    const note =
        document.createElement(
            "div"
        );


    note.textContent =
        "⚠️ चारों फोटो आवश्यक हैं। सभी फोटो चुनने के बाद Submit करें।";


    note.style.cssText =
        "font-weight:bold;color:#c62828;margin-top:5px;";


    box.appendChild(
        note
    );


    optionsBox.appendChild(
        box
    );

}


/* =========================================================
   CURRENT ANSWER
========================================================= */

function getCurrentQuestionAnswer() {

    if(
        surveyQuestions.length === 0
    ) {

        return null;

    }


    const question =
        surveyQuestions[
            currentQuestion
        ];


    if(!question) {

        return null;

    }


    if(
        question.type ===
        "location"
    ) {

        return answers.questions[
            LOCATION_QUESTION.id
        ] || null;

    }


    if(
        question.type ===
        "photos"
    ) {

        const photoIds = [

            "photoVillage",
            "photoProblem",
            "photoPerson",
            "photoSelfie"

        ];


        const files = [];


        photoIds.forEach(
            function(id) {

                const input =
                    document.getElementById(
                        id
                    );


                if(
                    input &&
                    input.files &&
                    input.files.length > 0
                ) {

                    files.push({

                        id:
                            id,

                        file:
                            input.files[0]

                    });

                }

            }
        );


        return files;

    }


    const inputs =
        document.querySelectorAll(
            'input[name="surveyQuestion_' +
            question.id +
            '"]'
        );


    if(
        question.type ===
        "multiple"
    ) {

        const selected = [];


        inputs.forEach(
            function(input) {

                if(input.checked) {

                    selected.push(
                        input.value
                    );

                }

            }
        );


        return selected;

    }


    let selected =
        null;


    inputs.forEach(
        function(input) {

            if(input.checked) {

                selected =
                    input.value;

            }

        }
    );


    return selected;

}


/* =========================================================
   SAVE CURRENT ANSWER
========================================================= */

function saveCurrentQuestionAnswer() {

    const question =
        surveyQuestions[
            currentQuestion
        ];


    if(!question) {

        return false;

    }


    const answer =
        getCurrentQuestionAnswer();


    if(
        question.type ===
        "location"
    ) {

        if(
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
        ] =
            answer;


        return true;

    }


    if(
        question.type ===
        "photos"
    ) {

        if(
            !Array.isArray(answer) ||
            answer.length !== 4
        ) {

            showMessage(
                "📷 Please select all 4 required photos."
            );


            return false;

        }


        const requiredIds = [

            "photoVillage",
            "photoProblem",
            "photoPerson",
            "photoSelfie"

        ];


        for(
            let i = 0;
            i < requiredIds.length;
            i++
        ) {

            const input =
                document.getElementById(
                    requiredIds[i]
                );


            if(
                !input ||
                !input.files ||
                input.files.length === 0
            ) {

                showMessage(
                    "📷 Please select all 4 required photos."
                );


                return false;

            }

        }


        /*
         * IMPORTANT:
         * File objects are kept only
         * temporarily in browser memory.
         * They will NOT be saved to Firestore.
         */

        answers.questions[
            PHOTO_QUESTION.id
        ] =
            answer;


        return true;

    }


    if(
        question.type ===
        "multiple"
    ) {

        if(
            !Array.isArray(answer) ||
            answer.length === 0
        ) {

            showMessage(
                "Please select at least one option."
            );


            return false;

        }

    }
    else if(!answer) {

        showMessage(
            "Please select an option."
        );


        return false;

    }


    answers.questions[
        question.id
    ] =
        answer;


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


    if(nextButton) {

        nextButton.addEventListener(
            "click",
            function() {

                clearMessage();


                if(
                    !saveCurrentQuestionAnswer()
                ) {

                    return;

                }


                if(
                    currentQuestion <
                    surveyQuestions.length - 1
                ) {

                    currentQuestion++;


                    renderQuestion();

                }

            }
        );

    }


    if(previousButton) {

        previousButton.addEventListener(
            "click",
            function() {

                clearMessage();


                const question =
                    surveyQuestions[
                        currentQuestion
                    ];


                if(question) {

                    if(
                        question.type !==
                        "location" &&
                        question.type !==
                        "photos"
                    ) {

                        const answer =
                            getCurrentQuestionAnswer();


                        if(
                            question.type ===
                            "multiple"
                        ) {

                            if(
                                Array.isArray(
                                    answer
                                ) &&
                                answer.length > 0
                            ) {

                                answers.questions[
                                    question.id
                                ] =
                                    answer;

                            }

                        }
                        else if(answer) {

                            answers.questions[
                                question.id
                            ] =
                                answer;

                        }

                    }

                }


                if(
                    currentQuestion > 0
                ) {

                    currentQuestion--;


                    renderQuestion();

                }

            }
        );

    }


    if(submitButton) {

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
        function(resolve,reject) {

            if(
                !navigator.geolocation
            ) {

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
                            new Date()
                                .toISOString()

                    });

                },

                function(error) {

                    let messageText =
                        "Unable to capture live location. Please allow location permission.";


                    if(
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

                    enableHighAccuracy:
                        true,

                    timeout:
                        15000,

                    maximumAge:
                        0

                }

            );

        }
    );

}


/* =========================================================
   GET PHOTO FILES
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

            const input =
                document.getElementById(
                    id
                );


            if(
                input &&
                input.files &&
                input.files.length > 0
            ) {

                files.push({

                    id:
                        id,

                    file:
                        input.files[0]

                });

            }

        }
    );


    return files;

}


/* =========================================================
   UPLOAD PHOTOS
========================================================= */

function uploadSurveyPhotos(
    surveyId,
    user
) {

    const photoFiles =
        getRequiredPhotoFiles();


    if(
        photoFiles.length !== 4
    ) {

        return Promise.reject(
            new Error(
                "All 4 photos are required."
            )
        );

    }


    return loadFirebaseStorageSDK()

        .then(function(ready) {

            if(!ready) {

                throw new Error(
                    "Firebase Storage is not available. Please enable Firebase Storage."
                );

            }


            const storage =
                firebase.storage();


            const uploads = {};


            photoFiles.forEach(
                function(item,index) {

                    const file =
                        item.file;


                    const safeName =
                        String(
                            file.name ||
                            "photo"
                        )
                        .replace(
                            /[^a-zA-Z0-9._-]/g,
                            "_"
                        );


                    const storagePath =
                        "surveyPhotos/" +
                        surveyId +
                        "/photo_" +
                        (index + 1) +
                        "_" +
                        Date.now() +
                        "_" +
                        safeName;


                    const ref =
                        storage.ref(
                            storagePath
                        );


                    uploads[
                        "photo" +
                        (index + 1)
                    ] =
                        ref
                            .put(file)

                            .then(
                                function(snapshot) {

                                    return snapshot.ref
                                        .getDownloadURL();

                                }
                            )

                            .then(
                                function(url) {

                                    return {

                                        url:
                                            url,

                                        name:
                                            file.name,

                                        type:
                                            file.type,

                                        size:
                                            file.size,

                                        storagePath:
                                            storagePath

                                    };

                                }
                            );

                }
            );


            return Promise.all(

                Object.keys(
                    uploads
                )
                .map(
                    function(key) {

                        return uploads[key]
                            .then(
                                function(data) {

                                    return {

                                        key:
                                            key,

                                        data:
                                            data

                                    };

                                }
                            );

                    }
                )

            );

        })

        .then(function(results) {

            const photos =
                {};


            results.forEach(
                function(result) {

                    photos[
                        result.key
                    ] =
                        result.data;

                }
            );


            return photos;

        });

}


/* =========================================================
   CLEAN ANSWERS FOR FIRESTORE
   VERY IMPORTANT FIX
========================================================= */

function getCleanFirestoreAnswers() {

    const cleanAnswers =
        {};


    const source =
        answers.questions ||
        {};


    Object.keys(
        source
    )
    .forEach(
        function(key) {

            /*
             * NEVER SAVE PERMANENT QUESTIONS
             * TO FIRESTORE answers FIELD.
             *
             * Firestore rejects field names
             * beginning AND ending with "__".
             */

            if(
                key ===
                LOCATION_QUESTION.id
            ) {

                return;

            }


            if(
                key ===
                PHOTO_QUESTION.id
            ) {

                return;

            }


            /*
             * Extra safety:
             * Ignore any field beginning
             * and ending with "__".
             */

            if(
                key.startsWith("__") &&
                key.endsWith("__")
            ) {

                return;

            }


            const value =
                source[key];


            /*
             * Never save File objects
             * to Firestore.
             */

            if(
                value instanceof File
            ) {

                return;

            }


            if(
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


                if(containsFile) {

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
        "Submit Survey clicked..."
    );


    if(
        !dailyLimitLoaded ||
        DAILY_LIMIT <= 0
    ) {

        showMessage(
            "Daily limit is not loaded yet."
        );


        return;

    }


    if(!surveyStarted) {

        showMessage(
            "Please start the survey first."
        );


        return;

    }


    /*
     * FINAL PHOTO VALIDATION
     */

    if(
        surveyQuestions[
            currentQuestion
        ] &&
        surveyQuestions[
            currentQuestion
        ].type ===
        "photos"
    ) {

        if(
            !saveCurrentQuestionAnswer()
        ) {

            console.warn(
                "Photo validation failed."
            );


            return;

        }

    }


    /*
     * SAVE FINAL LOCATION IF
     * USER IS ON LOCATION QUESTION
     */

    if(
        surveyQuestions[
            currentQuestion
        ] &&
        surveyQuestions[
            currentQuestion
        ].type ===
        "location"
    ) {

        if(
            !saveCurrentQuestionAnswer()
        ) {

            return;

        }

    }


    /*
     * VALIDATE ALL QUESTIONS
     */

    for(
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


        if(
            question.type ===
            "location"
        ) {

            if(
                !answer ||
                answer.latitude === undefined ||
                answer.longitude === undefined
            ) {

                currentQuestion =
                    i;


                renderQuestion();


                showMessage(
                    "📍 Please capture live location before submitting."
                );


                return;

            }


            continue;

        }


        if(
            question.type ===
            "photos"
        ) {

            const photoFiles =
                getRequiredPhotoFiles();


            if(
                photoFiles.length !== 4
            ) {

                currentQuestion =
                    i;


                renderQuestion();


                showMessage(
                    "📷 Please upload all 4 required photos before submitting."
                );


                return;

            }


            continue;

        }


        if(
            question.type ===
            "multiple"
        ) {

            if(
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

            if(!answer) {

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


    if(!user) {

        showMessage(
            "Session expired. Please login again."
        );


        return;

    }


    const button =
        document.getElementById(
            "submitSurvey"
        );


    if(button) {

        button.disabled =
            true;


        button.textContent =
            "Saving Survey...";

    }


    console.log(
        "Checking daily survey count..."
    );


    /*
     * CHECK DAILY LIMIT
     */

    getTodayCount(user)

        .then(function(count) {

            updateDailyProgress(
                count
            );


            if(
                count >=
                DAILY_LIMIT
            ) {

                throw new Error(
                    "Daily survey limit reached."
                );

            }


            /*
             * GET SAVED LOCATION
             */

            const savedLocation =
                answers.questions[
                    LOCATION_QUESTION.id
                ];


            if(
                savedLocation &&
                savedLocation.latitude !== undefined &&
                savedLocation.longitude !== undefined
            ) {

                console.log(
                    "Using saved survey location:",
                    savedLocation
                );


                return savedLocation;

            }


            console.log(
                "Capturing location automatically..."
            );


            return captureCurrentLocation();

        })


        /*
         * SAVE SURVEY TO FIRESTORE
         */

        .then(function(locationData) {

            answers.questions[
                LOCATION_QUESTION.id
            ] =
                locationData;


            /*
             * IMPORTANT FIX:
             * Only clean normal answers
             * are sent to Firestore.
             */

            const cleanAnswers =
                getCleanFirestoreAnswers();


            console.log(
                "Clean answers prepared:",
                cleanAnswers
            );


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

                district:
                    answers.basic.district ||
                    "",

                pincode:
                    answers.basic.pincode ||
                    "",

                /*
                 * ONLY NORMAL QUESTIONS
                 * ARE SAVED HERE.
                 */

                answers:
                    cleanAnswers,

                surveyorEmail:
                    user.email ||
                    "",

                surveyorUid:
                    user.uid ||
                    "",

                createdBy:
                    user.email ||
                    "",

                createdAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp(),

                /*
                 * LOCATION IS SAVED
                 * SEPARATELY.
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
                        .Timestamp
                        .fromDate(
                            new Date()
                        )

            };


            console.log(
                "Saving survey data to Firestore..."
            );


            return db
                .collection(
                    "surveys"
                )
                .add(
                    surveyData
                );

        })


        /*
         * UPLOAD PHOTOS
         */

        .then(function(docRef) {

            console.log(
                "Survey saved:",
                docRef.id
            );


            if(button) {

                button.textContent =
                    "Uploading Photos...";

            }


            console.log(
                "Uploading 4 survey photos..."
            );


            return uploadSurveyPhotos(
                docRef.id,
                user
            )

            .then(function(photoData) {

                console.log(
                    "Photos uploaded:",
                    photoData
                );


                return db
                    .collection(
                        "surveys"
                    )
                    .doc(
                        docRef.id
                    )
                    .update({

                        photos:
                            photoData,

                        photoCount:
                            Object.keys(
                                photoData
                            ).length,

                        photosUploadedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    })

                    .then(function() {

                        return docRef;

                    });

            });

        })


        /*
         * COMPLETE
         */

        .then(function(docRef) {

            console.log(
                "Survey completed:",
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


            showSuccessMessage(
                "✅ Survey submitted successfully!"
            );


            console.log(
                "Survey saved successfully."
            );


            /*
             * RESET AND OPEN
             * NEW SURVEY
             */

            resetSurveyForm();


            if(
                newCount >=
                DAILY_LIMIT
            ) {

                disableSurveyButtons();


                showMessage(
                    "✅ Survey saved. Daily limit reached."
                );

            }

        })


        .catch(function(error) {

            console.error(
                "Survey submission error:",
                error
            );


            /*
             * IMPORTANT:
             * Show actual Firebase error
             * instead of silently stopping.
             */

            showMessage(
                "❌ Survey could not be submitted: " +
                (
                    error &&
                    error.message
                        ? error.message
                        : String(error)
                )
            );


            if(button) {

                button.disabled =
                    false;


                button.textContent =
                    "Submit Survey";

            }

        });

}


/* =========================================================
   RESET SURVEY
========================================================= */

function resetSurveyForm() {

    console.log(
        "Resetting survey form..."
    );


    answers = {

        basic:
            {},

        questions:
            {}

    };


    currentQuestion =
        0;


    surveyStarted =
        false;


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
                document.getElementById(
                    id
                );


            if(element) {

                element.value =
                    "";

            }

        }
    );


    /*
     * REMOVE ALL FILES
     */

    document
        .querySelectorAll(
            'input[type="file"]'
        )
        .forEach(
            function(input) {

                input.value =
                    "";

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


    /*
     * SHOW BASIC FORM
     */

    if(basicStep) {

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


    /*
     * HIDE QUESTIONS
     */

    if(questionStep) {

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


    if(button) {

        button.disabled =
            false;


        button.textContent =
            "Submit Survey";


        button.style.display =
            "none";

    }


    const nextButton =
        document.getElementById(
            "nextButton"
        );


    if(nextButton) {

        nextButton.style.display =
            "block";


        nextButton.disabled =
            false;

    }


    const previousButton =
        document.getElementById(
            "previousButton"
        );


    if(previousButton) {

        previousButton.disabled =
            true;

    }


    /*
     * REFRESH DAILY COUNT
     */

    const user =
        firebase.auth()
            .currentUser;


    if(user) {

        getTodayCount(user)

            .then(function(count) {

                updateDailyProgress(
                    count
                );


                if(
                    count <
                    DAILY_LIMIT
                ) {

                    enableSurveyButtons();

                }

            });

    }


    console.log(
        "Survey form reset successfully. Ready for next survey."
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


    if(basicButton) {

        basicButton.disabled =
            true;

    }


    if(nextButton) {

        nextButton.disabled =
            true;

    }


    if(previousButton) {

        previousButton.disabled =
            true;

    }


    if(submitButton) {

        submitButton.disabled =
            true;

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


    if(basicButton) {

        basicButton.disabled =
            false;

    }


    if(nextButton) {

        nextButton.disabled =
            false;

    }


    if(previousButton) {

        previousButton.disabled =
            currentQuestion === 0;

    }


    if(submitButton) {

        submitButton.disabled =
            false;

    }

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    if(!element) {

        return "";

    }


    return String(
        element.value ||
        ""
    ).trim();

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text) {

    message =
        document.getElementById(
            "message"
        );


    if(!message) {

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


    if(!message) {

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


    if(messageElement) {

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

if(
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
