// ======================================================
// SURVEYKSHAN - ADMIN.JS
// ======================================================

console.log("✅ Surveykshan Admin JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let partyChart = null;
let surveyorFilter = null;


// ======================================================
// DOM
// ======================================================

const surveyTable = document.getElementById("surveyTable");
const searchBox = document.getElementById("searchBox");
const partyFilter = document.getElementById("partyFilter");
const dateFilter = document.getElementById("dateFilter");
const villageFilter = document.getElementById("villageFilter");
const assemblyFilter = document.getElementById("assemblyFilter");
const resetFilters = document.getElementById("resetFilters");
const logoutBtn = document.getElementById("logoutBtn");
const exportExcel = document.getElementById("exportExcel");


// ======================================================
// SAFE TEXT
// ======================================================

function safe(value) {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================================
// SET TEXT
// ======================================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// ======================================================
// GET FIRESTORE DATE
// ======================================================

function getSurveyDate(data) {

    if (!data || !data.createdAt) {
        return null;
    }

    try {

        if (
            typeof data.createdAt.toDate === "function"
        ) {
            return data.createdAt.toDate();
        }

        if (
            data.createdAt.seconds !== undefined
        ) {
            return new Date(
                data.createdAt.seconds * 1000
            );
        }

        const date = new Date(data.createdAt);

        if (!isNaN(date.getTime())) {
            return date;
        }

    } catch (error) {

        console.error(
            "Date conversion error:",
            error
        );
    }

    return null;
}


// ======================================================
// GET SURVEYOR
// ======================================================

function getSurveyor(data) {

    return (
        data.surveyorEmail ||
        data.surveyorId ||
        data.createdBy ||
        "Unknown"
    );
}


// ======================================================
// AUTH CHECK
// ======================================================

auth.onAuthStateChanged(function (user) {

    console.log(
        "Auth:",
        user ? user.email : "Not logged in"
    );

    if (!user) {

        window.location.href = "index.html";
        return;
    }

    if (
        !user.email ||
        user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {

        alert(
            "Access Denied\n\nLogged in as: " +
            user.email
        );

        window.location.href = "survey.html";
        return;
    }

    console.log("✅ Admin Verified");

    initializeChart();

    createSurveyorFilter();

    createSurveyorPerformanceSection();

    loadSurveys();

});


// ======================================================
// CHART
// ======================================================

function initializeChart() {

    const canvas =
        document.getElementById("partyChart");

    if (!canvas) {

        console.warn(
            "partyChart not found"
        );

        return;
    }

    if (typeof Chart === "undefined") {

        console.warn(
            "Chart.js not loaded"
        );

        return;
    }

    try {

        const ctx =
            canvas.getContext("2d");

        partyChart =
            new Chart(ctx, {

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

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            });

        console.log("✅ Chart Created");

    } catch (error) {

        console.error(
            "Chart Error:",
            error
        );

        partyChart = null;
    }
}


// ======================================================
// LOAD SURVEYS
// ======================================================

function loadSurveys() {

    console.log(
        "🔄 Loading Firestore surveys..."
    );

    db.collection("surveys")
        .get()

        .then(function (snapshot) {

            console.log(
                "🔥 Surveys found:",
                snapshot.size
            );

            allSurveys = [];

            snapshot.forEach(function (doc) {

                const data = doc.data();

                allSurveys.push({

                    id: doc.id,

                    ...data

                });

            });


            // Newest first

            allSurveys.sort(function (a, b) {

                const dateA =
                    getSurveyDate(a);

                const dateB =
                    getSurveyDate(b);

                if (!dateA && !dateB) {
                    return 0;
                }

                if (!dateA) {
                    return 1;
                }

                if (!dateB) {
                    return -1;
                }

                return dateB - dateA;

            });


            updateDashboard();

            createVillageFilter();

            createAssemblyFilter();

            createSurveyorFilter();

            updateSurveyorPerformance();

            renderTable(allSurveys);


            console.log(
                "✅ Dashboard loaded successfully"
            );

        })

        .catch(function (error) {

            console.error(
                "❌ Firestore Error:",
                error
            );

            alert(
                "Firestore Error:\n\n" +
                error.message
            );

        });

}


// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {

    let total = 0;

    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;

    let today = 0;
    let week = 0;
    let month = 0;


    const now = new Date();


    const todayStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const weekStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6
        );


    const monthStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    allSurveys.forEach(function (data) {

        total++;


        const party =
            String(
                data.party || ""
            )
                .trim()
                .toLowerCase();


        if (party === "bjp") {

            bjp++;

        }

        else if (party === "congress") {

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


        const surveyDate =
            getSurveyDate(data);


        if (!surveyDate) {
            return;
        }


        if (surveyDate >= todayStart) {
            today++;
        }


        if (surveyDate >= weekStart) {
            week++;
        }


        if (surveyDate >= monthStart) {
            month++;
        }

    });


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
        "todayCount",
        today
    );

    setText(
        "weekSurvey",
        week
    );

    setText(
        "weekCount",
        week
    );

    setText(
        "monthSurvey",
        month
    );

    setText(
        "monthCount",
        month
    );


    // Chart

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


    console.log(
        "Dashboard:",
        {
            total,
            bjp,
            congress,
            aap,
            bsp,
            sp,
            other,
            today,
            week,
            month
        }
    );

}


// ======================================================
// SURVEYOR FILTER
// ======================================================

function createSurveyorFilter() {

    if (!surveyorFilter) {

        const filters =
            document.querySelector(".filters");

        if (!filters) {
            return;
        }


        surveyorFilter =
            document.createElement("select");

        surveyorFilter.id =
            "surveyorFilter";


        surveyorFilter.innerHTML = `
            <option value="">
                All Surveyors
            </option>
        `;


        if (assemblyFilter) {

            filters.insertBefore(
                surveyorFilter,
                assemblyFilter.nextSibling
            );

        }

        else {

            filters.appendChild(
                surveyorFilter
            );

        }


        surveyorFilter.addEventListener(
            "change",
            filterTable
        );

    }


    const currentValue =
        surveyorFilter.value;


    surveyorFilter.innerHTML = `
        <option value="">
            All Surveyors
        </option>
    `;


    const surveyors = [];


    allSurveys.forEach(function (data) {

        const surveyor =
            getSurveyor(data);


        if (
            surveyor &&
            !surveyors.includes(surveyor)
        ) {

            surveyors.push(
                surveyor
            );

        }

    });


    surveyors.sort();


    surveyors.forEach(function (surveyor) {

        const option =
            document.createElement("option");

        option.value =
            surveyor;

        option.textContent =
            surveyor;

        surveyorFilter.appendChild(
            option
        );

    });


    if (
        surveyors.includes(currentValue)
    ) {

        surveyorFilter.value =
            currentValue;

    }

}


// ======================================================
// SURVEYOR PERFORMANCE SECTION
// ======================================================

function createSurveyorPerformanceSection() {

    if (
        document.getElementById(
            "surveyorPerformance"
        )
    ) {

        return;
    }


    const container =
        document.querySelector(".container");


    if (!container) {
        return;
    }


    const section =
        document.createElement("div");


    section.id =
        "surveyorPerformance";


    section.style.margin =
        "20px 0";


    section.innerHTML = `

        <div style="
            background:white;
            padding:20px;
            border-radius:10px;
            box-shadow:0 2px 10px rgba(0,0,0,.12);
        ">

            <h2 style="
                margin-top:0;
                color:#1565c0;
            ">
                👤 Surveyor Performance
            </h2>

            <div style="
                overflow-x:auto;
            ">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                ">

                    <thead>

                        <tr>

                            <th style="
                                background:#1565c0;
                                color:white;
                                padding:10px;
                            ">
                                Surveyor
                            </th>

                            <th style="
                                background:#1565c0;
                                color:white;
                                padding:10px;
                            ">
                                Total Surveys
                            </th>

                            <th style="
                                background:#1565c0;
                                color:white;
                                padding:10px;
                            ">
                                Today
                            </th>

                            <th style="
                                background:#1565c0;
                                color:white;
                                padding:10px;
                            ">
                                This Week
                            </th>

                        </tr>

                    </thead>

                    <tbody id="surveyorTable">

                    </tbody>

                </table>

            </div>

        </div>

    `;


    const chart =
        document.getElementById(
            "partyChart"
        );


    if (chart) {

        container.insertBefore(
            section,
            chart
        );

    }

    else {

        container.prepend(
            section
        );

    }

}


// ======================================================
// SURVEYOR PERFORMANCE
// ======================================================

function updateSurveyorPerformance() {

    const table =
        document.getElementById(
            "surveyorTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML = "";


    const now = new Date();


    const todayStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const weekStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6
        );


    const stats = {};


    allSurveys.forEach(function (data) {

        const surveyor =
            getSurveyor(data);


        if (!stats[surveyor]) {

            stats[surveyor] = {

                total: 0,

                today: 0,

                week: 0

            };

        }


        stats[surveyor].total++;


        const date =
            getSurveyDate(data);


        if (!date) {
            return;
        }


        if (date >= todayStart) {

            stats[surveyor].today++;

        }


        if (date >= weekStart) {

            stats[surveyor].week++;

        }

    });


    const surveyors =
        Object.keys(stats).sort();


    if (surveyors.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="4"
                    style="
                        padding:20px;
                        text-align:center;
                    ">

                    No Surveyor Data

                </td>

            </tr>

        `;

        return;
    }


    surveyors.forEach(function (surveyor) {

        const data =
            stats[surveyor];


        table.innerHTML += `

            <tr>

                <td style="
                    padding:10px;
                    border:1px solid #ddd;
                ">
                    ${safe(surveyor)}
                </td>

                <td style="
                    padding:10px;
                    border:1px solid #ddd;
                    text-align:center;
                ">
                    ${data.total}
                </td>

                <td style="
                    padding:10px;
                    border:1px solid #ddd;
                    text-align:center;
                ">
                    ${data.today}
                </td>

                <td style="
                    padding:10px;
                    border:1px solid #ddd;
                    text-align:center;
                ">
                    ${data.week}
                </td>

            </tr>

        `;

    });

}


// ======================================================
// TABLE
// ======================================================

function renderTable(surveys) {

    if (!surveyTable) {
        return;
    }


    surveyTable.innerHTML = "";


    if (surveys.length === 0) {

        surveyTable.innerHTML = `

            <tr>

                <td colspan="9"
                    style="
                        padding:30px;
                        text-align:center;
                    ">

                    No Survey Found

                </td>

            </tr>

        `;

        return;
    }


    surveys.forEach(function (data) {

        surveyTable.innerHTML += `

            <tr>

                <td>
                    ${safe(data.name)}
                </td>

                <td>
                    ${safe(data.mobile)}
                </td>

                <td>
                    ${safe(data.age)}
                </td>

                <td>
                    ${safe(data.gender)}
                </td>

                <td>
                    ${safe(data.village)}
                </td>

                <td>
                    ${safe(data.party)}
                </td>

                <td>
                    ${safe(data.candidate)}
                </td>

                <td>
                    ${safe(data.feedback)}
                </td>

                <td>

                    <button
                        onclick="editSurvey('${data.id}')">
                        ✏️ Edit
                    </button>

                    <button
                        onclick="deleteSurvey('${data.id}')">
                        🗑 Delete
                    </button>

                </td>

            </tr>

        `;

    });

}


// ======================================================
// FILTER
// ======================================================

function filterTable() {

    const search =
        searchBox
            ? searchBox.value
                .toLowerCase()
                .trim()
            : "";


    const party =
        partyFilter
            ? partyFilter.value
                .toLowerCase()
                .trim()
            : "";


    const dateValue =
        dateFilter
            ? dateFilter.value
            : "";


    const village =
        villageFilter
            ? villageFilter.value
                .toLowerCase()
                .trim()
            : "";


    const assembly =
        assemblyFilter
            ? assemblyFilter.value
                .toLowerCase()
                .trim()
            : "";


    const surveyor =
        surveyorFilter
            ? surveyorFilter.value
                .toLowerCase()
                .trim()
            : "";


    const now = new Date();


    const todayStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const yesterdayStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
        );


    const weekStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6
        );


    const monthStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    const filtered =
        allSurveys.filter(function (data) {


            // SEARCH

            const text = [

                data.name || "",
                data.mobile || "",
                data.village || "",
                data.assembly || "",
                data.party || "",
                data.candidate || "",
                data.feedback || "",
                getSurveyor(data)

            ]
                .join(" ")
                .toLowerCase();


            if (
                search &&
                !text.includes(search)
            ) {

                return false;

            }


            // PARTY

            const rowParty =
                String(
                    data.party || ""
                )
                    .toLowerCase()
                    .trim();


            if (
                party &&
                rowParty !== party
            ) {

                return false;

            }


            // VILLAGE

            const rowVillage =
                String(
                    data.village || ""
                )
                    .toLowerCase()
                    .trim();


            if (
                village &&
                rowVillage !== village
            ) {

                return false;

            }


            // ASSEMBLY

            const rowAssembly =
                String(
                    data.assembly || ""
                )
                    .toLowerCase()
                    .trim();


            if (
                assembly &&
                rowAssembly !== assembly
            ) {

                return false;

            }


            // SURVEYOR

            const rowSurveyor =
                getSurveyor(data)
                    .toLowerCase()
                    .trim();


            if (
                surveyor &&
                rowSurveyor !== surveyor
            ) {

                return false;

            }


            // DATE

            if (dateValue) {

                const surveyDate =
                    getSurveyDate(data);


                if (!surveyDate) {

                    return false;

                }


                if (
                    dateValue === "today"
                ) {

                    if (
                        surveyDate <
                        todayStart
                    ) {

                        return false;

                    }

                }


                else if (
                    dateValue === "yesterday"
                ) {

                    if (
                        surveyDate <
                        yesterdayStart ||
                        surveyDate >=
                        todayStart
                    ) {

                        return false;

                    }

                }


                else if (
                    dateValue === "week"
                ) {

                    if (
                        surveyDate <
                        weekStart
                    ) {

                        return false;

                    }

                }


                else if (
                    dateValue === "month"
                ) {

                    if (
                        surveyDate <
                        monthStart
                    ) {

                        return false;

                    }

                }

            }


            return true;

        });


    renderTable(filtered);

}


// ======================================================
// EVENTS
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


// ======================================================
// RESET
// ======================================================

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


            renderTable(
                allSurveys
            );

        }
    );

}


// ======================================================
// VILLAGE FILTER
// ======================================================

function createVillageFilter() {

    if (!villageFilter) {
        return;
    }


    const current =
        villageFilter.value;


    villageFilter.innerHTML = `

        <option value="">
            All Villages
        </option>

    `;


    const villages = [];


    allSurveys.forEach(function (data) {

        if (
            data.village &&
            !villages.includes(
                String(data.village)
            )
        ) {

            villages.push(
                String(data.village)
            );

        }

    });


    villages.sort();


    villages.forEach(function (village) {

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

    });


    if (
        villages.includes(current)
    ) {

        villageFilter.value =
            current;

    }

}


// ======================================================
// ASSEMBLY FILTER
// ======================================================

function createAssemblyFilter() {

    if (!assemblyFilter) {
        return;
    }


    const current =
        assemblyFilter.value;


    assemblyFilter.innerHTML = `

        <option value="">
            All Assemblies
        </option>

    `;


    const assemblies = [];


    allSurveys.forEach(function (data) {

        if (
            data.assembly &&
            !assemblies.includes(
                String(data.assembly)
            )
        ) {

            assemblies.push(
                String(data.assembly)
            );

        }

    });


    assemblies.sort();


    assemblies.forEach(function (assembly) {

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

    });


    if (
        assemblies.includes(current)
    ) {

        assemblyFilter.value =
            current;

    }

}


// ======================================================
// LOGOUT
// ======================================================

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
                        "Logout Error:\n\n" +
                        error.message
                    );

                });

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
                    "Excel library load nahi hui."
                );

                return;

            }


            if (
                allSurveys.length === 0
            ) {

                alert(
                    "No survey data available."
                );

                return;

            }


            const exportData =
                allSurveys.map(
                    function (data) {

                        const date =
                            getSurveyDate(data);


                        return {

                            Name:
                                data.name || "",

                            Mobile:
                                data.mobile || "",

                            Age:
                                data.age || "",

                            Gender:
                                data.gender || "",

                            Village:
                                data.village || "",

                            Assembly:
                                data.assembly || "",

                            Party:
                                data.party || "",

                            Candidate:
                                data.candidate || "",

                            Feedback:
                                data.feedback || "",

                            Surveyor:
                                getSurveyor(data),

                            SurveyorEmail:
                                data.surveyorEmail || "",

                            SurveyorId:
                                data.surveyorId || "",

                            CreatedBy:
                                data.createdBy || "",

                            CreatedAt:
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
                    exportData
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

        }
    );

}


// ======================================================
// DELETE SURVEY
// ======================================================

function deleteSurvey(id) {

    if (
        !confirm(
            "Kya aap is survey ko delete karna chahte hain?"
        )
    ) {

        return;

    }


    db.collection("surveys")
        .doc(id)
        .delete()

        .then(function () {

            alert(
                "✅ Survey Delete Ho Gaya"
            );

            loadSurveys();

        })

        .catch(function (error) {

            alert(
                "❌ Delete Error:\n\n" +
                error.message
            );

        });

}


// ======================================================
// EDIT SURVEY
// ======================================================

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


            const data =
                doc.data();


            const name =
                prompt(
                    "Edit Name",
                    data.name || ""
                );


            if (name === null) return;


            const mobile =
                prompt(
                    "Edit Mobile",
                    data.mobile || ""
                );


            if (mobile === null) return;


            const age =
                prompt(
                    "Edit Age",
                    data.age || ""
                );


            if (age === null) return;


            const gender =
                prompt(
                    "Edit Gender",
                    data.gender || ""
                );


            if (gender === null) return;


            const village =
                prompt(
                    "Edit Village",
                    data.village || ""
                );


            if (village === null) return;


            const assembly =
                prompt(
                    "Edit Assembly",
                    data.assembly || ""
                );


            if (assembly === null) return;


            const party =
                prompt(
                    "Edit Party",
                    data.party || ""
                );


            if (party === null) return;


            const candidate =
                prompt(
                    "Edit Candidate",
                    data.candidate || ""
                );


            if (candidate === null) return;


            const feedback =
                prompt(
                    "Edit Feedback",
                    data.feedback || ""
                );


            if (feedback === null) return;


            db.collection("surveys")
                .doc(id)
                .update({

                    name:
                        name.trim(),

                    mobile:
                        mobile.trim(),

                    age:
                        Number(age),

                    gender:
                        gender.trim(),

                    village:
                        village.trim(),

                    assembly:
                        assembly.trim(),

                    party:
                        party.trim(),

                    candidate:
                        candidate.trim(),

                    feedback:
                        feedback.trim()

                })

                .then(function () {

                    alert(
                        "✅ Survey Updated Successfully"
                    );

                    loadSurveys();

                })

                .catch(function (error) {

                    alert(
                        "❌ Update Error:\n\n" +
                        error.message
                    );

                });

        })

        .catch(function (error) {

            alert(
                "❌ Error:\n\n" +
                error.message
            );

        });

}


// ======================================================
// READY
// ======================================================

console.log(
    "🚀 Surveykshan Admin Panel Ready"
);
