```javascript
console.log("Survey JS Loaded");

const ADMIN_EMAIL =
    "goswamivinod2305@gmail.com";

let DAILY_LIMIT = 20;

const submitBtn =
    document.getElementById("submitSurvey");

const message =
    document.getElementById("message");


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


    const box =
        document.createElement("div");

    box.id =
        "dailyProgressBox";


    box.innerHTML = `

        <div style="
            background:#ffffff;
            border:1px solid #e0e0e0;
            border-radius:12px;
            padding:15px;
            margin:15px 0;
            box-shadow:0 2px 8px rgba(0,0,0,.08);
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                margin-bottom:8px;
                font-size:15px;
                font-weight:bold;
            ">

                <span>
                    📊 Today's Progress
                </span>

                <span id="dailyProgressText">
                    0 / 20
                </span>

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
                        border-radius:20px;
                        transition:width .4s ease;
                    ">
                </div>

            </div>


            <div
                id="dailyRemainingText"
                style="
                    margin-top:8px;
                    font-size:13px;
                    color:#555;
                "
            >
                Remaining today: 20
            </div>

        </div>

    `;


    /*
        Insert progress box before
        the login/form box if possible.
    */

    const formBox =
        document.querySelector(
            ".login-box"
        );


    if (formBox) {

        formBox.parentNode.insertBefore(
            box,
            formBox
        );

    }
    else {

        document.body.insertBefore(
            box,
            document.body.firstChild
        );

    }

}


// =====================================
// UPDATE DAILY PROGRESS UI
// =====================================

function updateDailyProgress(
    todayCount
) {

    createProgressUI();


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


    const limit =
        Number(DAILY_LIMIT) || 20;


    const count =
        Number(todayCount) || 0;


    const remaining =
        Math.max(
            limit - count,
            0
        );


    const percentage =
        limit > 0

            ? Math.min(
                (count / limit) * 100,
                100
            )

            : 100;


    progressText.textContent =
        count +
        " / " +
        limit;


    remainingText.textContent =
        remaining > 0

            ? "Remaining today: " +
              remaining

            : "Daily limit reached";


    progressBar.style.width =
        percentage + "%";


    if (count >= limit) {

        progressBar.style.background =
            "#c62828";

        progressText.style.color =
            "#c62828";

        remainingText.style.color =
            "#c62828";

    }

    else if (
        percentage >= 80
    ) {

        progressBar.style.background =
            "#ef6c00";

        progressText.style.color =
            "#ef6c00";

        remainingText.style.color =
            "#555";

    }

    else {

        progressBar.style.background =
            "#1565c0";

        progressText.style.color =
            "#1565c0";

        remainingText.style.color =
            "#555";

    }

}


// =====================================
// LOAD DAILY LIMIT FROM FIRESTORE
// =====================================

function loadDailyLimit() {

    return db.collection("settings")
        .doc("config")
        .get()

        .then(function(doc) {

            if (
                doc.exists &&
                doc.data().dailyLimit !==
                undefined
            ) {

                const newLimit =
                    Number(
                        doc.data().dailyLimit
                    );


                if (
                    Number.isFinite(
                        newLimit
                    ) &&
                    newLimit > 0
                ) {

                    DAILY_LIMIT =
                        newLimit;

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


            // Default limit
            DAILY_LIMIT = 20;

        });

}


// =====================================
// AUTH
// =====================================

firebase.auth().setPersistence(
    firebase.auth.Auth.Persistence.SESSION
)

.then(function() {

    firebase.auth().onAuthStateChanged(
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
                user.email.toLowerCase() ===
                ADMIN_EMAIL.toLowerCase()
            ) {

                window.location.replace(
                    "admin.html"
                );

                return;

            }


            console.log(
                "Surveyor:",
                user.email
            );


            // Create progress UI
            createProgressUI();


            // Load limit first
            loadDailyLimit()

                .then(function() {

                    checkSurveyorStatus(
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


// =====================================
// CHECK SURVEYOR STATUS
// =====================================

function checkSurveyorStatus(user) {

    db.collection("surveyors")
        .doc(user.email)
        .get()

        .then(function(doc) {

            if (!doc.exists) {

                showMessage(
                    "Surveyor account not registered."
                );


                if (submitBtn) {

                    submitBtn.disabled =
                        true;

                }

                return;

            }


            const data =
                doc.data();


            if (
                data.enabled !== true
            ) {

                showMessage(
                    "Your surveyor account is disabled by Admin."
                );


                if (submitBtn) {

                    submitBtn.disabled =
                        true;

                }

                return;

            }


            checkDailyLimit(user);

        })

        .catch(function(error) {

            console.error(
                "Surveyor Status Error:",
                error
            );


            showMessage(
                "Unable to check account status."
            );

        });

}


// =====================================
// GET TODAY COUNT
// =====================================

function getTodayCount(user) {

    const todayStart =
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

            let todayCount = 0;


            snapshot.forEach(function(doc) {

                const data =
                    doc.data();


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

                    else if (
                        data.createdAt.seconds
                    ) {

                        date =
                            new Date(
                                data.createdAt.seconds *
                                1000
                            );

                    }

                }

                catch (error) {

                    return;

                }


                if (
                    date &&
                    date >= todayStart
                ) {

                    todayCount++;

                }

            });


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


            // Update progress
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


            showMessage(
                "Unable to check today's survey count."
            );

        });

}


// =====================================
// SUBMIT SURVEY
// =====================================

if (submitBtn) {

    submitBtn.addEventListener(
        "click",
        function() {

            const user =
                firebase.auth().currentUser;


            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );


                setTimeout(function() {

                    window.location.replace(
                        "index.html"
                    );

                }, 1000);


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


            const name =
                document.getElementById("name")
                    .value.trim();


            const mobile =
                document.getElementById("mobile")
                    .value.trim();


            const age =
                document.getElementById("age")
                    .value.trim();


            const gender =
                document.getElementById("gender")
                    .value;


            const village =
                document.getElementById("village")
                    .value.trim();


            const assembly =
                document.getElementById("assembly")
                    .value.trim();


            const party =
                document.getElementById("party")
                    .value;


            const candidate =
                document.getElementById("candidate")
                    .value.trim();


            const feedback =
                document.getElementById("feedback")
                    .value.trim();


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


            // Check account again
            db.collection("surveyors")
                .doc(user.email)
                .get()

                .then(function(surveyorDoc) {

                    if (
                        !surveyorDoc.exists
                    ) {

                        throw new Error(
                            "Surveyor account not registered."
                        );

                    }


                    const surveyorData =
                        surveyorDoc.data();


                    if (
                        surveyorData.enabled !==
                        true
                    ) {

                        throw new Error(
                            "Your surveyor account is disabled."
                        );

                    }


                    // Reload latest limit
                    return loadDailyLimit();

                })

                .then(function() {

                    return getTodayCount(
                        user
                    );

                })

                .then(function(todayCount) {

                    // Update progress before submit
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


                    return db.collection("surveys")
                        .add({

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


                    document.getElementById(
                        "name"
                    ).value = "";


                    document.getElementById(
                        "mobile"
                    ).value = "";


                    document.getElementById(
                        "age"
                    ).value = "";


                    document.getElementById(
                        "gender"
                    ).value = "";


                    document.getElementById(
                        "village"
                    ).value = "";


                    document.getElementById(
                        "assembly"
                    ).value = "";


                    document.getElementById(
                        "party"
                    ).value = "";


                    document.getElementById(
                        "candidate"
                    ).value = "";


                    document.getElementById(
                        "feedback"
                    ).value = "";


                    /*
                        Get fresh count immediately
                        after successful submission.
                    */

                    return loadDailyLimit()

                        .then(function() {

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

                            }

                            else {

                                submitBtn.disabled =
                                    false;

                                submitBtn.textContent =
                                    "Submit Survey";

                            }

                        });

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
                        Refresh progress even
                        when submission fails.
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
    success = false
) {

    if (!message) return;


    message.textContent =
        text;


    message.style.color =
        success
            ? "green"
            : "red";

}
```
