// Survey JS Loaded
console.log("Survey JS Loaded");

document.getElementById("submitSurvey").addEventListener("click", function () {
  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value;
  const village = document.getElementById("village").value.trim();
  const assembly = document.getElementById("assembly").value.trim();
  const party = document.getElementById("party").value;
  const candidate = document.getElementById("candidate").value.trim();
  const feedback = document.getElementById("feedback").value.trim();

  const message = document.getElementById("message");
  message.innerHTML = "";

  if (
    name === "" ||
    mobile === "" ||
    age === "" ||
    gender === "" ||
    village === "" ||
    assembly === "" ||
    party === ""
  ) {
    message.innerHTML = "Please fill all required fields.";
    return;
  }

  db.collection("surveys")
    .add({
      name: name,
      mobile: mobile,
      age: Number(age),
      gender: gender,
      village: village,
      assembly: assembly,
      party: party,
      candidate: candidate,
      feedback: feedback,
      createdBy: localStorage.getItem("userEmail"),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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

      message.innerHTML = "Survey Saved Successfully.";
    })

    .catch(function (error) {
      alert("Error: " + error.message);
      message.innerHTML = error.message;

      console.error(error);
    });
});
