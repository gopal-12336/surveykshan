// Firestore
const db = firebase.firestore();

document.getElementById("submitSurvey").addEventListener("click", function () {

    let name = document.getElementById("name").value.trim();
    let mobile = document.getElementById("mobile").value.trim();
    let age = document.getElementById("age").value.trim();
    let gender = document.getElementById("gender").value;
    let village = document.getElementById("village").value.trim();
    let assembly = document.getElementById("assembly").value.trim();
    let party = document.getElementById("party").value;
    let candidate = document.getElementById("candidate").value.trim();
    let feedback = document.getElementById("feedback").value.trim();

    if (
        name === "" ||
        mobile === "" ||
        age === "" ||
        gender === "" ||
        village === "" ||
        assembly === "" ||
        party === ""
    ) {
        alert("Please fill all required fields.");
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

        alert("Survey Submitted Successfully!");

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

        alert("Error: " + error.message);

    });

});
