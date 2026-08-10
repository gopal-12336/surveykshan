// ======================================================
// SURVEYKSHAN ADMIN PANEL - COMPLETE ADMIN.JS
// ======================================================

console.log("✅ Admin JS Loaded");


// ======================================================
// ADMIN EMAIL
// ======================================================

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let partyChart = null;

let allSurveyData = [];


// ======================================================
// DOM ELEMENTS
// ======================================================

const searchBox =
    document.getElementById("searchBox");

const partyFilter =
    document.getElementById("partyFilter");

const dateFilter =
    document.getElementById("dateFilter");

const villageFilter =
    document.getElementById("villageFilter");

const assemblyFilter =
    document.getElementById("assemblyFilter");

const resetFilters =
    document.getElementById("resetFilters");

const surveyTable =
    document.getElementById("surveyTable");


// ======================================================
// HELPER - SET TEXT
// ======================================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


// ======================================================
// HELPER - ESCAPE HTML
// ======================================================

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


// ======================================================
// FIREBASE ADMIN LOGIN CHECK
// ======================================================

auth.onAuthStateChanged(function (user) {

    console.log(
        "Auth State:",
        user ? user.email : "No user"
    );


    if (!user) {

        window.location.href =
            "index.html";

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

        window.location.href =
            "survey.html";

        return;
    }


    console.log(
        "✅ Admin Login Verified"
    );


    // Chart ko safely initialize karo
    initializeChart();


    // Firebase se surveys load karo
    loadSurvey();

});


// ======================================================
// INITIALIZE CHART
// ======================================================

function initializeChart() {

    const canvas =
        document.getElementById(
            "partyChart"
        );


    if (!canvas) {

        console.warn(
            "⚠️ partyChart canvas not found"
        );

        return;
    }


    // Agar Chart.js load nahi hua
    if (
        typeof Chart ===
        "undefined"
    ) {

        console.warn(
            "⚠️ Chart.js not loaded. Surveys will still work."
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

                    maintainAspectRatio: true,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    }

                }

            });


        console.log(
            "✅ Chart initialized"
        );

    }

    catch (error) {

        console.error(
            "Chart Error:",
            error
        );

        partyChart = null;
    }

}


// ======================================================
// LOAD SURVEYS FROM FIRESTORE
// ======================================================

function loadSurvey() {

    console.log(
        "🔄 Loading surveys..."
    );


    if (!surveyTable) {

        console.error(
            "❌ surveyTable not found"
        );

        return;
    }


    surveyTable.innerHTML = "";


    db.collection("surveys")
        .orderBy(
            "createdAt",
            "desc"
        )
        .get()

        .then(function (snapshot) {

            console.log(
                "✅ Firebase Surveys:",
                snapshot.size
            );


            allSurveyData = [];


            // ------------------------------------------
            // PARTY COUNTERS
            // ------------------------------------------

            let total = 0;

            let bjp = 0;

            let congress = 0;

            let aap = 0;

            let bsp = 0;

            let sp = 0;

            let other = 0;


            // ------------------------------------------
            // DATE COUNTERS
            // ------------------------------------------

            let todayCount = 0;

            let weekCount = 0;

            let monthCount = 0;


            // ------------------------------------------
            // DATE SETUP
            // ------------------------------------------

            const now =
                new Date();


            const startOfToday =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    0,
                    0,
                    0,
                    0
                );


            const startOfWeek =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() - 6,
                    0,
                    0,
                    0,
                    0
                );


            const startOfMonth =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1,
                    0,
                    0,
                    0,
                    0
                );


            // ------------------------------------------
            // LOOP THROUGH SURVEYS
            // ------------------------------------------

            snapshot.forEach(
                function (doc) {

                    const data =
                        doc.data();


                    const survey = {

                        id: doc.id,

                        ...data

                    };


                    allSurveyData.push(
                        survey
                    );


                    total++;


                    // ----------------------------------
                    // PARTY COUNT
                    // ----------------------------------

                    const party =
                        String(
                            data.party || ""
                        )
                        .trim()
                        .toLowerCase();


                    if (
                        party ===
                        "bjp"
                    ) {

                        bjp++;

                    }

                    else if (
                        party ===
                        "congress"
                    ) {

                        congress++;

                    }

                    else if (
                        party ===
                        "aap"
                    ) {

                        aap++;

                    }

                    else if (
                        party ===
                        "bsp"
                    ) {

                        bsp++;

                    }

                    else if (
                        party ===
                        "sp"
                    ) {

                        sp++;

                    }

                    else {

                        other++;

                    }


                    // ----------------------------------
                    // CREATED DATE
                    // ----------------------------------

                    let surveyDate =
                        null;


                    if (
                        data.createdAt &&
                        typeof
                        data.createdAt.toDate ===
                        "function"
                    ) {

                        surveyDate =
                            data.createdAt.toDate();

                    }

                    else if (
                        data.createdAt
                    ) {

                        surveyDate =
                            new Date(
                                data.createdAt
                            );

                    }


                    // ----------------------------------
                    // DATE COUNTS
                    // ----------------------------------

                    if (
                        surveyDate &&
                        !isNaN(
                            surveyDate.getTime()
                        )
                    ) {


                        // TODAY

                        if (
                            surveyDate >=
                            startOfToday
                        ) {

                            todayCount++;

                        }


                        // LAST 7 DAYS

                        if (
                            surveyDate >=
                            startOfWeek
                        ) {

                            weekCount++;

                        }


                        // CURRENT MONTH

                        if (
                            surveyDate >=
                            startOfMonth
                        ) {

                            monthCount++;

                        }

                    }


                }
            );


            // ------------------------------------------
            // UPDATE DASHBOARD
            // ------------------------------------------

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


            // ------------------------------------------
            // DATE CARDS
            // ------------------------------------------

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


            console.log(
                "Today:",
                todayCount
            );

            console.log(
                "Last 7 Days:",
                weekCount
            );

            console.log(
                "This Month:",
                monthCount
            );


            // ------------------------------------------
            // UPDATE CHART
            // ------------------------------------------

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


            // ------------------------------------------
            // DISPLAY TABLE
            // ------------------------------------------

            renderTable(
                allSurveyData
            );


            // ------------------------------------------
            // FILTER OPTIONS
            // ------------------------------------------

            createVillageOptions(
                allSurveyData
            );


            createAssemblyOptions(
                allSurveyData
            );


            console.log(
                "✅ Surveys Loaded Successfully"
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
// RENDER TABLE
// ======================================================

function renderTable(
    surveys
) {

    if (!surveyTable) {
        return;
    }


    surveyTable.innerHTML = "";


    if (
        surveys.length === 0
    ) {

        surveyTable.innerHTML = `

<tr>

<td colspan="9"
style="text-align:center;padding:30px;">

No Survey Found

</td>

</tr>

`;

        return;
    }


    surveys.forEach(
        function (data) {

            surveyTable.innerHTML += `

<tr>

<td>
${escapeHTML(data.name || "")}
</td>

<td>
${escapeHTML(data.mobile || "")}
</td>

<td>
${escapeHTML(data.age || "")}
</td>

<td>
${escapeHTML(data.gender || "")}
</td>

<td>
${escapeHTML(data.village || "")}
</td>

<td>
${escapeHTML(data.party || "")}
</td>

<td>
${escapeHTML(data.candidate || "")}
</td>

<td>
${escapeHTML(data.feedback || "")}
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

        }
    );

}


// ======================================================
// SEARCH + FILTER
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


    const now =
        new Date();


    const startToday =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const startWeek =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6
        );


    const startMonth =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    const filtered =
        allSurveyData.filter(
            function (data) {


                // ----------------------------------
                // SEARCH
                // ----------------------------------

                const combinedText = [

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


                const searchMatch =
                    combinedText.includes(
                        searchValue
                    );


                // ----------------------------------
                // PARTY
                // ----------------------------------

                const rowParty =
                    String(
                        data.party || ""
                    )
                    .toLowerCase()
                    .trim();


                const partyMatch =
                    selectedParty === "" ||
                    rowParty ===
                    selectedParty;


                // ----------------------------------
                // VILLAGE
                // ----------------------------------

                const rowVillage =
                    String(
                        data.village || ""
                    )
                    .toLowerCase()
                    .trim();


                const villageMatch =
                    selectedVillage === "" ||
                    rowVillage ===
                    selectedVillage;


                // ----------------------------------
                // ASSEMBLY
                // ----------------------------------

                const rowAssembly =
                    String(
                        data.assembly || ""
                    )
                    .toLowerCase()
                    .trim();


                const assemblyMatch =
                    selectedAssembly === "" ||
                    rowAssembly ===
                    selectedAssembly;


                // ----------------------------------
                // DATE
                // ----------------------------------

                let dateMatch =
                    true;


                if (
                    selectedDate !== ""
                ) {

                    let surveyDate =
                        null;


                    if (
                        data.createdAt &&
                        typeof
                        data.createdAt.toDate ===
                        "function"
                    ) {

                        surveyDate =
                            data.createdAt.toDate();

                    }

                    else if (
                        data.createdAt
                    ) {

                        surveyDate =
                            new Date(
                                data.createdAt
                            );

                    }


                    if (
                        !surveyDate ||
                        isNaN(
                            surveyDate.getTime()
                        )
                    ) {

                        dateMatch =
                            false;

                    }

                    else {


                        // TODAY

                        if (
                            selectedDate ===
                            "today"
                        ) {

                            dateMatch =
                                surveyDate >=
                                startToday;

                        }


                        // WEEK

                        else if (
                            selectedDate ===
                            "week"
                        ) {

                            dateMatch =
                                surveyDate >=
                                startWeek;

                        }


                        // MONTH

                        else if (
                            selectedDate ===
                            "month"
                        ) {

                            dateMatch =

                                surveyDate
                                    .getMonth() ===
                                now.getMonth()

                                &&

                                surveyDate
                                    .getFullYear() ===
                                now.getFullYear();

                        }

                    }

                }


                return (

                    searchMatch &&

                    partyMatch &&

                    villageMatch &&

                    assemblyMatch &&

                    dateMatch

                );

            }
        );


    renderTable(
        filtered
    );

}


// ======================================================
// SEARCH EVENT
// ======================================================

if (searchBox) {

    searchBox.addEventListener(
        "input",
        filterTable
    );

}


// ======================================================
// PARTY FILTER
// ======================================================

if (partyFilter) {

    partyFilter.addEventListener(
        "change",
        filterTable
    );

}


// ======================================================
// DATE FILTER
// ======================================================

if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        filterTable
    );

}


// ======================================================
// VILLAGE FILTER
// ======================================================

if (villageFilter) {

    villageFilter.addEventListener(
        "change",
        filterTable
    );

}


// ======================================================
// ASSEMBLY FILTER
// ======================================================

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


            renderTable(
                allSurveyData
            );

        }
    );

}


// ======================================================
// CREATE VILLAGE OPTIONS
// ======================================================

function createVillageOptions(
    surveys
) {

    if (!villageFilter) {
        return;
    }


    const currentValue =
        villageFilter.value;


    villageFilter.innerHTML = `

<option value="">
All Villages
</option>

`;


    const villages =
        new Set();


    surveys.forEach(
        function (data) {

            if (
                data.village
            ) {

                villages.add(
                    String(
                        data.village
                    ).trim()
                );

            }

        }
    );


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


    villageFilter.value =
        currentValue;

}


// ======================================================
// CREATE ASSEMBLY OPTIONS
// ======================================================

function createAssemblyOptions(
    surveys
) {

    if (!assemblyFilter) {
        return;
    }


    const currentValue =
        assemblyFilter.value;


    assemblyFilter.innerHTML = `

<option value="">
All Assemblies
</option>

`;


    const assemblies =
        new Set();


    surveys.forEach(
        function (data) {

            if (
                data.assembly
            ) {

                assemblies.add(
                    String(
                        data.assembly
                    ).trim()
                );

            }

        }
    );


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


    assemblyFilter.value =
        currentValue;

}


// ======================================================
// LOGOUT
// ======================================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            auth.signOut()

                .then(
                    function () {

                        localStorage.clear();

                        window.location.href =
                            "index.html";

                    }
                )

                .catch(
                    function (error) {

                        alert(
                            "Logout Error:\n\n" +
                            error.message
                        );

                    }
                );

        }
    );

}


// ======================================================
// EXPORT EXCEL
// ======================================================

const exportExcel =
    document.getElementById(
        "exportExcel"
    );


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


            db.collection("surveys")
                .get()

                .then(
                    function (snapshot) {

                        const data = [];


                        snapshot.forEach(
                            function (doc) {

                                const survey =
                                    doc.data();


                                let createdAt =
                                    "";


                                if (
                                    survey.createdAt &&
                                    typeof
                                    survey.createdAt.toDate ===
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


                        if (
                            data.length === 0
                        ) {

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


                    }
                )

                .catch(
                    function (error) {

                        alert(
                            "Export Error:\n\n" +
                            error.message
                        );

                    }
                );

        }
    );

}


// ======================================================
// DELETE SURVEY
// ======================================================

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

        .then(
            function () {

                alert(
                    "✅ Survey Delete Ho Gaya"
                );


                loadSurvey();

            }
        )

        .catch(
            function (error) {

                alert(
                    "❌ Delete Error:\n\n" +
                    error.message
                );

            }
        );

}


// ======================================================
// EDIT SURVEY
// ======================================================

function editSurvey(id) {

    db.collection("surveys")
        .doc(id)
        .get()

        .then(
            function (doc) {

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


                if (
                    newName === null
                ) {
                    return;
                }


                const newMobile =
                    prompt(
                        "Edit Mobile",
                        data.mobile || ""
                    );


                if (
                    newMobile === null
                ) {
                    return;
                }


                const newAge =
                    prompt(
                        "Edit Age",
                        data.age || ""
                    );


                if (
                    newAge === null
                ) {
                    return;
                }


                const newGender =
                    prompt(
                        "Edit Gender",
                        data.gender || ""
                    );


                if (
                    newGender === null
                ) {
                    return;
                }


                const newVillage =
                    prompt(
                        "Edit Village",
                        data.village || ""
                    );


                if (
                    newVillage === null
                ) {
                    return;
                }


                const newAssembly =
                    prompt(
                        "Edit Assembly",
                        data.assembly || ""
                    );


                if (
                    newAssembly === null
                ) {
                    return;
                }


                const newParty =
                    prompt(
                        "Edit Party",
                        data.party || ""
                    );


                if (
                    newParty === null
                ) {
                    return;
                }


                const newCandidate =
                    prompt(
                        "Edit Candidate",
                        data.candidate || ""
                    );


                if (
                    newCandidate === null
                ) {
                    return;
                }


                const newFeedback =
                    prompt(
                        "Edit Feedback",
                        data.feedback || ""
                    );


                if (
                    newFeedback === null
                ) {
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
                            Number(
                                newAge
                            ),

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

                    .then(
                        function () {

                            alert(
                                "✅ Survey Updated Successfully"
                            );


                            loadSurvey();

                        }
                    )

                    .catch(
                        function (error) {

                            alert(
                                "❌ Update Error:\n\n" +
                                error.message
                            );

                        }
                    );

            }
        )

        .catch(
            function (error) {

                alert(
                    "❌ Error:\n\n" +
                    error.message
                );

            }
        );

}


// ======================================================
// END
// ======================================================

console.log(
    "🚀 Surveykshan Admin Panel Ready"
);
