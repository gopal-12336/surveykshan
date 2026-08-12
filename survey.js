console.log("Survey JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";
const DAILY_LIMIT = 20;

const submitBtn = document.getElementById("submitSurvey");
const message = document.getElementById("message");


// =====================================
// AUTH + SURVEYOR STATUS
// =====================================

firebase.auth().setPersistence(
    firebase.auth.Auth.Persistence.SESSION
)
.then(function () {

    firebase.auth().onAuthStateChanged(function (user) {

        if (!user) {
            window.location.replace("index.html");
            return;
        }

        // ADMIN
        if (
            user.email &&
            user.email.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
        ) {
            window.location.replace("admin.html");
            return;
        }

        console.log("Surveyor:", user.email);

        checkSurveyorStatus(user);

    });

})
.catch(function (error) {

    console.error(
        "Auth Persistence Error:",
        error
    );

});


// =====================================
// CHECK SURVEYOR ENABLED / DISABLED
// =====================================

function checkSurveyorStatus(user) {

    db.collection("surveyors")
        .doc(user.email)
        .get()

        .then(function (doc) {

            if (!doc.exists) {

                showMessage(
                    "Surveyor account not registered."
                );

                if (submitBtn) {
                    submitBtn.disabled = true;
                }

                return;
            }

            const data = doc.data();

            if (data.enabled !== true) {

                showMessage(
                    "Your surveyor account is disabled by Admin."
                );

                if (submitBtn) {
                    submitBtn.disabled = true;
                }

                return;
            }

            console.log(
                "Surveyor account active."
            );

            checkDailyLimit(user);

        })

        .catch(function (error) {

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
// CHECK DAILY LIMIT
// =====================================

function checkDailyLimit(user) {

    const todayStart =
        new Date();

    todayStart.setHours(
        0, 0, 0, 0
    );


    db.collection("surveys")
        .where(
            "surveyorEmail",
            "==",
            user.email
        )
        .get()

        .then(function (snapshot) {

            let todayCount = 0;


            snapshot.forEach(function (doc) {

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


            console.log(
                "Today's Surveys:",
                todayCount
            );


            if (
                todayCount >= DAILY_LIMIT
            ) {

                showMessage(
                    "Daily survey limit of " +
                    DAILY_LIMIT +
                    " reached."
                );

                if (submitBtn) {
                    submitBtn.disabled = true;
                }

                return;
            }


            if (submitBtn) {
                submitBtn.disabled = false;
            }


            showMessage(
                "Today's Surveys: " +
                todayCount +
                " / " +
                DAILY_LIMIT,
                true
            );

        })

        .catch(function (error) {

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
        function () {

            const user =
                firebase.auth().currentUser;


            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );

                setTimeout(function () {

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


            submitBtn.disabled = true;

            submitBtn.textContent =
                "Checking limit...";


            // Check status + today's count again
            db.collection("surveyors")
                .doc(user.email)
                .get()

                .then(function (surveyorDoc) {

                    if (!surveyorDoc.exists) {

                        throw new Error(
                            "Surveyor account not registered."
                        );

                    }


                    const surveyorData =
                        surveyorDoc.data();


                    if (
                        surveyorData.enabled !== true
                    ) {

                        throw new Error(
                            "Your surveyor account is disabled."
                        );

                    }


                    return db.collection("surveys")
                        .where(
                            "surveyorEmail",
                            "==",
                            user.email
                        )
                        .get();

                })

                .then(function (snapshot) {

                    let todayCount = 0;


                    const todayStart =
                        new Date();

                    todayStart.setHours(
                        0, 0, 0, 0
                    );


                    snapshot.forEach(
                        function (doc) {

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

                        }
                    );


                    if (
                        todayCount >= DAILY_LIMIT
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

                            name: name,

                            mobile: mobile,

                            age: age,

                            gender: gender,

                            village: village,

                            assembly: assembly,

                            party: party,

                            candidate: candidate,

                            feedback: feedback,

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

                .then(function () {

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


                    submitBtn.disabled = false;

                    submitBtn.textContent =
                        "Submit Survey";


                    // Refresh counter
                    setTimeout(function () {

                        checkDailyLimit(user);

                    }, 500);

                })

                .catch(function (error) {

                    console.error(
                        "Survey Error:",
                        error
                    );


                    showMessage(
                        error.message ||
                        "Survey submit failed."
                    );


                    submitBtn.disabled = false;

                    submitBtn.textContent =
                        "Submit Survey";

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
