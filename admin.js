console.log("Admin JS Loaded");

let allSurveys = [];
let filteredSurveys = [];
let partyChart = null;

// ===============================
// ADMIN EMAIL
// ===============================

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

// ===============================
// DOM ELEMENTS
// ===============================

const searchBox = document.getElementById("searchBox");
const partyFilter = document.getElementById("partyFilter");
const dateFilter = document.getElementById("dateFilter");
const villageFilter = document.getElementById("villageFilter");
const assemblyFilter = document.getElementById("assemblyFilter");
const surveyorFilter = document.getElementById("surveyorFilter");

const surveyTable = document.getElementById("surveyTable");

const resetFilters = document.getElementById("resetFilters");
const exportExcel = document.getElementById("exportExcel");
const logoutBtn = document.getElementById("logoutBtn");

// ===============================
// FIREBASE AUTH - ADMIN ONLY
// ===============================

firebase.auth().onAuthStateChanged(function (user) {

    if (!user) {

        alert("Please login first.");

        window.location.href = "index.html";

        return;
    }

    console.log("Logged in:", user.email);

    // ===============================
    // ADMIN EMAIL CHECK
    // ===============================

    if (
        !user.email ||
        user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {

        alert("Access denied. Admin only.");

        firebase.auth()
            .signOut()
            .then(function () {

                window.location.href = "index.html";

            })
            .catch(function (error) {

                console.error(
                    "Logout error:",
                    error
                );

                window.location.href = "index.html";

            });

        return;
    }

    // ===============================
    // ADMIN VERIFIED
    // ===============================

    console.log(
        "Admin verified:",
        user.email
    );

    loadSurveys();

});

// ===============================
// LOAD SURVEYS
// ===============================

function loadSurveys() {

    db.collection("surveys")
        .orderBy("createdAt", "desc")
        .get()
        .then(function (snapshot) {

            allSurveys = [];

            snapshot.forEach(function (doc) {

                const data = doc.data();

                allSurveys.push({

                    id: doc.id,

                    ...data

                });

            });

            console.log(
                "Surveys Loaded:",
                allSurveys.length
            );

            updateDashboard();

            populateVillageFilter();

            populateAssemblyFilter();

            populateSurveyorFilter();

            filterTable();

        })
        .catch(function (error) {

            console.error(
                "Firebase Error:",
                error
            );

            // Fallback without orderBy

            db.collection("surveys")
                .get()
                .then(function (snapshot) {

                    allSurveys = [];

                    snapshot.forEach(
                        function (doc) {

                            allSurveys.push({

                                id: doc.id,

                                ...doc.data()

                            });

                        }
                    );

                    console.log(
                        "Surveys Loaded Without OrderBy:",
                        allSurveys.length
                    );

                    updateDashboard();

                    populateVillageFilter();

                    populateAssemblyFilter();

                    populateSurveyorFilter();

                    filterTable();

                })
                .catch(function (err) {

                    console.error(err);

                    alert(
                        "Unable to load survey data."
                    );

                });

        });

}

// ===============================
// DATE HELPER
// ===============================

function getSurveyDate(survey) {

    if (!survey.createdAt) {

        return null;

    }

    try {

        if (
            typeof survey.createdAt.toDate ===
            "function"
        ) {

            return survey.createdAt.toDate();

        }

        if (
            survey.createdAt.seconds
        ) {

            return new Date(
                survey.createdAt.seconds * 1000
            );

        }

        return new Date(
            survey.createdAt
        );

    }
    catch (error) {

        return null;

    }

}

// ===============================
// TODAY CHECK
// ===============================

function isToday(date) {

    if (!date) return false;

    const now = new Date();

    return (

        date.getDate() ===
        now.getDate()

        &&

        date.getMonth() ===
        now.getMonth()

        &&

        date.getFullYear() ===
        now.getFullYear()

    );

}

// ===============================
// THIS WEEK CHECK
// ===============================

function isThisWeek(date) {

    if (!date) return false;

    const now = new Date();

    const startOfWeek =
        new Date(now);

    const day =
        now.getDay();

    const diff =
        day === 0
            ? 6
            : day - 1;

    startOfWeek.setDate(
        now.getDate() - diff
    );

    startOfWeek.setHours(
        0,
        0,
        0,
        0
    );

    const endOfWeek =
        new Date(startOfWeek);

    endOfWeek.setDate(
        startOfWeek.getDate() + 7
    );

    return (

        date >= startOfWeek
        &&
        date < endOfWeek

    );

}

// ===============================
// THIS MONTH CHECK
// ===============================

function isThisMonth(date) {

    if (!date) return false;

    const now = new Date();

    return (

        date.getMonth() ===
        now.getMonth()

        &&

        date.getFullYear() ===
        now.getFullYear()

    );

}

// ===============================
// DASHBOARD
// ===============================

function updateDashboard() {

    const total =
        allSurveys.length;

    let bjp = 0;

    let congress = 0;

    let aap = 0;

    let bsp = 0;

    let sp = 0;

    let other = 0;

    let today = 0;

    let week = 0;

    let month = 0;

    allSurveys.forEach(
        function (survey) {

            const party =
                String(
                    survey.party || ""
                )
                    .trim()
                    .toLowerCase();

            if (
                party === "bjp"
            ) {

                bjp++;

            }
            else if (
                party === "congress"
                ||
                party === "inc"
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
            else if (
                party !== ""
            ) {

                other++;

            }

            const date =
                getSurveyDate(
                    survey
                );

            if (
                isToday(date)
            ) {

                today++;

            }

            if (
                isThisWeek(date)
            ) {

                week++;

            }

            if (
                isThisMonth(date)
            ) {

                month++;

            }

        }
    );

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

    setText(
        "todaySurvey",
        today
    );

    setText(
        "weekSurvey",
        week
    );

    setText(
        "monthSurvey",
        month
    );

    createPartyChart(
        bjp,
        congress,
        aap,
        bsp,
        sp,
        other
    );

}

// ===============================
// SAFE TEXT UPDATE
// ===============================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}

// ===============================
// PARTY CHART
// ===============================

function createPartyChart(
    bjp,
    congress,
    aap,
    bsp,
    sp,
    other
) {

    const canvas =
        document.getElementById(
            "partyChart"
        );

    if (!canvas) return;

    const ctx =
        canvas.getContext("2d");

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

                    datasets: [

                        {

                            data: [

                                bjp,

                                congress,

                                aap,

                                bsp,

                                sp,

                                other

                            ]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    }

                }

            }
        );

}

// ===============================
// VILLAGE FILTER
// ===============================

function populateVillageFilter() {

    if (!villageFilter)
        return;

    const villages =
        new Set();

    allSurveys.forEach(
        function (survey) {

            if (
                survey.village
            ) {

                villages.add(
                    String(
                        survey.village
                    ).trim()
                );

            }

        }
    );

    villageFilter.innerHTML =
        '<option value="">All Villages</option>';

    Array.from(villages)
        .sort()
        .forEach(
            function (village) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    village;

                option.textContent =
                    village;

                villageFilter.appendChild(
                    option
                );

            }
        );

}

// ===============================
// ASSEMBLY FILTER
// ===============================

function populateAssemblyFilter() {

    if (!assemblyFilter)
        return;

    const assemblies =
        new Set();

    allSurveys.forEach(
        function (survey) {

            if (
                survey.assembly
            ) {

                assemblies.add(
                    String(
                        survey.assembly
                    ).trim()
                );

            }

        }
    );

    assemblyFilter.innerHTML =
        '<option value="">All Assemblies</option>';

    Array.from(assemblies)
        .sort()
        .forEach(
            function (assembly) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    assembly;

                option.textContent =
                    assembly;

                assemblyFilter.appendChild(
                    option
                );

            }
        );

}

// ===============================
// SURVEYOR FILTER
// ===============================

function populateSurveyorFilter() {

    if (!surveyorFilter)
        return;

    const surveyors =
        new Set();

    allSurveys.forEach(
        function (survey) {

            const surveyor =
                survey.surveyorEmail
                ||
                survey.surveyorId
                ||
                survey.createdBy
                ||
                "";

            if (surveyor) {

                surveyors.add(
                    String(
                        surveyor
                    ).trim()
                );

            }

        }
    );

    surveyorFilter.innerHTML =
        '<option value="">All Surveyors</option>';

    Array.from(surveyors)
        .sort()
        .forEach(
            function (surveyor) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    surveyor;

                option.textContent =
                    surveyor;

                surveyorFilter.appendChild(
                    option
                );

            }
        );

}

// ===============================
// FILTER TABLE
// ===============================

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
                .toLowerCase()
                .trim()
            : "";

    const selectedVillage =
        villageFilter
            ? villageFilter.value
                .toLowerCase()
                .trim()
            : "";

    const selectedAssembly =
        assemblyFilter
            ? assemblyFilter.value
                .toLowerCase()
                .trim()
            : "";

    const selectedSurveyor =
        surveyorFilter
            ? surveyorFilter.value
                .toLowerCase()
                .trim()
            : "";

    filteredSurveys =
        allSurveys.filter(
            function (survey) {

                const name =
                    String(
                        survey.name || ""
                    ).toLowerCase();

                const mobile =
                    String(
                        survey.mobile || ""
                    ).toLowerCase();

                const village =
                    String(
                        survey.village || ""
                    ).toLowerCase();

                const assembly =
                    String(
                        survey.assembly || ""
                    ).toLowerCase();

                const party =
                    String(
                        survey.party || ""
                    ).toLowerCase();

                const surveyor =
                    String(

                        survey.surveyorEmail
                        ||
                        survey.surveyorId
                        ||
                        survey.createdBy
                        ||
                        ""

                    ).toLowerCase();

                const searchMatch =

                    !searchValue

                    ||

                    name.includes(
                        searchValue
                    )

                    ||

                    mobile.includes(
                        searchValue
                    )

                    ||

                    village.includes(
                        searchValue
                    )

                    ||

                    assembly.includes(
                        searchValue
                    );

                const partyMatch =

                    !selectedParty

                    ||

                    party ===
                    selectedParty;

                const villageMatch =

                    !selectedVillage

                    ||

                    village ===
                    selectedVillage;

                const assemblyMatch =

                    !selectedAssembly

                    ||

                    assembly ===
                    selectedAssembly;

                const surveyorMatch =

                    !selectedSurveyor

                    ||

                    surveyor ===
                    selectedSurveyor;

                let dateMatch =
                    true;

                const date =
                    getSurveyDate(
                        survey
                    );

                if (
                    selectedDate ===
                    "today"
                ) {

                    dateMatch =
                        isToday(date);

                }
                else if (
                    selectedDate ===
                    "week"
                ) {

                    dateMatch =
                        isThisWeek(date);

                }
                else if (
                    selectedDate ===
                    "month"
                ) {

                    dateMatch =
                        isThisMonth(date);

                }

                return (

                    searchMatch

                    &&

                    partyMatch

                    &&

                    villageMatch

                    &&

                    assemblyMatch

                    &&

                    surveyorMatch

                    &&

                    dateMatch

                );

            }
        );

    renderTable();

    updateFilteredCounts();

    updateSurveyorPerformance();

}

// ===============================
// RENDER TABLE
// ===============================

function renderTable() {

    if (!surveyTable)
        return;

    surveyTable.innerHTML = "";

    if (
        filteredSurveys.length === 0
    ) {

        surveyTable.innerHTML =
            '<tr><td colspan="9">No survey found.</td></tr>';

        return;

    }

    filteredSurveys.forEach(
        function (survey) {

            const row =
                document.createElement(
                    "tr"
                );

            const surveyDate =
                getSurveyDate(
                    survey
                );

            row.innerHTML = `

                <td>
                    ${safe(
                        survey.name
                    )}
                </td>

                <td>
                    ${safe(
                        survey.mobile
                    )}
                </td>

                <td>
                    ${safe(
                        survey.age
                    )}
                </td>

                <td>
                    ${safe(
                        survey.gender
                    )}
                </td>

                <td>
                    ${safe(
                        survey.village
                    )}
                </td>

                <td>
                    ${safe(
                        survey.party
                    )}
                </td>

                <td>
                    ${safe(
                        survey.candidate
                    )}
                </td>

                <td>
                    ${safe(
                        survey.feedback
                    )}
                </td>

                <td>

                    <button
                        onclick="editSurvey('${survey.id}')"
                        style="
                            background:#1565c0;
                            color:white;
                            width:100%;
                        "
                    >
                        ✏️ Edit
                    </button>

                    <button
                        onclick="deleteSurvey('${survey.id}')"
                        style="
                            background:#c62828;
                            color:white;
                            width:100%;
                        "
                    >
                        🗑 Delete
                    </button>

                    <small>

                        Surveyor:
                        ${safe(

                            survey.surveyorEmail
                            ||
                            survey.surveyorId
                            ||
                            survey.createdBy
                            ||
                            "-"

                        )}

                        <br>

                        Date:

                        ${
                            surveyDate
                                ? surveyDate.toLocaleDateString(
                                    "en-IN"
                                )
                                : "-"
                        }

                    </small>

                </td>

            `;

            surveyTable.appendChild(
                row
            );

        }
    );

}

// ===============================
// FILTERED COUNTS
// ===============================

function updateFilteredCounts() {

    const total =
        filteredSurveys.length;

    let today = 0;

    let week = 0;

    let month = 0;

    filteredSurveys.forEach(
        function (survey) {

            const date =
                getSurveyDate(
                    survey
                );

            if (
                isToday(date)
            ) {

                today++;

            }

            if (
                isThisWeek(date)
            ) {

                week++;

            }

            if (
                isThisMonth(date)
            ) {

                month++;

            }

        }
    );

    setText(
        "filteredSurvey",
        total
    );

    setText(
        "todaySurvey",
        today
    );

    setText(
        "weekSurvey",
        week
    );

    setText(
        "monthSurvey",
        month
    );

}

// ===============================
// SURVEYOR PERFORMANCE
// ===============================

function updateSurveyorPerformance() {

    const performanceTable =
        document.getElementById(
            "surveyorPerformanceTable"
        );

    if (!performanceTable) {

        console.log(
            "surveyorPerformanceTable not found"
        );

        return;

    }

    const performance = {};

    allSurveys.forEach(
        function (survey) {

            const surveyor =

                survey.surveyorEmail

                ||

                survey.surveyorId

                ||

                survey.createdBy

                ||

                "Unknown";

            if (
                !performance[
                    surveyor
                ]
            ) {

                performance[
                    surveyor
                ] = {

                    total: 0,

                    today: 0,

                    week: 0,

                    month: 0

                };

            }

            performance[
                surveyor
            ].total++;

            const date =
                getSurveyDate(
                    survey
                );

            if (
                isToday(date)
            ) {

                performance[
                    surveyor
                ].today++;

            }

            if (
                isThisWeek(date)
            ) {

                performance[
                    surveyor
                ].week++;

            }

            if (
                isThisMonth(date)
            ) {

                performance[
                    surveyor
                ].month++;

            }

        }
    );

    performanceTable.innerHTML =
        "";

    const surveyors =
        Object.keys(
            performance
        ).sort();

    if (
        surveyors.length === 0
    ) {

        performanceTable.innerHTML =

            `<tr>

                <td colspan="5">

                    No surveyor data found.

                </td>

            </tr>`;

        return;

    }

    surveyors.forEach(
        function (surveyor) {

            const p =
                performance[
                    surveyor
                ];

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    ${safe(
                        surveyor
                    )}
                </td>

                <td>
                    <strong>
                        ${p.total}
                    </strong>
                </td>

                <td>
                    ${p.today}
                </td>

                <td>
                    ${p.week}
                </td>

                <td>
                    ${p.month}
                </td>

            `;

            performanceTable.appendChild(
                row
            );

        }
    );

}

// ===============================
// SAFE HTML
// ===============================

function safe(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}

// ===============================
// EDIT SURVEY
// ===============================

window.editSurvey =
    function (id) {

        const survey =
            allSurveys.find(
                function (item) {

                    return item.id === id;

                }
            );

        if (!survey) {

            alert(
                "Survey not found."
            );

            return;

        }

        const name =
            prompt(
                "Enter Name:",
                survey.name || ""
            );

        if (name === null)
            return;

        const village =
            prompt(
                "Enter Village:",
                survey.village || ""
            );

        if (village === null)
            return;

        const party =
            prompt(
                "Enter Party:",
                survey.party || ""
            );

        if (party === null)
            return;

        db.collection("surveys")
            .doc(id)
            .update({

                name:
                    name.trim(),

                village:
                    village.trim(),

                party:
                    party.trim()

            })
            .then(
                function () {

                    alert(
                        "Survey updated successfully."
                    );

                    loadSurveys();

                }
            )
            .catch(
                function (error) {

                    console.error(
                        error
                    );

                    alert(
                        "Update failed: " +
                        error.message
                    );

                }
            );

    };

// ===============================
// DELETE SURVEY
// ===============================

window.deleteSurvey =
    function (id) {

        const confirmDelete =
            confirm(
                "Are you sure you want to delete this survey?"
            );

        if (!confirmDelete)
            return;

        db.collection("surveys")
            .doc(id)
            .delete()
            .then(
                function () {

                    alert(
                        "Survey deleted successfully."
                    );

                    loadSurveys();

                }
            )
            .catch(
                function (error) {

                    console.error(
                        error
                    );

                    alert(
                        "Delete failed: " +
                        error.message
                    );

                }
            );

    };

// ===============================
// SEARCH EVENTS
// ===============================

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

// ===============================
// RESET
// ===============================

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

            if (villageFilter) {

                villageFilter.value = "";

            }

            if (assemblyFilter) {

                assemblyFilter.value = "";

            }

            if (surveyorFilter) {

                surveyorFilter.value = "";

            }

            filterTable();

        }
    );

}

// ===============================
// EXPORT EXCEL
// ===============================

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

                        const date =
                            getSurveyDate(
                                survey
                            );

                        return {

                            Name:
                                survey.name
                                || "",

                            Mobile:
                                survey.mobile
                                || "",

                            Age:
                                survey.age
                                || "",

                            Gender:
                                survey.gender
                                || "",

                            Village:
                                survey.village
                                || "",

                            Assembly:
                                survey.assembly
                                || "",

                            Party:
                                survey.party
                                || "",

                            Candidate:
                                survey.candidate
                                || "",

                            Feedback:
                                survey.feedback
                                || "",

                            Surveyor:

                                survey.surveyorEmail

                                ||

                                survey.surveyorId

                                ||

                                survey.createdBy

                                ||

                                "",

                            Date:

                                date

                                    ? date.toLocaleString(
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

// ===============================
// LOGOUT
// ===============================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            firebase.auth()
                .signOut()
                .then(
                    function () {

                        window.location.href =
                            "index.html";

                    }
                )
                .catch(
                    function (error) {

                        console.error(
                            error
                        );

                    }
                );

        }
    );

}
