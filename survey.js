console.log("Survey JS Loaded");

const db = firebase.firestore();

document.getElementById("submitSurvey").addEventListener("click", function () {
alert("Submit button clicked");
    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const age = document.getElementById("age").value.trim();
    const gender = document.getElementById("gender").value;
    const village = document.getElementById("village").value.trim();
    const assembly = document.getElementById("assembly").value.trim();
    const party = document.getElementById("party").value;
    const candidate = document.getElementById("candidate").value.trim();
    const feedback = document.getElementById("feedback").value.trim();

    if (
        name === "" ||
        mobile === "" ||
        age === "" ||
        gender === "" ||
        village === "" ||
        assembly === "" ||
        party === ""
    ) {
        document.getElementById("message").innerHTML = "Please fill all required fields.";
        return;
    }

    db.collection("surveys").add({
        name: name,
        mobile: mobile,
        age: age,
        gender: gender,
        village: village,
        assembly: assembly,
        party: party,
        candidate: candidate,
        feedback: feedback,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })

    .then(function () {
        document.getElementById("message").innerHTML = "Survey Submitted Successfully ✅";

        document.getElementById("name").value = "";
        document.getElementById("mobile").value = "";
        document.getElementById("age").value = "";
        document.getElementById("gender").value = "";
        document.getElementById("village").value = "";
        document.getElementById("assembly").value = "";
        document.getElementById("party").value = "";
        document.getElementById("candidate").value = "";
        document.getElementById("feedback").value = "";
    })

    .catch(function (error) {
        document.getElementById("message").innerHTML = error.message;
        console.error(error);
    });

});
