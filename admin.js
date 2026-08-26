console.log("Admin JS Loaded - FINAL FIXED VERSION");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];

let editingQuestionId = null;


// ==========================================
// ADMIN AUTH
// ==========================================

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


// ==========================================
// DATE HELPERS
// ==========================================

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


// ==========================================
// SURVEYOR EMAIL HELPER
// ==========================================

function getSurveyorEmail(survey) {

    if (!survey) return "";

    return String(
        survey.surveyorEmail ||
        survey.surveyor ||
        survey.surveyor_email ||
        survey.surveyorId ||
        survey.surveyorID ||
        survey.createdBy ||
        ""
    ).trim();
}


// ==========================================
// QUESTION MANAGER HIDE / SHOW
// ==========================================

function setupQuestionManagerToggle() {

    const toggle =
        document.getElementById("questionManagerToggle");

    const body =
        document.getElementById("questionManagerBody");

    if (!toggle || !body) return;

    toggle.onclick = function () {

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

    };
}


// ==========================================
// QUESTION BUILDER
// ==========================================

function createOptionInput(value = "") {

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


    remove.onclick = function () {
        row.remove();
    };


    row.appendChild(input);
    row.appendChild(remove);


    const container =
        document.getElementById("optionsContainer");

    if (container) {
        container.appendChild(row);
    }
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


    const text =
        textElement.value.trim();

    const type =
        typeElement.value;


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


// ==========================================
// LOAD QUESTIONS
// ==========================================

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


        const count =
            document.getElementById("questionCount");

        if (count) {
            count.textContent =
                allQuestions.length;
        }


        renderQuestions();

    })

    .catch(function (error) {

        console.warn(
            "Question orderBy failed. Loading without order.",
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


            const count =
                document.getElementById("questionCount");

            if (count) {
                count.textContent =
                    allQuestions.length;
            }


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


// ==========================================
// RENDER QUESTIONS
// ==========================================

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


// ==========================================
// EDIT QUESTION
// ==========================================

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

    if (!text || !type || !container) return;


    text.value =
        question.question || "";


    type.value =
        question.type || "single";


    container.innerHTML = "";


    (question.options || [])
    .forEach(function (option) {
        createOptionInput(option);
    });


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


    const body =
        document.getElementById("questionManagerBody");

    const toggle =
        document.getElementById("questionManagerToggle");


    if (body) {
        body.style.display = "block";
    }

    if (toggle) {
        toggle.textContent = "🙈 Hide";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ==========================================
// DELETE QUESTION
// ==========================================

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


// ==========================================
// CANCEL QUESTION EDIT
// ==========================================

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

    const cancel =
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


    if (cancel) {
        cancel.style.display =
            "none";
    }

}


// ==========================================
// QUESTION MESSAGE
// ==========================================

function showQuestionMessage(text, success) {

    const message =
        document.getElementById("questionMessage");

    if (!message) return;

    message.textContent = text;

    message.style.color =
        success ? "green" : "red";

}


// ==========================================
// LOAD SURVEYS
// ==========================================

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

        populateFilterDropdowns();

        applySurveyFilter();


        // IMPORTANT FIX:
        // Surveyors may load before surveys.
        // Re-render surveyor statistics AFTER
        // surveys are loaded.

        renderSurveyorManagement();

    })

    .catch(function (error) {

        console.error(
            "Survey load error:",
            error
        );

    });

}


// ==========================================
// DASHBOARD
// ==========================================

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


// ==========================================
// LOAD SURVEYORS
// ==========================================

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

    })

    .catch(function (error) {

        console.error(
            "Surveyor load error:",
            error
        );

    });

}


// ==========================================
// SURVEYOR MANAGEMENT
// ==========================================

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

        const email =
            String(
                surveyor.email ||
                surveyor.surveyorEmail ||
                surveyor.id ||
                ""
            ).trim();


        let total = 0;
        let today = 0;
        let week = 0;
        let month = 0;


        allSurveys.forEach(function (survey) {

            const surveyorEmail =
                getSurveyorEmail(survey);


            if (
                !surveyorEmail ||
                !email ||
                surveyorEmail.toLowerCase() !==
                email.toLowerCase()
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
<span style="
color:green;
font-weight:bold;
">
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
<span style="
color:red;
font-weight:bold;
">
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


// ==========================================
// ENABLE / DISABLE SURVEYOR
// ==========================================

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


// ==========================================
// FILTER DROPDOWNS
// ==========================================

function addUniqueOptions(
    selectId,
    values,
    firstText
) {

    const select =
        document.getElementById(selectId);

    if (!select) return;


    select.innerHTML =
        `<option value="">${firstText}</option>`;


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


    unique.forEach(function (value) {

        const option =
            document.createElement("option");

        option.value = value;

        option.textContent = value;

        select.appendChild(option);

    });

}


function populateFilterDropdowns() {

    const names =
        allSurveys.map(function (survey) {
            return survey.name;
        });


    const mobiles =
        allSurveys.map(function (survey) {
            return survey.mobile;
        });


    const villages =
        allSurveys.map(function (survey) {
            return survey.village;
        });


    const surveyors =
        allSurveys.map(function (survey) {
            return getSurveyorEmail(survey);
        });


    addUniqueOptions(
        "filterName",
        names,
        "👤 All Names"
    );


    addUniqueOptions(
        "filterMobile",
        mobiles,
        "📱 All Mobiles"
    );


    addUniqueOptions(
        "filterVillage",
        villages,
        "🏠 All Villages"
    );


    addUniqueOptions(
        "filterSurveyor",
        surveyors,
        "🧑‍💼 All Surveyors"
    );

}


// ==========================================
// APPLY FILTER
// ==========================================

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


    const filtered =
        allSurveys.filter(function (survey) {

            if (
                name &&
                String(survey.name || "").trim() !== name
            ) {
                return false;
            }


            if (
                mobile &&
                String(survey.mobile || "").trim() !== mobile
            ) {
                return false;
            }


            if (
                village &&
                String(survey.village || "").trim() !== village
            ) {
                return false;
            }


            if (
                surveyor &&
                getSurveyorEmail(survey).toLowerCase() !==
                surveyor.toLowerCase()
            ) {
                return false;
            }


            if (dateFilter) {

                const date =
                    getDate(survey.createdAt);


                if (dateFilter === "today" &&
                    !isToday(date)) {

                    return false;
                }


                if (dateFilter === "week" &&
                    !isThisWeek(date)) {

                    return false;
                }


                if (dateFilter === "month" &&
                    !isThisMonth(date)) {

                    return false;
                }

            }


            return true;

        });


    renderSurveyRecords(filtered);


    const result =
        document.getElementById(
            "filterResultCount"
        );


    if (result) {

        result.textContent =
            "Showing: " +
            filtered.length +
            " / " +
            allSurveys.length;

    }

}


document
.getElementById("applySurveyFilter")
?.addEventListener(
    "click",
    applySurveyFilter
);


// ==========================================
// CLEAR FILTER
// ==========================================

function clearSurveyFilter() {

    [
        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor"
    ]
    .forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });


    const date =
        document.getElementById("filterDate");

    if (date) {
        date.value = "";
    }


    applySurveyFilter();

}


document
.getElementById("clearSurveyFilter")
?.addEventListener(
    "click",
    clearSurveyFilter
);


// ==========================================
// RENDER SURVEY RECORDS
// ==========================================

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
onclick="showSurveyAnswers('${survey.id}')">
📋 Answers
</button>

<button
class="primary action-btn"
onclick="editSurvey('${survey.id}')">
✏️ Edit
</button>

<button
class="danger action-btn"
onclick="deleteSurvey('${survey.id}')">
🗑️ Delete
</button>

</td>

`;


        table.appendChild(row);

    });

}


// ==========================================
// EDIT SURVEY
// ==========================================

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


    const village =
        prompt(
            "Village:",
            survey.village || ""
        );

    if (village === null) return;


    const gender =
        prompt(
            "Gender:",
            survey.gender || ""
        );

    if (gender === null) return;


    db.collection("surveys")
    .doc(id)
    .update({

        name: name.trim(),

        mobile: mobile.trim(),

        age: age.trim(),

        village: village.trim(),

        gender: gender.trim()

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


// ==========================================
// DELETE SURVEY
// ==========================================

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


// ==========================================
// DELETE ALL SURVEYS
// ==========================================

document
.getElementById("deleteAllSurveysBtn")
?.addEventListener(
    "click",
    function () {

        if (allSurveys.length === 0) {

            alert("No surveys to delete.");

            return;

        }


        const confirmDelete =
            confirm(
                "⚠️ WARNING!\n\n" +
                "This will permanently delete ALL " +
                allSurveys.length +
                " survey records.\n\n" +
                "Do you want to continue?"
            );


        if (!confirmDelete) return;


        const button =
            document.getElementById(
                "deleteAllSurveysBtn"
            );


        if (button) {

            button.disabled = true;

            button.textContent =
                "Deleting...";

        }


        const batch =
            db.batch();


        allSurveys.forEach(function (survey) {

            const ref =
                db.collection("surveys")
                .doc(survey.id);

            batch.delete(ref);

        });


        batch.commit()

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
);


// ==========================================
// ANSWERS MODAL
// ==========================================

window.showSurveyAnswers =
function (id) {

    const survey =
        allSurveys.find(function (item) {
            return item.id === id;
        });


    if (!survey) return;


    const modal =
        document.getElementById("answerModal");

    const body =
        document.getElementById("answerModalBody");


    if (!modal || !body) return;


    body.innerHTML = "";


    const respondent =
        document.createElement("div");

    respondent.className =
        "respondent";


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


    const excludedFields = [

        "id",
        "name",
        "mobile",
        "age",
        "gender",
        "village",
        "createdAt",
        "updatedAt",
        "timestamp",
        "surveyDate",
        "surveyorEmail",
        "surveyor",
        "surveyorId",
        "surveyorID",
        "createdBy"

    ];


    const answerEntries = [];


    Object.keys(survey).forEach(function (key) {

        if (
            excludedFields.includes(key)
        ) {
            return;
        }


        const value =
            survey[key];


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return;
        }


        let displayValue;


        if (Array.isArray(value)) {

            displayValue =
                value.join(", ");

        } else if (
            typeof value === "object"
        ) {

            try {

                displayValue =
                    JSON.stringify(value);

            } catch (error) {

                displayValue =
                    String(value);

            }

        } else {

            displayValue =
                String(value);

        }


        answerEntries.push({

            key: key,

            value: displayValue

        });

    });


    if (answerEntries.length === 0) {

        const noAnswer =
            document.createElement("p");

        noAnswer.textContent =
            "No additional answers found.";

        body.appendChild(noAnswer);

    } else {

        answerEntries.forEach(function (item) {

            const answer =
                document.createElement("div");

            answer.className =
                "answer-item";


            const question =
                document.createElement("div");

            question.className =
                "answer-question";


            question.textContent =
                formatQuestionLabel(item.key);


            const value =
                document.createElement("div");

            value.className =
                "answer-value";


            value.textContent =
                item.value;


            answer.appendChild(question);

            answer.appendChild(value);

            body.appendChild(answer);

        });

    }


    modal.classList.add("show");

};


// ==========================================
// FORMAT ANSWER LABEL
// ==========================================

function formatQuestionLabel(key) {

    let label =
        String(key)
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2");


    label =
        label.charAt(0).toUpperCase() +
        label.slice(1);


    return label;

}


// ==========================================
// CLOSE ANSWER MODAL
// ==========================================

document
.getElementById("closeAnswerModal")
?.addEventListener(
    "click",
    function () {

        const modal =
            document.getElementById(
                "answerModal"
            );

        if (modal) {
            modal.classList.remove("show");
        }

    }
);


document
.getElementById("answerModal")
?.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            document.getElementById("answerModal")
        ) {

            event.target.classList.remove(
                "show"
            );

        }

    }
);


// ==========================================
// DAILY LIMIT
// ==========================================

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

        console.error(
            "Daily limit save error:",
            error
        );


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


// ==========================================
// LOGOUT
// ==========================================

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

        })

        .catch(function (error) {

            console.error(
                "Logout error:",
                error
            );

        });

    }
);


// ==========================================
// START
// ==========================================

initializeQuestionBuilder();

setupQuestionManagerToggle();

console.log(
    "Admin JS initialized successfully."
);
