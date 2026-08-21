console.log("Admin JS Loaded");

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
            user.email.toLowerCase() !==
            ADMIN_EMAIL.toLowerCase()
        ){

            window.location.replace("survey.html");
            return;

        }

        console.log("Admin logged in:",user.email);

        loadDailyLimit();
        loadQuestions();
        loadSurveyors();
        loadSurveys();

    });

})

.catch(function(error){

    console.error("Auth error:",error);

});


// ==========================================
// DATE HELPER
// ==========================================

function getDate(value){

    if(!value) return null;

    try{

        if(typeof value.toDate === "function"){
            return value.toDate();
        }

        if(value.seconds){
            return new Date(value.seconds * 1000);
        }

        return new Date(value);

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

    remove.onclick = function(){

        row.remove();

    };


    row.appendChild(input);

    row.appendChild(remove);

    document
        .getElementById("optionsContainer")
        .appendChild(row);

}


function initializeQuestionBuilder(){

    const container =
        document.getElementById(
            "optionsContainer"
        );

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

    const text =
        document
        .getElementById("questionText")
        .value
        .trim();

    const type =
        document
        .getElementById("questionType")
        .value;


    if(!text){

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


    optionInputs.forEach(function(input){

        const value =
            input.value.trim();

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

        question: text,

        type: type,

        options: options,

        updatedAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

    };


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );

    saveButton.disabled = true;

    saveButton.textContent = "Saving...";


    let promise;


    if(editingQuestionId){

        promise =
            db.collection("questions")
            .doc(editingQuestionId)
            .update(questionData);

    }
    else{

        questionData.createdAt =
            firebase.firestore
            .FieldValue
            .serverTimestamp();

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

        saveButton.disabled = false;

        saveButton.textContent =
            "💾 Save Question";

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

                id: doc.id,

                ...doc.data()

            });

        });


        console.log(
            "Questions:",
            allQuestions.length
        );


        const count =
            document.getElementById(
                "questionCount"
            );

        if(count){
            count.textContent =
                allQuestions.length;
        }


        renderQuestions();

    })

    .catch(function(error){

        console.error(
            "Question loading error:",
            error
        );


        /*
         * अगर createdAt index या पुराने
         * documents की वजह से orderBy error आए
         * तो बिना orderBy load करेंगे।
         */

        db.collection("questions")
        .get()

        .then(function(snapshot){

            allQuestions = [];

            snapshot.forEach(function(doc){

                allQuestions.push({

                    id: doc.id,

                    ...doc.data()

                });

            });

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
        document.getElementById(
            "questionsList"
        );

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
        .forEach(function(option){

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


    document
    .getElementById("questionText")
    .value =
        question.question || "";


    document
    .getElementById("questionType")
    .value =
        question.type || "single";


    const container =
        document.getElementById(
            "optionsContainer"
        );

    container.innerHTML = "";


    (question.options || [])
    .forEach(function(option){

        createOptionInput(option);

    });


    document
    .getElementById("saveQuestion")
    .textContent =
        "💾 Update Question";


    document
    .getElementById("cancelEdit")
    .style.display =
        "inline-block";


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


    document
    .getElementById("questionText")
    .value = "";


    document
    .getElementById("questionType")
    .value = "single";


    document
    .getElementById("optionsContainer")
    .innerHTML = "";


    createOptionInput();

    createOptionInput();


    document
    .getElementById("saveQuestion")
    .textContent =
        "💾 Save Question";


    document
    .getElementById("cancelEdit")
    .style.display =
        "none";

}


// ==========================================
// QUESTION MESSAGE
// ==========================================

function showQuestionMessage(text,success){

    const message =
        document.getElementById(
            "questionMessage"
        );

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


        updateDashboard();

        renderSurveyRecords();

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
            getDate(
                survey.createdAt
            );


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


function setText(id,value){

    const element =
        document.getElementById(id);

    if(element){
        element.textContent = value;
    }

}


// ==========================================
// RENDER SURVEY RECORDS
// ==========================================

function renderSurveyRecords(){

    const table =
        document.getElementById(
            "surveyTable"
        );

    if(!table) return;


    table.innerHTML = "";


    allSurveys.forEach(function(survey){

        const row =
            document.createElement("tr");


        row.innerHTML = `

<td>${escapeHTML(survey.name)}</td>

<td>${escapeHTML(survey.mobile)}</td>

<td>${escapeHTML(survey.age)}</td>

<td>${escapeHTML(survey.gender)}</td>

<td>${escapeHTML(survey.village)}</td>

<td>${escapeHTML(survey.assembly)}</td>

<td>${escapeHTML(survey.party)}</td>

<td>${escapeHTML(survey.candidate)}</td>

<td>${escapeHTML(survey.feedback)}</td>

<td>${escapeHTML(survey.surveyorEmail)}</td>

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
        prompt("Name:",survey.name || "");

    if(name === null) return;


    const mobile =
        prompt("Mobile:",survey.mobile || "");

    if(mobile === null) return;


    const age =
        prompt("Age:",survey.age || "");

    if(age === null) return;


    const village =
        prompt(
            "Village:",
            survey.village || ""
        );

    if(village === null) return;


    const assembly =
        prompt(
            "Assembly:",
            survey.assembly || ""
        );

    if(assembly === null) return;


    const party =
        prompt(
            "Party:",
            survey.party || ""
        );

    if(party === null) return;


    const candidate =
        prompt(
            "Candidate:",
            survey.candidate || ""
        );

    if(candidate === null) return;


    const feedback =
        prompt(
            "Feedback:",
            survey.feedback || ""
        );

    if(feedback === null) return;


    db.collection("surveys")
    .doc(id)
    .update({

        name:name.trim(),

        mobile:mobile.trim(),

        age:age.trim(),

        village:village.trim(),

        assembly:assembly.trim(),

        party:party.trim(),

        candidate:candidate.trim(),

        feedback:feedback.trim()

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
// DELETE SURVEY
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
? `<span style="color:green;font-weight:bold;">🟢 Active</span>
<button
class="warning"
onclick="toggleSurveyor('${escapeHTML(email)}',false)">
Disable
</button>`
:
`<span style="color:red;font-weight:bold;">🔴 Disabled</span>
<button
class="success"
onclick="toggleSurveyor('${escapeHTML(email)}',true)">
Enable
</button>`
}

</td>

`;

        table.appendChild(row);

    });

}


// ==========================================
// ENABLE / DISABLE SURVEYOR
// ==========================================

window.toggleSurveyor = function(email,enabled){

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


    const limit =
        Number(input.value);


    if(!Number.isFinite(limit) || limit < 1){

        message.textContent =
            "Enter valid limit.";

        message.style.color = "red";

        return;

    }


    db.collection("settings")
    .doc("config")
    .set({

        dailyLimit:limit,

        updatedAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

    },{

        merge:true

    })

    .then(function(){

        message.textContent =
            "✅ Limit saved: " + limit;

        message.style.color = "green";

    })

    .catch(function(error){

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


// ==========================================
// LOGOUT
// ==========================================

document
.getElementById("logoutBtn")
?.addEventListener("click",function(){

    firebase.auth()
    .signOut()

    .then(function(){

        window.location.replace(
            "index.html"
        );

    });

});


// ==========================================
// START QUESTION BUILDER
// ==========================================

initializeQuestionBuilder();
