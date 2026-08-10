// ======================================================
// SURVEYKSHAN ADMIN JS
// ======================================================

console.log("Admin JS Loaded");


// ======================================================
// VARIABLES
// ======================================================

let allSurveys = [];
let filteredSurveys = [];
let partyChart = null;


// ======================================================
// ELEMENTS
// ======================================================

const searchBox = document.getElementById("searchBox");
const partyFilter = document.getElementById("partyFilter");
const dateFilter = document.getElementById("dateFilter");
const villageFilter = document.getElementById("villageFilter");
const assemblyFilter = document.getElementById("assemblyFilter");

const surveyTable = document.getElementById("surveyTable");

const totalSurvey = document.getElementById("totalSurvey");
const bjpCount = document.getElementById("bjpCount");
const congressCount = document.getElementById("congressCount");
const aapCount = document.getElementById("aapCount");
const bspCount = document.getElementById("bspCount");
const spCount = document.getElementById("spCount");
const otherCount = document.getElementById("otherCount");

const todaySurvey = document.getElementById("todaySurvey");

const resetFilters = document.getElementById("resetFilters");
const exportExcel = document.getElementById("exportExcel");
const logoutBtn = document.getElementById("logoutBtn");


// ======================================================
// CREATE SURVEYOR FILTER
// ======================================================

let surveyorFilter = document.getElementById("surveyorFilter");

if (!surveyorFilter) {

    surveyorFilter = document.createElement("select");

    surveyorFilter.id = "surveyorFilter";

    surveyorFilter.innerHTML = `
        <option value="">All Surveyors</option>
    `;

    const filters = document.querySelector(".filters");

    if (filters) {
        filters.insertBefore(
            surveyorFilter,
            resetFilters
        );
    }
}


// ======================================================
// LOAD SURVEYS FROM FIREBASE
// ======================================================

function loadSurveys() {

    db.collection("surveys")
        .onSnapshot(function (snapshot) {

            allSurveys = [];

            snapshot.forEach(function (doc) {

                const data = doc.data();

                allSurveys.push({
                    id: doc.id,
                    ...data
                });

            });

            console.log(
                "Total Firebase Surveys:",
                allSurveys.length
            );

            createFilterOptions();

            filterTable();

        }, function (error) {

            console.error(
                "Firebase Error:",
                error
            );

        });

}


// ======================================================
// FILTER OPTIONS
// ======================================================

function createFilterOptions() {

    // -----------------------------
    // VILLAGES
    // -----------------------------

    const villages = [
        ...new Set(
            allSurveys
                .map(s => s.village)
                .filter(Boolean)
        )
    ].sort();

    villageFilter.innerHTML =
        `<option value="">All Villages</option>`;

    villages.forEach(function (village) {

        const option =
            document.createElement("option");

        option.value = village;
        option.textContent = village;

        villageFilter.appendChild(option);

    });


    // -----------------------------
    // ASSEMBLIES
    // -----------------------------

    const assemblies = [
        ...new Set(
            allSurveys
                .map(s => s.assembly)
                .filter(Boolean)
        )
    ].sort();

    assemblyFilter.innerHTML =
        `<option value="">All Assemblies</option>`;

    assemblies.forEach(function (assembly) {

        const option =
            document.createElement("option");

        option.value = assembly;
        option.textContent = assembly;

        assemblyFilter.appendChild(option);

    });


    // -----------------------------
    // SURVEYORS
    // -----------------------------

    const surveyors = [
        ...new Set(

            allSurveys
                .map(function (survey) {

                    return (
                        survey.surveyorEmail ||
                        survey.createdBy ||
                        survey.surveyorId ||
                        ""
                    );

                })
                .filter(Boolean)

        )
    ].sort();

    surveyorFilter.innerHTML =
        `<option value="">All Surveyors</option>`;

    surveyors.forEach(function (surveyor) {

        const option =
            document.createElement("option");

        option.value = surveyor;
        option.textContent = surveyor;

        surveyorFilter.appendChild(option);

    });

}


// ======================================================
// GET FIREBASE DATE
// ======================================================

function getSurveyDate(survey) {

    if (!survey.createdAt) {
        return null;
    }

    if (
        survey.createdAt.toDate &&
        typeof survey.createdAt.toDate === "function"
    ) {

        return survey.createdAt.toDate();

    }

    if (survey.createdAt.seconds) {

        return new Date(
            survey.createdAt.seconds * 1000
        );

    }

    if (survey.createdAt instanceof Date) {

        return survey.createdAt;

    }

    return null;

}


// ======================================================
// DATE HELPERS
// ======================================================

function isToday(date) {

    if (!date) return false;

    const now = new Date();

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );

}


function isThisWeek(date) {

    if (!date) return false;

    const now = new Date();

    const startOfWeek = new Date(now);

    const day = now.getDay();

    const difference =
        day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
        now.getDate() - difference
    );

    startOfWeek.setHours(
        0, 0, 0, 0
    );

    const endOfWeek = new Date(
        startOfWeek
    );

    endOfWeek.setDate(
        startOfWeek.getDate() + 7
    );

    return (
        date >= startOfWeek &&
        date < endOfWeek
    );

}


function isThisMonth(date) {

    if (!date) return false;

    const now = new Date();

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );

}


// ======================================================
// FILTER TABLE
// ======================================================

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
            : "";

    const selectedDate =
        dateFilter
            ? dateFilter.value
            : "";

    const selectedVillage =
        villageFilter
            ? villageFilter.value
            : "";

    const selectedAssembly =
        assemblyFilter
            ? assemblyFilter.value
            : "";

    const selectedSurveyor =
        surveyorFilter
            ? surveyorFilter.value
            : "";


    filteredSurveys =
        allSurveys.filter(function (survey) {

            // -----------------------------
            // SEARCH
            // -----------------------------

            const searchText = (

                (survey.name || "") + " " +
                (survey.mobile || "") + " " +
                (survey.village || "") + " " +
                (survey.assembly || "") + " " +
                (survey.party || "") + " " +
                (survey.candidate || "") + " " +
                (survey.feedback || "") + " " +
                (survey.surveyorEmail || "") + " " +
                (survey.createdBy || "")

            ).toLowerCase();


            if (
                searchValue &&
                !searchText.includes(searchValue)
            ) {

                return false;

            }


            // -----------------------------
            // PARTY
            // -----------------------------

            if (
                selectedParty &&
                survey.party !== selectedParty
            ) {

                return false;

            }


            // -----------------------------
            // VILLAGE
            // -----------------------------

            if (
                selectedVillage &&
                survey.village !== selectedVillage
            ) {

                return false;

            }


            // -----------------------------
            // ASSEMBLY
            // -----------------------------

            if (
                selectedAssembly &&
                survey.assembly !== selectedAssembly
            ) {

                return false;

            }


            // -----------------------------
            // SURVEYOR
            // -----------------------------

            const surveyor =
                survey.surveyorEmail ||
                survey.createdBy ||
                survey.surveyorId ||
                "";

            if (
                selectedSurveyor &&
                surveyor !== selectedSurveyor
            ) {

                return false;

            }


            // -----------------------------
            // DATE
            // -----------------------------

            const surveyDate =
                getSurveyDate(survey);


            if (selectedDate === "today") {

                if (!isToday(surveyDate)) {

                    return false;

                }

            }


            if (selectedDate === "week") {

                if (!isThisWeek(surveyDate)) {

                    return false;

                }

            }


            if (selectedDate === "month") {

                if (!isThisMonth(surveyDate)) {

                    return false;

                }

            }


            return true;

        });


    updateDashboard();

    displayTable();

    updateChart();

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard() {

    const surveys = filteredSurveys;


    if (totalSurvey) {

        totalSurvey.textContent =
            surveys.length;

    }


    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;


    surveys.forEach(function (survey) {

        const party =
            (survey.party || "")
                .toLowerCase()
                .trim();


        if (party === "bjp") {

            bjp++;

        }
        else if (
            party === "congress"
        ) {

            congress++;

        }
        else if (
            party === "aap"
        ) {

            aap++;

        }
        else if (
            party === "bsp"
        ) {

            bsp++;

        }
        else if (
            party === "sp"
        ) {

            sp++;

        }
        else {

            other++;

        }

    });


    if (bjpCount)
        bjpCount.textContent = bjp;

    if (congressCount)
        congressCount.textContent =
            congress;

    if (aapCount)
        aapCount.textContent = aap;

    if (bspCount)
        bspCount.textContent = bsp;

    if (spCount)
        spCount.textContent = sp;

    if (otherCount)
        otherCount.textContent = other;


    // Today's surveys
    let todayCount = 0;

    surveys.forEach(function (survey) {

        if (
            isToday(
                getSurveyDate(survey)
            )
        ) {

            todayCount++;

        }

    });


    if (todaySurvey) {

        todaySurvey.textContent =
            todayCount;

    }

}


// ======================================================
// DISPLAY TABLE
// ======================================================

function displayTable() {

    if (!surveyTable) return;


    surveyTable.innerHTML = "";


    if (filteredSurveys.length === 0) {

        surveyTable.innerHTML = `
            <tr>
                <td colspan="9"
                    style="padding:25px;">
                    No survey records found.
                </td>
            </tr>
        `;

        return;

    }


    filteredSurveys.forEach(function (survey) {

        const row =
            document.createElement("tr");


        const surveyor =
            survey.surveyorEmail ||
            survey.createdBy ||
            survey.surveyorId ||
            "-";


        const surveyDate =
            getSurveyDate(survey);


        const dateText =
            surveyDate
                ? surveyDate.toLocaleDateString(
                    "en-IN"
                )
                : "-";


        row.innerHTML = `

            <td>${escapeHTML(
                survey.name || ""
            )}</td>

            <td>${escapeHTML(
                survey.mobile || ""
            )}</td>

            <td>${escapeHTML(
                survey.age || ""
            )}</td>

            <td>${escapeHTML(
                survey.gender || ""
            )}</td>

            <td>${escapeHTML(
                survey.village || ""
            )}</td>

            <td>${escapeHTML(
                survey.party || ""
            )}</td>

            <td>${escapeHTML(
                survey.candidate || ""
            )}</td>

            <td>${escapeHTML(
                survey.feedback || ""
            )}</td>

            <td>

                <button
                    onclick="editSurvey('${survey.id}')"
                    style="
                        background:#1565c0;
                        color:white;
                    "
                >
                    ✏️ Edit
                </button>

                <button
                    onclick="deleteSurvey('${survey.id}')"
                    style="
                        background:#c62828;
                        color:white;
                    "
                >
                    🗑️ Delete
                </button>

                <br>

                <small>
                    Surveyor:
                    ${escapeHTML(surveyor)}
                    <br>
                    Date:
                    ${dateText}
                </small>

            </td>

        `;


        surveyTable.appendChild(row);

    });

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// EDIT SURVEY
// ======================================================

window.editSurvey = function (id) {

    const survey =
        allSurveys.find(
            s => s.id === id
        );


    if (!survey) return;


    const name =
        prompt(
            "Name:",
            survey.name || ""
        );

    if (name === null) return;


    const mobile =
        prompt(
            "Mobile:",
            survey.mobile || ""
        );

    if (mobile === null) return;


    const age =
        prompt(
            "Age:",
            survey.age || ""
        );

    if (age === null) return;


    const village =
        prompt(
            "Village:",
            survey.village || ""
        );

    if (village === null) return;


    const assembly =
        prompt(
            "Assembly:",
            survey.assembly || ""
        );

    if (assembly === null) return;


    const party =
        prompt(
            "Party:",
            survey.party || ""
        );

    if (party === null) return;


    const candidate =
        prompt(
            "Candidate:",
            survey.candidate || ""
        );

    if (candidate === null) return;


    const feedback =
        prompt(
            "Feedback:",
            survey.feedback || ""
        );

    if (feedback === null) return;


    db.collection("surveys")
        .doc(id)
        .update({

            name: name.trim(),

            mobile: mobile.trim(),

            age: Number(age),

            village: village.trim(),

            assembly: assembly.trim(),

            party: party.trim(),

            candidate: candidate.trim(),

            feedback: feedback.trim()

        })
        .then(function () {

            alert(
                "Survey updated successfully!"
            );

        })
        .catch(function (error) {

            alert(
                "Update Error: " +
                error.message
            );

            console.error(error);

        });

};


// ======================================================
// DELETE SURVEY
// ======================================================

window.deleteSurvey = function (id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this survey?"
        );


    if (!confirmDelete) return;


    db.collection("surveys")
        .doc(id)
        .delete()
        .then(function () {

            alert(
                "Survey deleted successfully!"
            );

        })
        .catch(function (error) {

            alert(
                "Delete Error: " +
                error.message
            );

            console.error(error);

        });

};


// ======================================================
// RESET FILTERS
// ======================================================

if (resetFilters) {

    resetFilters.addEventListener(
        "click",
        function () {

            if (searchBox)
                searchBox.value = "";

            if (partyFilter)
                partyFilter.value = "";

            if (dateFilter)
                dateFilter.value = "";

            if (villageFilter)
                villageFilter.value = "";

            if (assemblyFilter)
                assemblyFilter.value = "";

            if (surveyorFilter)
                surveyorFilter.value = "";

            filterTable();

        }
    );

}


// ======================================================
// FILTER EVENTS
// ======================================================

if (searchBox) {

    searchBox.addEventListener(
        "input",
        filterTable
    );

}

if (partyFilter) {

    partyFilter.addEventListener(
        "change",
        filterTable
    );

}

if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        filterTable
    );

}

if (villageFilter) {

    villageFilter.addEventListener(
        "change",
        filterTable
    );

}

if (assemblyFilter) {

    assemblyFilter.addEventListener(
        "change",
        filterTable
    );

}

if (surveyorFilter) {

    surveyorFilter.addEventListener(
        "change",
        filterTable
    );

}


// ======================================================
// CHART
// ======================================================

function updateChart() {

    const canvas =
        document.getElementById(
            "partyChart"
        );


    if (!canvas) return;


    const ctx =
        canvas.getContext("2d");


    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;


    filteredSurveys.forEach(function (survey) {

        const party =
            (survey.party || "")
                .toLowerCase()
                .trim();


        if (party === "bjp")
            bjp++;

        else if (party === "congress")
            congress++;

        else if (party === "aap")
            aap++;

        else if (party === "bsp")
            bsp++;

        else if (party === "sp")
            sp++;

        else
            other++;

    });


    if (partyChart) {

        partyChart.destroy();

    }


    partyChart =
        new Chart(
            ctx,
            {

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
                            bjp,
                            congress,
                            aap,
                            bsp,
                            sp,
                            other
                        ]

                    }]

                },

                options: {

                    responsive: true,

                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    }

                }

            }
        );

}


// ======================================================
// EXPORT EXCEL
// ======================================================

if (exportExcel) {

    exportExcel.addEventListener(
        "click",
        function () {

            if (
                typeof XLSX ===
                "undefined"
            ) {

                alert(
                    "Excel library not loaded."
                );

                return;

            }


            if (
                filteredSurveys.length === 0
            ) {

                alert(
                    "No survey data to export."
                );

                return;

            }


            const excelData =
                filteredSurveys.map(
                    function (survey) {

                        const surveyDate =
                            getSurveyDate(
                                survey
                            );


                        return {

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

                            Surveyor:
                                survey.surveyorEmail ||
                                survey.createdBy ||
                                survey.surveyorId ||
                                "",

                            Date:
                                surveyDate
                                    ? surveyDate.toLocaleString(
                                        "en-IN"
                                    )
                                    : ""

                        };

                    }
                );


            const worksheet =
                XLSX.utils.json_to_sheet(
                    excelData
                );


            const workbook =
                XLSX.utils.book_new();


            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Surveys"
            );


            XLSX.writeFile(
                workbook,
                "Surveykshan_Surveys.xlsx"
            );

        }
    );

}


// ======================================================
// LOGOUT
// ======================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            firebase.auth()
                .signOut()
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


// ======================================================
// START
// ======================================================

loadSurveys();
