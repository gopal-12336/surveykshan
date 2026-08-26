console.log("Admin JS Loaded - FINAL ADMIN VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];

let editingQuestionId = null;

let filteredSurveys = [];


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

        loadDailyLimit();
        loadQuestions();
        loadSurveyors();
        loadSurveys();

        setTimeout(function () {
            setupAdminUI();
        }, 500);

    });

})
.catch(function (error) {
    console.error("Auth error:", error);
});


// =====================================================
// DATE HELPERS
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

        const date = new Date(value);

        return isNaN(date.getTime()) ? null : date;

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


// =====================================================
// ESCAPE HTML
// =====================================================

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


// =====================================================
// ADMIN UI SETUP
// =====================================================

function setupAdminUI() {

    createQuestionManagerToggle();

    createQuestionBuilderToggle();

    createSurveyFilters();

    removeAssemblyFromSurveyTable();

    addAnswersColumn();

}


// =====================================================
// QUESTION MANAGER HIDE / SHOW
// =====================================================

function createQuestionManagerToggle() {

    const list = document.getElementById("questionsList");

    if (!list) return;

    if (document.getElementById("questionManagerToggle")) return;

    const heading =
        document.getElementById("questionCount") ||
        list.parentElement;

    const button = document.createElement("button");

    button.id = "questionManagerToggle";

    button.type = "button";

    button.textContent = "👁️ Hide Question Manager";

    button.style.cssText = `
        background:#1565c0;
        color:white;
        border:none;
        border-radius:8px;
        padding:10px 16px;
        margin:10px 0;
        cursor:pointer;
        font-weight:bold;
    `;

    list.parentElement.insertBefore(button, list);

    button.onclick = function () {

        const hidden =
            list.style.display === "none";

        if (hidden) {

            list.style.display = "";

            button.textContent =
                "👁️ Hide Question Manager";

        } else {

            list.style.display = "none";

            button.textContent =
                "👁️ Show Question Manager";

        }

    };

}


// =====================================================
// ADD QUESTION BUILDER HIDE / SHOW
// =====================================================

function createQuestionBuilderToggle() {

    const questionText =
        document.getElementById("questionText");

    const saveQuestion =
        document.getElementById("saveQuestion");

    if (!questionText || !saveQuestion) return;

    if (document.getElementById("questionBuilderToggle")) return;

    let builder = questionText.closest("section");

    if (!builder) {
        builder = questionText.parentElement;
    }

    if (!builder) return;

    const button = document.createElement("button");

    button.id = "questionBuilderToggle";

    button.type = "button";

    button.textContent =
        "👁️ Hide Add Question";

    button.style.cssText = `
        background:#1565c0;
        color:white;
        border:none;
        border-radius:8px;
        padding:10px 16px;
        margin:10px 0;
        cursor:pointer;
        font-weight:bold;
    `;

    builder.parentElement.insertBefore(button, builder);

    button.onclick = function () {

        const hidden =
            builder.style.display === "none";

        if (hidden) {

            builder.style.display = "";

            button.textContent =
                "👁️ Hide Add Question";

        } else {

            builder.style.display = "none";

            button.textContent =
                "👁️ Show Add Question";

        }

    };

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

        updateQuestionCount();

        renderQuestions();

    })

    .catch(function () {

        db.collection("questions")
        .get()

        .then(function (snapshot) {

            allQuestions = [];

            snapshot.forEach(function (doc) {

                allQuestions.push({

                    id: doc.id,

                    ...doc.data()

                });

            });

            updateQuestionCount();

            renderQuestions();

        })

        .catch(function (error) {

            console.error(
                "Question loading error:",
                error
            );

        });

    });

}


function updateQuestionCount() {

    const count =
        document.getElementById("questionCount");

    if (count) {
        count.textContent =
            allQuestions.length;
    }

}


// =====================================================
// RENDER QUESTIONS
// =====================================================

function renderQuestions() {

    const container =
        document.getElementById("questionsList");

    if (!container) return;

    container.innerHTML = "";

    if (allQuestions.length === 0) {

        container.innerHTML =
            "<p>No questions added yet.</p>";

        return;

    }

    allQuestions.forEach(function (question, index) {

        const card =
            document.createElement("div");

        card.className =
            "question-card";

        const title =
            document.createElement("h3");

        title.textContent =
            (index + 1) +
            ". " +
            (question.question || "Untitled Question");

        const badge =
            document.createElement("span");

        badge.className = "badge";

        badge.textContent =
            question.type === "multiple"
                ? "Multiple Choice"
                : "Single Choice";

        card.appendChild(title);
        card.appendChild(badge);

        const options =
            document.createElement("div");

        options.style.marginTop = "10px";

        (question.options || [])
        .forEach(function (option) {

            const item =
                document.createElement("div");

            item.className =
                "option-item";

            item.textContent =
                "• " + option;

            options.appendChild(item);

        });

        card.appendChild(options);

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

    const questionText =
        document.getElementById("questionText");

    const questionType =
        document.getElementById("questionType");

    if (questionText) {
        questionText.value =
            question.question || "";
    }

    if (questionType) {
        questionType.value =
            question.type || "single";
    }

    const container =
        document.getElementById("optionsContainer");

    if (container) {

        container.innerHTML = "";

        (question.options || [])
        .forEach(function (option) {

            createOptionInput(option);

        });

    }

    const saveButton =
        document.getElementById("saveQuestion");

    if (saveButton) {
        saveButton.textContent =
            "💾 Update Question";
    }

    const cancel =
        document.getElementById("cancelEdit");

    if (cancel) {
        cancel.style.display =
            "inline-block";
    }

    const toggle =
        document.getElementById(
            "questionBuilderToggle"
        );

    if (toggle) {

        const builder =
            questionText?.closest("section") ||
            questionText?.parentElement;

        if (builder) {

            builder.style.display = "";

            toggle.textContent =
                "👁️ Hide Add Question";

        }

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

    if (!confirm(
        "Are you sure you want to delete this question?"
    )) {
        return;
    }

    db.collection("questions")
    .doc(id)
    .delete()

    .then(function () {

        alert(
            "Question deleted successfully."
        );

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
// CANCEL EDIT
// =====================================================

document
.getElementById("cancelEdit")
?.addEventListener("click", function () {

    resetQuestionBuilder();

});


function resetQuestionBuilder() {

    editingQuestionId = null;

    const questionText =
        document.getElementById("questionText");

    const questionType =
        document.getElementById("questionType");

    const options =
        document.getElementById("optionsContainer");

    const saveButton =
        document.getElementById("saveQuestion");

    const cancel =
        document.getElementById("cancelEdit");

    if (questionText) {
        questionText.value = "";
    }

    if (questionType) {
        questionType.value = "single";
    }

    if (options) {

        options.innerHTML = "";

        createOptionInput();
        createOptionInput();

    }

    if (saveButton) {

        saveButton.textContent =
            "💾 Save Question";

    }

    if (cancel) {

        cancel.style.display =
            "none";

    }

}


// =====================================================
// QUESTION MESSAGE
// =====================================================

function showQuestionMessage(text, success) {

    const message =
        document.getElementById(
            "questionMessage"
        );

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

        filteredSurveys =
            [...allSurveys];

        updateDashboard();

        createSurveyFilters();

        renderSurveyRecords();

        renderSurveyorManagement();

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

    setText(
        "totalSurvey",
        allSurveys.length
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


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


// =====================================================
// REMOVE ASSEMBLY FROM SURVEY TABLE
// =====================================================

function removeAssemblyFromSurveyTable() {

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const headerRow =
        table.closest("table")?.querySelector("thead tr");

    if (!headerRow) return;

    const headers =
        Array.from(headerRow.children);

    const assemblyIndex =
        headers.findIndex(function (th) {

            return (
                th.textContent
                .trim()
                .toLowerCase()
                .includes("assembly")
            );

        });

    if (assemblyIndex === -1) return;

    headers[assemblyIndex].style.display = "none";

    table.querySelectorAll("tr")
    .forEach(function (row) {

        if (row.children[assemblyIndex]) {

            row.children[assemblyIndex]
                .style.display = "none";

        }

    });

}


// =====================================================
// ANSWERS COLUMN
// =====================================================

function addAnswersColumn() {

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const parentTable =
        table.closest("table");

    if (!parentTable) return;

    const headerRow =
        parentTable.querySelector("thead tr");

    if (!headerRow) return;

    const exists =
        Array.from(headerRow.children)
        .some(function (th) {

            return th.textContent
                .trim()
                .toLowerCase()
                .includes("answer");

        });

    if (exists) return;

    const th =
        document.createElement("th");

    th.textContent =
        "Answers";

    th.style.cssText =
        "background:#1565c0;color:white;";

    headerRow.appendChild(th);

}


// =====================================================
// ANSWERS FORMAT
// =====================================================

function formatAnswers(answers) {

    if (!answers) {
        return "No answers";
    }

    let data = answers;

    if (typeof data === "string") {

        try {
            data = JSON.parse(data);
        } catch (e) {
            return escapeHTML(data);
        }

    }

    if (typeof data !== "object") {
        return escapeHTML(data);
    }

    const parts = [];

    Object.keys(data)
    .forEach(function (key) {

        let value = data[key];

        if (Array.isArray(value)) {
            value = value.join(", ");
        }

        parts.push(
            "<div style='margin-bottom:6px;'>" +
            "<b>" +
            escapeHTML(key) +
            ":</b> " +
            escapeHTML(value) +
            "</div>"
        );

    });

    return parts.length
        ? parts.join("")
        : "No answers";

}


// =====================================================
// RENDER SURVEY RECORDS
// =====================================================

function renderSurveyRecords() {

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    table.innerHTML = "";

    if (!filteredSurveys.length) {

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td colspan="20"
                style="text-align:center;padding:20px;">
                No survey records found.
            </td>
        `;

        table.appendChild(row);

        updateFilterCount();

        return;
    }

    filteredSurveys.forEach(function (survey) {

        const row =
            document.createElement("tr");

        row.innerHTML = `

<td>${escapeHTML(survey.name)}</td>

<td>${escapeHTML(survey.mobile)}</td>

<td>${escapeHTML(survey.age)}</td>

<td>${escapeHTML(survey.gender)}</td>

<td>${escapeHTML(survey.village)}</td>

<td class="assembly-column">
${escapeHTML(survey.assembly || "")}
</td>

<td>${escapeHTML(survey.party || "")}</td>

<td>${escapeHTML(survey.candidate || "")}</td>

<td style="min-width:220px;">
${formatAnswers(survey.answers)}
</td>

<td>${escapeHTML(survey.surveyorEmail || "")}</td>

<td>
<button
class="primary"
onclick="editSurvey('${survey.id}')">
✏️ Edit
</button>

<button
class="danger"
onclick="deleteSurvey('${survey.id}')">
🗑️ Delete
</button>
</td>

`;

        table.appendChild(row);

    });

    removeAssemblyFromSurveyTable();

    updateFilterCount();

}


// =====================================================
// SURVEY FILTERS
// =====================================================

function createSurveyFilters() {

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const parent =
        table.closest("section") ||
        table.parentElement;

    if (!parent) return;

    let box =
        document.getElementById(
            "surveyFilterBox"
        );

    if (box) {

        refreshFilterOptions();

        return;

    }

    box =
        document.createElement("div");

    box.id =
        "surveyFilterBox";

    box.style.cssText = `
        background:#f7f9fc;
        border:1px solid #ddd;
        border-radius:12px;
        padding:15px;
        margin:15px 0;
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
    `;

    const nameSelect =
        createSelect(
            "filterName",
            "👤 All Names"
        );

    const mobileSelect =
        createSelect(
            "filterMobile",
            "📱 All Mobiles"
        );

    const villageSelect =
        createSelect(
            "filterVillage",
            "🏠 All Villages"
        );

    const surveyorSelect =
        createSelect(
            "filterSurveyor",
            "👤 All Surveyors"
        );

    const dateSelect =
        createSelect(
            "filterDate",
            "📅 All Dates"
        );

    dateSelect.innerHTML = `
        <option value="">📅 All Dates</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
    `;

    const filterButton =
        document.createElement("button");

    filterButton.id =
        "applySurveyFilter";

    filterButton.textContent =
        "🔎 Filter";

    filterButton.style.cssText = `
        background:#1565c0;
        color:white;
        border:none;
        border-radius:7px;
        padding:10px 18px;
        cursor:pointer;
        font-weight:bold;
    `;

    const clearButton =
        document.createElement("button");

    clearButton.textContent =
        "✖ Clear";

    clearButton.style.cssText = `
        background:#ef6c00;
        color:white;
        border:none;
        border-radius:7px;
        padding:10px 18px;
        cursor:pointer;
        font-weight:bold;
    `;

    const count =
        document.createElement("span");

    count.id =
        "filterResultCount";

    count.style.cssText =
        "font-weight:bold;margin-left:5px;";

    box.append(
        nameSelect,
        mobileSelect,
        villageSelect,
        surveyorSelect,
        dateSelect,
        filterButton,
        clearButton,
        count
    );

    parent.insertBefore(box, table);

    filterButton.onclick =
        applySurveyFilter;

    clearButton.onclick =
        clearSurveyFilter;

    refreshFilterOptions();

    updateFilterCount();

}


function createSelect(id, defaultText) {

    const select =
        document.createElement("select");

    select.id = id;

    select.style.cssText = `
        min-width:150px;
        padding:10px;
        border:1px solid #ccc;
        border-radius:7px;
        background:white;
        cursor:pointer;
    `;

    const option =
        document.createElement("option");

    option.value = "";

    option.textContent =
        defaultText;

    select.appendChild(option);

    return select;

}


function refreshFilterOptions() {

    setFilterOptions(
        "filterName",
        "👤 All Names",
        allSurveys.map(function (s) {
            return s.name;
        })
    );

    setFilterOptions(
        "filterMobile",
        "📱 All Mobiles",
        allSurveys.map(function (s) {
            return s.mobile;
        })
    );

    setFilterOptions(
        "filterVillage",
        "🏠 All Villages",
        allSurveys.map(function (s) {
            return s.village;
        })
    );

    setFilterOptions(
        "filterSurveyor",
        "👤 All Surveyors",
        allSurveys.map(function (s) {
            return s.surveyorEmail;
        })
    );

}


function setFilterOptions(id, defaultText, values) {

    const select =
        document.getElementById(id);

    if (!select) return;

    const oldValue =
        select.value;

    const unique =
        [...new Set(
            values
            .filter(function (v) {
                return v !== null &&
                    v !== undefined &&
                    String(v).trim() !== "";
            })
            .map(function (v) {
                return String(v).trim();
            })
        )]
        .sort(function (a, b) {
            return a.localeCompare(b);
        });

    select.innerHTML = "";

    const first =
        document.createElement("option");

    first.value = "";

    first.textContent =
        defaultText;

    select.appendChild(first);

    unique.forEach(function (value) {

        const option =
            document.createElement("option");

        option.value = value;

        option.textContent = value;

        select.appendChild(option);

    });

    if (unique.includes(oldValue)) {
        select.value = oldValue;
    }

}


function applySurveyFilter() {

    const name =
        document.getElementById(
            "filterName"
        )?.value || "";

    const mobile =
        document.getElementById(
            "filterMobile"
        )?.value || "";

    const village =
        document.getElementById(
            "filterVillage"
        )?.value || "";

    const surveyor =
        document.getElementById(
            "filterSurveyor"
        )?.value || "";

    const date =
        document.getElementById(
            "filterDate"
        )?.value || "";

    filteredSurveys =
        allSurveys.filter(function (survey) {

            if (
                name &&
                String(survey.name || "") !== name
            ) {
                return false;
            }

            if (
                mobile &&
                String(survey.mobile || "") !== mobile
            ) {
                return false;
            }

            if (
                village &&
                String(survey.village || "") !== village
            ) {
                return false;
            }

            if (
                surveyor &&
                String(survey.surveyorEmail || "") !== surveyor
            ) {
                return false;
            }

            const surveyDate =
                getDate(survey.createdAt);

            if (date === "today" &&
                !isToday(surveyDate)) {
                return false;
            }

            if (date === "week" &&
                !isThisWeek(surveyDate)) {
                return false;
            }

            if (date === "month" &&
                !isThisMonth(surveyDate)) {
                return false;
            }

            return true;

        });

    renderSurveyRecords();

}


function clearSurveyFilter() {

    [
        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor",
        "filterDate"
    ].forEach(function (id) {

        const select =
            document.getElementById(id);

        if (select) {
            select.value = "";
        }

    });

    filteredSurveys =
        [...allSurveys];

    renderSurveyRecords();

}


function updateFilterCount() {

    const element =
        document.getElementById(
            "filterResultCount"
        );

    if (!element) return;

    element.textContent =
        "Showing: " +
        filteredSurveys.length +
        " / " +
        allSurveys.length;

}


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

    const gender =
        prompt(
            "Gender:",
            survey.gender || ""
        );

    if (gender === null) return;

    const village =
        prompt(
            "Village:",
            survey.village || ""
        );

    if (village === null) return;

    db.collection("surveys")
    .doc(id)
    .update({

        name: name.trim(),

        mobile: mobile.trim(),

        age: age.trim(),

        gender: gender.trim(),

        village: village.trim()

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
// DELETE SINGLE SURVEY
// =====================================================

window.deleteSurvey = function (id) {

    if (!confirm(
        "Are you sure you want to delete this survey?"
    )) {
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
// DELETE ALL SURVEYS
// =====================================================

function createDeleteAllButton() {

    if (document.getElementById("deleteAllSurveys")) {
        return;
    }

    const table =
        document.getElementById("surveyTable");

    if (!table) return;

    const parent =
        table.closest("section") ||
        table.parentElement;

    if (!parent) return;

    const button =
        document.createElement("button");

    button.id =
        "deleteAllSurveys";

    button.type = "button";

    button.textContent =
        "🗑️ Delete All Surveys";

    button.style.cssText = `
        background:#c62828;
        color:white;
        border:none;
        border-radius:8px;
        padding:12px 18px;
        margin:10px 0;
        cursor:pointer;
        font-weight:bold;
    `;

    parent.insertBefore(button, table);

    button.onclick =
        deleteAllSurveys;

}


function deleteAllSurveys() {

    if (allSurveys.length === 0) {

        alert(
            "There are no surveys to delete."
        );

        return;

    }

    const firstConfirm =
        confirm(
            "⚠️ WARNING!\n\n" +
            "You are about to delete ALL " +
            allSurveys.length +
            " surveys.\n\n" +
            "This action cannot be undone.\n\n" +
            "Continue?"
        );

    if (!firstConfirm) return;

    const secondConfirm =
        confirm(
            "FINAL CONFIRMATION\n\n" +
            "Delete ALL survey records permanently?"
        );

    if (!secondConfirm) return;

    const button =
        document.getElementById(
            "deleteAllSurveys"
        );

    if (button) {

        button.disabled = true;

        button.textContent =
            "Deleting...";

    }

    const batchSize = 400;

    let batches = [];

    for (
        let i = 0;
        i < allSurveys.length;
        i += batchSize
    ) {

        batches.push(
            allSurveys.slice(
                i,
                i + batchSize
            )
        );

    }

    let promise =
        Promise.resolve();

    batches.forEach(function (batch) {

        promise =
            promise.then(function () {

                const writeBatch =
                    db.batch();

                batch.forEach(function (survey) {

                    const ref =
                        db.collection("surveys")
                        .doc(survey.id);

                    writeBatch.delete(ref);

                });

                return writeBatch.commit();

            });

    });

    promise

    .then(function () {

        alert(
            "✅ All surveys deleted successfully."
        );

        loadSurveys();

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
                getDate(
                    survey.createdAt
                );

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

:

`
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


// =====================================================
// ENABLE / DISABLE SURVEYOR
// =====================================================

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

    if (!input) return;

    const limit =
        Number(input.value);

    if (
        !Number.isFinite(limit) ||
        limit < 1
    ) {

        if (message) {

            message.textContent =
                "Enter valid limit.";

            message.style.color =
                "red";

        }

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

        if (message) {

            message.textContent =
                "✅ Limit saved: " + limit;

            message.style.color =
                "green";

        }

    })

    .catch(function (error) {

        if (message) {

            message.textContent =
                "❌ " + error.message;

            message.style.color =
                "red";

        }

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
?.addEventListener(
    "click",
    function () {

        firebase.auth()
        .signOut()

        .then(function () {

            window.location.replace(
                "index.html"
            );

        });

    }
);


// =====================================================
// INITIALIZE
// =====================================================

initializeQuestionBuilder();


// =====================================================
// CREATE EXTRA UI AFTER PAGE LOAD
// =====================================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(function () {

                setupAdminUI();

                createDeleteAllButton();

            }, 800);

        }
    );

} else {

    setTimeout(function () {

        setupAdminUI();

        createDeleteAllButton();

    }, 800);

}s
