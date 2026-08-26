console.log("Admin JS Loaded - FIXED FINAL VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let filteredSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let editingQuestionId = null;


// ======================================================
// FIREBASE / ADMIN AUTH
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

        if (value.seconds) {
            return new Date(value.seconds * 1000);
        }

        return new Date(value);

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
// QUESTION MANAGER - HIDE / SHOW
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    const toggle =
        document.getElementById("questionManagerToggle");

    const body =
        document.getElementById("questionManagerBody");

    if (toggle && body) {

        toggle.addEventListener("click", function () {

            if (
                body.style.display === "none" ||
                getComputedStyle(body).display === "none"
            ) {

                body.style.display = "block";
                toggle.textContent = "🙈 Hide";

            } else {

                body.style.display = "none";
                toggle.textContent = "👁️ Show";

            }

        });

    }

});


// ======================================================
// QUESTION OPTION BUILDER
// ======================================================

function createOptionInput(value = "") {

    const container =
        document.getElementById("optionsContainer");

    if (!container) return;

    const row =
        document.createElement("div");

    row.className = "option-row";


    const input =
        document.createElement("input");

    input.type = "text";
    input.className = "question-option";
    input.placeholder = "Enter option";
    input.value = value;


    const remove =
        document.createElement("button");

    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "❌";

    remove.addEventListener("click", function () {
        row.remove();
    });


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
document.addEventListener("DOMContentLoaded", function () {

    const addButton =
        document.getElementById("addOption");

    if (addButton) {

        addButton.addEventListener("click", function () {

            createOptionInput();

        });

    }

});


// ======================================================
// SAVE / UPDATE QUESTION
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    const saveButton =
        document.getElementById("saveQuestion");

    if (!saveButton) return;


    saveButton.addEventListener("click", function () {

        const textElement =
            document.getElementById("questionText");

        const typeElement =
            document.getElementById("questionType");


        const text =
            textElement
            ? textElement.value.trim()
            : "";


        const type =
            typeElement
            ? typeElement.value
            : "single";


        if (!text) {

            showQuestionMessage(
                "Please enter question.",
                false
            );

            return;
        }


        const inputs =
            document.querySelectorAll(
                ".question-option"
            );


        const options = [];


        inputs.forEach(function (input) {

            const value =
                input.value.trim();

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
                firebase.firestore
                .FieldValue
                .serverTimestamp()

        };


        saveButton.disabled = true;
        saveButton.textContent = "Saving...";


        let promise;


        if (editingQuestionId) {

            promise =
                db.collection("questions")
                .doc(editingQuestionId)
                .update(questionData);

        } else {

            questionData.createdAt =
                firebase.firestore
                .FieldValue
                .serverTimestamp();

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

            saveButton.disabled = false;
            saveButton.textContent =
                "💾 Save Question";

        });

    });

});


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
// LOAD QUESTIONS
// ======================================================

function loadQuestions() {

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


        allQuestions.sort(function (a, b) {

            const aDate = getDate(a.createdAt);
            const bDate = getDate(b.createdAt);

            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;

            return aDate - bDate;

        });


        setText(
            "questionCount",
            allQuestions.length
        );


        renderQuestions();

    })

    .catch(function (error) {

        console.error(
            "Question loading error:",
            error
        );

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


        (question.options || []).forEach(function (option) {

            const item =
                document.createElement("div");

            item.className = "option-item";

            item.textContent =
                "• " + option;

            options.appendChild(item);

        });


        card.appendChild(options);


        const edit =
            document.createElement("button");

        edit.className = "primary";
        edit.textContent = "✏️ Edit";

        edit.addEventListener("click", function () {

            editQuestion(question.id);

        });


        const del =
            document.createElement("button");

        del.className = "danger";
        del.textContent = "🗑️ Delete";

        del.addEventListener("click", function () {

            deleteQuestion(question.id);

        });


        card.appendChild(edit);
        card.appendChild(del);

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


    document.getElementById("questionText").value =
        question.question || "";


    document.getElementById("questionType").value =
        question.type || "single";


    const container =
        document.getElementById("optionsContainer");

    container.innerHTML = "";


    (question.options || []).forEach(function (option) {

        createOptionInput(option);

    });


    document.getElementById("saveQuestion").textContent =
        "💾 Update Question";


    document.getElementById("cancelEdit").style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ======================================================
// DELETE QUESTION
// ======================================================

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


// ======================================================
// CANCEL QUESTION EDIT
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    const cancelButton =
        document.getElementById("cancelEdit");

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            resetQuestionBuilder
        );

    }

});


function resetQuestionBuilder() {

    editingQuestionId = null;


    const text =
        document.getElementById("questionText");

    if (text) text.value = "";


    const type =
        document.getElementById("questionType");

    if (type) type.value = "single";


    const container =
        document.getElementById("optionsContainer");

    if (container) {

        container.innerHTML = "";

        createOptionInput();
        createOptionInput();

    }


    const save =
        document.getElementById("saveQuestion");

    if (save) {
        save.textContent = "💾 Save Question";
    }


    const cancel =
        document.getElementById("cancelEdit");

    if (cancel) {
        cancel.style.display = "none";
    }

}


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


        filteredSurveys =
            allSurveys.slice();


        updateDashboard();

        populateFilterDropdowns();

        renderSurveyRecords(
            filteredSurveys
        );

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
// FILTER DROPDOWNS
// ======================================================

function getUniqueValues(field) {

    const values = [];

    allSurveys.forEach(function (survey) {

        const value =
            String(
                survey[field] || ""
            ).trim();

        if (
            value &&
            !values.some(function (item) {
                return item.toLowerCase() === value.toLowerCase();
            })
        ) {
            values.push(value);
        }

    });


    values.sort(function (a, b) {

        return a.localeCompare(b);

    });


    return values;
}


function fillSelect(id, defaultText, values) {

    const select =
        document.getElementById(id);

    if (!select) return;


    select.innerHTML = "";


    const first =
        document.createElement("option");

    first.value = "";
    first.textContent = defaultText;

    select.appendChild(first);


    values.forEach(function (value) {

        const option =
            document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);

    });

}


function populateFilterDropdowns() {

    fillSelect(
        "filterName",
        "👤 All Names",
        getUniqueValues("name")
    );


    fillSelect(
        "filterMobile",
        "📱 All Mobiles",
        getUniqueValues("mobile")
    );


    fillSelect(
        "filterVillage",
        "🏠 All Villages",
        getUniqueValues("village")
    );


    const surveyorValues = [];


    allSurveyors.forEach(function (surveyor) {

        const value =
            surveyor.email ||
            surveyor.id ||
            "";


        if (
            value &&
            !surveyorValues.some(function (item) {

                return item.toLowerCase() ===
                    value.toLowerCase();

            })
        ) {

            surveyorValues.push(value);

        }

    });


    allSurveys.forEach(function (survey) {

        const value =
            String(
                survey.surveyorEmail || ""
            ).trim();


        if (
            value &&
            !surveyorValues.some(function (item) {

                return item.toLowerCase() ===
                    value.toLowerCase();

            })
        ) {

            surveyorValues.push(value);

        }

    });


    surveyorValues.sort();


    fillSelect(
        "filterSurveyor",
        "🧑‍💼 All Surveyors",
        surveyorValues
    );

}


// ======================================================
// APPLY FILTER
// ======================================================

function applySurveyFilter() {

    const name =
        document.getElementById("filterName")?.value || "";

    const mobile =
        document.getElementById("filterMobile")?.value || "";

    const village =
        document.getElementById("filterVillage")?.value || "";

    const surveyor =
        document.getElementById("filterSurveyor")?.value || "";

    const dateFilter =
        document.getElementById("filterDate")?.value || "";


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


            if (surveyor) {

                if (
                    String(
                        survey.surveyorEmail || ""
                    ).toLowerCase() !==
                    surveyor.toLowerCase()
                ) {
                    return false;
                }

            }


            const date =
                getDate(survey.createdAt);


            if (dateFilter === "today") {

                if (!isToday(date)) {
                    return false;
                }

            }


            if (dateFilter === "week") {

                if (!isThisWeek(date)) {
                    return false;
                }

            }


            if (dateFilter === "month") {

                if (!isThisMonth(date)) {
                    return false;
                }

            }


            return true;

        });


    renderSurveyRecords(
        filteredSurveys
    );

}


// ======================================================
// CLEAR FILTER
// ======================================================

function clearSurveyFilter() {

    const ids = [

        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor",
        "filterDate"

    ];


    ids.forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });


    filteredSurveys =
        allSurveys.slice();


    renderSurveyRecords(
        filteredSurveys
    );

}


// FILTER BUTTONS

document.addEventListener("DOMContentLoaded", function () {

    const apply =
        document.getElementById(
            "applySurveyFilter"
        );

    const clear =
        document.getElementById(
            "clearSurveyFilter"
        );


    if (apply) {

        apply.addEventListener(
            "click",
            applySurveyFilter
        );

    }


    if (clear) {

        clear.addEventListener(
            "click",
            clearSurveyFilter
        );

    }

});


// ======================================================
// SURVEY RECORD TABLE
// PARTY / CANDIDATE / FEEDBACK / SURVEYOR / ACTION
// ARE NOT SHOWN
// ======================================================

function renderSurveyRecords(surveys) {

    const table =
        document.getElementById("surveyTable");

    if (!table) return;


    table.innerHTML = "";


    surveys.forEach(function (survey) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

<td>${escapeHTML(survey.name)}</td>

<td>${escapeHTML(survey.mobile)}</td>

<td>${escapeHTML(survey.age)}</td>

<td>${escapeHTML(survey.gender)}</td>

<td>${escapeHTML(survey.village)}</td>

<td>

<button
class="purple action-btn"
type="button">
📋 Answers
</button>

<button
class="primary action-btn"
type="button">
✏️ Edit
</button>

<button
class="danger action-btn"
type="button">
🗑️ Delete
</button>

</td>

`;


        const buttons =
            row.querySelectorAll("button");


        buttons[0].addEventListener(
            "click",
            function () {
                showAnswers(survey);
            }
        );


        buttons[1].addEventListener(
            "click",
            function () {
                editSurvey(survey.id);
            }
        );


        buttons[2].addEventListener(
            "click",
            function () {
                deleteSurvey(survey.id);
            }
        );


        table.appendChild(row);

    });


    const count =
        document.getElementById(
            "filterResultCount"
        );


    if (count) {

        count.textContent =
            "Showing: " +
            surveys.length +
            " / " +
            allSurveys.length;

    }

}


// ======================================================
// ANSWERS
// ======================================================

function showAnswers(survey) {

    const modal =
        document.getElementById("answerModal");

    const body =
        document.getElementById("answerModalBody");


    if (!modal || !body) return;


    body.innerHTML = "";


    const respondent =
        document.createElement("div");

    respondent.className = "respondent";


    respondent.innerHTML = `

<h3>👤 Respondent Details</h3>

<div class="respondent-grid">

<div>
<strong>Name</strong><br>
${escapeHTML(survey.name)}
</div>

<div>
<strong>Mobile</strong><br>
${escapeHTML(survey.mobile)}
</div>

<div>
<strong>Age</strong><br>
${escapeHTML(survey.age)}
</div>

<div>
<strong>Gender</strong><br>
${escapeHTML(survey.gender)}
</div>

<div>
<strong>Village</strong><br>
${escapeHTML(survey.village)}
</div>

</div>

`;


    body.appendChild(respondent);


    const answers =
        survey.answers ||
        survey.responses ||
        survey.questions ||
        {};


    if (
        Array.isArray(answers) &&
        answers.length > 0
    ) {

        answers.forEach(function (item, index) {

            const question =
                item.question ||
                item.questionText ||
                ("Question " + (index + 1));


            const answer =
                item.answer ||
                item.value ||
                item.response ||
                "";


            addAnswerItem(
                body,
                question,
                answer
            );

        });

    } else if (
        answers &&
        typeof answers === "object" &&
        !Array.isArray(answers)
    ) {

        Object.keys(answers).forEach(function (key) {

            addAnswerItem(
                body,
                key,
                answers[key]
            );

        });

    } else {

        const message =
            document.createElement("p");

        message.textContent =
            "No answers found for this survey.";

        body.appendChild(message);

    }


    modal.classList.add("show");

}


function addAnswerItem(container, question, answer) {

    const item =
        document.createElement("div");

    item.className = "answer-item";


    const q =
        document.createElement("div");

    q.className = "answer-question";

    q.textContent =
        question;


    const a =
        document.createElement("div");

    a.className = "answer-value";

    a.textContent =
        Array.isArray(answer)
            ? answer.join(", ")
            : String(answer);


    item.appendChild(q);
    item.appendChild(a);

    container.appendChild(item);

}


// CLOSE ANSWERS

document.addEventListener("DOMContentLoaded", function () {

    const close =
        document.getElementById(
            "closeAnswerModal"
        );


    const modal =
        document.getElementById(
            "answerModal"
        );


    if (close && modal) {

        close.addEventListener(
            "click",
            function () {

                modal.classList.remove("show");

            }
        );


        modal.addEventListener(
            "click",
            function (event) {

                if (event.target === modal) {

                    modal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }

});


// ======================================================
// EDIT SURVEY
// ======================================================

function editSurvey(id) {

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

}


// ======================================================
// DELETE SINGLE SURVEY
// ======================================================

function deleteSurvey(id) {

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

}


// ======================================================
// DELETE ALL SURVEYS
// ======================================================

function deleteAllSurveys() {

    if (allSurveys.length === 0) {

        alert("No surveys to delete.");

        return;
    }


    const confirmed =
        confirm(
            "⚠️ WARNING!\n\n" +
            "This will permanently delete ALL survey records.\n\n" +
            "Do you want to continue?"
        );


    if (!confirmed) return;


    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Deleting...";

    }


    const surveysRef =
        db.collection("surveys");


    surveysRef
    .get()

    .then(async function (snapshot) {

        const docs = snapshot.docs;


        for (
            let i = 0;
            i < docs.length;
            i += 450
        ) {

            const batch =
                db.batch();


            const chunk =
                docs.slice(
                    i,
                    i + 450
                );


            chunk.forEach(function (doc) {

                batch.delete(doc.ref);

            });


            await batch.commit();

        }


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


document.addEventListener("DOMContentLoaded", function () {

    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );


    if (button) {

        button.addEventListener(
            "click",
            deleteAllSurveys
        );

    }

});


// ======================================================
// SURVEYOR MANAGEMENT
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

        populateFilterDropdowns();

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


    if (allSurveyors.length === 0) {

        table.innerHTML = `

<tr>
<td colspan="6">
No surveyors found.
</td>
</tr>

`;

        return;
    }


    allSurveyors.forEach(function (surveyor) {

        const surveyorId =
            surveyor.email ||
            surveyor.id ||
            "Unknown";


        let total = 0;
        let today = 0;
        let week = 0;
        let month = 0;


        allSurveys.forEach(function (survey) {

            if (
                String(
                    survey.surveyorEmail || ""
                ).toLowerCase() !==
                String(
                    surveyorId
                ).toLowerCase()
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

<td>${escapeHTML(surveyorId)}</td>

<td>${total}</td>

<td>${today}</td>

<td>${week}</td>

<td>${month}</td>

<td>

${
    enabled

    ? `

<span style="
color:green;
font-weight:bold;
">
🟢 Active
</span>

<button
class="warning"
type="button">
Disable
</button>

`

    : `

<span style="
color:red;
font-weight:bold;
">
🔴 Disabled
</span>

<button
class="success"
type="button">
Enable
</button>

`
}

</td>

`;


        const statusButton =
            row.querySelector("button");


        if (statusButton) {

            statusButton.addEventListener(
                "click",
                function () {

                    toggleSurveyor(
                        surveyorId,
                        !enabled
                    );

                }
            );

        }


        table.appendChild(row);

    });

}


// ======================================================
// ENABLE / DISABLE SURVEYOR
// ======================================================

function toggleSurveyor(email, enabled) {

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

}


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
            firebase.firestore
            .FieldValue
            .serverTimestamp()

    }, {

        merge: true

    })

    .then(function () {

        if (message) {

            message.textContent =
                "✅ Limit saved: " +
                limit;

            message.style.color =
                "green";

        }

        alert(
            "Daily survey limit saved: " +
            limit
        );

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

    });

}


document.addEventListener("DOMContentLoaded", function () {

    const button =
        document.getElementById(
            "saveDailyLimit"
        );


    if (button) {

        button.addEventListener(
            "click",
            saveDailyLimit
        );

    }

});


// ======================================================
// LOGOUT
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    const logout =
        document.getElementById(
            "logoutBtn"
        );


    if (logout) {

        logout.addEventListener(
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

                    alert(
                        "Logout failed: " +
                        error.message
                    );

                });

            }
        );

    }

});


// ======================================================
// INITIALIZE
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    initializeQuestionBuilder();

    console.log(
        "Admin dashboard initialized successfully."
    );

});
