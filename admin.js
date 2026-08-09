// ==========================================
// SURVEYKSHAN ADMIN PANEL
// Complete Working Version
// ==========================================

console.log("✅ Admin Panel Loaded");


// ==========================================
// ADMIN EMAIL
// ==========================================

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";


// ==========================================
// CHART VARIABLE
// ==========================================

let partyChart = null;


// ==========================================
// CHECK ADMIN LOGIN
// ==========================================

auth.onAuthStateChanged(function (user) {

    if (!user) {

        window.location.href = "index.html";
        return;

    }

    if (!user.email) {

        alert("Unable to verify account.");
        window.location.href = "index.html";
        return;

    }

    if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {

        alert(
            "Access Denied\n\nLogged in as: " +
            user.email
        );

        auth.signOut();

        window.location.href = "index.html";

        return;

    }

    console.log("✅ Admin Login Verified");

    createChart();

    loadSurvey();

});


// ==========================================
// LOAD SURVEY DATA
// ==========================================

function loadSurvey() {

    console.log("Loading surveys...");

    const table = document.getElementById("surveyTable");

    if (!table) {

        console.error("surveyTable not found");
        return;

    }

    table.innerHTML = "";

    let total = 0;
    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;


    db.collection("surveys")
        .get()

        .then(function (snapshot) {

            console.log(
                "Total Firebase Documents:",
                snapshot.size
            );


            snapshot.forEach(function (doc) {

                const data = doc.data();

                total++;


                // ==========================
                // PARTY COUNT
                // ==========================

                const party = String(
                    data.party || ""
                ).trim().toLowerCase();


                if (party === "bjp") {

                    bjp++;

                }

                else if (
                    party === "congress"
                ) {

                    congress++;

                }

                else if (party === "aap") {

                    aap++;

                }

                else if (party === "bsp") {

                    bsp++;

                }

                else if (party === "sp") {

                    sp++;

                }

                else {

                    other++;

                }


                // ==========================
                // TABLE
                // ==========================

                table.innerHTML += `

<tr>

<td>${escapeHTML(data.name)}</td>

<td>${escapeHTML(data.mobile)}</td>

<td>${escapeHTML(data.age)}</td>

<td>${escapeHTML(data.gender)}</td>

<td>${escapeHTML(data.village)}</td>

<td>${escapeHTML(data.party)}</td>

<td>${escapeHTML(data.candidate)}</td>

<td>${escapeHTML(data.feedback)}</td>

<td>

<button
class="edit-btn"
onclick="editSurvey('${doc.id}')">

✏️ Edit

</button>

<button
class="delete-btn"
onclick="deleteSurvey('${doc.id}')">

🗑 Delete

</button>

</td>

</tr>

`;

            });


            // ==========================
            // DASHBOARD COUNTS
            // ==========================

            setText(
                "totalSurvey",
                total
            );

            setText(
                "bjpCount",
                bjp
            );

            setText(
                "congressCount",
                congress
            );

            setText(
                "aapCount",
                aap
            );

            // Agar ye cards HTML me nahi hain
            // to koi error nahi aayega.

            setText(
                "bspCount",
                bsp
            );

            setText(
                "spCount",
                sp
            );

            setText(
                "otherCount",
                other
            );


            // ==========================
            // UPDATE CHART
            // ==========================

            if (partyChart) {

                partyChart.data.datasets[0].data = [

                    bjp,
                    congress,
                    aap,
                    bsp,
                    sp,
                    other

                ];

                partyChart.update();

            }


            console.log("✅ Surveys Loaded");

        })

        .catch(function (error) {

            console.error(
                "Firestore Error:",
                error
            );

            alert(
                "Firestore Error:\n\n" +
                error.message
            );

        });

}


// ==========================================
// CREATE PIE CHART
// ==========================================

function createChart() {

    const canvas =
        document.getElementById(
            "partyChart"
        );


    if (!canvas) {

        console.log(
            "Party chart canvas not found."
        );

        return;

    }


    const ctx =
        canvas.getContext("2d");


    partyChart = new Chart(ctx, {

        type: "pie",

        data: {

            labels: [

                "BJP",
                "Congress",
                "AAP",
                "BSP",
                "SP",
                "Others"

            ],

            datasets: [{

                data: [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            plugins: {

                legend: {

                    position: "bottom"

                }

            }

        }

    });

}


// ==========================================
// SEARCH
// ==========================================

const searchBox =
    document.getElementById(
        "searchBox"
    );


if (searchBox) {

    searchBox.addEventListener(
        "keyup",
        function () {

            filterTable();

        }
    );

}


// ==========================================
// PARTY FILTER
// ==========================================

const partyFilter =
    document.getElementById(
        "partyFilter"
    );


if (partyFilter) {

    partyFilter.addEventListener(
        "change",
        function () {

            filterTable();

        }
    );

}


// ==========================================
// SEARCH + PARTY FILTER
// ==========================================

function filterTable() {

    const searchValue =
        searchBox
            ? searchBox.value
                .toLowerCase()
                .trim()
            : "";


    const partyValue =
        partyFilter
            ? partyFilter.value
                .toLowerCase()
                .trim()
            : "";


    const rows =
        document.querySelectorAll(
            "#surveyTable tr"
        );


    rows.forEach(function (row) {

        const rowText =
            row.innerText.toLowerCase();


        const searchMatch =
            searchValue === "" ||
            rowText.includes(searchValue);


        const partyMatch =
            partyValue === "" ||
            rowText.includes(partyValue);


        if (
            searchMatch &&
            partyMatch
        ) {

            row.style.display = "";

        }

        else {

            row.style.display = "none";

        }

    });

}


// ==========================================
// EXPORT EXCEL
// ==========================================

const exportButton =
    document.getElementById(
        "exportExcel"
    );


if (exportButton) {

    exportButton.addEventListener(
        "click",
        function () {

            db.collection("surveys")
                .get()

                .then(function (snapshot) {

                    let data = [];


                    snapshot.forEach(
                        function (doc) {

                            const survey =
                                doc.data();


                            data.push({

                                Name:
                                    survey.name || "",

                                Mobile:
                                    survey.mobile || "",

                                Age:
                                    survey.age || "",

                                Gender:
                                    survey.gender || "",

                                Village:
                                    survey.village || "",

                                Assembly:
                                    survey.assembly || "",

                                Party:
                                    survey.party || "",

                                Candidate:
                                    survey.candidate || "",

                                Feedback:
                                    survey.feedback || ""

                            });

                        }
                    );


                    if (data.length === 0) {

                        alert(
                            "No survey data available."
                        );

                        return;

                    }


                    const worksheet =
                        XLSX.utils.json_to_sheet(
                            data
                        );


                    const workbook =
                        XLSX.utils.book_new();


                    XLSX.utils.book_append_sheet(

                        workbook,

                        worksheet,

                        "Survey Data"

                    );


                    XLSX.writeFile(

                        workbook,

                        "Surveykshan_Data.xlsx"

                    );


                    console.log(
                        "✅ Excel Exported"
                    );

                })

                .catch(function (error) {

                    alert(
                        "Export Error:\n" +
                        error.message
                    );

                });

        }
    );

}


// ==========================================
// DELETE SURVEY
// ==========================================

function deleteSurvey(id) {

    const confirmDelete =
        confirm(
            "Kya aap is survey ko delete karna chahte hain?"
        );


    if (!confirmDelete) {

        return;

    }


    db.collection("surveys")
        .doc(id)
        .delete()

        .then(function () {

            alert(
                "✅ Survey Delete Ho Gaya"
            );

            loadSurvey();

        })

        .catch(function (error) {

            console.error(error);

            alert(
                "❌ Delete Error:\n" +
                error.message
            );

        });

}


// ==========================================
// EDIT SURVEY
// ==========================================

function editSurvey(id) {

    db.collection("surveys")
        .doc(id)
        .get()

        .then(function (doc) {

            if (!doc.exists) {

                alert(
                    "Survey not found."
                );

                return;

            }


            const data = doc.data();


            const newName =
                prompt(
                    "Edit Name",
                    data.name || ""
                );

            if (newName === null) return;


            const newMobile =
                prompt(
                    "Edit Mobile",
                    data.mobile || ""
                );

            if (newMobile === null) return;


            const newAge =
                prompt(
                    "Edit Age",
                    data.age || ""
                );

            if (newAge === null) return;


            const newGender =
                prompt(
                    "Edit Gender",
                    data.gender || ""
                );

            if (newGender === null) return;


            const newVillage =
                prompt(
                    "Edit Village",
                    data.village || ""
                );

            if (newVillage === null) return;


            const newAssembly =
                prompt(
                    "Edit Assembly",
                    data.assembly || ""
                );

            if (newAssembly === null) return;


            const newParty =
                prompt(
                    "Edit Party",
                    data.party || ""
                );

            if (newParty === null) return;


            const newCandidate =
                prompt(
                    "Edit Candidate",
                    data.candidate || ""
                );

            if (newCandidate === null) return;


            const newFeedback =
                prompt(
                    "Edit Feedback",
                    data.feedback || ""
                );

            if (newFeedback === null) return;


            db.collection("surveys")
                .doc(id)
                .update({

                    name: newName,

                    mobile: newMobile,

                    age: Number(newAge),

                    gender: newGender,

                    village: newVillage,

                    assembly: newAssembly,

                    party: newParty,

                    candidate: newCandidate,

                    feedback: newFeedback

                })

                .then(function () {

                    alert(
                        "✅ Survey Updated Successfully"
                    );

                    loadSurvey();

                })

                .catch(function (error) {

                    alert(
                        "❌ Update Error:\n" +
                        error.message
                    );

                });

        })

        .catch(function (error) {

            alert(
                "❌ Error:\n" +
                error.message
            );

        });

}


// ==========================================
// LOGOUT
// ==========================================

const logoutButton =
    document.getElementById(
        "logoutBtn"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            auth.signOut()

                .then(function () {

                    localStorage.clear();

                    window.location.href =
                        "index.html";

                })

                .catch(function (error) {

                    alert(
                        "Logout Error:\n" +
                        error.message
                    );

                });

        }
    );

}


// ==========================================
// HELPER: SET TEXT
// ==========================================

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.innerHTML = value;

    }

}


// ==========================================
// HELPER: SAFE HTML
// ==========================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ==========================================
// ADMIN.JS COMPLETE
// ==========================================

console.log(
    "✅ admin.js Loaded Successfully"
);
