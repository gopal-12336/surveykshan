// ==========================================
// SURVEYKSHAN ADMIN PANEL
// ==========================================

console.log("Admin Panel Loaded");

const adminEmail = "goswamivinod2305@gmail.com";


// ==========================================
// ELEMENTS
// ==========================================

const searchBox = document.getElementById("searchBox");
const partyFilter = document.getElementById("partyFilter");
const dateFilter = document.getElementById("dateFilter");
const villageFilter = document.getElementById("villageFilter");
const assemblyFilter = document.getElementById("assemblyFilter");
const resetFilters = document.getElementById("resetFilters");


// ==========================================
// PARTY CHART
// ==========================================

let partyChart = null;

const chartCanvas =
    document.getElementById("partyChart");

if (chartCanvas) {

    const ctx =
        chartCanvas.getContext("2d");

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

            plugins: {

                legend: {
                    position: "bottom"
                }

            }

        }

    });

}


// ==========================================
// ADMIN LOGIN CHECK
// ==========================================

auth.onAuthStateChanged(function (user) {

    if (!user) {

        window.location.href = "index.html";

        return;

    }


    if (
        !user.email ||
        user.email.toLowerCase() !==
        adminEmail.toLowerCase()
    ) {

        alert(
            "Access Denied\n\nLogged in as: " +
            user.email
        );

        window.location.href =
            "survey.html";

        return;

    }


    console.log("Admin Login Verified");

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


    // ======================================
    // DATE COUNTERS
    // ======================================

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;


    const now = new Date();


    const startOfToday =
        new Date();

    startOfToday.setHours(
        0,
        0,
        0,
        0
    );


    const startOfWeek =
        new Date();

    startOfWeek.setDate(
        now.getDate() - 7
    );


    const startOfMonth =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    const table =
        document.getElementById(
            "surveyTable"
        );


    if (!table) {

        console.error(
            "surveyTable not found"
        );

        return;

    }


    table.innerHTML = "";


    db.collection("surveys")
        .orderBy("createdAt", "desc")
        .get()

        .then(function (snapshot) {


            // ==================================
            // UNIQUE VILLAGES / ASSEMBLIES
            // ==================================

            const villages =
                new Set();

            const assemblies =
                new Set();


            snapshot.forEach(function (doc) {

                const data =
                    doc.data();


                total++;


                // ==================================
                // DATE COUNTS
                // ==================================

                if (
                    data.createdAt &&
                    typeof data.createdAt.toDate ===
                    "function"
                ) {

                    const surveyDate =
                        data.createdAt.toDate();


                    // TODAY

                   if (data.createdAt) {

    let surveyDate = null;

    // Firebase Timestamp
    if (
        typeof data.createdAt.toDate === "function"
    ) {
        surveyDate = data.createdAt.toDate();
    }

    // JavaScript Date
    else if (
        data.createdAt instanceof Date
    ) {
        surveyDate = data.createdAt;
    }

    // String date
    else {
        surveyDate = new Date(data.createdAt);
    }


    if (
        surveyDate &&
        !isNaN(surveyDate.getTime())
    ) {

        // TODAY
        if (
            surveyDate >= startOfToday
        ) {
            todayCount++;
        }


        // LAST 7 CALENDAR DAYS
        const sevenDaysAgo =
            new Date();

        sevenDaysAgo.setHours(
            0,
            0,
            0,
            0
        );

        sevenDaysAgo.setDate(
            sevenDaysAgo.getDate() - 6
        );


        if (
            surveyDate >= sevenDaysAgo
        ) {
            weekCount++;
        }


        // CURRENT MONTH
        if (
            surveyDate.getFullYear() ===
                now.getFullYear()
            &&
            surveyDate.getMonth() ===
                now.getMonth()
        ) {
            monthCount++;
        }

    }

}
                // ==================================
                // PARTY COUNT
                // ==================================

                const party =
                    String(
                        data.party || ""
                    )
                    .trim()
                    .toLowerCase();


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


                // ==================================
                // VILLAGE / ASSEMBLY
                // ==================================

                const village =
                    String(
                        data.village || ""
                    ).trim();


                const assembly =
                    String(
                        data.assembly || ""
                    ).trim();


                if (village !== "") {

                    villages.add(village);

                }


                if (assembly !== "") {

                    assemblies.add(assembly);

                }


                // ==================================
                // CREATED DATE
                // ==================================

                let createdDate = "";


                if (
                    data.createdAt &&
                    typeof data.createdAt.toDate ===
                    "function"
                ) {

                    createdDate =
                        data.createdAt
                            .toDate()
                            .toISOString();

                }


                // ==================================
                // SEARCH DATA
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
                // TABLE ROW
                // ==================================

                table.innerHTML += `

<tr

data-date="${createdDate}"

data-party="${party}"

data-village="${escapeAttribute(
                    village.toLowerCase()
                )}"

data-assembly="${escapeAttribute(
                    assembly.toLowerCase()
                )}"

data-search="${escapeAttribute(
                    searchText
                )}"

>

<td>
${escapeHTML(data.name)}
</td>

<td>
${escapeHTML(data.mobile)}
</td>

<td>
${escapeHTML(data.age)}
</td>

<td>
${escapeHTML(data.gender)}
</td>

<td>
${escapeHTML(data.village)}
</td>

<td>
${escapeHTML(data.party)}
</td>

<td>
${escapeHTML(data.candidate)}
</td>

<td>
${escapeHTML(data.feedback)}
</td>

<td>

<button
onclick="editSurvey('${doc.id}')">
✏️ Edit
</button>

<button
onclick="deleteSurvey('${doc.id}')">
🗑 Delete
</button>

</td>

</tr>

`;

            });


            // ==================================
            // UPDATE DASHBOARD COUNTS
            // ==================================

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


            // ==================================
            // DATE CARDS
            // ==================================

            setText(
                "todaySurvey",
                todayCount
            );


            setText(
                "weekSurvey",
                weekCount
            );


            setText(
                "monthSurvey",
                monthCount
            );


            // ==================================
            // UPDATE CHART
            // ==================================

            if (partyChart) {

                partyChart.data
                    .datasets[0]
                    .data = [

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
            // CREATE VILLAGE FILTER
            // ==================================

            createFilterOptions(
                villageFilter,
                villages,
                "All Villages"
            );


            // ==================================
            // CREATE ASSEMBLY FILTER
            // ==================================

            createFilterOptions(
                assemblyFilter,
                assemblies,
                "All Assemblies"
            );


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
                "Firestore Error:\n\n" +
                error.message
            );

        });

}


// ==========================================
// CREATE FILTER OPTIONS
// ==========================================

function createFilterOptions(
    selectElement,
    values,
    defaultText
) {

    if (!selectElement) {

        return;

    }


    const currentValue =
        selectElement.value;


    selectElement.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value = "";

    defaultOption.textContent =
        defaultText;


    selectElement.appendChild(
        defaultOption
    );


    const sortedValues =
        Array.from(values)
            .sort(function (a, b) {

                return a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity:
                            "base"
                    }
                );

            });


    sortedValues.forEach(
        function (value) {

            const option =
                document.createElement(
                    "option"
                );


            option.value = value;

            option.textContent = value;


            selectElement.appendChild(
                option
            );

        }
    );


    if (
        Array.from(
            selectElement.options
        ).some(
            function (option) {

                return option.value ===
                    currentValue;

            }
        )
    ) {

        selectElement.value =
            currentValue;

    }

}


// ==========================================
// FILTER TABLE
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


    const rows =
        document.querySelectorAll(
            "#surveyTable tr"
        );


    const now =
        new Date();


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
        // VILLAGE
        // ==================================

        const rowVillage =
            row.getAttribute(
                "data-village"
            ) || "";


        const villageMatch =
            selectedVillage === "" ||
            rowVillage === selectedVillage;


        // ==================================
        // ASSEMBLY
        // ==================================

        const rowAssembly =
            row.getAttribute(
                "data-assembly"
            ) || "";


        const assemblyMatch =
            selectedAssembly === "" ||
            rowAssembly === selectedAssembly;


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
            rowDate
        ) {

            const surveyDate =
                new Date(rowDate);


            // TODAY

            if (
                selectedDate === "today"
            ) {

                const startOfToday =
                    new Date();

                startOfToday.setHours(
                    0,
                    0,
                    0,
                    0
                );


                const endOfToday =
                    new Date();

                endOfToday.setHours(
                    23,
                    59,
                    59,
                    999
                );


                dateMatch =
                    surveyDate >=
                        startOfToday &&
                    surveyDate <=
                        endOfToday;

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
                    surveyDate >=
                    weekAgo;

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
        // FINAL FILTER RESULT
        // ==================================

        if (

            searchMatch &&

            partyMatch &&

            villageMatch &&

            assemblyMatch &&

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
// PARTY EVENT
// ==========================================

if (partyFilter) {

    partyFilter.addEventListener(
        "change",
        filterTable
    );

}


// ==========================================
// DATE EVENT
// ==========================================

if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        filterTable
    );

}


// ==========================================
// VILLAGE EVENT
// ==========================================

if (villageFilter) {

    villageFilter.addEventListener(
        "change",
        filterTable
    );

}


// ==========================================
// ASSEMBLY EVENT
// ==========================================

if (assemblyFilter) {

    assemblyFilter.addEventListener(
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


            if (villageFilter) {

                villageFilter.value = "";

            }


            if (assemblyFilter) {

                assemblyFilter.value = "";

            }


            filterTable();

        }
    );

}


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


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


                    const data = [];


                    snapshot.forEach(
                        function (doc) {

                            const survey =
                                doc.data();


                            let createdAt = "";


                            if (
                                survey.createdAt &&
                                typeof survey.createdAt.toDate ===
                                "function"
                            ) {

                                createdAt =
                                    survey.createdAt
                                        .toDate()
                                        .toLocaleString();

                            }


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
                                    createdAt

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

                })

                .catch(function (error) {

                    alert(
                        "Export Error:\n\n" +
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
                "❌ Delete Error:\n\n" +
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


            const newGender =
                prompt(
                    "Edit Gender",
                    data.gender || ""
                );


            if (newGender === null) {
                return;
            }


            const newVillage =
                prompt(
                    "Edit Village",
                    data.village || ""
                );


            if (newVillage === null) {
                return;
            }


            const newAssembly =
                prompt(
                    "Edit Assembly",
                    data.assembly || ""
                );


            if (newAssembly === null) {
                return;
            }


            const newParty =
                prompt(
                    "Edit Party",
                    data.party || ""
                );


            if (newParty === null) {
                return;
            }


            const newCandidate =
                prompt(
                    "Edit Candidate",
                    data.candidate || ""
                );


            if (newCandidate === null) {
                return;
            }


            const newFeedback =
                prompt(
                    "Edit Feedback",
                    data.feedback || ""
                );


            if (newFeedback === null) {
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
                        Number(newAge),

                    gender:
                        newGender.trim(),

                    village:
                        newVillage.trim(),

                    assembly:
                        newAssembly.trim(),

                    party:
                        newParty.trim(),

                    candidate:
                        newCandidate.trim(),

                    feedback:
                        newFeedback.trim()

                })

                .then(function () {

                    alert(
                        "✅ Survey Updated Successfully"
                    );


                    loadSurvey();

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
// HELPER: ESCAPE HTML
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
// HELPER: ESCAPE ATTRIBUTE
// ==========================================

function escapeAttribute(value) {

    return escapeHTML(value);

}


// ==========================================
// READY
// ==========================================

console.log(
    "✅ Surveykshan Admin JS Ready"
);
