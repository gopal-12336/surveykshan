console.log("Admin JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allSurveyors = [];
let partyChart = null;


// =====================================
// ADMIN AUTH
// =====================================

firebase.auth().setPersistence(
    firebase.auth.Auth.Persistence.SESSION
)
.then(function () {

    firebase.auth().onAuthStateChanged(function (user) {

        if (!user) {
            window.location.replace("index.html");
            return;
        }

        if (
            !user.email ||
            user.email.toLowerCase() !==
            ADMIN_EMAIL.toLowerCase()
        ) {
            window.location.replace("survey.html");
            return;
        }

        console.log("Admin logged in:", user.email);

        loadDailyLimit();
        loadSurveyors();
        loadSurveys();

    });

})
.catch(function (error) {

    console.error(
        "Auth persistence error:",
        error
    );

});


// =====================================
// HELPER - DATE
// =====================================

function getDate(value) {

    if (!value) return null;

    try {

        if (
            typeof value.toDate === "function"
        ) {
            return value.toDate();
        }

        if (value.seconds) {
            return new Date(
                value.seconds * 1000
            );
        }

        if (value instanceof Date) {
            return value;
        }

        return new Date(value);

    } catch (error) {

        return null;

    }
}


// =====================================
// DATE CHECKS
// =====================================

function isToday(date) {

    if (!date) return false;

    const now = new Date();

    return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}


function isThisWeek(date) {

    if (!date) return false;

    const now = new Date();

    const start = new Date(now);

    const day = start.getDay();

    const diff =
        day === 0 ? 6 : day - 1;

    start.setDate(
        start.getDate() - diff
    );

    start.setHours(0, 0, 0, 0);

    return date >= start;

}


function isThisMonth(date) {

    if (!date) return false;

    const now = new Date();

    return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );

}


// =====================================
// LOAD SURVEYS
// =====================================

function loadSurveys() {

    db.collection("surveys")
        .get()

        .then(function (snapshot) {

            allSurveys = [];

            snapshot.forEach(function (doc) {

                allSurveys.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            console.log(
                "Surveys loaded:",
                allSurveys.length
            );

            updateDashboard();
            populateFilters();
            renderSurveys(allSurveys);
            renderSurveyorPerformance();
            renderPartyChart();

        })

        .catch(function (error) {

            console.error(
                "Survey Load Error:",
                error
            );

            alert(
                "Unable to load surveys: " +
                error.message
            );

        });

}


// =====================================
// LOAD SURVEYORS
// =====================================

function loadSurveyors() {

    db.collection("surveyors")
        .get()

        .then(function (snapshot) {

            allSurveyors = [];

            snapshot.forEach(function (doc) {

                allSurveyors.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            console.log(
                "Surveyors loaded:",
                allSurveyors.length
            );

            renderSurveyorManagement();
            populateSurveyorFilter();
            renderSurveyorPerformance();

        })

        .catch(function (error) {

            console.error(
                "Surveyor Load Error:",
                error
            );

        });

}


// =====================================
// DASHBOARD COUNTERS
// =====================================

function updateDashboard() {

    let total = allSurveys.length;

    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;

    let today = 0;
    let week = 0;
    let month = 0;


    allSurveys.forEach(function (survey) {

        const party =
            String(
                survey.party || ""
            ).toLowerCase();


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


        const date =
            getDate(survey.createdAt);


        if (isToday(date)) {
            today++;
        }

        if (isThisWeek(date)) {
            week++;
        }

        if (isThisMonth(date)) {
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
        "weekSurvey",
        week
    );

    setText(
        "monthSurvey",
        month
    );

    setText(
        "filteredSurvey",
        allSurveys.length
    );

}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


// =====================================
// FILTER OPTIONS
// =====================================

function populateFilters() {

    const villages = new Set();
    const assemblies = new Set();

    allSurveys.forEach(function (survey) {

        if (survey.village) {
            villages.add(survey.village);
        }

        if (survey.assembly) {
            assemblies.add(survey.assembly);
        }

    });


    const villageFilter =
        document.getElementById(
            "villageFilter"
        );

    const assemblyFilter =
        document.getElementById(
            "assemblyFilter"
        );


    if (villageFilter) {

        villageFilter.innerHTML =
            '<option value="">All Villages</option>';

        [...villages]
            .sort()
            .forEach(function (village) {

                villageFilter.innerHTML +=
                    `<option value="${escapeHTML(village)}">
                        ${escapeHTML(village)}
                    </option>`;

            });

    }


    if (assemblyFilter) {

        assemblyFilter.innerHTML =
            '<option value="">All Assemblies</option>';

        [...assemblies]
            .sort()
            .forEach(function (assembly) {

                assemblyFilter.innerHTML +=
                    `<option value="${escapeHTML(assembly)}">
                        ${escapeHTML(assembly)}
                    </option>`;

            });

    }

}


function populateSurveyorFilter() {

    const filter =
        document.getElementById(
            "surveyorFilter"
        );

    if (!filter) return;


    filter.innerHTML =
        '<option value="">All Surveyors</option>';


    allSurveyors
        .sort(function (a, b) {

            return String(a.email || a.id)
                .localeCompare(
                    String(b.email || b.id)
                );

        })
        .forEach(function (surveyor) {

            const email =
                surveyor.email ||
                surveyor.id;

            filter.innerHTML +=
                `<option value="${escapeHTML(email)}">
                    ${escapeHTML(email)}
                </option>`;

        });

}


// =====================================
// APPLY FILTERS
// =====================================

function applyFilters() {

    const search =
        (
            document.getElementById(
                "searchBox"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const party =
        document.getElementById(
            "partyFilter"
        )?.value || "";


    const date =
        document.getElementById(
            "dateFilter"
        )?.value || "";


    const village =
        document.getElementById(
            "villageFilter"
        )?.value || "";


    const assembly =
        document.getElementById(
            "assemblyFilter"
        )?.value || "";


    const surveyor =
        document.getElementById(
            "surveyorFilter"
        )?.value || "";


    const filtered =
        allSurveys.filter(function (survey) {

            const searchText = (

                String(
                    survey.name || ""
                ) +

                " " +

                String(
                    survey.mobile || ""
                ) +

                " " +

                String(
                    survey.village || ""
                ) +

                " " +

                String(
                    survey.assembly || ""
                )

            ).toLowerCase();


            if (
                search &&
                !searchText.includes(search)
            ) {
                return false;
            }


            if (
                party &&
                survey.party !== party
            ) {
                return false;
            }


            if (
                village &&
                survey.village !== village
            ) {
                return false;
            }


            if (
                assembly &&
                survey.assembly !== assembly
            ) {
                return false;
            }


            if (
                surveyor &&
                survey.surveyorEmail !== surveyor
            ) {
                return false;
            }


            const created =
                getDate(
                    survey.createdAt
                );


            if (
                date === "today" &&
                !isToday(created)
            ) {
                return false;
            }


            if (
                date === "week" &&
                !isThisWeek(created)
            ) {
                return false;
            }


            if (
                date === "month" &&
                !isThisMonth(created)
            ) {
                return false;
            }


            return true;

        });


    setText(
        "filteredSurvey",
        filtered.length
    );


    renderSurveys(filtered);

}


// =====================================
// RESET FILTERS
// =====================================

function resetFilters() {

    const ids = [
        "searchBox",
        "partyFilter",
        "dateFilter",
        "villageFilter",
        "assemblyFilter",
        "surveyorFilter"
    ];


    ids.forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });


    renderSurveys(allSurveys);

    setText(
        "filteredSurvey",
        allSurveys.length
    );

}


// =====================================
// RENDER SURVEYS
// =====================================

function renderSurveys(surveys) {

    const table =
        document.getElementById(
            "surveyTable"
        );

    if (!table) return;


    table.innerHTML = "";


    if (surveys.length === 0) {

        table.innerHTML =
            `<tr>
                <td colspan="9">
                    No surveys found.
                </td>
            </tr>`;

        return;

    }


    surveys.forEach(function (survey) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>${escapeHTML(survey.name)}</td>

            <td>${escapeHTML(survey.mobile)}</td>

            <td>${escapeHTML(survey.age)}</td>

            <td>${escapeHTML(survey.gender)}</td>

            <td>${escapeHTML(survey.village)}</td>

            <td>${escapeHTML(survey.party)}</td>

            <td>${escapeHTML(survey.candidate)}</td>

            <td>${escapeHTML(survey.feedback)}</td>

            <td>

                <button
                    class="action-btn edit-btn"
                    onclick="editSurvey('${survey.id}')">
                    ✏️ Edit
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteSurvey('${survey.id}')">
                    🗑️ Delete
                </button>

            </td>

        `;


        table.appendChild(row);

    });

}


// =====================================
// EDIT SURVEY
// =====================================

window.editSurvey = function (id) {

    const survey =
        allSurveys.find(function (item) {

            return item.id === id;

        });


    if (!survey) {
        alert("Survey not found.");
        return;
    }


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

            age: age.trim(),

            village: village.trim(),

            assembly: assembly.trim(),

            party: party.trim(),

            candidate: candidate.trim(),

            feedback: feedback.trim()

        })

        .then(function () {

            alert(
                "Survey updated successfully."
            );

            loadSurveys();

        })

        .catch(function (error) {

            console.error(
                "Update Error:",
                error
            );

            alert(
                "Update failed: " +
                error.message
            );

        });

};


// =====================================
// DELETE SURVEY
// =====================================

window.deleteSurvey = function (id) {

    if (
        !confirm(
            "Are you sure you want to delete this survey?"
        )
    ) {
        return;
    }


    db.collection("surveys")
        .doc(id)
        .delete()

        .then(function () {

            alert(
                "Survey deleted successfully."
            );

            loadSurveys();

        })

        .catch(function (error) {

            console.error(
                "Delete Error:",
                error
            );

            alert(
                "Delete failed: " +
                error.message
            );

        });

};


// =====================================
// SURVEYOR PERFORMANCE
// =====================================

function renderSurveyorPerformance() {

    const table =
        document.getElementById(
            "surveyorPerformanceTable"
        );

    if (!table) return;


    table.innerHTML = "";


    const emails = new Set();


    allSurveyors.forEach(function (surveyor) {

        emails.add(
            surveyor.email ||
            surveyor.id
        );

    });


    allSurveys.forEach(function (survey) {

        if (survey.surveyorEmail) {

            emails.add(
                survey.surveyorEmail
            );

        }

    });


    [...emails]
        .sort()
        .forEach(function (email) {

            let total = 0;
            let today = 0;
            let week = 0;
            let month = 0;


            allSurveys.forEach(function (survey) {

                if (
                    survey.surveyorEmail !==
                    email
                ) {
                    return;
                }


                total++;


                const date =
                    getDate(
                        survey.createdAt
                    );


                if (isToday(date)) {
                    today++;
                }

                if (isThisWeek(date)) {
                    week++;
                }

                if (isThisMonth(date)) {
                    month++;
                }

            });


            table.innerHTML += `

                <tr>

                    <td>
                        ${escapeHTML(email)}
                    </td>

                    <td>${total}</td>

                    <td>${today}</td>

                    <td>${week}</td>

                    <td>${month}</td>

                </tr>

            `;

        });

}


// =====================================
// SURVEYOR MANAGEMENT
// =====================================

function renderSurveyorManagement() {

    const table =
        document.getElementById(
            "surveyorManagementTable"
        );

    if (!table) return;


    table.innerHTML = "";


    allSurveyors
        .sort(function (a, b) {

            return String(a.email || a.id)
                .localeCompare(
                    String(b.email || b.id)
                );

        })
        .forEach(function (surveyor) {

            const email =
                surveyor.email ||
                surveyor.id;


            let total = 0;
            let today = 0;
            let week = 0;
            let month = 0;


            allSurveys.forEach(function (survey) {

                if (
                    survey.surveyorEmail !==
                    email
                ) {
                    return;
                }


                total++;


                const date =
                    getDate(
                        survey.createdAt
                    );


                if (isToday(date)) {
                    today++;
                }

                if (isThisWeek(date)) {
                    week++;
                }

                if (isThisMonth(date)) {
                    month++;
                }

            });


            const enabled =
                surveyor.enabled === true;


            const status =
                enabled

                    ? `<span class="status-active">
                        🟢 Active
                       </span>`

                    : `<span class="status-disabled">
                        🔴 Disabled
                       </span>`;


            const action =
                enabled

                    ? `<button
                        class="action-btn disable-btn"
                        onclick="toggleSurveyor('${escapeHTML(email)}', false)">
                        Disable
                       </button>`

                    : `<button
                        class="action-btn enable-btn"
                        onclick="toggleSurveyor('${escapeHTML(email)}', true)">
                        Enable
                       </button>`;


            table.innerHTML += `

                <tr>

                    <td>
                        ${escapeHTML(email)}
                    </td>

                    <td>${total}</td>

                    <td>${today}</td>

                    <td>${week}</td>

                    <td>${month}</td>

                    <td>

                        ${status}

                        ${action}

                    </td>

                </tr>

            `;

        });

}


// =====================================
// ENABLE / DISABLE SURVEYOR
// =====================================

window.toggleSurveyor = function (
    email,
    enabled
) {

    db.collection("surveyors")
        .doc(email)
        .update({

            enabled: enabled

        })

        .then(function () {

            alert(
                enabled
                    ? "Surveyor enabled."
                    : "Surveyor disabled."
            );

            loadSurveyors();

        })

        .catch(function (error) {

            console.error(
                "Surveyor Status Error:",
                error
            );

            alert(
                "Status update failed: " +
                error.message
            );

        });

};


// =====================================
// PARTY CHART
// =====================================

function renderPartyChart() {

    const canvas =
        document.getElementById(
            "partyChart"
        );

    if (!canvas) return;


    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let bsp = 0;
    let sp = 0;
    let other = 0;


    allSurveys.forEach(function (survey) {

        switch (
            String(
                survey.party || ""
            ).toLowerCase()
        ) {

            case "bjp":
                bjp++;
                break;

            case "congress":
                congress++;
                break;

            case "aap":
                aap++;
                break;

            case "bsp":
                bsp++;
                break;

            case "sp":
                sp++;
                break;

            default:
                other++;
                break;

        }

    });


    if (partyChart) {

        partyChart.destroy();

    }


    partyChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: [
                        "BJP",
                        "Congress",
                        "AAP",
                        "BSP",
                        "SP",
                        "Other"
                    ],

                    datasets: [

                        {

                            label:
                                "Surveys",

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

                    maintainAspectRatio: true,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            }

                        }

                    }

                }

            }
        );

}


// =====================================
// DAILY LIMIT
// =====================================

function loadDailyLimit() {

    const input =
        document.getElementById(
            "dailyLimitInput"
        );

    if (!input) {
        console.error(
            "Daily limit input not found."
        );
        return;
    }


    db.collection("settings")
        .doc("config")
        .get()

        .then(function (doc) {

            if (
                doc.exists &&
                doc.data().dailyLimit !== undefined
            ) {

                input.value =
                    Number(
                        doc.data().dailyLimit
                    );

            }
            else {

                input.value = 20;

            }

        })

        .catch(function (error) {

            console.error(
                "Daily Limit Load Error:",
                error
            );

        });

}


// SAVE DAILY LIMIT

function saveDailyLimit() {

    const input =
        document.getElementById(
            "dailyLimitInput"
        );

    const button =
        document.getElementById(
            "saveDailyLimit"
        );

    const message =
        document.getElementById(
            "limitMessage"
        );


    if (!input || !button) {

        console.error(
            "Daily limit elements not found."
        );

        return;

    }


    const limit =
        Number(input.value);


    if (
        !Number.isFinite(limit) ||
        limit < 1
    ) {

        if (message) {

            message.textContent =
                "Enter a valid limit.";

            message.style.color =
                "red";

        }

        return;

    }


    const user =
        firebase.auth().currentUser;


    if (!user) {

        if (message) {

            message.textContent =
                "Admin login required.";

            message.style.color =
                "red";

        }

        return;

    }


    if (
        user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {

        if (message) {

            message.textContent =
                "Only Admin can change the limit.";

            message.style.color =
                "red";

        }

        return;

    }


    button.disabled = true;

    button.textContent =
        "Saving...";


    if (message) {
        message.textContent = "";
    }


    db.collection("settings")
        .doc("config")
        .set({

            dailyLimit: limit,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        }, {
            merge: true
        })

        .then(function () {

            console.log(
                "Daily Limit Saved:",
                limit
            );


            if (message) {

                message.textContent =
                    "✅ Limit saved: " +
                    limit;

                message.style.color =
                    "green";

            }


            button.disabled = false;

            button.textContent =
                "💾 Save Limit";

        })

        .catch(function (error) {

            console.error(
                "Daily Limit Save Error:",
                error
            );


            if (message) {

                message.textContent =
                    "❌ " +
                    error.message;

                message.style.color =
                    "red";

            }


            button.disabled = false;

            button.textContent =
                "💾 Save Limit";

        });

}


// =====================================
// FILTER EVENT LISTENERS
// =====================================

[
    "searchBox",
    "partyFilter",
    "dateFilter",
    "villageFilter",
    "assemblyFilter",
    "surveyorFilter"
]
.forEach(function (id) {

    const element =
        document.getElementById(id);

    if (!element) return;


    element.addEventListener(
        "input",
        applyFilters
    );

    element.addEventListener(
        "change",
        applyFilters
    );

});


// RESET

const resetBtn =
    document.getElementById(
        "resetFilters"
    );

if (resetBtn) {

    resetBtn.addEventListener(
        "click",
        resetFilters
    );

}


// SAVE LIMIT

const saveLimitBtn =
    document.getElementById(
        "saveDailyLimit"
    );

if (saveLimitBtn) {

    saveLimitBtn.addEventListener(
        "click",
        saveDailyLimit
    );

}


// =====================================
// EXCEL EXPORT
// =====================================

const exportBtn =
    document.getElementById(
        "exportExcel"
    );


if (exportBtn) {

    exportBtn.addEventListener(
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


            const rows =
                allSurveys.map(
                    function (survey) {

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
                                survey.surveyorEmail || "",

                            Date:
                                getDate(
                                    survey.createdAt
                                )
                                    ?.toLocaleString() || ""

                        };

                    }
                );


            const worksheet =
                XLSX.utils.json_to_sheet(
                    rows
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


// =====================================
// LOGOUT
// =====================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            firebase.auth()
                .signOut()

                .then(function () {

                    window.location.replace(
                        "index.html"
                    );

                })

                .catch(function (error) {

                    console.error(
                        "Logout Error:",
                        error
                    );

                });

        }
    );

}


// =====================================
// HTML ESCAPE
// =====================================

function escapeHTML(value) {

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
