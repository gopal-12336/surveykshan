alert("Survey JS Running");

const db = firebase.firestore();

document.getElementById("submitSurvey").onclick = function () {

    alert("Button Working");

    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const age = document.getElementById("age").value.trim();
    const gender = document.getElementById("gender").value;
    const village = document.getElementById("village").value.trim();
    const assembly = document.getElementById("assembly").value.trim();
    const party = document.getElementById("party").value;
    const candidate = document.getElementById("candidate").value.trim();
    const feedback = document.getElementById("feedback").value.trim();

    db.collection("surveys").add({
        name,
        mobile,
        age,
        gender,
        village,
        assembly,
        party,
        candidate,
        feedback,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function () {
        alert("Survey Saved Successfully");
    })
    .catch(function (error) {
        alert(error.message);
        console.error(error);
    });
};
