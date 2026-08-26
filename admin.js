console.log("Admin JS Loaded - UPDATED VERSION");

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

.then(function(){

    firebase.auth().onAuthStateChanged(function(user){

        if(!user){
            window.location.replace("index.html");
            return;
        }

        if(
            !user.email ||
            user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
        ){
            window.location.replace("survey.html");
            return;
        }

        console.log("Admin logged in:", user.email);

        loadDailyLimit();
        loadQuestions();
        loadSurveyors();
        loadSurveys();

        setupAdminControls();

    });

})

.catch(function(error){
    console.error("Auth error:", error);
});


// ==========================================
// ADMIN CONTROLS
// ==========================================

function setupAdminControls(){

    // Question manager hide/show
    const questionManager = document.getElementById("questionManager");

    if(questionManager){

        let toggleButton = document.getElementById("toggleQuestionManager");

        if(!toggleButton){

            toggleButton = document.createElement("button");

            toggleButton.id = "toggleQuestionManager";
            toggleButton.className = "primary";
            toggleButton.textContent = "👁️ Hide Question Manager";

            toggleButton.style.marginBottom = "15px";

            questionManager.parentNode.insertBefore(
                toggleButton,
                questionManager
            );

        }

        toggleButton.onclick = function(){

            if(questionManager.style.display === "none"){

                questionManager.style.display = "block";

                toggleButton.textContent =
                    "👁️ Hide Question Manager";

            }
            else{

                questionManager.style.display = "none";

                toggleButton.textContent =
                    "👁️ Show Question Manager";

            }

        };

    }

    // Delete all button
    createDeleteAllButton();

    // Filter UI
    createSurveyFilterUI();
}


// ==========================================
// DATE HELPER
// ==========================================

function getDate(value){

    if(!value) return null;

    try{

        if(typeof value.toDate === "function"){
            return value.toDate();
        }

        if(value.seconds !== undefined){
            return new Date(value.seconds * 1000);
        }

        const date = new Date(value);

        return isNaN(date.getTime()) ? null : date;

    }
    catch(error){
        return null;
    }
}


function isToday(date){

    if(!date) return false;

    const now = new Date();

    return(
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}


function isThisWeek(date){

    if(!date) return false;

    const now = new Date();

    const start = new Date(now);

    const day = start.getDay();

    const diff = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - diff);

    start.setHours(0,0,0,0);

    return date >= start;
}


function isThisMonth(date){

    if(!date) return false;

    const now = new Date();

    return(
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}


function escapeHTML(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}


// ==========================================
// QUESTION BUILDER
// ==========================================

function createOptionInput(value = ""){

    const container =
        document.getElementById("optionsContainer");

    if(!container) return;

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

    remove.onclick = function(){
        row.remove();
    };

    row.appendChild(input);
    row.appendChild(remove);

    container.appendChild(row);
}


function initializeQuestionBuilder(){

    const container =
        document.getElementById("optionsContainer");

    if(!container) return;

    container.innerHTML = "";

    createOptionInput();
    createOptionInput();
}


// ADD OPTION

document
.getElementById("addOption")
?.addEventListener("click",function(){

    createOptionInput();

});


// SAVE QUESTION

document
.getElementById("saveQuestion")
?.addEventListener("click",function(){

    const textElement =
        document.getElementById("questionText");

    const typeElement =
        document.getElementById("questionType");

    if(!textElement || !typeElement) return;

    const text = textElement.value.trim();

    const type = typeElement.value;

    if(!text){

        showQuestionMessage(
            "Please enter question.",
            false
        );

        return;
    }

    const optionInputs =
        document.querySelectorAll(".question-option");

    const options = [];

    optionInputs.forEach(function(input){

        const value = input.value.trim();

        if(value){
            options.push(value);
        }

    });

    if(options.length < 2){

        showQuestionMessage(
            "Please add at least 2 options.",
            false
        );

        return;
    }

    const questionData = {

        question:text,

        type:type,

        options:options,

        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()

    };

    const saveButton =
        document.getElementById("saveQuestion");

    if(saveButton){

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

    }

    let promise;

    if(editingQuestionId){

        promise =
            db.collection("questions")
            .doc(editingQuestionId)
            .update(questionData);

    }
    else{

        questionData.createdAt =
            firebase.firestore.FieldValue.serverTimestamp();

        promise =
            db.collection("questions")
            .add(questionData);

    }

    promise

    .then(function(){

        showQuestionMessage(
            editingQuestionId
            ? "Question updated successfully."
            : "Question added successfully.",
            true
        );

        resetQuestionBuilder();

        loadQuestions();

    })

    .catch(function(error){

        console.error(
            "Question save error:",
            error
        );

        showQuestionMessage(
            "Error: " + error.message,
            false
        );

    })

    .finally(function(){

        if(saveButton){

            saveButton.disabled = false;

            saveButton.textContent =
                "💾 Save Question";

        }

    });

});


// ==========================================
// LOAD QUESTIONS
// ==========================================

function loadQuestions(){

    db.collection("questions")
    .orderBy("createdAt","asc")
    .get()

    .then(function(snapshot){

        allQuestions = [];

        snapshot.forEach(function(doc){

            allQuestions.push({

                id:doc.id,

                ...doc.data()

            });

        });

        const count =
            document.getElementById("questionCount");

        if(count){
            count.textContent = allQuestions.length;
        }

        renderQuestions();

    })

    .catch(function(error){

        console.warn(
            "Ordered question loading failed:",
            error
        );

        db.collection("questions")
        .get()

        .then(function(snapshot){

            allQuestions = [];

            snapshot.forEach(function(doc){

                allQuestions.push({

                    id:doc.id,

                    ...doc.data()

                });

            });

            const count =
                document.getElementById("questionCount");

            if(count){
                count.textContent = allQuestions.length;
            }

            renderQuestions();

        })

        .catch(function(error2){

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

function renderQuestions(){

    const container =
        document.getElementById("questionsList");

    if(!container) return;

    container.innerHTML = "";

    if(allQuestions.length === 0){

        container.innerHTML =
            "<p>No questions added yet.</p>";

        return;
    }

    allQuestions.forEach(function(question,index){

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

        (question.options || [])
        .forEach(function(option){

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

        edit.onclick = function(){

            editQuestion(question.id);

        };

        const del =
            document.createElement("button");

        del.className = "danger";

        del.textContent = "🗑️ Delete";

        del.onclick = function(){

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

function editQuestion(id){

    const question =
        allQuestions.find(function(item){

            return item.id === id;

        });

    if(!question) return;

    editingQuestionId = id;

    const questionText =
        document.getElementById("questionText");

    const questionType =
        document.getElementById("questionType");

    const container =
        document.getElementById("optionsContainer");

    if(questionText){
        questionText.value =
            question.question || "";
    }

    if(questionType){
        questionType.value =
            question.type || "single";
    }

    if(container){

        container.innerHTML = "";

        (question.options || [])
        .forEach(function(option){

            createOptionInput(option);

        });

    }

    const saveButton =
        document.getElementById("saveQuestion");

    if(saveButton){
        saveButton.textContent =
            "💾 Update Question";
    }

    const cancelButton =
        document.getElementById("cancelEdit");

    if(cancelButton){
        cancelButton.style.display =
            "inline-block";
    }

    const manager =
        document.getElementById("questionManager");

    if(manager){
        manager.style.display = "block";
    }

    const toggleButton =
        document.getElementById("toggleQuestionManager");

    if(toggleButton){
        toggleButton.textContent =
            "👁️ Hide Question Manager";
    }

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

}


// ==========================================
// DELETE QUESTION
// ==========================================

function deleteQuestion(id){

    if(!confirm(
        "Are you sure you want to delete this question?"
    )){
        return;
    }

    db.collection("questions")
    .doc(id)
    .delete()

    .then(function(){

        alert(
            "Question deleted successfully."
        );

        loadQuestions();

    })

    .catch(function(error){

        alert(
            "Delete failed: " +
            error.message
        );

    });

}


// ==========================================
// CANCEL EDIT
// ==========================================

document
.getElementById("cancelEdit")
?.addEventListener("click",function(){

    resetQuestionBuilder();

});


function resetQuestionBuilder(){

    editingQuestionId = null;

    const questionText =
        document.getElementById("questionText");

    const questionType =
        document.getElementById("questionType");

    const container =
        document.getElementById("optionsContainer");

    const saveButton =
        document.getElementById("saveQuestion");

    const cancelButton =
        document.getElementById("cancelEdit");

    if(questionText){
        questionText.value = "";
    }

    if(questionType){
        questionType.value = "single";
    }

    if(container){

        container.innerHTML = "";

        createOptionInput();
        createOptionInput();

    }

    if(saveButton){

        saveButton.textContent =
            "💾 Save Question";

    }

    if(cancelButton){

        cancelButton.style.display =
            "none";

    }

}


// ==========================================
// QUESTION MESSAGE
// ==========================================

function showQuestionMessage(text,success){

    const message =
        document.getElementById("questionMessage");

    if(!message) return;

    message.textContent = text;

    message.style.color =
        success ? "green" : "red";

}


// ==========================================
// SURVEYS
// ==========================================

function loadSurveys(){

    db.collection("surveys")
    .get()

    .then(function(snapshot){

        allSurveys = [];

        snapshot.forEach(function(doc){

            allSurveys.push({

                id:doc.id,

                ...doc.data()

            });

        });

        allSurveys.sort(function(a,b){

            const dateA = getDate(a.createdAt);
            const dateB = getDate(b.createdAt);

            if(!dateA && !dateB) return 0;
            if(!dateA) return 1;
            if(!dateB) return -1;

            return dateB - dateA;

        });

        updateDashboard();

        renderSurveyRecords();

        renderSurveyorManagement();

    })

    .catch(function(error){

        console.error(
            "Survey load error:",
            error
        );

    });

}


// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard(){

    let today = 0;
    let week = 0;
    let month = 0;

    allSurveys.forEach(function(survey){

        const date =
            getDate(survey.createdAt);

        if(isToday(date)) today++;

        if(isThisWeek(date)) week++;

        if(isThisMonth(date)) month++;

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


// ==========================================
// FILTER UI
// ==========================================

function createSurveyFilterUI(){

    const table =
        document.getElementById("surveyTable");

    if(!table) return;

    const existing =
        document.getElementById("surveyFilterBox");

    if(existing) return;

    const box =
        document.createElement("div");

    box.id = "surveyFilterBox";

    box.style.cssText =
        "background:#fff;border:1px solid #ddd;border-radius:12px;padding:15px;margin:15px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center;";

    box.innerHTML = `

<input
id="filterName"
type="text"
placeholder="🔎 Name"
style="padding:10px;border:1px solid #ccc;border-radius:7px;"
>

<input
id="filterMobile"
type="text"
placeholder="📱 Mobile"
style="padding:10px;border:1px solid #ccc;border-radius:7px;"
>

<input
id="filterVillage"
type="text"
placeholder="🏠 Village"
style="padding:10px;border:1px solid #ccc;border-radius:7px;"
>

<input
id="filterSurveyor"
type="text"
placeholder="👤 Surveyor Email"
style="padding:10px;border:1px solid #ccc;border-radius:7px;"
>

<select
id="filterDate"
style="padding:10px;border:1px solid #ccc;border-radius:7px;"
>

<option value="all">📅 All Dates</option>
<option value="today">Today</option>
<option value="week">This Week</option>
<option value="month">This Month</option>

</select>

<button
id="applySurveyFilter"
class="primary"
>
🔍 Filter
</button>

<button
id="clearSurveyFilter"
class="warning"
>
✖ Clear
</button>

<span
id="filterResultCount"
style="font-weight:bold;"
></span>

`;

    const parent =
        table.parentElement;

    if(parent){

        parent.insertBefore(
            box,
            table
        );

    }

    document
    .getElementById("applySurveyFilter")
    ?.addEventListener(
        "click",
        applySurveyFilter
    );

    document
    .getElementById("clearSurveyFilter")
    ?.addEventListener(
        "click",
        clearSurveyFilter
    );

    updateFilterResultCount(allSurveys.length);

}


// ==========================================
// APPLY FILTER
// ==========================================

function applySurveyFilter(){

    const name =
        getInputValue("filterName").toLowerCase();

    const mobile =
        getInputValue("filterMobile").toLowerCase();

    const village =
        getInputValue("filterVillage").toLowerCase();

    const surveyor =
        getInputValue("filterSurveyor").toLowerCase();

    const dateFilter =
        getInputValue("filterDate");

    const filtered =
        allSurveys.filter(function(survey){

            const surveyName =
                String(survey.name || "").toLowerCase();

            const surveyMobile =
                String(survey.mobile || "").toLowerCase();

            const surveyVillage =
                String(survey.village || "").toLowerCase();

            const surveyorEmail =
                String(survey.surveyorEmail || "").toLowerCase();

            const date =
                getDate(survey.createdAt);

            if(
                name &&
                !surveyName.includes(name)
            ){
                return false;
            }

            if(
                mobile &&
                !surveyMobile.includes(mobile)
            ){
                return false;
            }

            if(
                village &&
                !surveyVillage.includes(village)
            ){
                return false;
            }

            if(
                surveyor &&
                !surveyorEmail.includes(surveyor)
            ){
                return false;
            }

            if(dateFilter === "today" && !isToday(date)){
                return false;
            }

            if(dateFilter === "week" && !isThisWeek(date)){
                return false;
            }

            if(dateFilter === "month" && !isThisMonth(date)){
                return false;
            }

            return true;

        });

    renderFilteredSurveyRecords(filtered);

    updateFilterResultCount(filtered.length);

}


// ==========================================
// CLEAR FILTER
// ==========================================

function clearSurveyFilter(){

    [
        "filterName",
        "filterMobile",
        "filterVillage",
        "filterSurveyor"
    ].forEach(function(id){

        const input =
            document.getElementById(id);

        if(input){
            input.value = "";
        }

    });

    const date =
        document.getElementById("filterDate");

    if(date){
        date.value = "all";
    }

    renderSurveyRecords();

    updateFilterResultCount(
        allSurveys.length
    );

}


// ==========================================
// FILTERED RECORDS
// ==========================================

function renderFilteredSurveyRecords(filtered){

    renderSurveyRows(filtered);

}


// ==========================================
// RENDER SURVEY RECORDS
// ==========================================

function renderSurveyRecords(){

    renderSurveyRows(allSurveys);

    updateFilterResultCount(
        allSurveys.length
    );

}


function renderSurveyRows(surveys){

    const table =
        document.getElementById("surveyTable");

    if(!table) return;

    table.innerHTML = "";

    if(surveys.length === 0){

        const row =
            document.createElement("tr");

        row.innerHTML =
            `<td colspan="9" style="text-align:center;padding:20px;">
                No survey records found.
            </td>`;

        table.appendChild(row);

        return;
    }

    surveys.forEach(function(survey){

        const row =
            document.createElement("tr");

        row.innerHTML = `

<td>${escapeHTML(survey.name)}</td>

<td>${escapeHTML(survey.mobile)}</td>

<td>${escapeHTML(survey.age)}</td>

<td>${escapeHTML(survey.gender)}</td>

<td>${escapeHTML(survey.village)}</td>

<td>${escapeHTML(survey.district)}</td>

<td>${escapeHTML(survey.surveyorEmail)}</td>

<td>
${formatDateTime(survey.createdAt)}
</td>

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

}


function formatDateTime(value){

    const date = getDate(value);

    if(!date) return "";

    return date.toLocaleString(
        "en-IN",
        {
            dateStyle:"short",
            timeStyle:"short"
        }
    );

}


// ==========================================
// EDIT SURVEY
// ==========================================

window.editSurvey = function(id){

    const survey =
        allSurveys.find(function(item){

            return item.id === id;

        });

    if(!survey) return;

    const name =
        prompt(
            "Name:",
            survey.name || ""
        );

    if(name === null) return;

    const mobile =
        prompt(
            "Mobile:",
            survey.mobile || ""
        );

    if(mobile === null) return;

    const age =
        prompt(
            "Age:",
            survey.age || ""
        );

    if(age === null) return;

    const gender =
        prompt(
            "Gender:",
            survey.gender || ""
        );

    if(gender === null) return;

    const village =
        prompt(
            "Village:",
            survey.village || ""
        );

    if(village === null) return;

    const district =
        prompt(
            "District:",
            survey.district || ""
        );

    if(district === null) return;

    const pincode =
        prompt(
            "PIN Code:",
            survey.pincode || ""
        );

    if(pincode === null) return;

    db.collection("surveys")
    .doc(id)
    .update({

        name:name.trim(),

        mobile:mobile.trim(),

        age:Number(age),

        gender:gender.trim(),

        village:village.trim(),

        district:district.trim(),

        pincode:pincode.trim()

    })

    .then(function(){

        alert(
            "Survey updated successfully."
        );

        loadSurveys();

    })

    .catch(function(error){

        alert(
            "Update failed: " +
            error.message
        );

    });

};


// ==========================================
// DELETE SINGLE SURVEY
// ==========================================

window.deleteSurvey = function(id){

    if(!confirm(
        "Are you sure you want to delete this survey?"
    )){
        return;
    }

    db.collection("surveys")
    .doc(id)
    .delete()

    .then(function(){

        alert(
            "Survey deleted successfully."
        );

        loadSurveys();

    })

    .catch(function(error){

        alert(
            "Delete failed: " +
            error.message
        );

    });

};


// ==========================================
// DELETE ALL SURVEYS
// ==========================================

function createDeleteAllButton(){

    const table =
        document.getElementById("surveyTable");

    if(!table) return;

    if(document.getElementById("deleteAllSurveysBtn")){
        return;
    }

    const button =
        document.createElement("button");

    button.id =
        "deleteAllSurveysBtn";

    button.className =
        "danger";

    button.textContent =
        "🗑️ Delete All Surveys";

    button.style.cssText =
        "margin:10px 0;padding:10px 15px;font-weight:bold;";

    button.onclick =
        deleteAllSurveys;

    const parent =
        table.parentElement;

    if(parent){

        parent.insertBefore(
            button,
            table
        );

    }

}


function deleteAllSurveys(){

    if(allSurveys.length === 0){

        alert(
            "There are no surveys to delete."
        );

        return;

    }

    const firstConfirm =
        confirm(
            "⚠️ WARNING!\n\n" +
            "This will permanently delete ALL " +
            allSurveys.length +
            " survey records.\n\n" +
            "Do you want to continue?"
        );

    if(!firstConfirm) return;

    const secondConfirm =
        confirm(
            "FINAL CONFIRMATION!\n\n" +
            "All survey data will be permanently deleted.\n\n" +
            "Press OK only if you are absolutely sure."
        );

    if(!secondConfirm) return;

    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );

    if(button){

        button.disabled = true;
        button.textContent =
            "Deleting...";

    }

    deleteSurveysInBatches()

    .then(function(){

        alert(
            "✅ All surveys deleted successfully."
        );

        loadSurveys();

    })

    .catch(function(error){

        console.error(
            "Delete all error:",
            error
        );

        alert(
            "❌ Delete failed: " +
            error.message
        );

    })

    .finally(function(){

        if(button){

            button.disabled = false;

            button.textContent =
                "🗑️ Delete All Surveys";

        }

    });

}


function deleteSurveysInBatches(){

    return db.collection("surveys")
    .get()

    .then(function(snapshot){

        if(snapshot.empty){
            return;
        }

        const batch =
            db.batch();

        snapshot.forEach(function(doc){

            batch.delete(doc.ref);

        });

        return batch.commit();

    })

    .then(function(){

        return db.collection("surveys")
        .get()
        .then(function(snapshot){

            if(snapshot.empty){
                return;
            }

            return deleteSurveysInBatches();

        });

    });

}


// ==========================================
// SURVEYORS
// ==========================================

function loadSurveyors(){

    db.collection("surveyors")
    .get()

    .then(function(snapshot){

        allSurveyors = [];

        snapshot.forEach(function(doc){

            allSurveyors.push({

                id:doc.id,

                ...doc.data()

            });

        });

        renderSurveyorManagement();

    })

    .catch(function(error){

        console.error(
            "Surveyor load error:",
            error
        );

    });

}


function renderSurveyorManagement(){

    const table =
        document.getElementById(
            "surveyorManagementTable"
        );

    if(!table) return;

    table.innerHTML = "";

    allSurveyors.forEach(function(surveyor){

        const email =
            surveyor.email ||
            surveyor.id;

        let total = 0;
        let today = 0;
        let week = 0;
        let month = 0;

        allSurveys.forEach(function(survey){

            if(
                String(
                    survey.surveyorEmail || ""
                ).toLowerCase() !==
                String(email).toLowerCase()
            ){
                return;
            }

            total++;

            const date =
                getDate(
                    survey.createdAt
                );

            if(isToday(date)) today++;

            if(isThisWeek(date)) week++;

            if(isThisMonth(date)) month++;

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


// ==========================================
// ENABLE / DISABLE SURVEYOR
// ==========================================

window.toggleSurveyor =
function(email,enabled){

    db.collection("surveyors")
    .doc(email)
    .update({

        enabled:enabled

    })

    .then(function(){

        alert(
            enabled
            ? "Surveyor enabled."
            : "Surveyor disabled."
        );

        loadSurveyors();

    })

    .catch(function(error){

        alert(
            "Status update failed: " +
            error.message
        );

    });

};


// ==========================================
// DAILY LIMIT
// ==========================================

function loadDailyLimit(){

    const input =
        document.getElementById(
            "dailyLimitInput"
        );

    if(!input) return;

    db.collection("settings")
    .doc("config")
    .get()

    .then(function(doc){

        if(
            doc.exists &&
            doc.data().dailyLimit !== undefined
        ){

            input.value =
                doc.data().dailyLimit;

        }
        else{

            input.value = 20;

        }

    })

    .catch(function(error){

        console.error(
            "Daily limit load error:",
            error
        );

    });

}


function saveDailyLimit(){

    const input =
        document.getElementById(
            "dailyLimitInput"
        );

    const message =
        document.getElementById(
            "limitMessage"
        );

    if(!input) return;

    const limit =
        Number(input.value);

    if(!Number.isFinite(limit) || limit < 1){

        if(message){

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

        dailyLimit:limit,

        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()

    },{
        merge:true
    })

    .then(function(){

        if(message){

            message.textContent =
                "✅ Limit saved: " + limit;

            message.style.color =
                "green";

        }

    })

    .catch(function(error){

        if(message){

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
// FILTER HELPERS
// ==========================================

function getInputValue(id){

    const element =
        document.getElementById(id);

    if(!element) return "";

    return String(
        element.value || ""
    ).trim();

}


function updateFilterResultCount(count){

    const element =
        document.getElementById(
            "filterResultCount"
        );

    if(element){

        element.textContent =
            "Showing: " + count;

    }

}


// ==========================================
// LOGOUT
// ==========================================

document
.getElementById("logoutBtn")
?.addEventListener(
    "click",
    function(){

        firebase.auth()
        .signOut()

        .then(function(){

            window.location.replace(
                "index.html"
            );

        });

    }
);


// ==========================================
// START QUESTION BUILDER
// ==========================================

initializeQuestionBuilder();
