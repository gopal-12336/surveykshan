// ==========================================
// SURVEYKSHAN ADMIN PANEL
// ==========================================

console.log("Admin Panel Loaded");


// ==========================================
// ADMIN EMAIL
// ==========================================

const adminEmail = "goswamivinod2305@gmail.com";


// ==========================================
// ELEMENTS
// ==========================================

const searchBox = document.getElementById("searchBox");
const partyFilter = document.getElementById("partyFilter");
const dateFilter = document.getElementById("dateFilter");
const resetFilters = document.getElementById("resetFilters");


// ==========================================
// PARTY CHART
// ==========================================

const chartCanvas = document.getElementById("partyChart");

let partyChart = null;

if (chartCanvas) {

    const ctx = chartCanvas.getContext("2d");

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

        }

    });

}


// ==========================================
// CHECK LOGIN
// ==========================================

auth.onAuthStateChanged(function (user) {

    if (!user) {

        window.location.href = "index.html";

        return;
    }


    // ADMIN EMAIL CHECK

    if (
        !user.email ||
        user.email.toLowerCase() !==
        adminEmail.toLowerCase()
    ) {

        alert(
            "Access Denied\n\nLogged in as: " +
            user.email
        );

        window.location.href = "survey.html";

        return;
    }


    // LOAD SURVEYS

    loadSurvey();

});


// ==========================================
// LOAD SURVEY DATA
// ==========================================

function loadSurvey() {

    let total = 0;

    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;


    const table =
        document.getElementById("surveyTable");


    if (!table) {

        console.error(
            "surveyTable element not found"
        );

        return;
    }


    table.innerHTML = "";


    db.collection("surveys")

        .orderBy("createdAt", "desc")

        .get()

        .then(function (snapshot) {


            snapshot.forEach(function (doc) {

                const data = doc.data();


                total++;


                // ==================================
                // PARTY COUNT
                // ==================================

                if (data.party === "BJP") {

                    bjp++;

                }

                else if (data.party === "Congress") {

                    congress++;

                }

                else if (data.party === "AAP") {

                    aap++;

                }

                else if (data.party === "BSP") {

                    bsp++;

                }

                else if (data.party === "SP") {

                    sp++;

                }

                else {

                    other++;

                }


                // ==================================
                // DATE
                // ==================================

                let createdDate = "";

                if (
                    data.createdAt &&
                    typeof data.createdAt.toDate === "function"
                ) {

                    createdDate =
                        data.createdAt
                            .toDate()
                            .toISOString();

                }


                // ==================================
                // SEARCH TEXT
                // ==================================

                const searchText = [

                    data.name || "",
                    data.mobile || "",
                    data.age || "",
                    data.gender || "",
                    data.village || "",
                    data.assembly || "",
                    data.party || "",
                    data.candidate || "",
                    data.feedback || ""

                ]
                    .join(" ")
                    .toLowerCase();


                // ==================================
                // CREATE TABLE ROW
                // ==================================

                table.innerHTML += `

                    <tr
                        data-date="${createdDate}"
                        data-party="${(
                            data.party || ""
                        ).toLowerCase()}"
                        data-search="${searchText}"
                    >

                        <td>
                            ${data.name || ""}
                        </td>

                        <td>
                            ${data.mobile || ""}
                        </td>

                        <td>
                            ${data.age || ""}
                        </td>

                        <td>
                            ${data.gender || ""}
                        </td>

                        <td>
                            ${data.village || ""}
                        </td>

                        <td>
                            ${data.party || ""}
                        </td>

                        <td>
                            ${data.candidate || ""}
                        </td>

                        <td>
                            ${data.feedback || ""}
                        </td>

                        <td>

                            <button
                                onclick="editSurvey('${doc.id}')"
                            >
                                ✏️ Edit
                            </button>

                            <button
                                onclick="deleteSurvey('${doc.id}')"
                            >
                                🗑 Delete
                            </button>

                        </td>

                    </tr>

                `;

            });


            // ==================================
            // UPDATE COUNTERS
            // ==================================

            document.getElementById(
                "totalSurvey"
            ).innerHTML = total;


            document.getElementById(
                "bjpCount"
            ).innerHTML = bjp;


            document.getElementById(
                "congressCount"
            ).innerHTML = congress;


            document.getElementById(
                "aapCount"
            ).innerHTML = aap;


            document.getElementById(
                "bspCount"
            ).innerHTML = bsp;


            document.getElementById(
                "spCount"
            ).innerHTML = sp;


            document.getElementById(
                "otherCount"
            ).innerHTML = other;


            // ==================================
            // UPDATE CHART
            // ==================================

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


            // ==================================
            // APPLY FILTER
            // ==================================

            filterTable();

        })

        .catch(function (error) {

            console.error(
                "Firestore Error:",
                error
            );

            alert(
                "Firestore Error:\n" +
                error.message
            );

        });

}


// ==========================================
// SEARCH + PARTY + DATE FILTER
// ==========================================

function filterTable() {

    const searchValue =

        searchBox
            ? searchBox.value
                .toLowerCase()
                .trim()
            : "";


    const selectedParty =

        partyFilter
            ? partyFilter.value
                .toLowerCase()
                .trim()
            : "";


    const selectedDate =

        dateFilter
            ? dateFilter.value
            : "";


    const rows =
        document.querySelectorAll(
            "#surveyTable tr"
        );


    const now = new Date();


    rows.forEach(function (row) {


        // ==================================
        // SEARCH
        // ==================================

        const rowSearch =

            row.getAttribute(
                "data-search"
            ) || "";


        const searchMatch =

            rowSearch.includes(
                searchValue
            );


        // ==================================
        // PARTY
        // ==================================

        const rowParty =

            row.getAttribute(
                "data-party"
            ) || "";


        const partyMatch =

            selectedParty === "" ||
            rowParty === selectedParty;


        // ==================================
        // DATE
        // ==================================

        let dateMatch = true;


        const rowDate =

            row.getAttribute(
                "data-date"
            );


        if (
            selectedDate !== "" &&
            rowDate !== ""
        ) {


            const surveyDate =
                new Date(rowDate);


            // TODAY

            if (
                selectedDate === "today"
            ) {

                dateMatch =

                    surveyDate.toDateString() ===
                    now.toDateString();

            }


            // THIS WEEK

            else if (
                selectedDate === "week"
            ) {

                const weekAgo =
                    new Date();


                weekAgo.setDate(
                    now.getDate() - 7
                );


                dateMatch =
                    surveyDate >= weekAgo;

            }


            // THIS MONTH

            else if (
                selectedDate === "month"
            ) {

                dateMatch =

                    surveyDate.getMonth() ===
                    now.getMonth()

                    &&

                    surveyDate.getFullYear() ===
                    now.getFullYear();

            }

        }


        // ==================================
        // SHOW / HIDE ROW
        // ==================================

        if (
            searchMatch &&
            partyMatch &&
            dateMatch
        ) {

            row.style.display = "";

        }

        else {

            row.style.display = "none";

        }

    });

}


// ==========================================
// SEARCH EVENT
// ==========================================

if (searchBox) {

    searchBox.addEventListener(
        "input",
        filterTable
    );

}


// ==========================================
// PARTY FILTER EVENT
// ==========================================

if (partyFilter) {

    partyFilter.addEventListener(
        "change",
        filterTable
    );

}


// ==========================================
// DATE FILTER EVENT
// ==========================================

if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        filterTable
    );

}


// ==========================================
// RESET FILTERS
// ==========================================

if (resetFilters) {

    resetFilters.addEventListener(
        "click",
        function () {


            if (searchBox) {

                searchBox.value = "";

            }


            if (partyFilter) {

                partyFilter.value = "";

            }


            if (dateFilter) {

                dateFilter.value = "";

            }


            filterTable();

        }
    );

}


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
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
                        "Logout Error: " +
                        error.message
                    );

                });

        }
    );

}


// ==========================================
// EXPORT EXCEL
// ==========================================

const exportExcel =
    document.getElementById(
        "exportExcel"
    );


if (exportExcel) {

    exportExcel.addEventListener(
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
                                    survey.feedback || "",

                                CreatedBy:
                                    survey.createdBy || "",

                                CreatedAt:

                                    survey.createdAt &&
                                    typeof survey.createdAt.toDate ===
                                    "function"

                                        ? survey.createdAt
                                            .toDate()
                                            .toLocaleString()

                                        : ""

                            });

                        }
                    );


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

                })

                .catch(function (error) {

                    alert(
                        "Export Error: " +
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

            alert(
                "❌ Error: " +
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
                    "Survey not found"
                );

                return;

            }


            const data =
                doc.data();


            const newName =

                prompt(
                    "Edit Name",
                    data.name || ""
                );


            if (newName === null) {

                return;

            }


            const newMobile =

                prompt(
                    "Edit Mobile",
                    data.mobile || ""
                );


            if (newMobile === null) {

                return;

            }


            const newAge =

                prompt(
                    "Edit Age",
                    data.age || ""
                );


            if (newAge === null) {

                return;

            }


            db.collection("surveys")
                .doc(id)

                .update({

                    name:
                        newName.trim(),

                    mobile:
                        newMobile.trim(),

                    age:
                        Number(newAge)

                })

                .then(function () {


                    alert(
                        "✅ Survey Updated Successfully"
                    );


                    loadSurvey();

                })

                .catch(function (error) {

                    alert(
                        "❌ Update Error: " +
                        error.message
                    );

                });

        })

        .catch(function (error) {

            alert(
                "❌ Error: " +
                error.message
            );

        });

}
