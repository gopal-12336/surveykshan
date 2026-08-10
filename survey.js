// ======================================================
// SURVEYKSHAN - SURVEY JS
// ======================================================

console.log("✅ Survey JS Loaded");


// ======================================================
// SUBMIT SURVEY
// ======================================================

document
    .getElementById("submitSurvey")
    .addEventListener("click", function () {


        // ==================================================
        // GET FORM VALUES
        // ==================================================

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
            document.getElementById(
                "message"
            );


        message.innerHTML = "";


        // ==================================================
        // REQUIRED FIELD CHECK
        // ==================================================

        if (

            name === "" ||

            mobile === "" ||

            age === "" ||

            gender === "" ||

            village === "" ||

            assembly === "" ||

            party === ""

        ) {

            message.innerHTML =
                "Please fill all required fields.";

            return;

        }


        // ==================================================
        // SURVEYOR INFORMATION
        // ==================================================

        const surveyorEmail =
            localStorage.getItem(
                "userEmail"
            ) || "";


        // Surveyor ID के लिए फिलहाल email
        // का इस्तेमाल किया जा रहा है।

        const surveyorId =
            surveyorEmail;


        const surveyorName =
            localStorage.getItem(
                "userName"
            ) || surveyorEmail;


        // ==================================================
        // SAVE TO FIRESTORE
        // ==================================================

        db.collection("surveys")
            .add({

                // ------------------------------------------
                // RESPONDENT DATA
                // ------------------------------------------

                name: name,

                mobile: mobile,

                age: Number(age),

                gender: gender,

                village: village,

                assembly: assembly,

                party: party,

                candidate: candidate,

                feedback: feedback,


                // ------------------------------------------
                // SURVEYOR DATA
                // ------------------------------------------

                surveyorId:
                    surveyorId,

                surveyorEmail:
                    surveyorEmail,

                surveyorName:
                    surveyorName,


                // ------------------------------------------
                // OLD FIELD - KEEPING IT FOR COMPATIBILITY
                // ------------------------------------------

                createdBy:
                    surveyorEmail,


                // ------------------------------------------
                // SUBMISSION TIME
                // ------------------------------------------

                createdAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            })


            // ==================================================
            // SUCCESS
            // ==================================================

            .then(function () {

                alert(
                    "Survey Submitted Successfully!"
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


                message.innerHTML =
                    "Survey Saved Successfully.";

            })


            // ==================================================
            // ERROR
            // ==================================================

            .catch(function (error) {

                alert(
                    "Error: " +
                    error.message
                );


                message.innerHTML =
                    error.message;


                console.error(
                    "Firestore Error:",
                    error
                );

            });

    });
