console.log("Survey JS Loaded");

const ADMIN_EMAIL =
    "goswamivinod2305@gmail.com";

const submitBtn =
    document.getElementById("submitSurvey");

const message =
    document.getElementById("message");


// =====================================
// TAB SESSION AUTH
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

        // Admin cannot use survey page
        if (
            user.email &&
            user.email.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
        ) {

            window.location.replace("admin.html");
            return;
        }

        console.log(
            "Surveyor logged in:",
            user.email
        );

    });

})
.catch(function (error) {

    console.error(
        "Auth Persistence Error:",
        error
    );

});


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


            if (!name ||
                !mobile ||
                !age ||
                !gender ||
                !village ||
                !assembly ||
                !party) {

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

                setTimeout(function () {

                    window.location.replace(
                        "index.html"
                    );

                }, 1000);

                return;
            }


            if (
                user.email.toLowerCase() ===
                ADMIN_EMAIL.toLowerCase()
            ) {

                window.location.replace(
                    "admin.html"
                );

                return;
            }


            submitBtn.disabled = true;
            submitBtn.textContent =
                "Submitting...";

            message.textContent = "";


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

                    showMessage(
                        "Survey submitted successfully!",
                        true
                    );

                    document.getElementById("name").value = "";
                    document.getElementById("mobile").value = "";
                    document.getElementById("age").value = "";
                    document.getElementById("gender").value = "";
                    document.getElementById("village").value = "";
                    document.getElementById("assembly").value = "";
                    document.getElementById("party").value = "";
                    document.getElementById("candidate").value = "";
                    document.getElementById("feedback").value = "";

                    submitBtn.disabled = false;
                    submitBtn.textContent =
                        "Submit Survey";

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

function showMessage(text, success = false) {

    if (!message) return;

    message.textContent = text;

    message.style.color =
        success ? "green" : "red";
}
