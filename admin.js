// ======================================================
// SURVEYKSHAN - FINAL ADMIN.JS
// ======================================================

console.log("✅ Surveykshan Admin JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let partyChart = null;

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

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ======================================================
// HTML ESCAPE
// ======================================================

function safe(value) {
    if (value === undefined || value === null) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ======================================================
// FIRESTORE DATE
// ======================================================

function getSurveyDate(data) {
    if (!data || !data.createdAt) return null;

    try {
        if (typeof data.createdAt.toDate === "function") {
            return data.createdAt.toDate();
        }

        if (data.createdAt.seconds !== undefined) {
            return new Date(data.createdAt.seconds * 1000);
        }

        const date = new Date(data.createdAt);

        if (!isNaN(date.getTime())) {
            return date;
        }
    } catch (error) {
        console.error("Date conversion error:", error);
    }

    return null;
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
        user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {
        window.location.href = "survey.html";
        return;
    }

    console.log("Admin logged in:", user.email);

    loadSurveys();
    createVillageFilter();
    createAssemblyFilter();
});

// ======================================================
// LOAD SURVEYS
// ======================================================

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
                "Surveys Loaded:",
                allSurveys.length
            );

            createVillageFilter();
            createAssemblyFilter();

            filterTable();

            updateDashboard();

        })

        .catch(function (error) {

            console.error(
                "Survey loading error:",
                error
            );

        });

}

// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {

    let total = allSurveys.length;
    let today = 0;
    let week = 0;
    let month = 0;

    allSurveys.forEach(function (data) {

        const date = getSurveyDate(data);

        if (!date) return;

        if (isToday(date)) today++;
        if (isThisWeek(date)) week++;
        if (isThisMonth(date)) month++;

    });

    setText("totalSurvey", total);
    setText("todaySurvey", today);
    setText("weekSurvey", week);
    setText("monthSurvey", month);

}

// ======================================================
// DATE CHECKS
// ======================================================

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
    const diff = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - diff);
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

// ======================================================
// TABLE
// ======================================================

function renderTable(surveys) {

    if (!surveyTable) return;

    surveyTable.innerHTML = "";

    if (surveys.length === 0) {

        surveyTable.innerHTML = `
            <tr>
                <td colspan="7"
                    style="padding:30px;text-align:center;">
                    No Survey Found
                </td>
            </tr>
        `;

        return;
    }

    surveys.forEach(function (data) {

        surveyTable.innerHTML += `

        <tr>

            <td>${safe(data.name)}</td>

            <td>${safe(data.mobile)}</td>

            <td>${safe(data.age)}</td>

            <td>${safe(data.gender)}</td>

            <td>${safe(data.village)}</td>

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

    hidePartyCandidateHeaders();

}

// ======================================================
// REMOVE ONLY PARTY & CANDIDATE HEADERS
// ======================================================

function hidePartyCandidateHeaders() {

    const table =
        surveyTable
            ? surveyTable.closest("table")
            : null;

    if (!table) return;

    const headers =
        table.querySelectorAll("thead th");

    headers.forEach(function (th) {

        const text =
            th.textContent
                .trim()
                .toLowerCase();

        if (
            text === "party" ||
            text === "candidate"
        ) {
            th.style.display = "none";
        }

    });

}

// ======================================================
// FILTER
// ======================================================

function filterTable() {

    const search =
        searchBox
            ? searchBox.value.toLowerCase().trim()
            : "";

    const party =
        partyFilter
            ? partyFilter.value.toLowerCase().trim()
            : "";

    const dateFilterValue =
        dateFilter
            ? dateFilter.value
            : "";

    const village =
        villageFilter
            ? villageFilter.value.toLowerCase().trim()
            : "";

    const assembly =
        assemblyFilter
            ? assemblyFilter.value.toLowerCase().trim()
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

            const text = [

                data.name || "",
                data.mobile || "",
                data.village || "",
                data.assembly || "",
                data.party || "",
                data.candidate || "",
                data.feedback || ""

            ]
                .join(" ")
                .toLowerCase();

            if (
                search &&
                !text.includes(search)
            ) {
                return false;
            }

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

            if (dateFilterValue) {

                const surveyDate =
                    getSurveyDate(data);

                if (!surveyDate) {
                    return false;
                }

                if (
                    dateFilterValue === "today"
                ) {

                    if (
                        surveyDate <
                        todayStart
                    ) {
                        return false;
                    }

                }

                else if (
                    dateFilterValue === "yesterday"
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
                    dateFilterValue === "week"
                ) {

                    if (
                        surveyDate <
                        weekStart
                    ) {
                        return false;
                    }

                }

                else if (
                    dateFilterValue === "month"
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

    setText(
        "showingCount",
        filtered.length +
        " / " +
        allSurveys.length
    );

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

            renderTable(allSurveys);

        }
    );

}

// ======================================================
// VILLAGE FILTER
// ======================================================

function createVillageFilter() {

    if (!villageFilter) return;

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
            document.createElement("option");

        option.value = village;
        option.textContent = village;

        villageFilter.appendChild(option);

    });

}

// ======================================================
// ASSEMBLY FILTER
// ======================================================

function createAssemblyFilter() {

    if (!assemblyFilter) return;

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
            document.createElement("option");

        option.value = assembly;
        option.textContent = assembly;

        assemblyFilter.appendChild(option);

    });

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
// DELETE
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
// EDIT
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
