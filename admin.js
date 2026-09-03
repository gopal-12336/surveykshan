/* =========================================================
   SURVEKSHAN ADMIN PANEL
   COMPLETE FIXED VERSION
   ========================================================= */

console.log("==============================================");
console.log("SURVEKSHAN ADMIN JS LOADED - FIXED VERSION");
console.log("==============================================");


/* =========================================================
   ADMIN CONFIG
   ========================================================= */

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let allSurveys = [];
let filteredSurveys = [];

let allQuestions = [];
let allSurveyors = [];

let editingQuestionId = null;

let partyChart = null;


/* =========================================================
   SAFE FIREBASE CHECK
   ========================================================= */

if (
    typeof firebase === "undefined"
) {

    console.error(
        "Firebase SDK is not loaded."
    );

}
else {

    console.log(
        "Firebase SDK detected."
    );

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Admin DOM ready."
        );

        initializeAdmin();

    }
);


/* =========================================================
   INITIALIZE ADMIN
   ========================================================= */

function initializeAdmin() {

    if (
        typeof firebase === "undefined"
    ) {

        console.error(
            "Firebase is unavailable."
        );

        return;

    }


    if (
        typeof db === "undefined" ||
        !db
    ) {

        console.error(
            "Firestore database 'db' is unavailable."
        );

        return;

    }


    initializeQuestionBuilder();

    setupAdminEvents();

    startAdminAuthentication();

}


/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

function startAdminAuthentication() {

    firebase.auth()
        .setPersistence(
            firebase.auth.Auth.Persistence.SESSION
        )
        .then(function () {

            firebase.auth()
                .onAuthStateChanged(
                    function (user) {

                        console.log(
                            "Auth state:",
                            user
                                ? user.email
                                : "No user"
                        );


                        if (!user) {

                            window.location.replace(
                                "index.html"
                            );

                            return;

                        }


                        if (
                            !user.email ||
                            user.email
                                .toLowerCase()
                            !==
                            ADMIN_EMAIL
                                .toLowerCase()
                        ) {

                            console.warn(
                                "Unauthorized user:",
                                user.email
                            );

                            window.location.replace(
                                "survey.html"
                            );

                            return;

                        }


                        console.log(
                            "ADMIN LOGIN SUCCESS:",
                            user.email
                        );


                        /*
                         * Load everything independently.
                         * One failure should not stop
                         * other dashboard sections.
                         */

                        loadQuestions();

                        loadSurveys();

                        loadSurveyors();

                        loadDailyLimit();

                    }
                );

        })
        .catch(function (error) {

            console.error(
                "Authentication initialization error:",
                error
            );

        });

}


/* =========================================================
   HELPER - SET TEXT
   ========================================================= */

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


/* =========================================================
   HELPER - ESCAPE HTML
   ========================================================= */

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


/* =========================================================
   HELPER - NORMALIZE
   ========================================================= */

function normalizeValue(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .trim()
        .toLowerCase();

}


/* =========================================================
   HELPER - FIRESTORE DATE
   ========================================================= */

function getDate(value) {

    if (!value) {

        return null;

    }


    try {

        /*
         * Firestore Timestamp
         */

        if (
            typeof value.toDate ===
            "function"
        ) {

            return value.toDate();

        }


        /*
         * Firestore Timestamp
         * serialized format
         */

        if (
            value.seconds !== undefined
        ) {

            return new Date(
                Number(value.seconds) * 1000
            );

        }


        if (
            value._seconds !== undefined
        ) {

            return new Date(
                Number(value._seconds) * 1000
            );

        }


        /*
         * Native Date
         */

        if (
            value instanceof Date
        ) {

            return value;

        }


        /*
         * String / number
         */

        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return date;

    }
    catch (error) {

        console.error(
            "Date conversion error:",
            error
        );

        return null;

    }

}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function isToday(date) {

    if (!date) {

        return false;

    }


    const now =
        new Date();


    return (
        date.getDate() ===
            now.getDate() &&

        date.getMonth() ===
            now.getMonth() &&

        date.getFullYear() ===
            now.getFullYear()
    );

}


/* =========================================================
   THIS WEEK
   Monday -> Sunday
   ========================================================= */

function isThisWeek(date) {

    if (!date) {

        return false;

    }


    const now =
        new Date();


    const start =
        new Date(now);


    const day =
        start.getDay();


    const difference =
        day === 0
            ? 6
            : day - 1;


    start.setDate(
        start.getDate() -
        difference
    );


    start.setHours(
        0,
        0,
        0,
        0
    );


    return date >= start;

}


/* =========================================================
   THIS MONTH
   ========================================================= */

function isThisMonth(date) {

    if (!date) {

        return false;

    }


    const now =
        new Date();


    return (
        date.getMonth() ===
            now.getMonth() &&

        date.getFullYear() ===
            now.getFullYear()
    );

}


/* =========================================================
   QUESTION BUILDER
   ========================================================= */

function initializeQuestionBuilder() {

    const container =
        document.getElementById(
            "optionsContainer"
        );


    if (!container) {

        return;

    }


    /*
     * Only create default options
     * if there are none.
     */

    if (
        container.children.length === 0
    ) {

        createOptionInput();

        createOptionInput();

    }

}


/* =========================================================
   CREATE OPTION
   ========================================================= */

function createOptionInput(
    value = ""
) {

    const container =
        document.getElementById(
            "optionsContainer"
        );


    if (!container) {

        return;

    }


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "option-row";


    const input =
        document.createElement(
            "input"
        );


    input.type =
        "text";


    input.className =
        "question-option";


    input.placeholder =
        "Enter option";


    input.value =
        value;


    const removeButton =
        document.createElement(
            "button"
        );


    removeButton.type =
        "button";


    removeButton.className =
        "danger";


    removeButton.textContent =
        "❌";


    removeButton.addEventListener(
        "click",
        function () {

            row.remove();

        }
    );


    row.appendChild(
        input
    );


    row.appendChild(
        removeButton
    );


    container.appendChild(
        row
    );

}


/* =========================================================
   SAVE QUESTION EVENT
   ========================================================= */

function setupQuestionEvents() {

    const addButton =
        document.getElementById(
            "addOption"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            function () {

                createOptionInput();

            }
        );

    }


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveQuestion
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelEdit"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function () {

                resetQuestionBuilder();

            }
        );

    }


    const toggle =
        document.getElementById(
            "questionManagerToggle"
        );


    if (toggle) {

        toggle.addEventListener(
            "click",
            function () {

                const body =
                    document.getElementById(
                        "questionManagerBody"
                    );


                if (!body) {

                    return;

                }


                if (
                    body.style.display ===
                    "none"
                ) {

                    body.style.display =
                        "block";

                    this.textContent =
                        "🙈 Hide";

                }
                else {

                    body.style.display =
                        "none";

                    this.textContent =
                        "👁️ Show";

                }

            }
        );

    }

}


/* =========================================================
   SAVE QUESTION
   ========================================================= */

function saveQuestion() {

    const textElement =
        document.getElementById(
            "questionText"
        );


    const typeElement =
        document.getElementById(
            "questionType"
        );


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if (
        !textElement ||
        !typeElement
    ) {

        console.error(
            "Question form elements missing."
        );

        return;

    }


    const questionText =
        textElement.value.trim();


    const questionType =
        typeElement.value ||
        "single";


    if (!questionText) {

        showQuestionMessage(
            "Please enter question.",
            false
        );

        return;

    }


    const optionInputs =
        document.querySelectorAll(
            ".question-option"
        );


    const options = [];


    optionInputs.forEach(
        function (input) {

            const value =
                input.value.trim();


            if (value) {

                options.push(
                    value
                );

            }

        }
    );


    if (
        options.length < 2
    ) {

        showQuestionMessage(
            "Please add at least 2 options.",
            false
        );

        return;

    }


    const questionData = {

        question:
            questionText,

        type:
            questionType,

        options:
            options,

        updatedAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp()

    };


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    let operation;


    if (editingQuestionId) {

        operation =
            db.collection(
                "questions"
            )
            .doc(
                editingQuestionId
            )
            .update(
                questionData
            );

    }
    else {

        questionData.createdAt =
            firebase.firestore
                .FieldValue
                .serverTimestamp();


        operation =
            db.collection(
                "questions"
            )
            .add(
                questionData
            );

    }


    operation
        .then(function () {

            showQuestionMessage(
                editingQuestionId
                    ? "Question updated successfully."
                    : "Question added successfully.",
                true
            );


            resetQuestionBuilder();


            return loadQuestions();

        })
        .catch(function (error) {

            console.error(
                "Question save error:",
                error
            );


            showQuestionMessage(
                "Error: " +
                error.message,
                false
            );

        })
        .finally(function () {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "💾 Save Question";

            }

        });

}


/* =========================================================
   SHOW QUESTION MESSAGE
   ========================================================= */

function showQuestionMessage(
    text,
    success
) {

    const element =
        document.getElementById(
            "questionMessage"
        );


    if (!element) {

        return;

    }


    element.textContent =
        text;


    element.style.color =
        success
            ? "green"
            : "red";

}


/* =========================================================
   LOAD QUESTIONS
   ========================================================= */

function loadQuestions() {

    console.log(
        "Loading questions..."
    );


    /*
     * IMPORTANT:
     *
     * Do NOT use orderBy(createdAt)
     * here.
     *
     * This makes the dashboard work
     * even if old questions don't have
     * createdAt or timestamps are mixed.
     */

    return db.collection(
        "questions"
    )
    .get()

    .then(function (snapshot) {

        allQuestions = [];


        snapshot.forEach(
            function (doc) {

                allQuestions.push({

                    id:
                        doc.id,

                    ...doc.data()

                });

            }
        );


        /*
         * Optional sorting
         */

        allQuestions.sort(
            function (a, b) {

                const dateA =
                    getDate(
                        a.createdAt ||
                        a.updatedAt
                    );


                const dateB =
                    getDate(
                        b.createdAt ||
                        b.updatedAt
                               console.log(
            "QUESTIONS LOADED:",
            allQuestions.length
        );


        renderQuestions();

        return allQuestions;

    })

    .catch(function (error) {

        console.error(
            "QUESTION LOAD ERROR:",
            error
        );


        allQuestions = [];


        const table =
            document.getElementById(
                "questionsTable"
            );


        if (table) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        style="padding:20px;text-align:center;color:red;"
                    >
                        Failed to load questions.
                    </td>
                </tr>
            `;

        }


        return [];

    });

}


/* =========================================================
   RENDER QUESTIONS
   ========================================================= */

function renderQuestions() {

    const table =
        document.getElementById(
            "questionsTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML =
        "";


    if (
        allQuestions.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="padding:20px;text-align:center;color:#777;"
                >
                    No questions found.
                </td>
            </tr>
        `;

        return;

    }


    allQuestions.forEach(
        function (question, index) {

            const row =
                document.createElement(
                    "tr"
                );


            const options =
                Array.isArray(
                    question.options
                )
                    ? question.options
                    : [];


            const optionsHTML =
                options.length
                    ? options
                        .map(
                            function (option) {

                                return `
                                    <span
                                        style="
                                            display:inline-block;
                                            background:#f1f1f1;
                                            padding:4px 8px;
                                            margin:2px;
                                            border-radius:5px;
                                            font-size:12px;
                                        "
                                    >
                                        ${escapeHTML(option)}
                                    </span>
                                `;

                            }
                        )
                        .join("")
                    : "-";


            row.innerHTML = `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        question.question ||
                        question.text ||
                        ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        question.type ||
                        "single"
                    )}
                </td>

                <td>
                    ${optionsHTML}
                </td>

                <td>
                    ${question.required === false
                        ? "No"
                        : "Yes"
                    }
                </td>

                <td>

                    <button
                        type="button"
                        class="primary edit-question-btn"
                    >
                        ✏️ Edit
                    </button>

                    <button
                        type="button"
                        class="danger delete-question-btn"
                    >
                        🗑️ Delete
                    </button>

                </td>
            `;


            const editButton =
                row.querySelector(
                    ".edit-question-btn"
                );


            const deleteButton =
                row.querySelector(
                    ".delete-question-btn"
                );


            if (editButton) {

                editButton.addEventListener(
                    "click",
                    function () {

                        editQuestion(
                            question.id
                        );

                    }
                );

            }


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    function () {

                        deleteQuestion(
                            question.id
                        );

                    }
                );

            }


            table.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   EDIT QUESTION
   ========================================================= */

function editQuestion(
    questionId
) {

    const question =
        allQuestions.find(
            function (item) {

                return item.id ===
                    questionId;

            }
        );


    if (!question) {

        console.error(
            "Question not found:",
            questionId
        );

        return;

    }


    const textElement =
        document.getElementById(
            "questionText"
        );


    const typeElement =
        document.getElementById(
            "questionType"
        );


    const optionsContainer =
        document.getElementById(
            "optionsContainer"
        );


    if (textElement) {

        textElement.value =
            question.question ||
            question.text ||
            "";

    }


    if (typeElement) {

        typeElement.value =
            question.type ||
            "single";

    }


    if (optionsContainer) {

        optionsContainer.innerHTML =
            "";


        const options =
            Array.isArray(
                question.options
            )
                ? question.options
                : [];


        options.forEach(
            function (option) {

                createOptionInput(
                    option
                );

            }
        );


        if (
            options.length === 0
        ) {

            createOptionInput();

            createOptionInput();

        }

    }


    editingQuestionId =
        questionId;


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if (saveButton) {

        saveButton.textContent =
            "💾 Update Question";

    }


    const cancelButton =
        document.getElementById(
            "cancelEdit"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "inline-block";

    }


    showQuestionMessage(
        "Editing question...",
        true
    );


    /*
     * Scroll to question form.
     */

    const form =
        document.getElementById(
            "questionManager"
        ) ||
        document.getElementById(
            "questionForm"
        );


    if (form) {

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =========================================================
   RESET QUESTION BUILDER
   ========================================================= */

function resetQuestionBuilder() {

    editingQuestionId =
        null;


    const textElement =
        document.getElementById(
            "questionText"
        );


    const typeElement =
        document.getElementById(
            "questionType"
        );


    const optionsContainer =
        document.getElementById(
            "optionsContainer"
        );


    if (textElement) {

        textElement.value =
            "";

    }


    if (typeElement) {

        typeElement.value =
            "single";

    }


    if (optionsContainer) {

        optionsContainer.innerHTML =
            "";


        createOptionInput();

        createOptionInput();

    }


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if (saveButton) {

        saveButton.textContent =
            "💾 Save Question";

    }


    const cancelButton =
        document.getElementById(
            "cancelEdit"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    showQuestionMessage(
        "",
        true
    );

}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

function deleteQuestion(
    questionId
) {

    const question =
        allQuestions.find(
            function (item) {

                return item.id ===
                    questionId;

            }
        );


    if (!question) {

        alert(
            "Question not found."
        );

        return;

    }


    const questionText =
        question.question ||
        question.text ||
        "this question";


    const confirmed =
        confirm(
            "Are you sure you want to delete this question?\n\n" +
            questionText
        );


    if (!confirmed) {

        return;

    }


    db.collection(
        "questions"
    )
    .doc(
        questionId
    )
    .delete()

    .then(function () {

        alert(
            "Question deleted successfully."
        );


        return loadQuestions();

    })

    .catch(function (error) {

        console.error(
            "Question delete error:",
            error
        );


        alert(
            "Question delete failed: " +
            error.message
        );

    });

}


/* =========================================================
   SETUP QUESTION EVENTS
   ========================================================= */

function setupQuestionEvents() {

    const addButton =
        document.getElementById(
            "addOption"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            function () {

                createOptionInput();

            }
        );

    }


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveQuestion
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelEdit"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function () {

                resetQuestionBuilder();

            }
        );

    }


    const toggle =
        document.getElementById(
            "questionManagerToggle"
        );


    if (toggle) {

        toggle.addEventListener(
            "click",
            function () {

                const body =
                    document.getElementById(
                        "questionManagerBody"
                    );


                if (!body) {

                    return;

                }


                if (
                    body.style.display ===
                    "none"
                ) {

                    body.style.display =
                        "block";

                    this.textContent =
                        "🙈 Hide";

                }
                else {

                    body.style.display =
                        "none";

                    this.textContent =
                        "👁️ Show";

                }

            }
        );

    }

}


/* =========================================================
   LOAD SURVEYS
   ========================================================= */

function loadSurveys() {

    console.log(
        "Loading surveys..."
    );


    return db.collection(
        "surveys"
    )
    .get()

    .then(function (snapshot) {

        allSurveys = [];


        snapshot.forEach(
            function (doc) {

                allSurveys.push({

                    id:
                        doc.id,

                    ...doc.data()

                });

            }
        );


        console.log(
            "SURVEYS LOADED:",
            allSurveys.length
        );


        /*
         * Newest first
         */

        allSurveys.sort(
            function (a, b) {

                const dateA =
                    getDate(
                        a.createdAt ||
                        a.timestamp ||
                        a.submittedAt ||
                        a.date
                    );


                const dateB =
                    getDate(
                        b.createdAt ||
                        b.timestamp ||
                        b.submittedAt ||
                        b.date
                    );


                if (!dateA && !dateB) {

                    return 0;

                }


                if (!dateA) {

                    return 1;

                }


                if (!dateB) {

                    return -1;

                }


                return (
                    dateB.getTime() -
                    dateA.getTime()
                );

            }
        );


        filteredSurveys =
            allSurveys.slice();


        updateDashboard();

        populateFilterDropdowns();

        renderSurveyRecords();

        /*
         * IMPORTANT:
         *
         * Surveyor management and
         * performance are rendered
         * again after surveys load.
         *
         * This fixes the situation where
         * surveyors were loaded before
         * survey data.
         */

        renderSurveyorManagement();

        renderSurveyorPerformance();

        renderPartyChart();


        return allSurveys;

    })

    .catch(function (error) {

        console.error(
            "SURVEY LOAD ERROR:",
            error
        );


        allSurveys = [];

        filteredSurveys = [];


        updateDashboard();

        renderSurveyRecords();

        renderSurveyorManagement();

        renderSurveyorPerformance();


        return [];

    });

}


/* =========================================================
   UPDATE DASHBOARD
   ========================================================= */

function updateDashboard() {

    const total =
        allSurveys.length;


    let today =
        0;


    let week =
        0;


    let month =
        0;


    allSurveys.forEach(
        function (survey) {

            const date =
                getDate(
                    survey.createdAt ||
                    survey.timestamp ||
                    survey.submittedAt ||
                    survey.date
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


    /*
     * Support multiple possible
     * dashboard element IDs.
     */

    const totalIds = [
        "totalSurveys",
        "totalSurveyCount",
        "surveyCount"
    ];


    const todayIds = [
        "todaySurveys",
        "todaySurveyCount",
        "todayCount"
    ];


    const weekIds = [
        "weekSurveys",
        "weeklySurveys",
        "weekCount"
    ];


    const monthIds = [
        "monthSurveys",
        "monthlySurveys",
        "monthCount"
    ];


    totalIds.forEach(
        function (id) {

            setText(
                id,
                total
            );

        }
    );


    todayIds.forEach(
        function (id) {

            setText(
                id,
                today
            );

        }
    );


    weekIds.forEach(
        function (id) {

            setText(
                id,
                week
            );

        }
    );


    monthIds.forEach(
        function (id) {

            setText(
                id,
                month
            );

        }
    );

}


/* =========================================================
   RENDER SURVEY RECORDS
   ========================================================= */

function renderSurveyRecords() {

    const table =
        document.getElementById(
            "surveyRecordsTable"
        ) ||
        document.getElementById(
            "surveysTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML =
        "";


    if (
        filteredSurveys.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="20"
                    style="
                        padding:25px;
                        text-align:center;
                        color:#777;
                    "
                >
                    No survey records found.
                </td>
            </tr>
        `;

        return;

    }


    filteredSurveys.forEach(
        function (survey, index) {

            const row =
                document.createElement(
                    "tr"
                );


            const date =
                getDate(
                    survey.createdAt ||
                    survey.timestamp ||
                    survey.submittedAt ||
                    survey.date
                );


            const surveyor =
                survey.surveyorEmail ||
                survey.surveyorId ||
                survey.createdBy ||
                survey.createdByEmail ||
                "-";


            const name =
                survey.name ||
                survey.respondentName ||
                survey.fullName ||
                "-";


            const mobile =
                survey.mobile ||
                survey.phone ||
                survey.mobileNumber ||
                "-";


            const village =
                survey.village ||
                survey.city ||
                "-";


            const assembly =
                survey.assembly ||
                survey.vidhanSabha ||
                "-";


            const party =
                survey.party ||
                "-";


            const candidate =
                survey.candidate ||
                "-";


            row.innerHTML = `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(name)}
                </td>

                <td>
                    ${escapeHTML(mobile)}
                </td>

                <td>
                    ${escapeHTML(village)}
                </td>

                <td>
                    ${escapeHTML(assembly)}
                </td>

                <td>
                    ${escapeHTML(party)}
                </td>

                <td>
                    ${escapeHTML(candidate)}
                </td>

                <td>
                    ${escapeHTML(surveyor)}
                </td>

                <td>
                    ${
                        date
                            ? date.toLocaleString(
                                "en-IN"
                            )
                            : "-"
                    }
                </td>

                <td>

                    <button
                        type="button"
                        class="primary view-survey-btn"
                    >
                        👁️ View
                    </button>

                </td>
            `;


            const viewButton =
                row.querySelector(
                    ".view-survey-btn"
                );


            if (viewButton) {

                viewButton.addEventListener(
                    "click",
                    function () {

                        showSurveyAnswers(
                            survey.id
                        );

                    }
                );

            }


            table.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   POPULATE FILTER DROPDOWNS
   ========================================================= */

function populateFilterDropdowns() {

    const partyFilter =
        document.getElementById(
            "partyFilter"
        );


    const villageFilter =
        document.getElementById(
            "villageFilter"
        );


    const assemblyFilter =
        document.getElementById(
            "assemblyFilter"
        );


    const surveyorFilter =
        document.getElementById(
            "surveyorFilter"
        );


    function uniqueValues(
        values
    ) {

        return Array.from(
            new Set(
                values
                    .filter(
                        function (value) {

                            return (
                                value !==
                                    null &&
                                value !==
                                    undefined &&
                                String(
                                    value
                                ).trim() !==
                                    ""
                            );

                        }
                    )
                    .map(
                        function (value) {

                            return String(
                                value
                            ).trim();

                        }
                    )
            )
        ).sort(
            function (a, b) {

                return a.localeCompare(
                    b
                );

            }
        );

    }


    if (partyFilter) {

        const current =
            partyFilter.value;


        const values =
            uniqueValues(
                allSurveys.map(
                    function (survey) {

                        return survey.party;

                    }
                )
            );


        partyFilter.innerHTML = `
            <option value="">
                All Parties
            </option>
        `;


        values.forEach(
            function (value) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    value;


                option.textContent =
                    value;


                partyFilter.appendChild(
                    option
                );

            }
        );


        partyFilter.value =
            current;

    }


    if (villageFilter) {

        const current =
            villageFilter.value;


        const values =
            uniqueValues(
                allSurveys.map(
                    function (survey) {

                        return (
                            survey.village ||
                            survey.city
                        );

                    }
                )
            );


        villageFilter.innerHTML = `
            <option value="">
                All Villages
            </option>
        `;


        values.forEach(
            function (value) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    value;


                option.textContent =
                    value;


                villageFilter.appendChild(
                    option
                );

            }
        );


        villageFilter.value =
            current;

    }


    if (assemblyFilter) {

        const current =
            assemblyFilter.value;


        const values =
            uniqueValues(
                allSurveys.map(
                    function (survey) {

                        return (
                            survey.assembly ||
                            survey.vidhanSabha
                        );

                    }
                )
            );


        assemblyFilter.innerHTML = `
            <option value="">
                All Assemblies
            </option>
        `;


        values.forEach(
            function (value) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    value;


                option.textContent =
                    value;


                assemblyFilter.appendChild(
                    option
                );

            }
        );


        assemblyFilter.value =
            current;

    }


    if (surveyorFilter) {

        const current =
            surveyorFilter.value;


        const values =
            uniqueValues(
                allSurveys.map(
                    function (survey) {

                        return (
                            survey.surveyorEmail ||
                            survey.surveyorId ||
                            survey.createdBy ||
                            survey.createdByEmail
                        );

                    }
                )
            );


        surveyorFilter.innerHTML = `
            <option value="">
                All Surveyors
            </option>
        `;


        values.forEach(
            function (value) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    value;


                option.textContent =
                    value;


                surveyorFilter.appendChild(
                    option
                );

            }
        );


        surveyorFilter.value =
            current;

    }

}


/* =========================================================
   APPLY SURVEY FILTERS
   ========================================================= */

function applySurveyFilters() {

    const searchBox =
        document.getElementById(
            "searchBox"
        );


    const partyFilter =
        document.getElementById(
            "partyFilter"
        );


    const dateFilter =
        document.getElementById(
            "dateFilter"
        );


    const villageFilter =
        document.getElementById(
            "villageFilter"
        );


    const assemblyFilter =
        document.getElementById(
            "assemblyFilter"
        );


    const surveyorFilter =
        document.getElementById(
            "surveyorFilter"
        );


    const filterName =
        document.getElementById(
            "filterName"
        );


    const filterMobile =
        document.getElementById(
            "filterMobile"
        );


    const filterVillage =
        document.getElementById(
            "filterVillage"
        );


    const filterSurveyor =
        document.getElementById(
            "filterSurveyor"
        );


    const filterDate =
        document.getElementById(
            "filterDate"
        );


    const search =
        normalizeValue(
            searchBox
                ? searchBox.value
                : ""
        );


    const party =
        normalizeValue(
            partyFilter
                ? partyFilter.value
                : ""
        );


    const village =
        normalizeValue(
            villageFilter
                ? villageFilter.value
                : ""
        );


    const assembly =
        normalizeValue(
            assemblyFilter
                ? assemblyFilter.value
                : ""
        );


    const surveyor =
        normalizeValue(
            surveyorFilter
                ? surveyorFilter.value
                : ""
        );


    const nameFilter =
        normalizeValue(
            filterName
                ? filterName.value
                : ""
        );


    const mobileFilter =
        normalizeValue(
            filterMobile
                ? filterMobile.value
                : ""
        );


    const villageFilterValue =
        normalizeValue(
            filterVillage
                ? filterVillage.value
                : ""
        );


    const surveyorFilterValue =
        normalizeValue(
            filterSurveyor
                ? filterSurveyor.value
                : ""
        );


    const selectedDate =
        dateFilter
            ? dateFilter.value
            : "";


    const oldDate =
        filterDate
            ? filterDate.value
            : "";


    const dateValue =
        selectedDate ||
        oldDate;


    filteredSurveys =
        allSurveys.filter(
            function (survey) {

                const name =
                    normalizeValue(
                        survey.name ||
                        survey.respondentName ||
                        survey.fullName
                    );


                const mobile =
                    normalizeValue(
                        survey.mobile ||
                        survey.phone ||
                        survey.mobileNumber
                    );


                const surveyVillage =
                    normalizeValue(
                        survey.village ||
                        survey.city
                    );


                const surveyAssembly =
                    normalizeValue(
                        survey.assembly ||
                        survey.vidhanSabha
                    );


                const surveyParty =
                    normalizeValue(
                        survey.party
                    );


                const surveyorValue =
                    normalizeValue(
                        survey.surveyorEmail ||
                        survey.surveyorId ||
                        survey.createdBy ||
                        survey.createdByEmail
                    );


                /*
                 * General search
                 */

                if (
                    search &&
                    !(
                        name.includes(search) ||
                        mobile.includes(search) ||
                        surveyVillage.includes(search) ||
                        surveyAssembly.includes(search) ||
                        surveyParty.includes(search) ||
                        surveyorValue.includes(search)
                    )
                ) {

                    return false;

                }


                if (
                    party &&
                    surveyParty !== party
                ) {

                    return false;

                }


                if (
                    village &&
                    surveyVillage !== village
                ) {

                    return false;

                }


                if (
                    assembly &&
                    surveyAssembly !== assembly
                ) {

                    return false;

                }


                if (
                    surveyor &&
                    surveyorValue !== surveyor
                ) {

                    return false;

                }


                if (
                    nameFilter &&
                    !name.includes(
                        nameFilter
                    )
                ) {

                    return false;

                }


                if (
                    mobileFilter &&
                    !mobile.includes(
                        mobileFilter
                    )
                ) {

                    return false;

                }


                if (
                    villageFilterValue &&
                    !surveyVillage.includes(
                        villageFilterValue
                    )
                ) {

                    return false;

                }


                if (
                    surveyorFilterValue &&
                    !surveyorValue.includes(
                        surveyorFilterValue
                    )
                ) {

                    return false;

                }


                /*
                 * Date filters
                 */

                if (dateValue) {

                    const surveyDate =
                        getDate(
                            survey.createdAt ||
                            survey.timestamp ||
                            survey.submittedAt ||
                            survey.date
                        );


                    if (!surveyDate) {

                        return false;

                    }


                    const filterDateObject =
                        new Date(
                            dateValue
                        );


                    if (
                        !isNaN(
                            filterDateObject.getTime()
                        )
                    ) {

                        if (
                            surveyDate
                                .getFullYear() !==
                            filterDateObject
                                .getFullYear() ||

                            surveyDate
                                .getMonth() !==
                            filterDateObject
                                .getMonth() ||

                            surveyDate
                                .getDate() !==
                            filterDateObject
                                .getDate()
                        ) {

                            return false;

                        }

                    }

                }


                return true;

            }
        );


    renderSurveyRecords();

    console.log(
        "FILTERED SURVEYS:",
        filteredSurveys.length
    );

}


/* =========================================================
   RESET SURVEY FILTERS
   ========================================================= */

function resetSurveyFilters() {

    const ids = [

        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor",
        "filterDate",
        "searchBox",
        "partyFilter",
        "dateFilter",
        "villageFilter",
        "assemblyFilter",
        "surveyorFilter"

    ];


    ids.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {

                return;

            }


            if (
                element.tagName ===
                "SELECT"
            ) {

                element.selectedIndex =
                    0;

            }
            else {

                element.value =
                    "";

            }

        }
    );


    filteredSurveys =
        allSurveys.slice();


    renderSurveyRecords();


    console.log(
        "Survey filters reset."
    );

}


/* =========================================================
   SHOW SURVEY ANSWERS
   ========================================================= */

function showSurveyAnswers(
    surveyId
) {

    const survey =
        allSurveys.find(
            function (item) {

                return item.id ===
                    surveyId;

            }
        );


    if (!survey) {

        alert(
            "Survey record not found."
        );

        return;

    }


    const modal =
        document.getElementById(
            "answerModal"
        );


    const content =
        document.getElementById(
            "answerContent"
        );


    if (
        !modal ||
        !content
    ) {

        /*
         * Fallback for dashboards
         * without answer modal.
         */

        console.log(
            "SURVEY ANSWERS:",
            survey
        );


        alert(
            JSON.stringify(
                survey,
                null,
                2
            )
        );


        return;

    }


    content.innerHTML =
        "";


    const heading =
        document.createElement(
            "h3"
        );


    heading.textContent =
        "Survey Details";


    content.appendChild(
        heading
    );


    Object.keys(
        survey
    )
    .forEach(
        function (key) {

            if (
                key === "id" ||
                key === "photos"
            ) {

                return;

            }


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.style.cssText = `
                padding:10px;
                margin-bottom:8px;
                border-bottom:1px solid #eee;
            `;


            const label =
                document.createElement(
                    "strong"
                );


            label.textContent =
                key + ": ";


            const value =
                document.createElement(
                    "span"
                );


            let displayValue =
                survey[key];


            if (
                displayValue &&
                typeof displayValue.toDate ===
                "function"
            ) {

                displayValue =
                    displayValue
                        .toDate()
                        .toLocaleString(
                            "en-IN"
                        );

            }
            else if (
                typeof displayValue ===
                "object"
            ) {

                try {

                    displayValue =
                        JSON.stringify(
                            displayValue,
                            null,
                            2
                        );

                }
                catch (
                    error
                ) {

                    displayValue =
                        String(
                            displayValue
                        );

                }

            }


            value.textContent =
                displayValue ===
                null ||
                displayValue ===
                undefined
                    ? "-"
                    : String(
                        displayValue
                    );


            wrapper.appendChild(
                label
            );


            wrapper.appendChild(
                value
            );


            content.appendChild(
                wrapper
            );

        }
    );


    /*
     * Photos
     */

    if (
        survey.photos &&
        typeof survey.photos ===
        "object"
    ) {

        const photoHeading =
            document.createElement(
                "h3"
            );


        photoHeading.textContent =
            "📷 Photos";


        content.appendChild(
            photoHeading
        );


        Object.keys(
            survey.photos
        )
        .forEach(
            function (key) {

                const photo =
                    survey.photos[key];


                if (
                    !photo ||
                    !photo.url
                ) {

                    return;

                }


                const wrapper =
                    document.createElement(
                        "div"
                    );


                wrapper.style.cssText = `
                    display:inline-block;
                    margin:8px;
                    vertical-align:top;
                `;


                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    photo.url;


                image.alt =
                    photo.name ||
                    key;


                image.style.cssText = `
                    width:160px;
                    height:120px;
                    object-fit:cover;
                    border-radius:8px;
                    border:1px solid #ddd;
                `;


                wrapper.appendChild(
                    image
                );


                content.appendChild(
                    wrapper
                );

            }
        );

    }


    modal.style.display =
        "flex";

}


/* =========================================================
   SETUP ANSWER MODAL
   ========================================================= */

function setupAnswerModal() {

    const modal =
        document.getElementById(
            "answerModal"
        );


    if (!modal) {

        return;

    }


    const closeButtons =
        modal.querySelectorAll(
            ".close-modal, .close, [data-close-modal]"
        );


    closeButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    modal.style.display =
                        "none";

                }
            );

        }
    );


    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                modal
            ) {

                modal.style.display =
                    "none";

            }

        }
    );

}
   /* =========================================================
   SURVEYOR MANAGEMENT
   ========================================================= */

function getSurveyorIdentifiers(surveyor) {

    if (!surveyor) {
        return [];
    }

    const identifiers = [
        surveyor.email,
        surveyor.surveyorEmail,
        surveyor.userEmail,
        surveyor.id,
        surveyor.uid,
        surveyor.userId,
        surveyor.createdBy,
        surveyor.createdByEmail
    ];

    return Array.from(
        new Set(
            identifiers
                .filter(function (value) {
                    return (
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    );
                })
                .map(function (value) {
                    return normalizeValue(value);
                })
        )
    );

}


/* =========================================================
   GET SURVEY IDENTIFIERS
   ========================================================= */

function getSurveyIdentifiers(survey) {

    if (!survey) {
        return [];
    }

    const identifiers = [
        survey.surveyorEmail,
        survey.surveyorId,
        survey.surveyorUid,
        survey.uid,
        survey.createdBy,
        survey.createdByEmail,
        survey.surveyor,
        survey.userEmail,
        survey.userId
    ];

    return Array.from(
        new Set(
            identifiers
                .filter(function (value) {
                    return (
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    );
                })
                .map(function (value) {
                    return normalizeValue(value);
                })
        )
    );

}


/* =========================================================
   CHECK SURVEY BELONGS TO SURVEYOR
   ========================================================= */

function surveyBelongsToSurveyor(
    survey,
    surveyor
) {

    const surveyIdentifiers =
        getSurveyIdentifiers(
            survey
        );


    const surveyorIdentifiers =
        getSurveyorIdentifiers(
            surveyor
        );


    if (
        surveyIdentifiers.length === 0 ||
        surveyorIdentifiers.length === 0
    ) {

        return false;

    }


    return surveyIdentifiers.some(
        function (surveyIdentifier) {

            return surveyorIdentifiers.includes(
                surveyIdentifier
            );

        }
    );

}


/* =========================================================
   RENDER SURVEYOR MANAGEMENT
   ========================================================= */

function renderSurveyorManagement() {

    const table =
        document.getElementById(
            "surveyorManagementTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML =
        "";


    /*
     * Keep the original surveyor documents
     * as the primary source.
     *
     * A combined identity map is used so
     * email/uid/id mismatches do not make
     * survey counts become zero.
     */

    const surveyorMap =
        new Map();


    allSurveyors.forEach(
        function (surveyor) {

            const identifiers =
                getSurveyorIdentifiers(
                    surveyor
                );


            identifiers.forEach(
                function (identifier) {

                    if (
                        !surveyorMap.has(
                            identifier
                        )
                    ) {

                        surveyorMap.set(
                            identifier,
                            surveyor
                        );

                    }

                }
            );

        }
    );


    /*
     * Also include identities found in surveys.
     *
     * This preserves the old behavior where
     * a surveyor can still appear in management
     * even if the surveyor document is missing.
     */

    allSurveys.forEach(
        function (survey) {

            const identifiers =
                getSurveyIdentifiers(
                    survey
                );


            if (
                identifiers.length === 0
            ) {

                return;

            }


            let matched =
                false;


            identifiers.forEach(
                function (identifier) {

                    if (
                        surveyorMap.has(
                            identifier
                        )
                    ) {

                        matched =
                            true;

                    }

                }
            );


            if (!matched) {

                const primary =
                    identifiers[0];


                surveyorMap.set(
                    primary,
                    {
                        id:
                            primary,

                        email:
                            primary,

                        surveyorEmail:
                            primary,

                        name:
                            primary,

                        active:
                            true,

                        enabled:
                            true,

                        __fromSurvey:
                            true
                    }
                );

            }

        }
    );


    /*
     * Remove duplicate surveyor records.
     *
     * Two records are considered the same
     * when ANY of their identifiers overlap.
     */

    const uniqueSurveyors =
        [];


    const uniqueIdentifierSets =
        [];


    surveyorMap.forEach(
        function (surveyor) {

            const identifiers =
                new Set(
                    getSurveyorIdentifiers(
                        surveyor
                    )
                );


            if (
                identifiers.size === 0
            ) {

                return;

            }


            let duplicate =
                false;


            for (
                let i = 0;
                i <
                uniqueIdentifierSets.length;
                i++
            ) {

                const existing =
                    uniqueIdentifierSets[i];


                for (
                    const identifier
                    of identifiers
                ) {

                    if (
                        existing.has(
                            identifier
                        )
                    ) {

                        duplicate =
                            true;

                        break;

                    }

                }


                if (duplicate) {

                    break;

                }

            }


            if (!duplicate) {

                uniqueSurveyors.push(
                    surveyor
                );


                uniqueIdentifierSets.push(
                    identifiers
                );

            }

        }
    );


    if (
        uniqueSurveyors.length === 0
    ) {

        table.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    style="
                        padding:20px;
                        text-align:center;
                    "
                >
                    No surveyors found.
                </td>
            </tr>
            `;


        return;

    }


    uniqueSurveyors.sort(
        function (a, b) {

            const nameA =
                normalizeValue(
                    a.name ||
                    a.surveyorName ||
                    a.username ||
                    a.email ||
                    a.surveyorEmail ||
                    a.id ||
                    ""
                );


            const nameB =
                normalizeValue(
                    b.name ||
                    b.surveyorName ||
                    b.username ||
                    b.email ||
                    b.surveyorEmail ||
                    b.id ||
                    ""
                );


            return nameA.localeCompare(
                nameB
            );

        }
    );


    uniqueSurveyors.forEach(
        function (surveyor) {

            const surveyorSurveys =
                allSurveys.filter(
                    function (survey) {

                        return surveyBelongsToSurveyor(
                            survey,
                            surveyor
                        );

                    }
                );


            const total =
                surveyorSurveys.length;


            let today =
                0;


            let week =
                0;


            let month =
                0;


            surveyorSurveys.forEach(
                function (survey) {

                    const date =
                        getDate(
                            survey.createdAt ||
                            survey.timestamp ||
                            survey.submittedAt ||
                            survey.date
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


            const displayName =
                surveyor.name ||
                surveyor.surveyorName ||
                surveyor.username ||
                surveyor.email ||
                surveyor.surveyorEmail ||
                surveyor.id ||
                "Unknown Surveyor";


            const email =
                surveyor.email ||
                surveyor.surveyorEmail ||
                surveyor.userEmail ||
                surveyor.id ||
                "-";


            const active =
                surveyor.active !== false &&
                surveyor.enabled !== false &&
                surveyor.status !==
                    "disabled";


            const status =
                active
                    ?
                    `
                    <span
                        style="
                            color:green;
                            font-weight:bold;
                        "
                    >
                        🟢 Active
                    </span>
                    `
                    :
                    `
                    <span
                        style="
                            color:red;
                            font-weight:bold;
                        "
                    >
                        🔴 Disabled
                    </span>
                    `;


            const action =
                active
                    ?
                    `
                    <button
                        type="button"
                        class="warning"
                    >
                        Disable
                    </button>
                    `
                    :
                    `
                    <button
                        type="button"
                        class="success"
                    >
                        Enable
                    </button>
                    `;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `
                <td>

                    ${escapeHTML(
                        displayName
                    )}

                    <div
                        style="
                            color:#777;
                            font-size:12px;
                            margin-top:3px;
                        "
                    >
                        ${escapeHTML(
                            email
                        )}
                    </div>

                </td>


                <td>
                    ${total}
                </td>


                <td>
                    ${today}
                </td>


                <td>
                    ${week}
                </td>


                <td>
                    ${month}
                </td>


                <td>

                    ${status}

                    ${action}

                </td>
                `;


            const button =
                row.querySelector(
                    "button"
                );


            if (button) {

                button.addEventListener(
                    "click",
                    function () {

                        toggleSurveyor(
                            surveyor,
                            !active
                        );

                    }
                );

            }


            table.appendChild(
                row
            );

        }
    );


    console.log(
        "SURVEYOR MANAGEMENT UPDATED:",
        uniqueSurveyors.length
    );

}


/* =========================================================
   RENDER SURVEYOR PERFORMANCE
   ========================================================= */

function renderSurveyorPerformance() {

    const table =
        document.getElementById(
            "surveyorPerformanceTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML =
        "";


    const surveyors =
        [];


    const identifierSets =
        [];


    /*
     * Start with real surveyor documents.
     */

    allSurveyors.forEach(
        function (surveyor) {

            const identifiers =
                getSurveyorIdentifiers(
                    surveyor
                );


            if (
                identifiers.length === 0
            ) {

                return;

            }


            const set =
                new Set(
                    identifiers
                );


            let duplicate =
                false;


            for (
                let i = 0;
                i < identifierSets.length;
                i++
            ) {

                for (
                    const id of set
                ) {

                    if (
                        identifierSets[i].has(
                            id
                        )
                    ) {

                        duplicate =
                            true;

                        break;

                    }

                }


                if (duplicate) {

                    break;

                }

            }


            if (!duplicate) {

                surveyors.push(
                    surveyor
                );


                identifierSets.push(
                    set
                );

            }

        }
    );


    /*
     * Add survey-only surveyors if no
     * matching surveyor document exists.
     */

    allSurveys.forEach(
        function (survey) {

            const identifiers =
                getSurveyIdentifiers(
                    survey
                );


            if (
                identifiers.length === 0
            ) {

                return;

            }


            let matched =
                false;


            for (
                let i = 0;
                i < identifierSets.length;
                i++
            ) {

                for (
                    const id of identifiers
                ) {

                    if (
                        identifierSets[i].has(
                            id
                        )
                    ) {

                        matched =
                            true;

                        break;

                    }

                }


                if (matched) {

                    break;

                }

            }


            if (!matched) {

                const primary =
                    identifiers[0];


                surveyors.push({

                    id:
                        primary,

                    email:
                        primary,

                    surveyorEmail:
                        primary,

                    name:
                        primary,

                    enabled:
                        true,

                    active:
                        true

                });


                identifierSets.push(
                    new Set(
                        identifiers
                    )
                );

            }

        }
    );


    if (
        surveyors.length === 0
    ) {

        table.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    style="
                        padding:20px;
                        text-align:center;
                    "
                >
                    No surveyors found.
                </td>
            </tr>
            `;


        return;

    }


    surveyors.sort(
        function (a, b) {

            const nameA =
                normalizeValue(
                    a.name ||
                    a.surveyorName ||
                    a.username ||
                    a.email ||
                    a.surveyorEmail ||
                    a.id ||
                    ""
                );


            const nameB =
                normalizeValue(
                    b.name ||
                    b.surveyorName ||
                    b.username ||
                    b.email ||
                    b.surveyorEmail ||
                    b.id ||
                    ""
                );


            return nameA.localeCompare(
                nameB
            );

        }
    );


    surveyors.forEach(
        function (surveyor) {

            let total =
                0;


            let today =
                0;


            let week =
                0;


            let month =
                0;


            allSurveys.forEach(
                function (survey) {

                    if (
                        !surveyBelongsToSurveyor(
                            survey,
                            surveyor
                        )
                    ) {

                        return;

                    }


                    total++;


                    const date =
                        getDate(
                            survey.createdAt ||
                            survey.timestamp ||
                            survey.submittedAt ||
                            survey.date
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


            const displayName =
                surveyor.name ||
                surveyor.surveyorName ||
                surveyor.username ||
                surveyor.email ||
                surveyor.surveyorEmail ||
                surveyor.id ||
                "Unknown Surveyor";


            const email =
                surveyor.email ||
                surveyor.surveyorEmail ||
                surveyor.userEmail ||
                surveyor.id ||
                "-";


            table.innerHTML +=
                `
                <tr>

                    <td>

                        ${escapeHTML(
                            displayName
                        )}

                        <div
                            style="
                                color:#777;
                                font-size:12px;
                                margin-top:3px;
                            "
                        >
                            ${escapeHTML(
                                email
                            )}
                        </div>

                    </td>


                    <td>
                        ${total}
                    </td>


                    <td>
                        ${today}
                    </td>


                    <td>
                        ${week}
                    </td>


                    <td>
                        ${month}
                    </td>

                </tr>
                `;

        }
    );


    console.log(
        "SURVEYOR PERFORMANCE UPDATED:",
        surveyors.length
    );

}


/* =========================================================
   TOGGLE SURVEYOR
   ========================================================= */

function toggleSurveyor(
    surveyor,
    enable
) {

    if (!surveyor) {

        return;

    }


    /*
     * Survey-only identities do not have
     * a real Firestore document to update.
     */

    if (
        surveyor.__fromSurvey
    ) {

        alert(
            "This surveyor does not have a surveyor account document."
        );

        return;

    }


    const surveyorId =
        surveyor.id ||
        surveyor.uid;


    if (!surveyorId) {

        alert(
            "Surveyor ID not found."
        );

        return;

    }


    const updateData = {

        active:
            enable,

        enabled:
            enable,

        status:
            enable
                ? "active"
                : "disabled",

        updatedAt:
            firebase.firestore.FieldValue
                .serverTimestamp()

    };


    db.collection(
        "surveyors"
    )
    .doc(
        surveyorId
    )
    .update(
        updateData
    )

    .then(function () {

        /*
         * Update local copy.
         */

        surveyor.active =
            enable;


        surveyor.enabled =
            enable;


        surveyor.status =
            enable
                ? "active"
                : "disabled";


        renderSurveyorManagement();

        renderSurveyorPerformance();


        alert(
            enable
                ? "Surveyor enabled successfully."
                : "Surveyor disabled successfully."
        );

    })

    .catch(function (error) {

        console.error(
            "TOGGLE SURVEYOR ERROR:",
            error
        );


        alert(
            "Unable to update surveyor status: " +
            error.message
        );

    });

}


/* =========================================================
   LOAD SURVEYORS
   ========================================================= */

function loadSurveyors() {

    console.log(
        "Loading surveyors..."
    );


    return db.collection(
        "surveyors"
    )
    .get()

    .then(function (snapshot) {

        allSurveyors =
            [];


        snapshot.forEach(
            function (doc) {

                allSurveyors.push({

                    id:
                        doc.id,

                    ...doc.data()

                });

            }
        );


        console.log(
            "SURVEYORS LOADED:",
            allSurveyors.length
        );


        renderSurveyorManagement();

        renderSurveyorPerformance();


        return allSurveyors;

    })

    .catch(function (error) {

        console.error(
            "SURVEYOR LOAD ERROR:",
            error
        );


        allSurveyors =
            [];


        renderSurveyorManagement();

        renderSurveyorPerformance();


        return [];

    });

}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

function loadSettings() {

    console.log(
        "Loading settings..."
    );


    return db.collection(
        "settings"
    )
    .doc(
        "config"
    )
    .get()

    .then(function (doc) {

        if (
            doc.exists
        ) {

            settings =
                {
                    ...settings,
                    ...doc.data()
                };

        }


        console.log(
            "SETTINGS LOADED:",
            settings
        );


        /*
         * Display daily limit
         */

        const dailyLimit =
            settings.dailyLimit ||
            settings.dailySurveyLimit ||
            20;


        const input =
            document.getElementById(
                "dailyLimit"
            );


        if (input) {

            input.value =
                dailyLimit;

        }


        const display =
            document.getElementById(
                "currentDailyLimit"
            );


        if (display) {

            display.textContent =
                dailyLimit;

        }


        return settings;

    })

    .catch(function (error) {

        console.error(
            "SETTINGS LOAD ERROR:",
            error
        );


        return settings;

    });

}


/* =========================================================
   SAVE DAILY LIMIT
   ========================================================= */

function saveDailyLimit() {

    const input =
        document.getElementById(
            "dailyLimit"
        );


    if (!input) {

        alert(
            "Daily limit field not found."
        );

        return;

    }


    const value =
        parseInt(
            input.value,
            10
        );


    if (
        isNaN(value) ||
        value < 1
    ) {

        alert(
            "Please enter a valid daily limit."
        );

        return;

    }


    db.collection(
        "settings"
    )
    .doc(
        "config"
    )
    .set(
        {
            dailyLimit:
                value,

            updatedAt:
                firebase.firestore.FieldValue
                    .serverTimestamp()

        },
        {
            merge:
                true
        }
    )

    .then(function () {

        settings.dailyLimit =
            value;


        const display =
            document.getElementById(
                "currentDailyLimit"
            );


        if (display) {

            display.textContent =
                value;

        }


        alert(
            "Daily survey limit updated successfully."
        );

    })

    .catch(function (error) {

        console.error(
            "SAVE DAILY LIMIT ERROR:",
            error
        );


        alert(
            "Unable to save daily limit: " +
            error.message
        );

    });

}


/* =========================================================
   PARTY CHART
   ========================================================= */

function renderPartyChart() {

    const canvas =
        document.getElementById(
            "partyChart"
        );


    if (!canvas) {

        return;

    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.warn(
            "Chart.js is not loaded."
        );

        return;

    }


    const counts =
        {};


    allSurveys.forEach(
        function (survey) {

            const party =
                String(
                    survey.party ||
                    "Not Specified"
                ).trim();


            if (!counts[party]) {

                counts[party] =
                    0;

            }


            counts[party]++;

        }
    );


    const labels =
        Object.keys(
            counts
        );


    const values =
        labels.map(
            function (label) {

                return counts[label];

            }
        );


    if (
        window.partyChartInstance
    ) {

        try {

            window.partyChartInstance.destroy();

        }
        catch (
            error
        ) {

            console.warn(
                "Unable to destroy previous party chart.",
                error
            );

        }

    }


    window.partyChartInstance =
        new Chart(
            canvas.getContext("2d"),
            {

                type:
                    "bar",

                data:
                    {
                        labels:
                            labels,

                        datasets:
                            [
                                {
                                    label:
                                        "Survey Count",

                                    data:
                                        values

                                }
                            ]
                    },

                options:
                    {
                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        plugins:
                            {
                                legend:
                                    {
                                        display:
                                            true
                                    }
                            },

                        scales:
                            {
                                y:
                                    {
                                        beginAtZero:
                                            true,

                                        ticks:
                                            {
                                                precision:
                                                    0
                                            }
                                    }
                            }

                    }

            }
        );

}


/* =========================================================
   SEARCH SURVEYS
   ========================================================= */

function searchSurveys() {

    applySurveyFilters();

}


/* =========================================================
   SETUP FILTER EVENTS
   ========================================================= */

function setupFilterEvents() {

    const filterIds = [

        "searchBox",
        "partyFilter",
        "dateFilter",
        "villageFilter",
        "assemblyFilter",
        "surveyorFilter",
        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor",
        "filterDate"

    ];


    filterIds.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {

                return;

            }


            element.addEventListener(
                "input",
                function () {

                    applySurveyFilters();

                }
            );


            element.addEventListener(
                "change",
                function () {

                    applySurveyFilters();

                }
            );

        }
    );


    const searchButton =
        document.getElementById(
            "searchButton"
        );


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            function () {

                applySurveyFilters();

            }
        );

    }


    const resetButton =
        document.getElementById(
            "resetFilters"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                resetSurveyFilters();

            }
        );

    }

}
   /* =========================================================
   EXPORT SURVEYS TO EXCEL
   ========================================================= */

function exportSurveysToExcel() {

    if (
        allSurveys.length === 0
    ) {

        alert(
            "No survey data available to export."
        );

        return;

    }


    if (
        typeof XLSX ===
        "undefined"
    ) {

        alert(
            "Excel export library is not loaded."
        );

        return;

    }


    const rows =
        allSurveys.map(
            function (survey, index) {

                const row = {

                    "S.No":
                        index + 1,

                    "Surveyor":
                        survey.surveyorEmail ||
                        survey.surveyorId ||
                        survey.createdBy ||
                        survey.createdByEmail ||
                        "",

                    "Surveyor Name":
                        survey.surveyorName ||
                        "",

                    "Respondent Name":
                        survey.name ||
                        survey.respondentName ||
                        survey.fullName ||
                        "",

                    "Mobile":
                        survey.mobile ||
                        survey.phone ||
                        survey.mobileNumber ||
                        "",

                    "Village":
                        survey.village ||
                        survey.city ||
                        "",

                    "Assembly":
                        survey.assembly ||
                        survey.vidhanSabha ||
                        "",

                    "Party":
                        survey.party ||
                        "",

                    "Candidate":
                        survey.candidate ||
                        "",

                    "Created At":
                        formatDateValue(
                            survey.createdAt ||
                            survey.timestamp ||
                            survey.submittedAt ||
                            survey.date
                        )

                };


                /*
                 * Add all answer fields.
                 *
                 * Internal metadata fields are skipped.
                 */

                Object.keys(
                    survey
                ).forEach(
                    function (key) {

                        if (
                            [
                                "id",
                                "surveyorId",
                                "surveyorEmail",
                                "surveyorName",
                                "createdBy",
                                "createdByEmail",
                                "createdAt",
                                "timestamp",
                                "submittedAt",
                                "date",
                                "photos"
                            ].includes(key)
                        ) {

                            return;

                        }


                        if (
                            Object.prototype.hasOwnProperty.call(
                                row,
                                key
                            )
                        ) {

                            return;

                        }


                        let value =
                            survey[key];


                        if (
                            value &&
                            typeof value.toDate ===
                            "function"
                        ) {

                            value =
                                value
                                    .toDate()
                                    .toLocaleString(
                                        "en-IN"
                                    );

                        }
                        else if (
                            Array.isArray(
                                value
                            )
                        ) {

                            value =
                                value.join(
                                    ", "
                                );

                        }
                        else if (
                            typeof value ===
                            "object" &&
                            value !== null
                        ) {

                            try {

                                value =
                                    JSON.stringify(
                                        value
                                    );

                            }
                            catch (
                                error
                            ) {

                                value =
                                    String(
                                        value
                                    );

                            }

                        }


                        row[key] =
                            value;

                    }
                );


                return row;

            }
        );


    try {

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


        /*
         * Auto width
         */

        const range =
            XLSX.utils.decode_range(
                worksheet["!ref"]
            );


        const widths =
            [];


        for (
            let column =
                range.s.c;
            column <=
            range.e.c;
            column++
        ) {

            let maxLength =
                10;


            for (
                let row =
                    range.s.r;
                row <=
                range.e.r;
                row++
            ) {

                const address =
                    XLSX.utils.encode_cell({
                        r: row,
                        c: column
                    });


                const cell =
                    worksheet[address];


                if (
                    cell &&
                    cell.v !==
                    undefined &&
                    cell.v !==
                    null
                ) {

                    maxLength =
                        Math.max(
                            maxLength,
                            String(
                                cell.v
                            ).length
                        );

                }

            }


            widths.push({

                wch:
                    Math.min(
                        maxLength + 2,
                        45
                    )

            });

        }


        worksheet["!cols"] =
            widths;


        const fileName =
            "Surveykshan_Surveys_" +
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                ) +
            ".xlsx";


        XLSX.writeFile(
            workbook,
            fileName
        );


        console.log(
            "Excel export completed:",
            fileName
        );

    }
    catch (error) {

        console.error(
            "EXCEL EXPORT ERROR:",
            error
        );


        alert(
            "Excel export failed: " +
            error.message
        );

    }

}


/* =========================================================
   FORMAT DATE VALUE
   ========================================================= */

function formatDateValue(
    value
) {

    const date =
        getDate(
            value
        );


    if (!date) {

        return "";

    }


    return date.toLocaleString(
        "en-IN"
    );

}


/* =========================================================
   DELETE SINGLE SURVEY
   ========================================================= */

function deleteSurvey(
    surveyId
) {

    if (!surveyId) {

        alert(
            "Survey ID not found."
        );

        return;

    }


    const survey =
        allSurveys.find(
            function (item) {

                return item.id ===
                    surveyId;

            }
        );


    const confirmed =
        confirm(
            "Are you sure you want to delete this survey?"
        );


    if (!confirmed) {

        return;

    }


    db.collection(
        "surveys"
    )
    .doc(
        surveyId
    )
    .delete()

    .then(function () {

        allSurveys =
            allSurveys.filter(
                function (item) {

                    return item.id !==
                        surveyId;

                }
            );


        filteredSurveys =
            filteredSurveys.filter(
                function (item) {

                    return item.id !==
                        surveyId;

                }
            );


        updateDashboard();

        populateFilterDropdowns();

        renderSurveyRecords();

        renderSurveyorManagement();

        renderSurveyorPerformance();

        renderPartyChart();


        alert(
            "Survey deleted successfully."
        );

    })

    .catch(function (error) {

        console.error(
            "DELETE SURVEY ERROR:",
            error
        );


        alert(
            "Unable to delete survey: " +
            error.message
        );

    });

}


/* =========================================================
   DELETE ALL SURVEYS
   ========================================================= */

function deleteAllSurveys() {

    if (
        allSurveys.length === 0
    ) {

        alert(
            "There are no surveys to delete."
        );

        return;

    }


    const firstConfirmation =
        confirm(
            "WARNING!\n\n" +
            "This will permanently delete ALL survey records.\n\n" +
            "Do you want to continue?"
        );


    if (!firstConfirmation) {

        return;

    }


    const secondConfirmation =
        confirm(
            "Please confirm again.\n\n" +
            "ALL SURVEY DATA WILL BE DELETED."
        );


    if (!secondConfirmation) {

        return;

    }


    const batchSize =
        400;


    const deleteNextBatch =
        function (startIndex) {

            const batch =
                db.batch();


            const endIndex =
                Math.min(
                    startIndex +
                    batchSize,
                    allSurveys.length
                );


            for (
                let i =
                    startIndex;
                i < endIndex;
                i++
            ) {

                const survey =
                    allSurveys[i];


                if (
                    survey &&
                    survey.id
                ) {

                    const reference =
                        db.collection(
                            "surveys"
                        )
                        .doc(
                            survey.id
                        );


                    batch.delete(
                        reference
                    );

                }

            }


            return batch.commit()
                .then(
                    function () {

                        if (
                            endIndex <
                            allSurveys.length
                        ) {

                            return deleteNextBatch(
                                endIndex
                            );

                        }


                        return true;

                    }
                );

        };


    deleteNextBatch(
        0
    )

    .then(function () {

        allSurveys =
            [];


        filteredSurveys =
            [];


        updateDashboard();

        populateFilterDropdowns();

        renderSurveyRecords();

        renderSurveyorManagement();

        renderSurveyorPerformance();

        renderPartyChart();


        alert(
            "All surveys deleted successfully."
        );

    })

    .catch(function (error) {

        console.error(
            "DELETE ALL SURVEYS ERROR:",
            error
        );


        alert(
            "Unable to delete all surveys: " +
            error.message
        );

    });

}


/* =========================================================
   DOWNLOAD SURVEY PHOTOS
   ========================================================= */

function openSurveyPhoto(
    url
) {

    if (!url) {

        return;

    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


/* =========================================================
   RENDER PHOTO GRID
   ========================================================= */

function renderSurveyPhotos(
    survey
) {

    if (
        !survey ||
        !survey.photos ||
        typeof survey.photos !==
            "object"
    ) {

        return `
            <div
                style="
                    padding:10px;
                    color:#777;
                "
            >
                No photos uploaded.
            </div>
        `;

    }


    const photoKeys =
        [
            "photo1",
            "photo2",
            "photo3",
            "photo4"
        ];


    const html =
        photoKeys
            .map(
                function (key) {

                    const photo =
                        survey.photos[key];


                    if (
                        !photo ||
                        !photo.url
                    ) {

                        return `
                            <div
                                style="
                                    width:170px;
                                    padding:10px;
                                    color:#999;
                                "
                            >
                                ${key}
                                <br>
                                Not available
                            </div>
                        `;

                    }


                    return `
                        <div
                            style="
                                width:180px;
                                display:inline-block;
                                vertical-align:top;
                                margin:8px;
                                text-align:center;
                            "
                        >

                            <div
                                style="
                                    font-weight:bold;
                                    margin-bottom:6px;
                                "
                            >
                                ${escapeHTML(
                                    key
                                )}
                            </div>

                            <img
                                src="${escapeHTML(
                                    photo.url
                                )}"
                                alt="${escapeHTML(
                                    photo.name ||
                                    key
                                )}"
                                style="
                                    width:160px;
                                    height:120px;
                                    object-fit:cover;
                                    border-radius:8px;
                                    border:1px solid #ddd;
                                    cursor:pointer;
                                "
                                onclick="openSurveyPhoto('${escapeHTML(
                                    photo.url
                                )}')"
                            >

                            <div
                                style="
                                    font-size:11px;
                                    color:#777;
                                    margin-top:5px;
                                    word-break:break-word;
                                "
                            >
                                ${escapeHTML(
                                    photo.name ||
                                    ""
                                )}
                            </div>

                        </div>
                    `;

                }
            )
            .join("");


    return `
        <div
            style="
                display:flex;
                flex-wrap:wrap;
                gap:5px;
            "
        >
            ${html}
        </div>
    `;

}


/* =========================================================
   SHOW SURVEY DETAILS WITH PHOTOS
   ========================================================= */

function viewSurveyDetails(
    surveyId
) {

    const survey =
        allSurveys.find(
            function (item) {

                return item.id ===
                    surveyId;

            }
        );


    if (!survey) {

        alert(
            "Survey not found."
        );

        return;

    }


    const modal =
        document.getElementById(
            "answerModal"
        );


    const content =
        document.getElementById(
            "answerContent"
        );


    if (
        !modal ||
        !content
    ) {

        console.log(
            "Survey details:",
            survey
        );

        return;

    }


    content.innerHTML =
        "";


    const title =
        document.createElement(
            "h2"
        );


    title.textContent =
        "📋 Survey Details";


    content.appendChild(
        title
    );


    const details =
        document.createElement(
            "div"
        );


    details.style.cssText =
        `
            margin-bottom:20px;
        `;


    const fields = [

        [
            "Surveyor",
            survey.surveyorEmail ||
            survey.surveyorId ||
            survey.createdBy ||
            "-"
        ],

        [
            "Surveyor Name",
            survey.surveyorName ||
            "-"
        ],

        [
            "Respondent Name",
            survey.name ||
            survey.respondentName ||
            survey.fullName ||
            "-"
        ],

        [
            "Mobile",
            survey.mobile ||
            survey.phone ||
            survey.mobileNumber ||
            "-"
        ],

        [
            "Village",
            survey.village ||
            survey.city ||
            "-"
        ],

        [
            "Assembly",
            survey.assembly ||
            survey.vidhanSabha ||
            "-"
        ],

        [
            "Party",
            survey.party ||
            "-"
        ],

        [
            "Candidate",
            survey.candidate ||
            "-"
        ],

        [
            "Submitted At",
            formatDateValue(
                survey.createdAt ||
                survey.timestamp ||
                survey.submittedAt ||
                survey.date
            ) || "-"
        ]

    ];


    fields.forEach(
        function (field) {

            const item =
                document.createElement(
                    "div"
                );


            item.style.cssText =
                `
                    padding:8px;
                    border-bottom:1px solid #eee;
                `;


            item.innerHTML =
                `
                    <strong>
                        ${escapeHTML(
                            field[0]
                        )}
                    </strong>
                    :
                    ${escapeHTML(
                        String(
                            field[1]
                        )
                    )}
                `;


            details.appendChild(
                item
            );

        }
    );


    content.appendChild(
        details
    );


    const photoTitle =
        document.createElement(
            "h3"
        );


    photoTitle.textContent =
        "📷 Uploaded Photos";


    content.appendChild(
        photoTitle
    );


    const photoContainer =
        document.createElement(
            "div"
        );


    photoContainer.innerHTML =
        renderSurveyPhotos(
            survey
        );


    content.appendChild(
        photoContainer
    );


    /*
     * Render remaining answer fields.
     */

    const answerTitle =
        document.createElement(
            "h3"
        );


    answerTitle.textContent =
        "📝 Answers";


    content.appendChild(
        answerTitle
    );


    Object.keys(
        survey
    )
    .forEach(
        function (key) {

            if (
                [
                    "id",
                    "photos",
                    "surveyorId",
                    "surveyorEmail",
                    "surveyorName",
                    "createdBy",
                    "createdByEmail",
                    "name",
                    "respondentName",
                    "fullName",
                    "mobile",
                    "phone",
                    "mobileNumber",
                    "village",
                    "city",
                    "assembly",
                    "vidhanSabha",
                    "party",
                    "candidate",
                    "createdAt",
                    "timestamp",
                    "submittedAt",
                    "date"
                ].includes(key)
            ) {

                return;

            }


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.style.cssText =
                `
                    padding:8px;
                    border-bottom:1px solid #eee;
                `;


            let value =
                survey[key];


            if (
                value &&
                typeof value.toDate ===
                    "function"
            ) {

                value =
                    value
                        .toDate()
                        .toLocaleString(
                            "en-IN"
                        );

            }
            else if (
                typeof value ===
                "object" &&
                value !== null
            ) {

                try {

                    value =
                        JSON.stringify(
                            value,
                            null,
                            2
                        );

                }
                catch (
                    error
                ) {

                    value =
                        String(
                            value
                        );

                }

            }


            wrapper.innerHTML =
                `
                    <strong>
                        ${escapeHTML(
                            key
                        )}
                    </strong>
                    :
                    ${escapeHTML(
                        String(
                            value ??
                            "-"
                        )
                    )}
                `;


            content.appendChild(
                wrapper
            );

        }
    );


    modal.style.display =
        "flex";

}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

    const modal =
        document.getElementById(
            "answerModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   ESC KEY MODAL CLOSE
   ========================================================= */

function setupGlobalModalEvents() {

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Escape"
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   DOWNLOAD DATA AS JSON
   ========================================================= */

function exportSurveysAsJSON() {

    if (
        allSurveys.length === 0
    ) {

        alert(
            "No survey data available."
        );

        return;

    }


    try {

        const json =
            JSON.stringify(
                allSurveys,
                function (key, value) {

                    if (
                        value &&
                        typeof value.toDate ===
                            "function"
                    ) {

                        return value
                            .toDate()
                            .toISOString();

                    }


                    return value;

                },
                2
            );


        const blob =
            new Blob(
                [
                    json
                ],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "Surveykshan_Surveys_" +
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                ) +
            ".json";


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );


    }
    catch (error) {

        console.error(
            "JSON EXPORT ERROR:",
            error
        );


        alert(
            "JSON export failed: " +
            error.message
        );

    }

}


/* =========================================================
   COPY SURVEY DATA
   ========================================================= */

function copySurveyData(
    surveyId
) {

    const survey =
        allSurveys.find(
            function (item) {

                return item.id ===
                    surveyId;

            }
        );


    if (!survey) {

        alert(
            "Survey not found."
        );

        return;

    }


    let text =
        "";


    Object.keys(
        survey
    )
    .forEach(
        function (key) {

            if (
                key ===
                "photos"
            ) {

                return;

            }


            let value =
                survey[key];


            if (
                value &&
                typeof value.toDate ===
                    "function"
            ) {

                value =
                    value
                        .toDate()
                        .toLocaleString(
                            "en-IN"
                        );

            }
            else if (
                typeof value ===
                    "object" &&
                value !== null
            ) {

                try {

                    value =
                        JSON.stringify(
                            value
                        );

                }
                catch (
                    error
                ) {

                    value =
                        String(
                            value
                        );

                }

            }


            text +=
                key +
                ": " +
                String(
                    value ??
                    ""
                ) +
                "\n";

        }
    );


    if (
        navigator.clipboard &&
        navigator.clipboard.writeText
    ) {

        navigator.clipboard
            .writeText(
                text
            )
            .then(
                function () {

                    alert(
                        "Survey data copied."
                    );

                }
            )
            .catch(
                function () {

                    fallbackCopyText(
                        text
                    );

                }
            );

    }
    else {

        fallbackCopyText(
            text
        );

    }

}


/* =========================================================
   FALLBACK COPY
   ========================================================= */

function fallbackCopyText(
    text
) {

    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.value =
        text;


    textarea.style.position =
        "fixed";


    textarea.style.left =
        "-9999px";


    document.body.appendChild(
        textarea
    );


    textarea.select();


    try {

        document.execCommand(
            "copy"
        );


        alert(
            "Survey data copied."
        );

    }
    catch (error) {

        console.error(
            "COPY ERROR:",
            error
        );


        alert(
            "Unable to copy survey data."
        );

    }


    document.body.removeChild(
        textarea
    );

}


/* =========================================================
   ADMIN AUTH CHECK
   ========================================================= */

function checkAdminAccess() {

    if (
        typeof firebase ===
        "undefined" ||
        !firebase.auth
    ) {

        console.error(
            "Firebase Auth is not available."
        );

        return;

    }


    firebase.auth()
        .onAuthStateChanged(
            function (user) {

                if (!user) {

                    console.warn(
                        "No authenticated user."
                    );


                    /*
                     * Keep existing login flow.
                     * If admin page has its own login
                     * UI, it can handle this state.
                     */

                    return;

                }


                const email =
                    normalizeValue(
                        user.email ||
                        ""
                    );


                const adminEmail =
                    normalizeValue(
                        ADMIN_EMAIL
                    );


                if (
                    adminEmail &&
                    email !==
                        adminEmail
                ) {

                    console.warn(
                        "Authenticated user is not the configured admin:",
                        user.email
                    );

                }

            }
        );

}


/* =========================================================
   LOGIN HELPER
   ========================================================= */

function adminLogin(
    email,
    password
) {

    if (
        !email ||
        !password
    ) {

        alert(
            "Please enter email and password."
        );

        return;

    }


    firebase.auth()
        .signInWithEmailAndPassword(
            email,
            password
        )

        .then(function (result) {

            console.log(
                "Admin login successful:",
                result.user.email
            );


            loadAdminData();

        })

        .catch(function (error) {

            console.error(
                "ADMIN LOGIN ERROR:",
                error
            );


            alert(
                "Login failed: " +
                error.message
            );

        });

}


/* =========================================================
   LOGOUT
   ========================================================= */

function adminLogout() {

    if (
        typeof firebase ===
        "undefined" ||
        !firebase.auth
    ) {

        return;

    }


    firebase.auth()
        .signOut()

        .then(function () {

            console.log(
                "Admin logged out."
            );

            window.location.reload();

        })

        .catch(function (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

        });

}
