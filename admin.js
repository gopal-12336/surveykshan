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
                    dateA - dateB
                );

            }
        );


        /*
         * THIS IS THE IMPORTANT FIX
         */

        setText(
            "questionCount",
            allQuestions.length
        );


        /*
         * Support alternate IDs
         */

        setText(
            "totalQuestions",
            allQuestions.length
        );


        console.log(
            "QUESTIONS LOADED:",
            allQuestions.length
        );


        allQuestions.forEach(
            function (question) {

                console.log(
                    "Question:",
                    question.id,
                    question
                );

            }
        );


        renderQuestions();


        return allQuestions;

    })

    .catch(function (error) {

        console.error(
            "QUESTION LOAD ERROR:",
            error
        );


        /*
         * Don't silently keep
         * the old 0 without explanation.
         */

        setText(
            "questionCount",
            0
        );


        setText(
            "totalQuestions",
            0
        );


        const container =
            document.getElementById(
                "questionsList"
            );


        if (container) {

            container.innerHTML =
                `
                <p style="
                    color:#c62828;
                    font-weight:bold;
                ">
                    ❌ Unable to load questions.
                </p>
                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>
                `;

        }


        return [];

    });

}


/* =========================================================
   RENDER QUESTIONS
   ========================================================= */

function renderQuestions() {

    const container =
        document.getElementById(
            "questionsList"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        allQuestions.length === 0
    ) {

        container.innerHTML =
            `
            <p>
                No questions added yet.
            </p>
            `;

        return;

    }


    allQuestions.forEach(
        function (
            question,
            index
        ) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "question-card";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                (
                    index + 1
                ) +
                ". " +
                (
                    question.question ||
                    "Untitled Question"
                );


            card.appendChild(
                title
            );


            const badge =
                document.createElement(
                    "span"
                );


            badge.className =
                "badge";


            badge.textContent =
                question.type ===
                "multiple"
                    ? "Multiple Choice"
                    : "Single Choice";


            card.appendChild(
                badge
            );


            const options =
                document.createElement(
                    "div"
                );


            options.style.marginTop =
                "10px";


            (
                question.options ||
                []
            )
            .forEach(
                function (option) {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "option-item";


                    item.textContent =
                        "• " +
                        option;


                    options.appendChild(
                        item
                    );

                }
            );


            card.appendChild(
                options
            );


            const editButton =
                document.createElement(
                    "button"
                );


            editButton.type =
                "button";


            editButton.className =
                "primary";


            editButton.textContent =
                "✏️ Edit";


            editButton.addEventListener(
                "click",
                function () {

                    editQuestion(
                        question.id
                    );

                }
            );


            card.appendChild(
                editButton
            );


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "danger";


            deleteButton.textContent =
                "🗑️ Delete";


            deleteButton.addEventListener(
                "click",
                function () {

                    deleteQuestion(
                        question.id
                    );

                }
            );


            card.appendChild(
                deleteButton
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   EDIT QUESTION
   ========================================================= */

function editQuestion(id) {

    const question =
        allQuestions.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!question) {

        alert(
            "Question not found."
        );

        return;

    }


    editingQuestionId =
        id;


    const textElement =
        document.getElementById(
            "questionText"
        );


    const typeElement =
        document.getElementById(
            "questionType"
        );


    const container =
        document.getElementById(
            "optionsContainer"
        );


    if (textElement) {

        textElement.value =
            question.question ||
            "";

    }


    if (typeElement) {

        typeElement.value =
            question.type ||
            "single";

    }


    if (container) {

        container.innerHTML =
            "";


        (
            question.options ||
            []
        )
        .forEach(
            function (option) {

                createOptionInput(
                    option
                );

            }
        );


        if (
            container.children.length === 0
        ) {

            createOptionInput();

            createOptionInput();

        }

    }


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


    const managerBody =
        document.getElementById(
            "questionManagerBody"
        );


    if (managerBody) {

        managerBody.style.display =
            "block";

    }


    const toggle =
        document.getElementById(
            "questionManagerToggle"
        );


    if (toggle) {

        toggle.textContent =
            "🙈 Hide";

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

function deleteQuestion(id) {

    if (
        !confirm(
            "Are you sure you want to delete this question?"
        )
    ) {

        return;

    }


    db.collection(
        "questions"
    )
    .doc(id)
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
            "Delete failed: " +
            error.message
        );

    });

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


    const container =
        document.getElementById(
            "optionsContainer"
        );


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    const cancelButton =
        document.getElementById(
            "cancelEdit"
        );


    if (textElement) {

        textElement.value =
            "";

    }


    if (typeElement) {

        typeElement.value =
            "single";

    }


    if (container) {

        container.innerHTML =
            "";


        createOptionInput();

        createOptionInput();

    }


    if (saveButton) {

        saveButton.textContent =
            "💾 Save Question";

    }


    if (cancelButton) {

        cancelButton.style.display =
            "none";

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


        /*
         * Newest survey first
         */

        allSurveys.sort(
            function (a, b) {

                const dateA =
                    getDate(
                        a.createdAt ||
                        a.timestamp ||
                        a.submittedAt
                    );


                const dateB =
                    getDate(
                        b.createdAt ||
                        b.timestamp ||
                        b.submittedAt
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


                return dateB - dateA;

            }
        );


        filteredSurveys =
            allSurveys.slice();


        console.log(
            "SURVEYS LOADED:",
            allSurveys.length
        );


        /*
         * IMPORTANT DASHBOARD UPDATE
         */

        updateDashboard();


        populateFilterDropdowns();


        renderSurveyRecords();


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


        setText(
            "totalSurvey",
            0
        );


        setText(
            "todaySurvey",
            0
        );


        setText(
            "weekSurvey",
            0
        );


        setText(
            "monthSurvey",
            0
        );


        const table =
            document.getElementById(
                "surveyTable"
            );


        if (table) {

            table.innerHTML =
                `
                <tr>
                    <td
                        colspan="11"
                        style="
                            color:#c62828;
                            padding:25px;
                        "
                    >
                        ❌ Unable to load surveys.
                        <br>
                        ${escapeHTML(
                            error.message
                        )}
                    </td>
                </tr>
                `;

        }


        return [];

    });

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const total =
        allSurveys.length;


    let today = 0;

    let week = 0;

    let month = 0;


    let bjp = 0;

    let congress = 0;

    let aap = 0;

    let bsp = 0;

    let sp = 0;

    let other = 0;


    allSurveys.forEach(
        function (survey) {

            /*
             * Date fallback
             */

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


            /*
             * Party
             */

            const party =
                normalizeValue(
                    survey.party
                );


            if (
                party === "bjp"
            ) {

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

        }
    );


    /*
     * MAIN CARDS
     */

    setText(
        "totalSurvey",
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


    /*
     * Alternate IDs
     */

    setText(
        "todayCount",
        today
    );


    setText(
        "weekCount",
        week
    );


    setText(
        "monthCount",
        month
    );


    setText(
        "filteredSurvey",
        total
    );


    /*
     * Party cards if present
     */

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


    console.log(
        "DASHBOARD COUNTS:",
        {
            total:
                total,

            today:
                today,

            week:
                week,

            month:
                month,

            questions:
                allQuestions.length
        }
    );

}


/* =========================================================
   FILTER DROPDOWNS
   ========================================================= */

function addUniqueOption(
    select,
    value,
    label
) {

    if (
        !select ||
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return;

    }


    const normalized =
        normalizeValue(value);


    /*
     * Prevent duplicate options
     */

    const existing =
        Array.from(
            select.options
        )
        .some(
            function (option) {

                return (
                    normalizeValue(
                        option.value
                    ) ===
                    normalized
                );

            }
        );


    if (existing) {

        return;

    }


    const option =
        document.createElement(
            "option"
        );


    option.value =
        String(value);


    option.textContent =
        label ||
        String(value);


    select.appendChild(
        option
    );

}


/* =========================================================
   POPULATE FILTERS
   ========================================================= */

function populateFilterDropdowns() {

    const nameFilter =
        document.getElementById(
            "filterName"
        );


    const mobileFilter =
        document.getElementById(
            "filterMobile"
        );


    const villageFilter =
        document.getElementById(
            "filterVillage"
        );


    const surveyorFilter =
        document.getElementById(
            "filterSurveyor"
        );


    const villageFilterOld =
        document.getElementById(
            "villageFilter"
        );


    const surveyorFilterOld =
        document.getElementById(
            "surveyorFilter"
        );


    /*
     * New filter system
     */

    if (nameFilter) {

        nameFilter.innerHTML =
            '<option value="">👤 All Names</option>';

    }


    if (mobileFilter) {

        mobileFilter.innerHTML =
            '<option value="">📱 All Mobile</option>';

    }


    if (villageFilter) {

        villageFilter.innerHTML =
            '<option value="">🏠 All Villages</option>';

    }


    if (surveyorFilter) {

        surveyorFilter.innerHTML =
            '<option value="">🧑‍💼 All Surveyors</option>';

    }


    /*
     * Old filter system
     */

    if (villageFilterOld) {

        villageFilterOld.innerHTML =
            '<option value="">All Villages</option>';

    }


    if (surveyorFilterOld) {

        surveyorFilterOld.innerHTML =
            '<option value="">All Surveyors</option>';

    }


    allSurveys.forEach(
        function (survey) {

            addUniqueOption(
                nameFilter,
                survey.name,
                survey.name
            );


            addUniqueOption(
                mobileFilter,
                survey.mobile,
                survey.mobile
            );


            addUniqueOption(
                villageFilter,
                survey.village,
                survey.village
            );


            addUniqueOption(
                villageFilterOld,
                survey.village,
                survey.village
            );


            const surveyor =
                survey.surveyorEmail ||
                survey.surveyorId ||
                survey.createdBy ||
                survey.createdByEmail;


            addUniqueOption(
                surveyorFilter,
                surveyor,
                surveyor
            );


            addUniqueOption(
                surveyorFilterOld,
                surveyor,
                surveyor
            );

        }
    );


    /*
     * Surveyors collection
     */

    allSurveyors.forEach(
        function (surveyor) {

            const email =
                surveyor.email ||
                surveyor.surveyorEmail ||
                surveyor.id;


            addUniqueOption(
                surveyorFilter,
                email,
                email
            );


            addUniqueOption(
                surveyorFilterOld,
                email,
                email
            );

        }
    );

}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applySurveyFilters() {

    const name =
        normalizeValue(
            document.getElementById(
                "filterName"
            )?.value
        );


    const mobile =
        normalizeValue(
            document.getElementById(
                "filterMobile"
            )?.value
        );


    const village =
        normalizeValue(
            document.getElementById(
                "filterVillage"
            )?.value
        );


    const surveyor =
        normalizeValue(
            document.getElementById(
                "filterSurveyor"
            )?.value
        );


    const oldVillage =
        normalizeValue(
            document.getElementById(
                "villageFilter"
            )?.value
        );


    const oldSurveyor =
        normalizeValue(
            document.getElementById(
                "surveyorFilter"
            )?.value
        );


    const selectedVillage =
        village ||
        oldVillage;


    const selectedSurveyor =
        surveyor ||
        oldSurveyor;


    const dateFilter =
        document.getElementById(
            "filterDate"
        )?.value ||
        document.getElementById(
            "dateFilter"
        )?.value ||
        "";


    const search =
        normalizeValue(
            document.getElementById(
                "searchBox"
            )?.value
        );


    const party =
        normalizeValue(
            document.getElementById(
                "partyFilter"
            )?.value
        );


    const assembly =
        normalizeValue(
            document.getElementById(
                "assemblyFilter"
            )?.value
        );


    filteredSurveys =
        allSurveys.filter(
            function (survey) {

                const surveyName =
                    normalizeValue(
                        survey.name
                    );


                const surveyMobile =
                    normalizeValue(
                        survey.mobile
                    );


                const surveyVillage =
                    normalizeValue(
                        survey.village
                    );


                const surveyAssembly =
                    normalizeValue(
                        survey.assembly
                    );


                const surveyorValue =
                    normalizeValue(
                        survey.surveyorEmail ||
                        survey.surveyorId ||
                        survey.createdBy ||
                        survey.createdByEmail
                    );


                /*
                 * Search
                 */

                if (
                    search
                ) {

                    const searchText =
                        [
                            survey.name,
                            survey.mobile,
                            survey.age,
                            survey.gender,
                            survey.village,
                            survey.assembly,
                            survey.party,
                            survey.candidate,
                            survey.feedback,
                            survey.surveyorEmail,
                            survey.surveyorId,
                            survey.createdBy
                        ]
                        .map(
                            function (value) {

                                return normalizeValue(
                                    value
                                );

                            }
                        )
                        .join(" ");


                    if (
                        !searchText.includes(
                            search
                        )
                    ) {

                        return false;

                    }

                }


                if (
                    name &&
                    surveyName !== name
                ) {

                    return false;

                }


                if (
                    mobile &&
                    surveyMobile !== mobile
                ) {

                    return false;

                }


                if (
                    selectedVillage &&
                    surveyVillage !==
                        selectedVillage
                ) {

                    return false;

                }


                if (
                    selectedSurveyor &&
                    surveyorValue !==
                        selectedSurveyor
                ) {

                    return false;

                }


                if (
                    party &&
                    normalizeValue(
                        survey.party
                    ) !== party
                ) {

                    return false;

                }


                if (
                    assembly &&
                    surveyAssembly !==
                        assembly
                ) {

                    return false;

                }


                const date =
                    getDate(
                        survey.createdAt ||
                        survey.timestamp ||
                        survey.submittedAt ||
                        survey.date
                    );


                if (
                    dateFilter ===
                    "today" &&
                    !isToday(date)
                ) {

                    return false;

                }


                if (
                    dateFilter ===
                    "week" &&
                    !isThisWeek(date)
                ) {

                    return false;

                }


                if (
                    dateFilter ===
                    "month" &&
                    !isThisMonth(date)
                ) {

                    return false;

                }


                return true;

            }
        );


    renderSurveyRecords();


    setText(
        "filteredSurvey",
        filteredSurveys.length
    );


    setText(
        "filterResultCount",
        "Showing: " +
        filteredSurveys.length +
        " / " +
        allSurveys.length
    );

}


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetSurveyFilters() {

    [
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
    ]
    .forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.value =
                    "";

            }

        }
    );


    filteredSurveys =
        allSurveys.slice();


    renderSurveyRecords();


    setText(
        "filteredSurvey",
        allSurveys.length
    );


    setText(
        "filterResultCount",
        "Showing: " +
        allSurveys.length +
        " / " +
        allSurveys.length
    );

}


/* =========================================================
   RENDER SURVEY RECORDS
   ========================================================= */

function renderSurveyRecords() {

    const table =
        document.getElementById(
            "surveyTable"
        );


    if (!table) {

        console.warn(
            "surveyTable not found."
        );

        return;

    }


    table.innerHTML =
        "";


    if (
        filteredSurveys.length === 0
    ) {

        /*
         * Your current HTML has
         * 11 columns.
         */

        table.innerHTML =
            `
            <tr>
                <td
                    colspan="11"
                    style="
                        padding:30px;
                        text-align:center;
                        color:#777;
                    "
                >
                    No Survey Found
                </td>
            </tr>
            `;

        return;

    }


    filteredSurveys.forEach(
        function (survey) {

            const row =
                document.createElement(
                    "tr"
                );


            const photoURL =
                survey.photos &&
                survey.photos.photo1 &&
                survey.photos.photo1.url
                    ? survey.photos.photo1.url
                    : (
                        survey.photoURL ||
                        survey.photo ||
                        ""
                    );


            const surveyor =
                survey.surveyorEmail ||
                survey.surveyorId ||
                survey.createdBy ||
                survey.createdByEmail ||
                "-";


            const date =
                getDate(
                    survey.createdAt ||
                    survey.timestamp ||
                    survey.submittedAt
                );


            const formattedDate =
                date
                    ? date.toLocaleString(
                        "en-IN"
                    )
                    : "-";


            row.innerHTML =
                `
                <td>
                    ${escapeHTML(
                        survey.name
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.mobile
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.age
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.gender
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.village
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.assembly
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.party
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.candidate
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        survey.feedback
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        surveyor
                    )}
                    <br>
                    <small>
                        ${escapeHTML(
                            formattedDate
                        )}
                    </small>
                </td>

                <td>

                    ${
                        photoURL
                            ? `
                            <button
                                type="button"
                                class="primary action-btn"
                                onclick="openSurveyPhoto('${escapeHTML(
                                    photoURL
                                )}')"
                            >
                                📷 Photo
                            </button>
                            `
                            : ""
                    }

                    <button
                        type="button"
                        class="purple action-btn answer-button"
                    >
                        📋 Answers
                    </button>

                    <button
                        type="button"
                        class="primary action-btn edit-button"
                    >
                        ✏️ Edit
                    </button>

                    <button
                        type="button"
                        class="danger action-btn delete-button"
                    >
                        🗑️ Delete
                    </button>

                </td>
                `;


            const answerButton =
                row.querySelector(
                    ".answer-button"
                );


            if (answerButton) {

                answerButton.addEventListener(
                    "click",
                    function () {

                        showSurveyAnswers(
                            survey
                        );

                    }
                );

            }


            const editButton =
                row.querySelector(
                    ".edit-button"
                );


            if (editButton) {

                editButton.addEventListener(
                    "click",
                    function () {

                        editSurvey(
                            survey.id
                        );

                    }
                );

            }


            const deleteButton =
                row.querySelector(
                    ".delete-button"
                );


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    function () {

                        deleteSurvey(
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


    setText(
        "filterResultCount",
        "Showing: " +
        filteredSurveys.length +
        " / " +
        allSurveys.length
    );

}


/* =========================================================
   OPEN PHOTO
   ========================================================= */

window.openSurveyPhoto =
function (url) {

    if (!url) {

        return;

    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

};


/* =========================================================
   SHOW SURVEY ANSWERS
   ========================================================= */

function showSurveyAnswers(
    survey
) {

    const modal =
        document.getElementById(
            "answerModal"
        );


    const body =
        document.getElementById(
            "answerModalBody"
        );


    if (!modal || !body) {

        /*
         * If your current HTML
         * does not have answer modal,
         * show a simple fallback.
         */

        console.log(
            "Survey answers:",
            survey
        );


        alert(
            "Answer modal is not present in admin.html. Check console for survey data."
        );


        return;

    }


    body.innerHTML =
        "";


    const respondent =
        document.createElement(
            "div"
        );


    respondent.className =
        "respondent";


    respondent.innerHTML =
        `
        <h3>
            👤 Respondent Details
        </h3>

        <div class="respondent-grid">

            <div>
                <strong>Name</strong>
                <br>
                ${escapeHTML(
                    survey.name
                )}
            </div>

            <div>
                <strong>Mobile</strong>
                <br>
                ${escapeHTML(
                    survey.mobile
                )}
            </div>

            <div>
                <strong>Age</strong>
                <br>
                ${escapeHTML(
                    survey.age
                )}
            </div>

            <div>
                <strong>Gender</strong>
                <br>
                ${escapeHTML(
                    survey.gender
                )}
            </div>

            <div>
                <strong>Village</strong>
                <br>
                ${escapeHTML(
                    survey.village
                )}
            </div>

            <div>
                <strong>Surveyor</strong>
                <br>
                ${escapeHTML(
                    survey.surveyorEmail ||
                    survey.surveyorId ||
                    survey.createdBy ||
                    "-"
                )}
            </div>

        </div>
        `;


    body.appendChild(
        respondent
    );


    /*
     * Find answer data
     */

    let answers =
        survey.answers ||
        survey.responses ||
        survey.responsesData ||
        survey.questions ||
        null;


    /*
     * Object answers
     */

    if (
        answers &&
        !Array.isArray(answers) &&
        typeof answers === "object"
    ) {

        const converted =
            [];


        Object.keys(
            answers
        )
        .forEach(
            function (key) {

                converted.push({

                    question:
                        key,

                    answer:
                        answers[key]

                });

            }
        );


        answers =
            converted;

    }


    const heading =
        document.createElement(
            "h3"
        );


    heading.textContent =
        "📋 Survey Answers";


    body.appendChild(
        heading
    );


    /*
     * Array answers
     */

    if (
        Array.isArray(
            answers
        )
    ) {

        if (
            answers.length === 0
        ) {

            const empty =
                document.createElement(
                    "p"
                );


            empty.textContent =
                "No answers found.";


            body.appendChild(
                empty
            );

        }
        else {

            answers.forEach(
                function (
                    item,
                    index
                ) {

                    const answerItem =
                        document.createElement(
                            "div"
                        );


                    answerItem.className =
                        "answer-item";


                    const questionText =
                        item.question ||
                        item.questionText ||
                        item.text ||
                        item.title ||
                        (
                            "Question " +
                            (
                                index + 1
                            )
                        );


                    let answerValue =
                        item.answer;


                    if (
                        answerValue ===
                        undefined
                    ) {

                        answerValue =
                            item.value;

                    }


                    if (
                        answerValue ===
                        undefined
                    ) {

                        answerValue =
                            item.response;

                    }


                    if (
                        Array.isArray(
                            answerValue
                        )
                    ) {

                        answerValue =
                            answerValue.join(
                                ", "
                            );

                    }


                    if (
                        answerValue &&
                        typeof answerValue ===
                            "object"
                    ) {

                        answerValue =
                            JSON.stringify(
                                answerValue
                            );

                    }


                    answerItem.innerHTML =
                        `
                        <div class="answer-question">
                            ${escapeHTML(
                                questionText
                            )}
                        </div>

                        <div class="answer-value">
                            ${escapeHTML(
                                answerValue ===
                                    undefined ||
                                answerValue ===
                                    null ||
                                answerValue ===
                                    ""
                                    ? "No answer"
                                    : answerValue
                            )}
                        </div>
                        `;


                    body.appendChild(
                        answerItem
                    );

                }
            );

        }

    }
    else {

        /*
         * If answers are stored
         * directly in survey fields.
         */

        const ignoredFields = [

            "id",

            "name",

            "mobile",

            "age",

            "gender",

            "village",

            "assembly",

            "party",

            "candidate",

            "feedback",

            "surveyorEmail",

            "surveyorId",

            "surveyorName",

            "createdBy",

            "createdByEmail",

            "createdAt",

            "timestamp",

            "submittedAt",

            "photos"

        ];


        let found =
            false;


        Object.keys(
            survey
        )
        .forEach(
            function (key) {

                if (
                    ignoredFields.includes(
                        key
                    )
                ) {

                    return;

                }


                const value =
                    survey[key];


                if (
                    value ===
                        null ||
                    value ===
                        undefined ||
                    value ===
                        ""
                ) {

                    return;

                }


                found =
                    true;


                let displayValue =
                    value;


                if (
                    Array.isArray(
                        value
                    )
                ) {

                    displayValue =
                        value.join(
                            ", "
                        );

                }
                else if (
                    typeof value ===
                        "object"
                ) {

                    displayValue =
                        JSON.stringify(
                            value
                        );

                }


                const answerItem =
                    document.createElement(
                        "div"
                    );


                answerItem.className =
                    "answer-item";


                answerItem.innerHTML =
                    `
                    <div class="answer-question">
                        ${escapeHTML(
                            key
                        )}
                    </div>

                    <div class="answer-value">
                        ${escapeHTML(
                            displayValue
                        )}
                    </div>
                    `;


                body.appendChild(
                    answerItem
                );

            }
        );


        if (!found) {

            const empty =
                document.createElement(
                    "p"
                );


            empty.textContent =
                "No answer data found for this survey.";


            body.appendChild(
                empty
            );

        }

    }


    modal.classList.add(
        "show"
    );

}


/* =========================================================
   CLOSE ANSWER MODAL
   ========================================================= */

function setupAnswerModal() {

    const closeButton =
        document.getElementById(
            "closeAnswerModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                const modal =
                    document.getElementById(
                        "answerModal"
                    );


                if (modal) {

                    modal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    const modal =
        document.getElementById(
            "answerModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    modal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }

}


/* =========================================================
   EDIT SURVEY
   ========================================================= */

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


    const fields = [

        [
            "Name",
            "name"
        ],

        [
            "Mobile",
            "mobile"
        ],

        [
            "Age",
            "age"
        ],

        [
            "Gender",
            "gender"
        ],

        [
            "Village",
            "village"
        ],

        [
            "Assembly",
            "assembly"
        ],

        [
            "Party",
            "party"
        ],

        [
            "Candidate",
            "candidate"
        ],

        [
            "Feedback",
            "feedback"
        ]

    ];


    const updates = {};


    for (
        let i = 0;
        i < fields.length;
        i++
    ) {

        const label =
            fields[i][0];


        const key =
            fields[i][1];


        const value =
            prompt(
                label + ":",
                survey[key] || ""
            );


        if (
            value === null
        ) {

            return;

        }


        updates[key] =
            value.trim();

    }


    db.collection(
        "surveys"
    )
    .doc(id)
    .update(
        updates
    )

    .then(function () {

        alert(
            "Survey updated successfully."
        );


        return loadSurveys();

    })

    .catch(function (error) {

        console.error(
            "Survey update error:",
            error
        );


        alert(
            "Update failed: " +
            error.message
        );

    });

};


/* =========================================================
   DELETE SURVEY
   ========================================================= */

window.deleteSurvey =
function (id) {

    if (
        !confirm(
            "Are you sure you want to delete this survey?"
        )
    ) {

        return;

    }


    db.collection(
        "surveys"
    )
    .doc(id)
    .delete()

    .then(function () {

        alert(
            "Survey deleted successfully."
        );


        return loadSurveys();

    })

    .catch(function (error) {

        console.error(
            "Survey delete error:",
            error
        );


        alert(
            "Delete failed: " +
            error.message
        );

    });

};


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


    const confirmation =
        prompt(
            "WARNING: This will permanently delete ALL survey records.\n\nType DELETE to confirm:"
        );


    if (
        confirmation !==
        "DELETE"
    ) {

        return;

    }


    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Deleting...";

    }


    db.collection(
        "surveys"
    )
    .get()

    .then(function (snapshot) {

        const docs =
            snapshot.docs;


        const batchSize =
            400;


        function deleteBatch(
            startIndex
        ) {

            if (
                startIndex >=
                docs.length
            ) {

                return Promise.resolve();

            }


            const batch =
                db.batch();


            const end =
                Math.min(
                    startIndex +
                    batchSize,
                    docs.length
                );


            for (
                let i =
                    startIndex;
                i < end;
                i++
            ) {

                batch.delete(
                    docs[i].ref
                );

            }


            return batch
                .commit()
                .then(
                    function () {

                        return deleteBatch(
                            end
                        );

                    }
                );

        }


        return deleteBatch(
            0
        );

    })

    .then(function () {

        alert(
            "All surveys deleted successfully."
        );


        return loadSurveys();

    })

    .catch(function (error) {

        console.error(
            "Delete all error:",
            error
        );


        alert(
            "Delete all failed: " +
            error.message
        );

    })

    .finally(function () {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "🗑️ Delete All Surveys";

        }

    });

}


/* =========================================================
   SURVEYOR IDENTIFIERS
   ========================================================= */

function getSurveyorIdentifiers(
    surveyor
) {

    const values = [

        surveyor.email,

        surveyor.surveyorEmail,

        surveyor.id,

        surveyor.uid,

        surveyor.userId

    ];


    return values
        .filter(
            function (value) {

                return (
                    value !==
                        undefined &&
                    value !==
                        null &&
                    String(
                        value
                    ).trim() !==
                        ""
                );

            }
        )
        .map(
            function (value) {

                return normalizeValue(
                    value
                );

            }
        );

}


/* =========================================================
   SURVEY IDENTIFIERS
   ========================================================= */

function getSurveyIdentifiers(
    survey
) {

    const values = [

        survey.surveyorEmail,

        survey.surveyorId,

        survey.createdBy,

        survey.createdByEmail,

        survey.surveyor,

        survey.userEmail,

        survey.userId

    ];


    return values
        .filter(
            function (value) {

                return (
                    value !==
                        undefined &&
                    value !==
                        null &&
                    String(
                        value
                    ).trim() !==
                        ""
                );

            }
        )
        .map(
            function (value) {

                return normalizeValue(
                    value
                );

            }
        );

}


/* =========================================================
   SURVEYOR MATCH
   ========================================================= */

function surveyBelongsToSurveyor(
    survey,
    surveyor
) {

    const surveyorIdentifiers =
        getSurveyorIdentifiers(
            surveyor
        );


    const surveyIdentifiers =
        getSurveyIdentifiers(
            survey
        );


    if (
        surveyorIdentifiers.length === 0 ||
        surveyIdentifiers.length === 0
    ) {

        return false;

    }


    return surveyorIdentifiers.some(
        function (id) {

            return surveyIdentifiers.includes(
                id
            );

        }
    );

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

        allSurveyors = [];


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


        populateFilterDropdowns();


        renderSurveyorManagement();


        renderSurveyorPerformance();


        return allSurveyors;

    })

    .catch(function (error) {

        console.error(
            "SURVEYOR LOAD ERROR:",
            error
        );


        return [];

    });

}


/* =========================================================
   SURVEYOR MANAGEMENT
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
     * Build combined surveyor map
     */

    const map =
        {};


    allSurveyors.forEach(
        function (surveyor) {

            const email =
                normalizeValue(
                    surveyor.email ||
                    surveyor.surveyorEmail ||
                    surveyor.id
                );


            if (!email) {

                return;

            }


            map[email] = {

                email:
                    email,

                enabled:
                    surveyor.enabled !==
                    false,

                documentId:
                    surveyor.id

            };

        }
    );


    /*
     * Add surveyors that exist
     * only in surveys.
     */

    allSurveys.forEach(
        function (survey) {

            const email =
                normalizeValue(
                    survey.surveyorEmail ||
                    survey.surveyorId ||
                    survey.createdBy ||
                    survey.createdByEmail
                );


            if (!email) {

                return;

            }


            if (!map[email]) {

                map[email] = {

                    email:
                        email,

                    enabled:
                        true,

                    documentId:
                        null

                };

            }

        }
    );


    const surveyors =
        Object.values(
            map
        )
        .sort(
            function (a, b) {

                return a.email.localeCompare(
                    b.email
                );

            }
        );


    if (
        surveyors.length === 0
    ) {

        table.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    style="padding:20px;"
                >
                    No surveyors found.
                </td>
            </tr>
            `;

        return;

    }


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
                            survey.submittedAt
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


            const status =
                surveyor.enabled
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
                surveyor.enabled
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
                        surveyor.email
                    )}
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
                            !surveyor.enabled
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
   TOGGLE SURVEYOR
   ========================================================= */

function toggleSurveyor(
    surveyor,
    enabled
) {

    /*
     * First use known document ID.
     */

    if (
        surveyor.documentId
    ) {

        db.collection(
            "surveyors"
        )
        .doc(
            surveyor.documentId
        )
        .update({

            enabled:
                enabled

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
                "Surveyor update error:",
                error
            );


            updateSurveyorByEmail(
                surveyor.email,
                enabled
            );

        });


        return;

    }


    /*
     * Otherwise find by email.
     */

    updateSurveyorByEmail(
        surveyor.email,
        enabled
    );

}


/* =========================================================
   UPDATE SURVEYOR BY EMAIL
   ========================================================= */

function updateSurveyorByEmail(
    email,
    enabled
) {

    db.collection(
        "surveyors"
    )
    .where(
        "email",
        "==",
        email
    )
    .get()

    .then(function (snapshot) {

        if (
            snapshot.empty
        ) {

            alert(
                "Surveyor document not found for: " +
                email
            );

            return;

        }


        const updates =
            [];


        snapshot.forEach(
            function (doc) {

                updates.push(
                    doc.ref.update({

                        enabled:
                            enabled

                    })
                );

            }
        );


        return Promise.all(
            updates
        );

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
            "Surveyor status error:",
            error
        );


        alert(
            "Status update failed: " +
            error.message
        );

    });

}


/* =========================================================
   SURVEYOR PERFORMANCE
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


    const emails =
        new Set();


    allSurveyors.forEach(
        function (surveyor) {

            const email =
                normalizeValue(
                    surveyor.email ||
                    surveyor.surveyorEmail ||
                    surveyor.id
                );


            if (email) {

                emails.add(
                    email
                );

            }

        }
    );


    allSurveys.forEach(
        function (survey) {

            const email =
                normalizeValue(
                    survey.surveyorEmail ||
                    survey.surveyorId ||
                    survey.createdBy ||
                    survey.createdByEmail
                );


            if (email) {

                emails.add(
                    email
                );

            }

        }
    );


    if (
        emails.size === 0
    ) {

        table.innerHTML =
            `
            <tr>
                <td colspan="5">
                    No surveyors found.
                </td>
            </tr>
            `;

        return;

    }


    Array.from(
        emails
    )
    .sort()
    .forEach(
        function (email) {

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

                    const surveyEmail =
                        normalizeValue(
                            survey.surveyorEmail ||
                            survey.surveyorId ||
                            survey.createdBy ||
                            survey.createdByEmail
                        );


                    if (
                        surveyEmail !==
                        email
                    ) {

                        return;

                    }


                    total++;


                    const date =
                        getDate(
                            survey.createdAt ||
                            survey.timestamp ||
                            survey.submittedAt
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


            table.innerHTML +=
                `
                <tr>

                    <td>
                        ${escapeHTML(
                            email
                        )}
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

}


/* =========================================================
   PARTY CHART
   ========================================================= */

function renderPartyChart() {

    const canvas =
        document.getElementById(
            "partyChart"
        );


    if (
        !canvas ||
        typeof Chart ===
            "undefined"
    ) {

        return;

    }


    let bjp =
        0;

    let congress =
        0;

    let aap =
        0;

    let bsp =
        0;

    let sp =
        0;

    let other =
        0;


    allSurveys.forEach(
        function (survey) {

            const party =
                normalizeValue(
                    survey.party
                );


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

        }
    );


    if (partyChart) {

        partyChart.destroy();

    }


    partyChart =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {

                type:
                    "bar",

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

                    responsive:
                        true,

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

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
   DAILY LIMIT
   ========================================================= */

function loadDailyLimit() {

    const input =
        document.getElementById(
            "dailyLimitInput"
        );


    if (!input) {

        return;

    }


    db.collection(
        "settings"
    )
    .doc(
        "config"
    )
    .get()

    .then(function (doc) {

        if (
            doc.exists &&
            doc.data().dailyLimit !==
                undefined
        ) {

            input.value =
                Number(
                    doc.data().dailyLimit
                );

        }
        else {

            input.value =
                20;

        }

    })

    .catch(function (error) {

        console.error(
            "Daily limit load error:",
            error
        );


        input.value =
            20;

    });

}


/* =========================================================
   SAVE DAILY LIMIT
   ========================================================= */

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


    if (!input) {

        return;

    }


    const limit =
        Number(
            input.value
        );


    if (
        !Number.isFinite(
            limit
        ) ||
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
        firebase.auth()
            .currentUser;


    if (
        !user ||
        !user.email ||
        normalizeValue(
            user.email
        ) !==
        normalizeValue(
            ADMIN_EMAIL
        )
    ) {

        if (message) {

            message.textContent =
                "Only Admin can change the limit.";

            message.style.color =
                "red";

        }

        return;

    }


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";

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
                limit,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        },
        {
            merge:
                true
        }
    )

    .then(function () {

        if (message) {

            message.textContent =
                "✅ Limit saved: " +
                limit;

            message.style.color =
                "green";

        }

    })

    .catch(function (error) {

        console.error(
            "Daily limit save error:",
            error
        );


        if (message) {

            message.textContent =
                "❌ " +
                error.message;

            message.style.color =
                "red";

        }

    })

    .finally(function () {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 Save Limit";

        }

    });

}


/* =========================================================
   DELETE ALL BUTTON
   ========================================================= */

function setupDeleteAllButton() {

    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        deleteAllSurveys
    );

}


/* =========================================================
   EXPORT EXCEL
   ========================================================= */

function setupExportExcel() {

    const button =
        document.getElementById(
            "exportExcel"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        function () {

            if (
                typeof XLSX ===
                "undefined"
            ) {

                alert(
                    "Excel library is not loaded."
                );

                return;

            }


            const rows =
                allSurveys.map(
                    function (survey) {

                        const date =
                            getDate(
                                survey.createdAt ||
                                survey.timestamp ||
                                survey.submittedAt
                            );


                        return {

                            Name:
                                survey.name ||
                                "",

                            Mobile:
                                survey.mobile ||
                                "",

                            Age:
                                survey.age ||
                                "",

                            Gender:
                                survey.gender ||
                                "",

                            Village:
                                survey.village ||
                                "",

                            Assembly:
                                survey.assembly ||
                                "",

                            Party:
                                survey.party ||
                                "",

                            Candidate:
                                survey.candidate ||
                                "",

                            Feedback:
                                survey.feedback ||
                                "",

                            Surveyor:
                                survey.surveyorEmail ||
                                survey.surveyorId ||
                                survey.createdBy ||
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


/* =========================================================
   SETUP EVENTS
   ========================================================= */

function setupAdminEvents() {

    /*
     * Question events
     */

    setupQuestionEvents();


    /*
     * Answer modal
     */

    setupAnswerModal();


    /*
     * Daily limit
     */

    const saveLimit =
        document.getElementById(
            "saveDailyLimit"
        );


    if (saveLimit) {

        saveLimit.addEventListener(
            "click",
            saveDailyLimit
        );

    }


    /*
     * Delete all
     */

    setupDeleteAllButton();


    /*
     * Export
     */

    setupExportExcel();


    /*
     * Filters
     */

    const filterIds = [

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
                applySurveyFilters
            );


            element.addEventListener(
                "change",
                applySurveyFilters
            );

        }
    );


    /*
     * Apply button
     */

    const applyButton =
        document.getElementById(
            "applySurveyFilter"
        );


    if (applyButton) {

        applyButton.addEventListener(
            "click",
            applySurveyFilters
        );

    }


    /*
     * Reset button
     */

    const resetButton =
        document.getElementById(
            "clearSurveyFilter"
        ) ||
        document.getElementById(
            "resetFilters"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSurveyFilters
        );

    }


    /*
     * Logout
     */

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                firebase.auth()
                    .signOut()
                    .then(
                        function () {

                            window.location.replace(
                                "index.html"
                            );

                        }
                    )
                    .catch(
                        function (error) {

                            console.error(
                                "Logout error:",
                                error
                            );

                        }
                    );

            }
        );

    }


    /*
     * Optional question manager
     */

    const questionToggle =
        document.getElementById(
            "questionManagerToggle"
        );


    if (
        questionToggle
    ) {

        /*
         * Already handled in
         * setupQuestionEvents().
         */

    }


    /*
     * Optional delete all
     */

    console.log(
        "Admin events initialized."
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.loadSurveys =
    loadSurveys;

window.loadQuestions =
    loadQuestions;

window.loadSurveyors =
    loadSurveyors;

window.editQuestion =
    editQuestion;

window.deleteQuestion =
    deleteQuestion;

window.showSurveyAnswers =
    showSurveyAnswers;

window.applySurveyFilters =
    applySurveyFilters;

window.resetSurveyFilters =
    resetSurveyFilters;

window.deleteAllSurveys =
    deleteAllSurveys;


/* =========================================================
   FINAL
   ========================================================= */

console.log(
    "Admin JS functions registered successfully."
);
 
