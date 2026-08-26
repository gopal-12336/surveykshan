console.log("Admin JS Loaded - FINAL FIXED VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let filteredSurveys = [];

let editingQuestionId = null;


// ======================================================
// ADMIN AUTHENTICATION
// ======================================================

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

    });

})
.catch(function (error) {
    console.error("Auth error:", error);
});


// ======================================================
// HELPERS
// ======================================================

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


// ======================================================
// QUESTION BUILDER
// ======================================================

function createOptionInput(value = "") {

    const container = document.getElementById("optionsContainer");

    if (!container) return;

    const row = document.createElement("div");

    row.className = "option-row";

    row.style.cssText =
        "display:flex;gap:8px;margin-bottom:8px;align-items:center;";

    const input = document.createElement("input");

    input.type = "text";
    input.className = "question-option";
    input.placeholder = "Enter option";
    input.value = value;

    input.style.cssText =
        "flex:1;padding:10px;border:1px solid #ddd;border-radius:6px;";

    const remove = document.createElement("button");

    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "❌";

    remove.style.cssText =
        "padding:8px 10px;cursor:pointer;";

    remove.onclick = function () {

        const rows =
            document.querySelectorAll(".question-option");

        if (rows.length <= 2) {

            showQuestionMessage(
                "At least 2 options are required.",
                false
            );

            return;
        }

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


// ADD OPTION

document
.getElementById("addOption")
?.addEventListener("click", function () {

    createOptionInput();

});


// SAVE QUESTION

document
.getElementById("saveQuestion")
?.addEventListener("click", function () {

    const textElement =
        document.getElementById("questionText");

    const typeElement =
        document.getElementById("questionType");

    if (!textElement || !typeElement) return;

    const text = textElement.value.trim();

    const type = typeElement.value;

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

        type: type === "multiple"
            ? "multiple"
            : "single",

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
            saveButton.textContent = "💾 Save Question";

        }

    });

});


// ======================================================
// LOAD QUESTIONS
// ======================================================

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

        console.log(
            "Questions loaded:",
            allQuestions.length
        );

        setText(
            "questionCount",
            allQuestions.length
        );

        renderQuestions();

    })

    .catch(function (error) {

        console.warn(
            "Question orderBy failed:",
            error
        );

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

            setText(
                "questionCount",
                allQuestions.length
            );

            renderQuestions();

        })

        .catch(function (error2) {

            console.error(
                "Question fallback error:",
                error2
            );

        });

    });

}


// ======================================================
// RENDER QUESTIONS
// ======================================================

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

        card.className = "question-card";

        card.style.cssText =
            "background:#fff;border:1px solid #ddd;border-radius:10px;padding:15px;margin-bottom:12px;";


        const title =
            document.createElement("h3");

        title.textContent =
            (index + 1) +
            ". " +
            (question.question || "Untitled Question");

        title.style.marginTop = "0";


        const badge =
            document.createElement("span");

        badge.textContent =
            question.type === "multiple"
                ? "Multiple Choice"
                : "Single Choice";

        badge.style.cssText =
            "display:inline-block;background:#e3f2fd;color:#1565c0;padding:5px 9px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:10px;";


        card.appendChild(title);
        card.appendChild(badge);


        const options =
            document.createElement("div");

        (question.options || [])
        .forEach(function (option) {

            const item =
                document.createElement("div");

            item.textContent =
                "• " + option;

            item.style.marginBottom = "5px";

            options.appendChild(item);

        });


        card.appendChild(options);


        const buttonBox =
            document.createElement("div");

        buttonBox.style.cssText =
            "display:flex;gap:8px;margin-top:12px;";


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


        buttonBox.appendChild(edit);
        buttonBox.appendChild(del);

        card.appendChild(buttonBox);

        container.appendChild(card);

    });

}


// ======================================================
// EDIT QUESTION
// ======================================================

function editQuestion(id) {

    const question =
        allQuestions.find(function (item) {

            return item.id === id;

        });

    if (!question) return;


    editingQuestionId = id;


    const textElement =
        document.getElementById("questionText");

    const typeElement =
        document.getElementById("questionType");

    const container =
        document.getElementById("optionsContainer");


    if (textElement) {
        textElement.value =
            question.question || "";
    }

    if (typeElement) {
        typeElement.value =
            question.type || "single";
    }

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


    const cancelButton =
        document.getElementById("cancelEdit");

    if (cancelButton) {
        cancelButton.style.display =
            "inline-block";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ======================================================
// DELETE QUESTION
// ======================================================

function deleteQuestion(id) {

    if (
        !confirm(
            "Are you sure you want to delete this question?"
        )
    ) {
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


// ======================================================
// CANCEL QUESTION EDIT
// ======================================================

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

    const saveButton =
        document.getElementById("saveQuestion");

    const cancelButton =
        document.getElementById("cancelEdit");


    if (text) text.value = "";

    if (type) type.value = "single";

    if (container) {

        container.innerHTML = "";

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


// ======================================================
// QUESTION MESSAGE
// ======================================================

function showQuestionMessage(text, success) {

    const message =
        document.getElementById("questionMessage");

    if (!message) return;

    message.textContent = text;

    message.style.color =
        success ? "green" : "red";

}


// ======================================================
// QUESTION MANAGER HIDE / SHOW
// ======================================================

function setupQuestionManagerToggle() {

    let manager =
        document.getElementById("questionManager") ||
        document.getElementById("questionManagerSection") ||
        document.querySelector("[data-question-manager]");


    if (!manager) {

        const headings =
            document.querySelectorAll("h1,h2,h3,h4");

        headings.forEach(function (heading) {

            const text =
                heading.textContent
                .toLowerCase()
                .trim();

            if (
                !manager &&
                (
                    text.includes("question manager") ||
                    text.includes("question management") ||
                    text.includes("manage questions")
                )
            ) {

                manager =
                    heading.closest("section") ||
                    heading.parentElement;

            }

        });

    }


    if (!manager) return;


    if (document.getElementById("questionManagerToggle")) {
        return;
    }


    const button =
        document.createElement("button");

    button.id =
        "questionManagerToggle";

    button.textContent =
        "👁️ Hide Question Manager";

    button.style.cssText =
        "background:#1565c0;color:#fff;border:none;border-radius:7px;padding:9px 14px;cursor:pointer;font-weight:bold;margin:10px 0;";


    manager.parentNode.insertBefore(
        button,
        manager
    );


    let hidden = false;


    button.onclick = function () {

        hidden = !hidden;

        manager.style.display =
            hidden ? "none" : "";

        button.textContent =
            hidden
                ? "👁️ Show Question Manager"
                : "👁️ Hide Question Manager";

    };

}


// ======================================================
// SURVEYS LOAD
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
            "Surveys loaded:",
            allSurveys.length
        );


        filteredSurveys =
            allSurveys.slice();


        updateDashboard();

        renderSurveyRecords();

        setupSurveyFilters();

    })

    .catch(function (error) {

        console.error(
            "Survey load error:",
            error
        );

    });

}


// ======================================================
// DASHBOARD
// ======================================================

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


// ======================================================
// SURVEY FILTER UI
// ======================================================

function setupSurveyFilters() {

    if (document.getElementById("surveyFilterBox")) {
        updateFilterOptions();
        return;
    }


    const table =
        document.getElementById("surveyTable");

    if (!table) return;


    const tableElement =
        table.closest("table");

    if (!tableElement) return;


    const box =
        document.createElement("div");

    box.id =
        "surveyFilterBox";


    box.style.cssText =
        "width:100%;box-sizing:border-box;background:#fff;border:1px solid #ddd;border-radius:12px;padding:15px;margin:15px 0;display:flex;flex-wrap:wrap;gap:10px;align-items:end;";


    const title =
        document.createElement("div");

    title.style.cssText =
        "width:100%;font-weight:bold;font-size:16px;margin-bottom:4px;";

    title.textContent =
        "🔎 Filter Survey Data";


    box.appendChild(title);


    function createInput(
        id,
        placeholder
    ) {

        const input =
            document.createElement("input");

        input.id = id;

        input.type = "text";

        input.placeholder =
            placeholder;

        input.style.cssText =
            "padding:10px;border:1px solid #ccc;border-radius:7px;min-width:160px;box-sizing:border-box;";

        box.appendChild(input);

        return input;

    }


    const nameInput =
        createInput(
            "filterName",
            "🔍 Name"
        );


    const mobileInput =
        createInput(
            "filterMobile",
            "📱 Mobile"
        );


    const villageInput =
        createInput(
            "filterVillage",
            "🏠 Village"
        );


    const surveyorInput =
        createInput(
            "filterSurveyor",
            "👤 Surveyor Email"
        );


    const dateInput =
        document.createElement("input");

    dateInput.id =
        "filterDate";

    dateInput.type =
        "date";

    dateInput.style.cssText =
        "padding:10px;border:1px solid #ccc;border-radius:7px;min-width:160px;";

    box.appendChild(dateInput);


    const filterButton =
        document.createElement("button");

    filterButton.id =
        "applySurveyFilter";

    filterButton.textContent =
        "🔎 Filter";

    filterButton.style.cssText =
        "background:#1565c0;color:#fff;border:none;border-radius:7px;padding:10px 18px;font-weight:bold;cursor:pointer;";


    const clearButton =
        document.createElement("button");

    clearButton.textContent =
        "✖ Clear";

    clearButton.style.cssText =
        "background:#ef6c00;color:#fff;border:none;border-radius:7px;padding:10px 18px;font-weight:bold;cursor:pointer;";


    const count =
        document.createElement("span");

    count.id =
        "filterResultCount";

    count.style.cssText =
        "font-weight:bold;margin-left:5px;padding:10px;";


    box.appendChild(filterButton);
    box.appendChild(clearButton);
    box.appendChild(count);


    tableElement.parentNode.insertBefore(
        box,
        tableElement
    );


    filterButton.onclick =
        applySurveyFilter;


    clearButton.onclick =
        function () {

            nameInput.value = "";
            mobileInput.value = "";
            villageInput.value = "";
            surveyorInput.value = "";
            dateInput.value = "";

            filteredSurveys =
                allSurveys.slice();

            renderSurveyRecords();

        };


    [
        nameInput,
        mobileInput,
        villageInput,
        surveyorInput
    ].forEach(function (input) {

        input.addEventListener(
            "input",
            applySurveyFilter
        );

    });


    dateInput.addEventListener(
        "change",
        applySurveyFilter
    );


    updateFilterOptions();

}


function updateFilterOptions() {

    const count =
        document.getElementById(
            "filterResultCount"
        );

    if (count) {

        count.textContent =
            "Showing: " +
            filteredSurveys.length;

    }

}


function applySurveyFilter() {

    const name =
        (
            document.getElementById("filterName")
            ?.value || ""
        )
        .trim()
        .toLowerCase();


    const mobile =
        (
            document.getElementById("filterMobile")
            ?.value || ""
        )
        .trim()
        .toLowerCase();


    const village =
        (
            document.getElementById("filterVillage")
            ?.value || ""
        )
        .trim()
        .toLowerCase();


    const surveyor =
        (
            document.getElementById("filterSurveyor")
            ?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedDate =
        document.getElementById("filterDate")
        ?.value || "";


    filteredSurveys =
        allSurveys.filter(function (survey) {

            const surveyName =
                String(
                    survey.name || ""
                ).toLowerCase();


            const surveyMobile =
                String(
                    survey.mobile || ""
                ).toLowerCase();


            const surveyVillage =
                String(
                    survey.village || ""
                ).toLowerCase();


            const surveyorEmail =
                String(
                    survey.surveyorEmail || ""
                ).toLowerCase();


            if (
                name &&
                !surveyName.includes(name)
            ) {
                return false;
            }


            if (
                mobile &&
                !surveyMobile.includes(mobile)
            ) {
                return false;
            }


            if (
                village &&
                !surveyVillage.includes(village)
            ) {
                return false;
            }


            if (
                surveyor &&
                !surveyorEmail.includes(surveyor)
            ) {
                return false;
            }


            if (selectedDate) {

                const date =
                    getDate(
                        survey.createdAt
                    );

                if (!date) return false;


                const year =
                    date.getFullYear();

                const month =
                    String(
                        date.getMonth() + 1
                    ).padStart(2, "0");

                const day =
                    String(
                        date.getDate()
                    ).padStart(2, "0");


                const dateString =
                    year +
                    "-" +
                    month +
                    "-" +
                    day;


                if (
                    dateString !==
                    selectedDate
                ) {
                    return false;
                }

            }


            return true;

        });


    renderSurveyRecords();

}


// ======================================================
// RENDER SURVEY RECORDS
// ======================================================

function renderSurveyRecords() {

    const table =
        document.getElementById(
            "surveyTable"
        );

    if (!table) return;


    table.innerHTML = "";


    if (filteredSurveys.length === 0) {

        const row =
            document.createElement("tr");

        const cell =
            document.createElement("td");

        cell.colSpan = 10;

        cell.textContent =
            "No survey records found.";

        cell.style.cssText =
            "text-align:center;padding:25px;font-weight:bold;color:#777;";

        row.appendChild(cell);

        table.appendChild(row);

        updateFilterOptions();

        return;

    }


    filteredSurveys.forEach(function (survey) {

        const row =
            document.createElement("tr");


        const date =
            getDate(
                survey.createdAt
            );


        const dateText =
            date
                ? date.toLocaleString("en-IN")
                : "-";


        row.innerHTML = `

<td>${escapeHTML(survey.name)}</td>

<td>${escapeHTML(survey.mobile)}</td>

<td>${escapeHTML(survey.age)}</td>

<td>${escapeHTML(survey.gender)}</td>

<td>${escapeHTML(survey.village)}</td>

<td>${escapeHTML(survey.district)}</td>

<td>${escapeHTML(survey.pincode)}</td>

<td>${escapeHTML(survey.surveyorEmail)}</td>

<td>${escapeHTML(dateText)}</td>

<td style="white-space:nowrap;">

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


    updateFilterOptions();

}


// ======================================================
// EDIT SURVEY
// ======================================================

window.editSurvey =
function (id) {

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


    const district =
        prompt(
            "District:",
            survey.district || ""
        );

    if (district === null) return;


    const pincode =
        prompt(
            "PIN Code:",
            survey.pincode || ""
        );

    if (pincode === null) return;


    db.collection("surveys")
    .doc(id)
    .update({

        name: name.trim(),

        mobile: mobile.trim(),

        age: Number(age) || age.trim(),

        gender: gender.trim(),

        village: village.trim(),

        district: district.trim(),

        pincode: pincode.trim()

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


// ======================================================
// DELETE SINGLE SURVEY
// ======================================================

window.deleteSurvey =
function (id) {

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

        alert(
            "Delete failed: " +
            error.message
        );

    });

};


// ======================================================
// DELETE ALL SURVEYS
// ======================================================

function createDeleteAllButton() {

    if (
        document.getElementById(
            "deleteAllSurveysBtn"
        )
    ) {
        return;
    }


    const table =
        document.getElementById(
            "surveyTable"
        );

    if (!table) return;


    const tableElement =
        table.closest("table");

    if (!tableElement) return;


    const button =
        document.createElement("button");


    button.id =
        "deleteAllSurveysBtn";


    button.textContent =
        "🗑️ Delete All Surveys";


    button.style.cssText =
        "background:#c62828;color:#fff;border:none;border-radius:7px;padding:11px 18px;font-weight:bold;cursor:pointer;margin:10px 0;";


    tableElement.parentNode.insertBefore(
        button,
        tableElement
    );


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
            "⚠️ WARNING!\n\nThis will delete ALL survey records.\n\nDo you want to continue?"
        );


    if (!firstConfirm) return;


    const secondConfirm =
        prompt(
            "Type DELETE to permanently delete all surveys:"
        );


    if (
        secondConfirm !== "DELETE"
    ) {

        alert(
            "Delete cancelled."
        );

        return;

    }


    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Deleting...";

    }


    db.collection("surveys")
    .get()

    .then(function (snapshot) {

        if (snapshot.empty) {
            return null;
        }


        const docs =
            snapshot.docs;


        const batches = [];

        let batch =
            db.batch();

        let count = 0;


        docs.forEach(function (doc) {

            batch.delete(doc.ref);

            count++;


            if (count === 500) {

                batches.push(batch);

                batch =
                    db.batch();

                count = 0;

            }

        });


        if (count > 0) {
            batches.push(batch);
        }


        return Promise.all(
            batches.map(function (batch) {

                return batch.commit();

            })
        );

    })

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
            "Delete all failed: " +
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


// ======================================================
// SURVEYORS
// ======================================================

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
?
`
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


// ======================================================
// ENABLE / DISABLE SURVEYOR
// ======================================================

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


// ======================================================
// DAILY LIMIT
// ======================================================

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

    })

    .catch(function (error) {

        console.error(
            "Daily limit load error:",
            error
        );

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


// ======================================================
// LOGOUT
// ======================================================

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


// ======================================================
// START
// ======================================================

initializeQuestionBuilder();


// Wait for HTML completely loaded
setTimeout(function () {

    setupQuestionManagerToggle();

    createDeleteAllButton();

}, 800);
