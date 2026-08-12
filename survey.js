console.log("Survey JS Loaded");

const ADMIN_EMAIL =
    "goswamivinod2305@gmail.com";

const DAILY_LIMIT = 20;

const submitBtn =
    document.getElementById("submitSurvey");

const message =
    document.getElementById("message");

let currentUser = null;
let todaySurveyCount = 0;


// =====================================
// TAB SESSION AUTH
// =====================================

firebase.auth().setPersistence(
    firebase.auth.Auth.Persistence.SESSION
)
.then(function () {

    firebase.auth().onAuthStateChanged(
        function (user) {

            if (!user) {

                window.location.replace(
                    "index.html"
                );

                return;
            }


            // Admin cannot use survey page

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


            currentUser = user;

            console.log(
                "Surveyor logged in:",
                user.email
            );


            createCounterBox();

            loadTodaySurveyCount();

        }
    );

})
.catch(function (error) {

    console.error(
        "Auth Persistence Error:",
        error
    );

});


// =====================================
// CREATE COUNTER BOX
// =====================================

function createCounterBox() {

    if (
        document.getElementById(
            "todaySurveyCounter"
        )
    ) {
        return;
    }


    const counter =
        document.createElement("div");


    counter.id =
        "todaySurveyCounter";


    counter.style.margin =
        "10px 0";

    counter.style.padding =
        "10px";

    counter.style.textAlign =
        "center";

    counter.style.borderRadius =
        "8px";

    counter.style.background =
        "#e3f2fd";

    counter.style.color =
        "#1565c0";

    counter.style.fontWeight =
        "bold";


    counter.textContent =
        "Today's Surveys: Loading...";


    if (submitBtn) {

        submitBtn.parentNode.insertBefore(
            counter,
            submitBtn
        );

    }

}


// =====================================
// LOAD TODAY'S SURVEY COUNT
// =====================================

function loadTodaySurveyCount() {

    if (!currentUser) {
        return;
    }


    const start =
        new Date();

    start.setHours(
        0,
        0,
        0,
        0
    );


    const end =
        new Date();

    end.setHours(
        23,
        59,
        59,
        999
    );


    db.collection("surveys")
        .where(
            "surveyorEmail",
            "==",
            currentUser.email
        )
        .get()

        .then(function (snapshot) {

            todaySurveyCount = 0;


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
                            typeof
                            data.createdAt.toDate ===
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

                        console.error(
                            error
                        );

                    }


                    if (
                        date &&
                        date >= start &&
                        date <= end
                    ) {

                        todaySurveyCount++;

                    }

                }
            );


            updateCounter();


        })

        .catch(function (error) {

            console.error(
                "Count Error:",
                error
            );

            updateCounter();

        });

}


// =====================================
// UPDATE COUNTER
// =====================================

function updateCounter() {

    const counter =
        document.getElementById(
            "todaySurveyCounter"
        );


    if (!counter) {
        return;
    }


    counter.textContent =
        "Today's Surveys: " +
        todaySurveyCount +
        " / " +
        DAILY_LIMIT;


    if (
        todaySurveyCount >=
        DAILY_LIMIT
    ) {

        counter.style.background =
            "#ffebee";

        counter.style.color =
            "#c62828";

    }
    else {

        counter.style.background =
            "#e3f2fd";

        counter.style.color =
            "#1565c0";

    }

}


// =====================================
// SUBMIT SURVEY
// =====================================

if (submitBtn) {

    submitBtn.addEventListener(
        "click",
        function () {

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


            // REQUIRED FIELDS

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


            const user =
                firebase.auth().currentUser;


            if (!user) {

                showMessage(
                    "Session expired. Please login again."
                );


                setTimeout(
                    function () {

                        window.location.replace(
                            "index.html"
                        );

                    },
                    1000
                );

                return;
            }


            // ADMIN BLOCK

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


            // =================================
            // DAILY LIMIT CHECK
            // =================================

            if (
                todaySurveyCount >=
                DAILY_LIMIT
            ) {

                showMessage(
                    "Daily limit reached. You can submit maximum 20 surveys per day."
                );

                return;
            }


            submitBtn.disabled =
                true;

            submitBtn.textContent =
                "Submitting...";


            message.textContent =
                "";


            // =================================
            // SAVE SURVEY
            // =================================

            db.collection("surveys")
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

                })


                .then(function () {

                    todaySurveyCount++;

                    updateCounter();


                    showMessage(
                        "Survey submitted successfully!",
                        true
                    );


                    // CLEAR FORM

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


                    submitBtn.disabled =
                        false;


                    submitBtn.textContent =
                        "Submit Survey";


                    // LIMIT REACHED

                    if (
                        todaySurveyCount >=
                        DAILY_LIMIT
                    ) {

                        showMessage(
                            "20 surveys completed today. Daily limit reached.",
                            true
                        );

                    }

                })


                .catch(function (error) {

                    console.error(
                        "Survey Error:",
                        error
                    );


                    showMessage(
                        "Survey submit failed: " +
                        error.message
                    );


                    submitBtn.disabled =
                        false;


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

    if (!message) {
        return;
    }


    message.textContent =
        text;


    message.style.color =
        success
            ? "green"
            : "red";

}
