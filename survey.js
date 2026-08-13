```javascript
console.log("Survey JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 20;

let submitBtn = null;
let message = null;


// =====================================
// INITIALIZE
// =====================================

function initializeSurveyPage() {

    submitBtn =
        document.getElementById("submitSurvey");

    message =
        document.getElementById("message");

    createProgressUI();

    startAuthentication();
}


// =====================================
// DAILY PROGRESS UI
// =====================================

function createProgressUI() {

    if (
        document.getElementById(
            "dailyProgressBox"
        )
    ) {
        return;
    }


    var box =
        document.createElement("div");

    box.id =
        "dailyProgressBox";


    box.style.backgroundColor =
        "#ffffff";

    box.style.border =
        "1px solid #e0e0e0";

    box.style.borderRadius =
        "12px";

    box.style.padding =
        "15px";

    box.style.margin =
        "15px 0";

    box.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.08)";


    // TITLE ROW

    var titleRow =
        document.createElement("div");

    titleRow.style.display =
        "flex";

    titleRow.style.justifyContent =
        "space-between";

    titleRow.style.alignItems =
        "center";

    titleRow.style.marginBottom =
        "8px";

    titleRow.style.fontSize =
        "15px";

    titleRow.style.fontWeight =
        "bold";


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

    titleRow.appendChild(
        progressText
    );


    // PROGRESS BACKGROUND

    var progressBackground =
        document.createElement("div");

    progressBackground.style.width =
        "100%";

    progressBackground.style.height =
        "12px";

    progressBackground.style.backgroundColor =
        "#eeeeee";

    progressBackground.style.borderRadius =
        "20px";

    progressBackground.style.overflow =
        "hidden";


    // PROGRESS BAR

    var progressBar =
        document.createElement("div");

    progressBar.id =
        "dailyProgressBar";

    progressBar.style.width =
        "0%";

    progressBar.style.height =
        "100%";

    progressBar.style.backgroundColor =
        "#1565c0";

    progressBar.style.borderRadius =
        "20px";

    progressBar.style.transition =
        "width 0.4s ease";


    progressBackground.appendChild(
        progressBar
    );


    // REMAINING TEXT

    var remainingText =
        document.createElement("div");

    remainingText.id =
        "dailyRemainingText";

    remainingText.textContent =
        "Remaining today: 20";

    remainingText.style.marginTop =
        "8px";

    remainingText.style.fontSize =
        "13px";

    remainingText.style.color =
        "#555555";


    // ADD EVERYTHING

    box.appendChild(titleRow);

    box.appendChild(
        progressBackground
    );

    box.appendChild(
        remainingText
    );


    // INSERT INTO PAGE

    var formBox =
        document.querySelector(
            ".login-box"
        );


    if (formBox) {

        formBox.parentNode.insertBefore(
            box,
            formBox
        );

    } else {

        var firstChild =
            document.body.firstChild;

        document.body.insertBefore(
            box,
            firstChild
        );
    }
}


// =====================================
// UPDATE DAILY PROGRESS
// =====================================

function updateDailyProgress(
    todayCount
) {

    createProgressUI();


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


    var percentage = 0;


    if (limit > 0) {

        percentage =
            Math.min(
                (count / limit) * 100,
                100
            );
    }


    progressText.textContent =
        count +
        " / " +
        limit;


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

    } else if (
        percentage >= 80
    ) {

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


// =====================================
// LOAD DAILY LIMIT
// =====================================

function loadDailyLimit() {

    return db.collection("settings")
        .doc("config")
        .get()

        .then(function(doc) {

            if (
                doc.exists
            ) {

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


            /*
             * Keep current value if
             * Firestore read fails.
             */

            if (
                !DAILY_LIMIT ||
                DAILY_LIMIT <= 0
            ) {

                DAILY_LIMIT = 20;
            }
        });
}


// =====================================
// AUTHENTICATION
// =====================================

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


                        // ADMIN

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


// =====================================
// GET TODAY'S SURVEY COUNT
// =====================================

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


                    if (
                        !data.createdAt
                    ) {

                        return;
                    }


                    var date =
                        null;


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
                            data.createdAt
                                .seconds
                        ) {

                            date =
                                new Date(
                                    data.createdAt
                                        .seconds *
                                    1000
                                );
                        }

                    } catch (
                        error
                    ) {

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


// =====================================
// CHECK DAILY LIMIT
// =====================================

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


                if (submitBtn) {

                    submitBtn.disabled =
                        true;

                    submitBtn.textContent =
                        "Daily Limit Reached";
                }


                return;
            }


            if (submitBtn) {

                submitBtn.disabled =
                    false;

                submitBtn.textContent =
                    "Submit Survey";
            }


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


            /*
             * Do not permanently disable
             * the submit button if the
             * count check fails.
             */

            if (submitBtn) {

                submitBtn.disabled =
                    false;

                submitBtn.textContent =
                    "Submit Survey";
            }


            showMessage(
                "Unable to check today's survey count."
            );

        });
}


// =====================================
// SUBMIT SURVEY
// =====================================

function setupSubmitButton() {

    if (!submitBtn) {

        console.error(
            "Submit button not found."
        );

        return;
    }


    submitBtn.addEventListener(
        "click",
        function() {

            var user =
                firebase.auth()
                    .currentUser;


            // LOGIN CHECK

            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );


                setTimeout(
                    function() {

                        window.location.replace(
                            "index.html"
                        );

                    },
                    1000
                );


                return;
            }


            // ADMIN CHECK

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


            // =================================
            // GET FORM VALUES
            // =================================

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


            var feedback =
                document.getElementById(
                    "feedback"
                ).value.trim();


            // =================================
            // REQUIRED FIELD CHECK
            // =================================

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
                    "Please fill all required fields."
                );

                return;
            }


            submitBtn.disabled =
                true;

            submitBtn.textContent =
                "Checking...";


            // =================================
            // LOAD LATEST LIMIT
            // =================================

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


                    // =================================
                    // SAVE SURVEY
                    // =================================

                    return db.collection(
                        "surveys"
                    ).add({

                        name:
                            name,

                        mobile:
                            mobile,

                        age:
                            age,

                        gender:
                            gender,

                        village:
                            village,

                        assembly:
                            assembly,

                        party:
                            party,

                        candidate:
                            candidate,

                        feedback:
                            feedback,

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
                        "Survey submitted successfully!",
                        true
                    );


                    // =================================
                    // CLEAR FORM
                    // =================================

                    var nameInput =
                        document.getElementById(
                            "name"
                        );

                    var mobileInput =
                        document.getElementById(
                            "mobile"
                        );

                    var ageInput =
                        document.getElementById(
                            "age"
                        );

                    var genderInput =
                        document.getElementById(
                            "gender"
                        );

                    var villageInput =
                        document.getElementById(
                            "village"
                        );

                    var assemblyInput =
                        document.getElementById(
                            "assembly"
                        );

                    var partyInput =
                        document.getElementById(
                            "party"
                        );

                    var candidateInput =
                        document.getElementById(
                            "candidate"
                        );

                    var feedbackInput =
                        document.getElementById(
                            "feedback"
                        );


                    if (nameInput) {
                        nameInput.value = "";
                    }

                    if (mobileInput) {
                        mobileInput.value = "";
                    }

                    if (ageInput) {
                        ageInput.value = "";
                    }

                    if (genderInput) {
                        genderInput.value = "";
                    }

                    if (villageInput) {
                        villageInput.value = "";
                    }

                    if (assemblyInput) {
                        assemblyInput.value = "";
                    }

                    if (partyInput) {
                        partyInput.value = "";
                    }

                    if (candidateInput) {
                        candidateInput.value = "";
                    }

                    if (feedbackInput) {
                        feedbackInput.value = "";
                    }


                    // =================================
                    // REFRESH COUNT
                    // =================================

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

                        submitBtn.disabled =
                            true;

                        submitBtn.textContent =
                            "Daily Limit Reached";


                        showMessage(
                            "Daily limit reached: " +
                            newCount +
                            " / " +
                            DAILY_LIMIT,
                            true
                        );

                    } else {

                        submitBtn.disabled =
                            false;

                        submitBtn.textContent =
                            "Submit Survey";
                    }

                })

                .catch(function(error) {

                    console.error(
                        "Survey Error:",
                        error
                    );


                    showMessage(
                        error.message ||
                        "Survey submit failed."
                    );


                    submitBtn.disabled =
                        false;

                    submitBtn.textContent =
                        "Submit Survey";


                    /*
                     * Refresh progress.
                     */

                    checkDailyLimit(
                        user
                    );

                });

        }
    );
}


// =====================================
// MESSAGE
// =====================================

function showMessage(
    text,
    success
) {

    if (!message) {
        return;
    }


    message.textContent =
        text;


    if (success === true) {

        message.style.color =
            "green";

    } else {

        message.style.color =
            "red";
    }
}


// =====================================
// START
// =====================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            initializeSurveyPage();

            setupSubmitButton();

        }
    );

} else {

    initializeSurveyPage();

    setupSubmitButton();
}
```
