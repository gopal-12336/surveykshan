// ======================================================
// SURVEYKSHAN SURVEY JS
// ======================================================

console.log("Survey JS Loaded");


// ======================================================
// DAILY LIMIT
// ======================================================

const DAILY_SURVEY_LIMIT = 20;


// ======================================================
// SUBMIT SURVEY
// ======================================================

document
    .getElementById("submitSurvey")
    .addEventListener("click", async function () {

        try {

            // ------------------------------------------
            // GET CURRENT USER
            // ------------------------------------------

            const user = firebase.auth().currentUser;

            if (!user) {

                alert("Please login first.");

                window.location.href = "index.html";

                return;

            }


            // ------------------------------------------
            // SURVEYOR EMAIL
            // ------------------------------------------

            const surveyorEmail =
                user.email ||
                localStorage.getItem("userEmail") ||
                "";


            if (!surveyorEmail) {

                alert(
                    "Surveyor information not found. Please login again."
                );

                return;

            }


            // ------------------------------------------
            // CHECK TODAY'S SURVEY COUNT
            // ------------------------------------------

            const now = new Date();


            const startOfToday =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                );


            const endOfToday =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() + 1
                );


            const startTimestamp =
                firebase.firestore.Timestamp.fromDate(
                    startOfToday
                );


            const endTimestamp =
                firebase.firestore.Timestamp.fromDate(
                    endOfToday
                );


            const todaySnapshot =
                await db
                    .collection("surveys")
                    .where(
                        "surveyorEmail",
                        "==",
                        surveyorEmail
                    )
                    .where(
                        "createdAt",
                        ">=",
                        startTimestamp
                    )
                    .where(
                        "createdAt",
                        "<",
                        endTimestamp
                    )
                    .get();


            const todayCount =
                todaySnapshot.size;


            console.log(
                "Today's surveys:",
                todayCount
            );


            // ------------------------------------------
            // DAILY LIMIT CHECK
            // ------------------------------------------

            if (
                todayCount >=
                DAILY_SURVEY_LIMIT
            ) {

                alert(
                    "⚠️ Today's survey limit is 20.\n\n" +
                    "You have already completed 20 surveys today.\n\n" +
                    "Please continue tomorrow."
                );

                return;

            }


            // ------------------------------------------
            // GET FORM DATA
            // ------------------------------------------

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const mobile =
                document
                    .getElementById("mobile")
                    .value
                    .trim();


            const age =
                document
                    .getElementById("age")
                    .value
                    .trim();


            const gender =
                document
                    .getElementById("gender")
                    .value;


            const village =
                document
                    .getElementById("village")
                    .value
                    .trim();


            const assembly =
                document
                    .getElementById("assembly")
                    .value
                    .trim();


            const party =
                document
                    .getElementById("party")
                    .value;


            const candidate =
                document
                    .getElementById("candidate")
                    .value
                    .trim();


            const feedback =
                document
                    .getElementById("feedback")
                    .value
                    .trim();


            const message =
                document.getElementById("message");


            if (message) {

                message.innerHTML = "";

            }


            // ------------------------------------------
            // REQUIRED FIELD CHECK
            // ------------------------------------------

            if (
                name === "" ||
                mobile === "" ||
                age === "" ||
                gender === "" ||
                village === "" ||
                assembly === "" ||
                party === ""
            ) {

                if (message) {

                    message.innerHTML =
                        "Please fill all required fields.";

                }

                return;

            }


            // ------------------------------------------
            // AGE VALIDATION
            // ------------------------------------------

            const ageNumber =
                Number(age);


            if (
                isNaN(ageNumber) ||
                ageNumber <= 0
            ) {

                if (message) {

                    message.innerHTML =
                        "Please enter a valid age.";

                }

                return;

            }


            // ------------------------------------------
            // MOBILE VALIDATION
            // ------------------------------------------

            if (
                mobile.length < 10
            ) {

                if (message) {

                    message.innerHTML =
                        "Please enter a valid mobile number.";

                }

                return;

            }


            // ------------------------------------------
            // SUBMIT BUTTON
            // ------------------------------------------

            const submitButton =
                document.getElementById(
                    "submitSurvey"
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.innerText =
                    "Saving...";

            }


            // ------------------------------------------
            // SAVE SURVEY
            // ------------------------------------------

            await db
                .collection("surveys")
                .add({

                    name: name,

                    mobile: mobile,

                    age: ageNumber,

                    gender: gender,

                    village: village,

                    assembly: assembly,

                    party: party,

                    candidate: candidate,

                    feedback: feedback,


                    // Surveyor information
                    surveyorEmail:
                        surveyorEmail,

                    createdBy:
                        surveyorEmail,


                    // Firebase server time
                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()

                });


            // ------------------------------------------
            // SUCCESS
            // ------------------------------------------

            const newCount =
                todayCount + 1;


            alert(
                "✅ Survey Submitted Successfully!\n\n" +
                "Today's Surveys: " +
                newCount +
                " / " +
                DAILY_SURVEY_LIMIT
            );


            // ------------------------------------------
            // CLEAR FORM
            // ------------------------------------------

            document
                .getElementById("name")
                .value = "";


            document
                .getElementById("mobile")
                .value = "";


            document
                .getElementById("age")
                .value = "";


            document
                .getElementById("gender")
                .value = "";


            document
                .getElementById("village")
                .value = "";


            document
                .getElementById("assembly")
                .value = "";


            document
                .getElementById("party")
                .value = "";


            document
                .getElementById("candidate")
                .value = "";


            document
                .getElementById("feedback")
                .value = "";


            if (message) {

                message.innerHTML =
                    "✅ Survey Saved Successfully.<br>" +
                    "Today's Surveys: " +
                    newCount +
                    " / " +
                    DAILY_SURVEY_LIMIT;

            }


        }

        catch (error) {

            console.error(
                "Survey Error:",
                error
            );


            // ------------------------------------------
            // FIRESTORE INDEX MESSAGE
            // ------------------------------------------

            if (
                error.code ===
                "failed-precondition"
            ) {

                alert(
                    "Firebase requires an index for this query.\n\n" +
                    "Please open the link shown in the browser console and create the index."
                );

            }
            else {

                alert(
                    "❌ Error: " +
                    error.message
                );

            }


            const message =
                document.getElementById(
                    "message"
                );


            if (message) {

                message.innerHTML =
                    error.message;

            }

        }

        finally {

            const submitButton =
                document.getElementById(
                    "submitSurvey"
                );


            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.innerText =
                    "Submit Survey";

            }

        }

    });
