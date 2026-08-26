console.log("Admin JS Loaded - FINAL PROFESSIONAL VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let editingQuestionId = null;
let filteredSurveys = [];
let filtersInitialized = false;


// =====================================================
// ADMIN AUTH
// =====================================================

firebase.auth()
    .setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(function () {

        firebase.auth().onAuthStateChanged(function (user) {

            if (!user) {
                window.location.replace("index.html");
                return;
            }

            if (
                !user.email ||
                user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
            ) {
                window.location.replace("survey.html");
                return;
            }

            console.log("Admin logged in:", user.email);

            hideAssemblyEverywhere();
            createProfessionalAdminUI();

            loadDailyLimit();
            loadQuestions();
            loadSurveyors();
            loadSurveys();
        });

    })
    .catch(function (error) {
        console.error("Auth error:", error);
    });


// =====================================================
// HELPERS
// =====================================================

function getDate(value) {

    if (!value) return null;

    try {

        if (typeof value.toDate === "function") {
            return value.toDate();
        }

        if (value.seconds !== undefined) {
            return new Date(value.seconds * 1000);
        }

        const d = new Date(value);

        return isNaN(d.getTime()) ? null : d;

    } catch (error) {
        return null;
    }
}


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


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// =====================================================
// HIDE ASSEMBLY
// =====================================================

function hideAssemblyEverywhere() {

    const ids = [
        "assembly",
        "assemblyGroup",
        "assemblyField",
        "assemblyContainer",
        "assemblySection"
    ];

    ids.forEach(function (id) {

        const el = document.getElementById(id);

        if (el) {
            el.style.display = "none";
        }
    });

    document.querySelectorAll("label").forEach(function (label) {

        if (
            label.textContent &&
            label.textContent.toLowerCase().includes("assembly")
        ) {
            label.style.display = "none";

            const parent = label.parentElement;

            if (parent) {
                parent.style.display = "none";
            }
        }
    });
}


// =====================================================
// PROFESSIONAL ADMIN UI
// =====================================================

function createProfessionalAdminUI() {

    if (document.getElementById("professionalAdminStyles")) return;

    const style = document.createElement("style");

    style.id = "professionalAdminStyles";

    style.textContent = `

        * {
            box-sizing: border-box;
        }

        .admin-section {
            background:#ffffff;
            border-radius:18px;
            padding:22px;
            margin:20px 0;
            box-shadow:0 5px 22px rgba(0,0,0,.08);
        }

        .admin-section-header {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:15px;
            margin-bottom:18px;
            flex-wrap:wrap;
        }

        .admin-section-title {
            font-size:22px;
            font-weight:700;
            color:#1769c2;
            margin:0;
        }

        .admin-toggle-btn {
            border:0;
            background:#1769c2;
            color:#fff;
            padding:10px 18px;
            border-radius:9px;
            cursor:pointer;
            font-weight:600;
        }

        .admin-toggle-btn:hover {
            background:#0d55a3;
        }

        .filter-panel {
            background:#f7faff;
            border:1px solid #dce8f7;
            border-radius:15px;
            padding:18px;
            margin-bottom:18px;
        }

        .filter-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
            gap:12px;
        }

        .filter-grid select {
            width:100%;
            padding:12px 14px;
            border:1px solid #ccd6e2;
            border-radius:9px;
            background:#fff;
            font-size:14px;
            outline:none;
        }

        .filter-actions {
            display:flex;
            gap:10px;
            margin-top:15px;
            flex-wrap:wrap;
        }

        .filter-btn {
            border:0;
            padding:11px 20px;
            border-radius:9px;
            cursor:pointer;
            font-weight:600;
            background:#1769c2;
            color:#fff;
        }

        .clear-filter-btn {
            border:0;
            padding:11px 20px;
            border-radius:9px;
            cursor:pointer;
            font-weight:600;
            background:#ef6c00;
            color:#fff;
        }

        .delete-all-btn {
            border:0;
            padding:12px 20px;
            border-radius:9px;
            cursor:pointer;
            font-weight:700;
            background:#d32f2f;
            color:#fff;
            margin-bottom:18px;
        }

        .delete-all-btn:hover {
            background:#b71c1c;
        }

        .records-info {
            margin-top:12px;
            font-weight:700;
            color:#333;
        }

        .professional-table-wrapper {
            width:100%;
            overflow-x:auto;
            border-radius:12px;
            border:1px solid #e1e7ef;
        }

        .professional-table {
            width:100%;
            min-width:850px;
            border-collapse:collapse;
            background:#fff;
        }

        .professional-table th {
            background:#1769c2;
            color:#fff;
            padding:13px 12px;
            text-align:left;
            white-space:nowrap;
            font-size:14px;
        }

        .professional-table td {
            padding:13px 12px;
            border-bottom:1px solid #edf0f4;
            color:#333;
            vertical-align:top;
        }

        .professional-table tr:hover td {
            background:#f8fbff;
        }

        .record-action-btn {
            border:0;
            padding:8px 12px;
            border-radius:7px;
            cursor:pointer;
            font-weight:600;
            margin:2px;
        }

        .answer-btn {
            background:#6a1b9a;
            color:#fff;
        }

        .edit-btn {
            background:#1976d2;
            color:#fff;
        }

        .delete-btn {
            background:#d32f2f;
            color:#fff;
        }

        .question-manager-body {
            transition:.25s ease;
        }

        .question-card {
            background:#f9fbff;
            border:1px solid #dfe7f1;
            border-radius:12px;
            padding:17px;
            margin-bottom:12px;
        }

        .question-card h3 {
            margin:0 0 8px;
            color:#1769c2;
            font-size:17px;
        }

        .question-badge {
            display:inline-block;
            background:#e3f2fd;
            color:#1565c0;
            padding:5px 9px;
            border-radius:20px;
            font-size:12px;
            font-weight:600;
            margin-bottom:10px;
        }

        .answer-modal-overlay {
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.55);
            z-index:99999;
            display:flex;
            justify-content:center;
            align-items:center;
            padding:20px;
        }

        .answer-modal {
            width:min(850px,100%);
            max-height:90vh;
            overflow:auto;
            background:#fff;
            border-radius:18px;
            padding:24px;
            box-shadow:0 15px 50px rgba(0,0,0,.25);
        }

        .answer-modal-header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            margin-bottom:18px;
        }

        .answer-modal-header h2 {
            margin:0;
            color:#1769c2;
        }

        .close-answer-modal {
            border:0;
            background:#d32f2f;
            color:#fff;
            width:36px;
            height:36px;
            border-radius:50%;
            cursor:pointer;
            font-size:18px;
        }

        .answer-basic {
            background:#f5f8fc;
            border-radius:12px;
            padding:15px;
            margin-bottom:18px;
        }

        .answer-basic-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
            gap:10px;
        }

        .answer-question {
            border:1px solid #e0e6ee;
            border-radius:10px;
            padding:14px;
            margin-bottom:10px;
        }

        .answer-question-title {
            font-weight:700;
            color:#333;
            margin-bottom:7px;
        }

        .answer-value {
            color:#1769c2;
            font-weight:600;
        }

        @media(max-width:600px) {

            .admin-section {
                padding:15px;
            }

            .admin-section-title {
                font-size:19px;
            }

            .filter-grid {
                grid-template-columns:1fr;
            }

            .answer-modal {
                padding:16px;
            }
        }
    `;

    document.head.appendChild(style);

    createQuestionManagerToggle();
    createSurveyFilterUI();
}


// =====================================================
// QUESTION MANAGER HIDE / SHOW
// =====================================================

function createQuestionManagerToggle() {

    const questionContainer =
        document.getElementById("questionsList");

    const builder =
        document.getElementById("questionText");

    if (!questionContainer && !builder) return;

    let section = null;

    if (questionContainer) {
        section = questionContainer.closest(".admin-section");
    }

    if (!section && builder) {
        section = builder.closest(".admin-section");
    }

    if (!section) {
        section = questionContainer?.parentElement || builder?.parentElement;
    }

    if (!section) return;

    if (document.getElementById("questionManagerToggle")) return;

    section.classList.add("admin-section");

    const header = document.createElement("div");

    header.className = "admin-section-header";

    header.innerHTML = `
        <h2 class="admin-section-title">📝 Survey Question Manager</h2>
        <button id="questionManagerToggle" class="admin-toggle-btn">
            👁 Hide Questions
        </button>
    `;

    section.insertBefore(header, section.firstChild);

    const toggleButton =
        document.getElementById("questionManagerToggle");

    const bodies = [];

    Array.from(section.children).forEach(function (child) {

        if (child !== header) {
            bodies.push(child);
        }

    });

    let hidden = false;

    toggleButton.addEventListener("click", function () {

        hidden = !hidden;

        bodies.forEach(function (body) {
            body.style.display = hidden ? "none" : "";
        });

        toggleButton.textContent =
            hidden
                ? "👁 Show Questions"
                : "🙈 Hide Questions";
    });
}


// =====================================================
// SURVEY FILTER UI
// =====================================================

function createSurveyFilterUI() {

    if (document.getElementById("professionalFilterPanel")) return;

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const section =
        table.closest(".admin-section") ||
        table.parentElement;

    if (!section) return;

    const filterPanel = document.createElement("div");

    filterPanel.id = "professionalFilterPanel";
    filterPanel.className = "filter-panel";

    filterPanel.innerHTML = `

        <div class="filter-grid">

            <select id="filterName">
                <option value="">👤 All Names</option>
            </select>

            <select id="filterMobile">
                <option value="">📱 All Mobiles</option>
            </select>

            <select id="filterVillage">
                <option value="">🏠 All Villages</option>
            </select>

            <select id="filterSurveyor">
                <option value="">🧑‍💼 All Surveyors</option>
            </select>

            <select id="filterDate">
                <option value="">📅 All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>

        </div>

        <div class="filter-actions">

            <button id="applySurveyFilter" class="filter-btn">
                🔎 Filter
            </button>

            <button id="clearSurveyFilter" class="clear-filter-btn">
                ✖ Clear
            </button>

        </div>

        <div id="filterResultCount" class="records-info">
            Showing: 0
        </div>
    `;

    table.parentElement.insertBefore(filterPanel, table);

    document
        .getElementById("applySurveyFilter")
        .addEventListener("click", applySurveyFilter);

    document
        .getElementById("clearSurveyFilter")
        .addEventListener("click", clearSurveyFilter);

    filtersInitialized = true;

    refreshFilterOptions();
}


// =====================================================
// FILTER OPTIONS
// =====================================================

function refreshFilterOptions() {

    const fields = [
        ["filterName", "name", "👤 All Names"],
        ["filterMobile", "mobile", "📱 All Mobiles"],
        ["filterVillage", "village", "🏠 All Villages"],
        ["filterSurveyor", "surveyorEmail", "🧑‍💼 All Surveyors"]
    ];

    fields.forEach(function (item) {

        const select =
            document.getElementById(item[0]);

        if (!select) return;

        const oldValue = select.value;

        select.innerHTML =
            `<option value="">${item[2]}</option>`;

        const values = [];

        allSurveys.forEach(function (survey) {

            const value =
                String(survey[item[1]] || "").trim();

            if (value && !values.includes(value)) {
                values.push(value);
            }

        });

        values.sort(function (a, b) {
            return a.localeCompare(b);
        });

        values.forEach(function (value) {

            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });

        if (values.includes(oldValue)) {
            select.value = oldValue;
        }
    });
}


// =====================================================
// APPLY FILTER
// =====================================================

function applySurveyFilter() {

    const name =
        document.getElementById("filterName")?.value || "";

    const mobile =
        document.getElementById("filterMobile")?.value || "";

    const village =
        document.getElementById("filterVillage")?.value || "";

    const surveyor =
        document.getElementById("filterSurveyor")?.value || "";

    const date =
        document.getElementById("filterDate")?.value || "";

    filteredSurveys =
        allSurveys.filter(function (survey) {

            if (name && survey.name !== name) return false;

            if (mobile && survey.mobile !== mobile) return false;

            if (village && survey.village !== village) return false;

            if (surveyor && survey.surveyorEmail !== surveyor) {
                return false;
            }

            const surveyDate =
                getDate(survey.createdAt);

            if (date === "today" && !isToday(surveyDate)) {
                return false;
            }

            if (date === "week" && !isThisWeek(surveyDate)) {
                return false;
            }

            if (date === "month" && !isThisMonth(surveyDate)) {
                return false;
            }

            return true;
        });

    renderSurveyRecords(filteredSurveys);
}


// =====================================================
// CLEAR FILTER
// =====================================================

function clearSurveyFilter() {

    [
        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor",
        "filterDate"
    ].forEach(function (id) {

        const el = document.getElementById(id);

        if (el) el.value = "";
    });

    filteredSurveys = [...allSurveys];

    renderSurveyRecords(filteredSurveys);
}


// =====================================================
// QUESTION BUILDER
// =====================================================

function createOptionInput(value = "") {

    const container =
        document.getElementById("optionsContainer");

    if (!container) return;

    const row = document.createElement("div");

    row.className = "option-row";

    const input = document.createElement("input");

    input.type = "text";
    input.className = "question-option";
    input.placeholder = "Enter option";
    input.value = value;

    const remove = document.createElement("button");

    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "❌";

    remove.onclick = function () {
        row.remove();
    };

    row.appendChild(input);
    row.appendChild(remove);

    container.appendChild(row);
}


function initializeQuestionBuilder() {

    const container =
        document.getElementById("optionsContainer");

    if (!container) return;

    container.innerHTML = "";

    createOptionInput();
    createOptionInput();
}


document
    .getElementById("addOption")
    ?.addEventListener("click", function () {

        createOptionInput();

    });


// =====================================================
// SAVE QUESTION
// =====================================================

document
    .getElementById("saveQuestion")
    ?.addEventListener("click", function () {

        const text =
            document
                .getElementById("questionText")
                ?.value
                .trim();

        const type =
            document
                .getElementById("questionType")
                ?.value || "single";

        if (!text) {

            showQuestionMessage(
                "Please enter question.",
                false
            );

            return;
        }

        const optionInputs =
            document.querySelectorAll(".question-option");

        const options = [];

        optionInputs.forEach(function (input) {

            const value = input.value.trim();

            if (value) {
                options.push(value);
            }
        });

        if (options.length < 2) {

            showQuestionMessage(
                "Please add at least 2 options.",
                false
            );

            return;
        }

        const questionData = {

            question: text,
            type: type,
            options: options,

            updatedAt:
                firebase.firestore.FieldValue.serverTimestamp()
        };

        const saveButton =
            document.getElementById("saveQuestion");

        if (saveButton) {

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        let promise;

        if (editingQuestionId) {

            promise =
                db.collection("questions")
                    .doc(editingQuestionId)
                    .update(questionData);

        } else {

            questionData.createdAt =
                firebase.firestore.FieldValue.serverTimestamp();

            promise =
                db.collection("questions")
                    .add(questionData);
        }

        promise
            .then(function () {

                showQuestionMessage(
                    editingQuestionId
                        ? "Question updated successfully."
                        : "Question added successfully.",
                    true
                );

                resetQuestionBuilder();
                loadQuestions();

            })
            .catch(function (error) {

                console.error(
                    "Question save error:",
                    error
                );

                showQuestionMessage(
                    "Error: " + error.message,
                    false
                );

            })
            .finally(function () {

                if (saveButton) {

                    saveButton.disabled = false;

                    saveButton.textContent =
                        "💾 Save Question";
                }
            });
    });


// =====================================================
// LOAD QUESTIONS
// =====================================================

function loadQuestions() {

    db.collection("questions")
        .orderBy("createdAt", "asc")
        .get()

        .then(function (snapshot) {

            allQuestions = [];

            snapshot.forEach(function (doc) {

                allQuestions.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            renderQuestions();

        })
        .catch(function () {

            return db.collection("questions")
                .get()
                .then(function (snapshot) {

                    allQuestions = [];

                    snapshot.forEach(function (doc) {

                        allQuestions.push({
                            id: doc.id,
                            ...doc.data()
                        });

                    });

                    renderQuestions();
                });
        });
}


// =====================================================
// RENDER QUESTIONS
// =====================================================

function renderQuestions() {

    const container =
        document.getElementById("questionsList");

    if (!container) return;

    container.innerHTML = "";

    setText(
        "questionCount",
        allQuestions.length
    );

    if (allQuestions.length === 0) {

        container.innerHTML =
            "<p>No questions added yet.</p>";

        return;
    }

    allQuestions.forEach(function (question, index) {

        const card =
            document.createElement("div");

        card.className = "question-card";

        const title =
            document.createElement("h3");

        title.textContent =
            (index + 1) + ". " +
            (question.question || "Untitled Question");

        const badge =
            document.createElement("span");

        badge.className = "question-badge";

        badge.textContent =
            question.type === "multiple"
                ? "Multiple Choice"
                : "Single Choice";

        card.appendChild(title);
        card.appendChild(badge);

        (question.options || []).forEach(function (option) {

            const item =
                document.createElement("div");

            item.textContent = "• " + option;

            card.appendChild(item);
        });

        const edit =
            document.createElement("button");

        edit.className = "primary";
        edit.textContent = "✏️ Edit";

        edit.onclick = function () {
            editQuestion(question.id);
        };

        const del =
            document.createElement("button");

        del.className = "danger";
        del.textContent = "🗑️ Delete";

        del.onclick = function () {
            deleteQuestion(question.id);
        };

        card.appendChild(edit);
        card.appendChild(del);

        container.appendChild(card);
    });
}


// =====================================================
// EDIT QUESTION
// =====================================================

function editQuestion(id) {

    const question =
        allQuestions.find(function (item) {
            return item.id === id;
        });

    if (!question) return;

    editingQuestionId = id;

    const text =
        document.getElementById("questionText");

    const type =
        document.getElementById("questionType");

    const container =
        document.getElementById("optionsContainer");

    if (text) text.value = question.question || "";

    if (type) {
        type.value =
            question.type || "single";
    }

    if (container) {

        container.innerHTML = "";

        (question.options || []).forEach(function (option) {
            createOptionInput(option);
        });
    }

    const saveButton =
        document.getElementById("saveQuestion");

    if (saveButton) {
        saveButton.textContent = "💾 Update Question";
    }

    const cancel =
        document.getElementById("cancelEdit");

    if (cancel) {
        cancel.style.display = "inline-block";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =====================================================
// DELETE QUESTION
// =====================================================

function deleteQuestion(id) {

    if (!confirm("Delete this question?")) {
        return;
    }

    db.collection("questions")
        .doc(id)
        .delete()
        .then(function () {

            alert("Question deleted successfully.");

            loadQuestions();

        })
        .catch(function (error) {

            alert(
                "Delete failed: " +
                error.message
            );
        });
}


// =====================================================
// RESET QUESTION
// =====================================================

document
    .getElementById("cancelEdit")
    ?.addEventListener("click", function () {

        resetQuestionBuilder();

    });


function resetQuestionBuilder() {

    editingQuestionId = null;

    const text =
        document.getElementById("questionText");

    const type =
        document.getElementById("questionType");

    const container =
        document.getElementById("optionsContainer");

    const save =
        document.getElementById("saveQuestion");

    const cancel =
        document.getElementById("cancelEdit");

    if (text) text.value = "";

    if (type) type.value = "single";

    if (container) {

        container.innerHTML = "";

        createOptionInput();
        createOptionInput();
    }

    if (save) {
        save.textContent = "💾 Save Question";
    }

    if (cancel) {
        cancel.style.display = "none";
    }
}


function showQuestionMessage(text, success) {

    const message =
        document.getElementById("questionMessage");

    if (!message) return;

    message.textContent = text;

    message.style.color =
        success ? "green" : "red";
}


// =====================================================
// LOAD SURVEYS
// =====================================================

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

            allSurveys.sort(function (a, b) {

                const da = getDate(a.createdAt);
                const dbb = getDate(b.createdAt);

                if (!da && !dbb) return 0;
                if (!da) return 1;
                if (!dbb) return -1;

                return dbb - da;
            });

            filteredSurveys = [...allSurveys];

            updateDashboard();
            refreshFilterOptions();
            renderSurveyRecords(filteredSurveys);

        })
        .catch(function (error) {

            console.error(
                "Survey load error:",
                error
            );
        });
}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard() {

    let today = 0;
    let week = 0;
    let month = 0;

    allSurveys.forEach(function (survey) {

        const date =
            getDate(survey.createdAt);

        if (isToday(date)) today++;

        if (isThisWeek(date)) week++;

        if (isThisMonth(date)) month++;
    });

    setText("totalSurvey", allSurveys.length);
    setText("todaySurvey", today);
    setText("weekSurvey", week);
    setText("monthSurvey", month);
}


// =====================================================
// RENDER SURVEY RECORDS
// =====================================================

function renderSurveyRecords(records = allSurveys) {

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const tableParent =
        table.parentElement;

    tableParent.classList.add(
        "professional-table-wrapper"
    );

    table.classList.add(
        "professional-table"
    );

    const thead =
        table.closest("table")?.querySelector("thead");

    if (thead) {

        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Village</th>
                <th>Party</th>
                <th>Candidate</th>
                <th>Actions</th>
            </tr>
        `;
    }

    table.innerHTML = "";

    records.forEach(function (survey) {

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

            <td>

                <button
                    class="record-action-btn answer-btn"
                    onclick="viewSurveyAnswers('${survey.id}')">
                    📋 Answers
                </button>

                <button
                    class="record-action-btn edit-btn"
                    onclick="editSurvey('${survey.id}')">
                    ✏️ Edit
                </button>

                <button
                    class="record-action-btn delete-btn"
                    onclick="deleteSurvey('${survey.id}')">
                    🗑️ Delete
                </button>

            </td>
        `;

        table.appendChild(row);
    });

    setText(
        "filterResultCount",
        "Showing: " + records.length +
        " / " + allSurveys.length
    );

    createDeleteAllButton();
}


// =====================================================
// DELETE ALL BUTTON
// =====================================================

function createDeleteAllButton() {

    if (document.getElementById("deleteAllSurveysBtn")) {
        return;
    }

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const wrapper =
        table.parentElement;

    const button =
        document.createElement("button");

    button.id = "deleteAllSurveysBtn";
    button.className = "delete-all-btn";
    button.textContent = "🗑️ Delete All Surveys";

    wrapper.parentElement.insertBefore(
        button,
        wrapper
    );

    button.addEventListener(
        "click",
        deleteAllSurveys
    );
}


// =====================================================
// DELETE ALL
// =====================================================

function deleteAllSurveys() {

    if (allSurveys.length === 0) {

        alert("There are no surveys to delete.");

        return;
    }

    const confirmed =
        confirm(
            "WARNING!\n\n" +
            "This will permanently delete ALL " +
            allSurveys.length +
            " survey records.\n\n" +
            "Continue?"
        );

    if (!confirmed) return;

    const second =
        confirm(
            "Are you absolutely sure?\n\n" +
            "This action cannot be undone."
        );

    if (!second) return;

    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );

    if (button) {

        button.disabled = true;
        button.textContent = "Deleting...";
    }

    const batchSize = 400;

    function deleteBatch(start) {

        const batch =
            db.batch();

        const records =
            allSurveys.slice(
                start,
                start + batchSize
            );

        if (records.length === 0) {
            return Promise.resolve();
        }

        records.forEach(function (survey) {

            batch.delete(
                db.collection("surveys")
                    .doc(survey.id)
            );
        });

        return batch.commit()
            .then(function () {
                return deleteBatch(
                    start + batchSize
                );
            });
    }

    deleteBatch(0)
        .then(function () {

            alert(
                "✅ All surveys deleted successfully."
            );

            allSurveys = [];
            filteredSurveys = [];

            updateDashboard();
            refreshFilterOptions();
            renderSurveyRecords([]);

        })
        .catch(function (error) {

            console.error(
                "Delete all error:",
                error
            );

            alert(
                "❌ Delete failed: " +
                error.message
            );

        })
        .finally(function () {

            if (button) {

                button.disabled = false;
                button.textContent =
                    "🗑️ Delete All Surveys";
            }
        });
}


// =====================================================
// VIEW ANSWERS
// =====================================================

window.viewSurveyAnswers = function (id) {

    const survey =
        allSurveys.find(function (item) {
            return item.id === id;
        });

    if (!survey) return;

    const overlay =
        document.createElement("div");

    overlay.className =
        "answer-modal-overlay";

    const modal =
        document.createElement("div");

    modal.className =
        "answer-modal";

    const basic =
        survey;

    let answersHTML = "";

    const answerData =
        survey.answers || {};

    allQuestions.forEach(function (question, index) {

        let answer =
            answerData[question.id];

        if (Array.isArray(answer)) {
            answer = answer.join(", ");
        }

        if (
            answer === undefined ||
            answer === null ||
            answer === ""
        ) {
            answer = "Not answered";
        }

        answersHTML += `

            <div class="answer-question">

                <div class="answer-question-title">
                    ${index + 1}. ${escapeHTML(question.question)}
                </div>

                <div class="answer-value">
                    ${escapeHTML(answer)}
                </div>

            </div>
        `;
    });

    modal.innerHTML = `

        <div class="answer-modal-header">

            <h2>📋 Survey Answers</h2>

            <button
                class="close-answer-modal"
                id="closeAnswerModal">
                ×
            </button>

        </div>

        <div class="answer-basic">

            <h3 style="margin-top:0;color:#1769c2;">
                👤 Respondent Details
            </h3>

            <div class="answer-basic-grid">

                <div>
                    <b>Name:</b>
                    ${escapeHTML(basic.name)}
                </div>

                <div>
                    <b>Mobile:</b>
                    ${escapeHTML(basic.mobile)}
                </div>

                <div>
                    <b>Age:</b>
                    ${escapeHTML(basic.age)}
                </div>

                <div>
                    <b>Gender:</b>
                    ${escapeHTML(basic.gender)}
                </div>

                <div>
                    <b>Village:</b>
                    ${escapeHTML(basic.village)}
                </div>

                <div>
                    <b>Party:</b>
                    ${escapeHTML(basic.party)}
                </div>

                <div>
                    <b>Candidate:</b>
                    ${escapeHTML(basic.candidate)}
                </div>

            </div>

        </div>

        <h3 style="color:#1769c2;">
            📝 Questions & Answers
        </h3>

        ${answersHTML || "<p>No answers found.</p>"}
    `;

    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    document
        .getElementById("closeAnswerModal")
        .addEventListener("click", function () {
            overlay.remove();
        });

    overlay.addEventListener("click", function (event) {

        if (event.target === overlay) {
            overlay.remove();
        }
    });
};


// =====================================================
// EDIT SURVEY
// =====================================================

window.editSurvey = function (id) {

    const survey =
        allSurveys.find(function (item) {
            return item.id === id;
        });

    if (!survey) return;

    const name =
        prompt("Name:", survey.name || "");

    if (name === null) return;

    const mobile =
        prompt("Mobile:", survey.mobile || "");

    if (mobile === null) return;

    const age =
        prompt("Age:", survey.age || "");

    if (age === null) return;

    const gender =
        prompt("Gender:", survey.gender || "");

    if (gender === null) return;

    const village =
        prompt("Village:", survey.village || "");

    if (village === null) return;

    const party =
        prompt("Party:", survey.party || "");

    if (party === null) return;

    const candidate =
        prompt("Candidate:", survey.candidate || "");

    if (candidate === null) return;

    db.collection("surveys")
        .doc(id)
        .update({

            name: name.trim(),
            mobile: mobile.trim(),
            age: age.trim(),
            gender: gender.trim(),
            village: village.trim(),
            party: party.trim(),
            candidate: candidate.trim()

        })
        .then(function () {

            alert(
                "Survey updated successfully."
            );

            loadSurveys();

        })
        .catch(function (error) {

            alert(
                "Update failed: " +
                error.message
            );
        });
};


// =====================================================
// DELETE SURVEY
// =====================================================

window.deleteSurvey = function (id) {

    if (!confirm("Delete this survey?")) {
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

            alert(
                "Delete failed: " +
                error.message
            );
        });
};


// =====================================================
// SURVEYORS
// =====================================================

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

            renderSurveyorManagement();

        })
        .catch(function (error) {

            console.error(
                "Surveyor load error:",
                error
            );
        });
}


function renderSurveyorManagement() {

    const table =
        document.getElementById(
            "surveyorManagementTable"
        );

    if (!table) return;

    table.innerHTML = "";

    allSurveyors.forEach(function (surveyor) {

        const email =
            surveyor.email ||
            surveyor.id;

        let total = 0;
        let today = 0;
        let week = 0;
        let month = 0;

        allSurveys.forEach(function (survey) {

            if (
                String(
                    survey.surveyorEmail || ""
                ).toLowerCase() !==
                String(email).toLowerCase()
            ) {
                return;
            }

            total++;

            const date =
                getDate(survey.createdAt);

            if (isToday(date)) today++;
            if (isThisWeek(date)) week++;
            if (isThisMonth(date)) month++;
        });

        const enabled =
            surveyor.enabled !== false;

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>${escapeHTML(email)}</td>

            <td>${total}</td>

            <td>${today}</td>

            <td>${week}</td>

            <td>${month}</td>

            <td>

                ${
                    enabled
                        ? `
                            <span style="color:green;font-weight:bold;">
                                🟢 Active
                            </span>

                            <button
                                class="warning"
                                onclick="toggleSurveyor('${escapeHTML(email)}',false)">
                                Disable
                            </button>
                        `
                        : `
                            <span style="color:red;font-weight:bold;">
                                🔴 Disabled
                            </span>

                            <button
                                class="success"
                                onclick="toggleSurveyor('${escapeHTML(email)}',true)">
                                Enable
                            </button>
                        `
                }

            </td>
        `;

        table.appendChild(row);
    });
}


window.toggleSurveyor =
    function (email, enabled) {

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

                alert(
                    "Status update failed: " +
                    error.message
                );
            });
    };


// =====================================================
// DAILY LIMIT
// =====================================================

function loadDailyLimit() {

    const input =
        document.getElementById(
            "dailyLimitInput"
        );

    if (!input) return;

    db.collection("settings")
        .doc("config")
        .get()
        .then(function (doc) {

            if (
                doc.exists &&
                doc.data().dailyLimit !== undefined
            ) {

                input.value =
                    doc.data().dailyLimit;

            } else {

                input.value = 20;
            }
        });
}


function saveDailyLimit() {

    const input =
        document.getElementById(
            "dailyLimitInput"
        );

    const message =
        document.getElementById(
            "limitMessage"
        );

    if (!input || !message) return;

    const limit =
        Number(input.value);

    if (
        !Number.isFinite(limit) ||
        limit < 1
    ) {

        message.textContent =
            "Enter valid limit.";

        message.style.color = "red";

        return;
    }

    db.collection("settings")
        .doc("config")
        .set({

            dailyLimit: limit,

            updatedAt:
                firebase.firestore.FieldValue.serverTimestamp()

        }, {
            merge: true
        })
        .then(function () {

            message.textContent =
                "✅ Limit saved: " + limit;

            message.style.color = "green";

        })
        .catch(function (error) {

            message.textContent =
                "❌ " + error.message;

            message.style.color = "red";
        });
}


document
    .getElementById("saveDailyLimit")
    ?.addEventListener(
        "click",
        saveDailyLimit
    );


// =====================================================
// LOGOUT
// =====================================================

document
    .getElementById("logoutBtn")
    ?.addEventListener("click", function () {

        firebase.auth()
            .signOut()
            .then(function () {

                window.location.replace(
                    "index.html"
                );
            });
    });


// =====================================================
// START
// =====================================================

initializeQuestionBuilder();
