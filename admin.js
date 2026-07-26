// Admin Panel Loaded
console.log("Admin Panel Loaded");

// Check Login
auth.onAuthStateChanged(function (user) {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Admin Email Check
    const adminEmail = "goswamivinod2305@gmail.com";

    if (user.email.toLowerCase() !== adminEmail.toLowerCase()) {
        alert("Access Denied\n\nLogged in as: " + user.email);
        window.location.href = "survey.html";
        return;
    }

    loadSurvey();

});

// Load Survey Data
function loadSurvey() {

    let total = 0;
    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let other = 0;

    const table = document.getElementById("surveyTable");
    table.innerHTML = "";

    db.collection("surveys")
        .orderBy("createdAt", "desc")
        .get()

        .then(function (snapshot) {

            snapshot.forEach(function (doc) {

                const data = doc.data();

                total++;

                if (data.party === "BJP") {
                    bjp++;
                } else if (data.party === "Congress") {
                    congress++;
                } else if (data.party === "AAP") {
                    aap++;
                } else {
                    other++;
                }

                table.innerHTML += `
<tr>
<td>${data.name || ""}</td>
<td>${data.mobile || ""}</td>
<td>${data.age || ""}</td>
<td>${data.gender || ""}</td>
<td>${data.village || ""}</td>
<td>${data.party || ""}</td>
<td>${data.candidate || ""}</td>
<td>${data.feedback || ""}</td>

<td>
<button onclick="deleteSurvey('${doc.id}')">🗑 Delete</button>
</td>

</tr>
`;
            });

            document.getElementById("totalSurvey").innerHTML = total;
            document.getElementById("bjpCount").innerHTML = bjp;
            document.getElementById("congressCount").innerHTML = congress;
            document.getElementById("aapCount").innerHTML = aap;
            document.getElementById("otherCount").innerHTML = other;

        })

        .catch(function (error) {

            alert("Firestore Error:\n" + error.message);
            console.error(error);

        });

}

// Logout
document.getElementById("logoutBtn").addEventListener("click", function () {

    auth.signOut().then(function () {

        localStorage.clear();

        window.location.href = "index.html";

    });

});
// Logout
document.getElementById("logoutBtn").addEventListener("click", function () {

    auth.signOut().then(function () {

        localStorage.clear();

        window.location.href = "index.html";

    });

});

// Live Search
document.getElementById("searchBox").addEventListener("keyup", function () {

    let value = this.value.toLowerCase();

    let rows = document.querySelectorAll("#surveyTable tr");

    rows.forEach(function (row) {

        if (row.innerText.toLowerCase().includes(value)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});
// Export Excel
document.getElementById("exportExcel").addEventListener("click", function () {

    db.collection("surveys").get()

    .then(function(snapshot){

        let data = [];

        snapshot.forEach(function(doc){

            data.push(doc.data());

        });

        let worksheet = XLSX.utils.json_to_sheet(data);

        let workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Survey Data");

        XLSX.writeFile(workbook, "Surveykshan_Data.xlsx");

    })

    .catch(function(error){

        alert(error.message);

    });

});
