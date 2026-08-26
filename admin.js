console.log("Admin JS Loaded - FINAL FIX");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let filteredSurveys = [];
let allSurveyors = [];
let allQuestions = [];
let editingQuestionId = null;


// =====================================================
// AUTH
// =====================================================

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
        loadSurveys();
        loadSurveyors();

    });

})
.catch(function(error){

    console.error("Auth error:", error);

});


// =====================================================
// DATE HELPERS
// =====================================================

function getDate(value){

    if(!value) return null;

    try{

        if(typeof value.toDate === "function"){
            return value.toDate();
        }

        if(value.seconds !== undefined){
            return new Date(value.seconds * 1000);
        }

        const d = new Date(value);

        return isNaN(d.getTime()) ? null : d;

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


// =====================================================
// QUESTION MANAGER HIDE / SHOW
// =====================================================

document
.getElementById("questionManagerToggle")
?.addEventListener("click",function(){

    const body =
        document.getElementById("questionManagerBody");

    if(!body) return;

    if(body.style.display === "none"){

        body.style.display = "block";

        this.textContent = "🙈 Hide";

    }
    else{

        body.style.display = "none";

        this.textContent = "👁️ Show";

    }

});


// =====================================================
// QUESTION OPTIONS
// =====================================================

function createOptionInput(value=""){

    const container =
        document.getElementById("optionsContainer");

    if(!container) return;

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

    remove.textContent = "✖";

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


document
.getElementById("addOption")
?.addEventListener("click",function(){

    createOptionInput();

});


// =====================================================
// SAVE QUESTION
// =====================================================

document
.getElementById("saveQuestion")
?.addEventListener("click",function(){

    const textElement =
        document.getElementById("questionText");

    const typeElement =
        document.getElementById("questionType");

    if(!textElement || !typeElement) return;


    const text =
        textElement.value.trim();

    const type =
        typeElement.value;


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


    const data = {

        question:text,

        type:type,

        options:options,

        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()

    };


    const button =
        document.getElementById("saveQuestion");

    if(!button) return;


    button.disabled = true;

    button.textContent = "Saving...";


    let promise;


    if(editingQuestionId){

        promise =
            db.collection("questions")
            .doc(editingQuestionId)
            .update(data);

    }
    else{

        data.createdAt =
            firebase.firestore.FieldValue.serverTimestamp();

        promise =
            db.collection("questions")
            .add(data);

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

        button.disabled = false;

        button.textContent =
            "💾 Save Question";

    });

});


// =====================================================
// LOAD QUESTIONS
// =====================================================

function loadQuestions(){

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


        allQuestions.sort(function(a,b){

            const da = getDate(a.createdAt);
            const dbb = getDate(b.createdAt);

            if(da && dbb){

                return da.getTime() - dbb.getTime();

            }

            return 0;

        });


        const count =
            document.getElementById("questionCount");

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

    });

}


// =====================================================
// RENDER QUESTIONS
// =====================================================

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

        card.className =
            "question-card";


        const title =
            document.createElement("h3");

        title.textContent =
            (index + 1) +
            ". " +
            (question.question || "");


        card.appendChild(title);


        const badge =
            document.createElement("span");

        badge.textContent =
            question.type === "multiple"
            ? "Multiple Choice"
            : "Single Choice";

        badge.style.cssText =
            "background:#e3f2fd;color:#1565c0;padding:5px 9px;border-radius:20px;font-size:12px;font-weight:bold;";


        card.appendChild(badge);


        (question.options || [])
        .forEach(function(option){

            const item =
                document.createElement("div");

            item.textContent =
                "• " + option;

            item.style.padding =
                "5px 0";

            card.appendChild(item);

        });


        const edit =
            document.createElement("button");

        edit.className =
            "primary";

        edit.textContent =
            "✏️ Edit";

        edit.onclick = function(){

            editQuestion(question.id);

        };


        const del =
            document.createElement("button");

        del.className =
            "danger";

        del.textContent =
            "🗑️ Delete";

        del.onclick = function(){

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

function editQuestion(id){

    const question =
        allQuestions.find(function(q){

            return q.id === id;

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
        document.getElementById("optionsContainer");

    if(container){

        container.innerHTML = "";

        (question.options || [])
        .forEach(function(option){

            createOptionInput(option);

        });

    }


    document
    .getElementById("saveQuestion")
    .textContent =
        "💾 Update Question";


    document
    .getElementById("cancelEdit")
    .style.display =
        "inline-block";


    document
    .getElementById("questionManagerBody")
    .style.display =
        "block";


    document
    .getElementById("questionManagerToggle")
    .textContent =
        "🙈 Hide";


    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

}


// =====================================================
// DELETE QUESTION
// =====================================================

function deleteQuestion(id){

    if(!confirm("Delete this question?")){

        return;

    }


    db.collection("questions")
    .doc(id)
    .delete()

    .then(function(){

        loadQuestions();

    })
    .catch(function(error){

        alert(
            "Delete failed: " +
            error.message
        );

    });

}


document
.getElementById("cancelEdit")
?.addEventListener("click",function(){

    resetQuestionBuilder();

});


function resetQuestionBuilder(){

    editingQuestionId = null;


    const questionText =
        document.getElementById("questionText");

    if(questionText){

        questionText.value = "";

    }


    const questionType =
        document.getElementById("questionType");

    if(questionType){

        questionType.value = "single";

    }


    const container =
        document.getElementById("optionsContainer");

    if(container){

        container.innerHTML = "";

        createOptionInput();

        createOptionInput();

    }


    const button =
        document.getElementById("saveQuestion");

    if(button){

        button.textContent =
            "💾 Save Question";

    }


    const cancel =
        document.getElementById("cancelEdit");

    if(cancel){

        cancel.style.display =
            "none";

    }

}


function showQuestionMessage(text,success){

    const element =
        document.getElementById("questionMessage");

    if(!element) return;


    element.textContent = text;

    element.style.color =
        success
        ? "#2e7d32"
        : "#d32f2f";

}


// =====================================================
// LOAD SURVEYS
// =====================================================

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

            const da = getDate(a.createdAt);
            const dbb = getDate(b.createdAt);

            if(!da && !dbb) return 0;

            if(!da) return 1;

            if(!dbb) return -1;

            return dbb.getTime() - da.getTime();

        });


        filteredSurveys =
            [...allSurveys];


        updateDashboard();

        createFilterOptions();

        renderSurveyRecords();


        // IMPORTANT:
        // Survey data load hone ke baad
        // Surveyor Management ko dobara render karein.

        renderSurveyorManagement();

    })
    .catch(function(error){

        console.error(
            "Survey load error:",
            error
        );

    });

}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard(){

    let today = 0;

    let week = 0;

    let month = 0;


    allSurveys.forEach(function(survey){

        const date =
            getDate(survey.createdAt);


        if(isToday(date)){

            today++;

        }


        if(isThisWeek(date)){

            week++;

        }


        if(isThisMonth(date)){

            month++;

        }

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

        element.textContent =
            value;

    }

}


// =====================================================
// FILTER OPTIONS
// =====================================================

function addUniqueOptions(selectId,values,icon){

    const select =
        document.getElementById(selectId);

    if(!select) return;


    const first =
        select.options[0];


    select.innerHTML = "";


    if(first){

        select.appendChild(first);

    }


    const unique =
        [
            ...new Set(

                values

                .filter(function(v){

                    return(
                        v !== null &&
                        v !== undefined
                    );

                })

                .map(function(v){

                    return String(v).trim();

                })

                .filter(Boolean)

            )
        ]
        .sort(function(a,b){

            return a.localeCompare(b);

        });


    unique.forEach(function(value){

        const option =
            document.createElement("option");

        option.value = value;

        option.textContent =
            icon + " " + value;

        select.appendChild(option);

    });

}


function createFilterOptions(){

    addUniqueOptions(
        "filterName",
        allSurveys.map(function(s){

            return s.name;

        }),
        "👤"
    );


    addUniqueOptions(
        "filterMobile",
        allSurveys.map(function(s){

            return s.mobile;

        }),
        "📱"
    );


    addUniqueOptions(
        "filterVillage",
        allSurveys.map(function(s){

            return s.village;

        }),
        "🏠"
    );


    addUniqueOptions(
        "filterSurveyor",
        allSurveys.map(function(s){

            return(
                s.surveyorEmail ||
                s.createdBy ||
                ""
            );

        }),
        "🧑‍💼"
    );

}


// =====================================================
// APPLY FILTER
// =====================================================

document
.getElementById("applySurveyFilter")
?.addEventListener("click",function(){

    const name =
        document.getElementById("filterName").value;


    const mobile =
        document.getElementById("filterMobile").value;


    const village =
        document.getElementById("filterVillage").value;


    const surveyor =
        document.getElementById("filterSurveyor").value;


    const dateFilter =
        document.getElementById("filterDate").value;


    filteredSurveys =
        allSurveys.filter(function(survey){

            if(
                name &&
                String(survey.name || "") !== name
            ){

                return false;

            }


            if(
                mobile &&
                String(survey.mobile || "") !== mobile
            ){

                return false;

            }


            if(
                village &&
                String(survey.village || "") !== village
            ){

                return false;

            }


            if(surveyor){

                const surveyorIdentity =
                    survey.surveyorEmail ||
                    survey.createdBy ||
                    "";

                if(
                    String(surveyorIdentity) !==
                    String(surveyor)
                ){

                    return false;

                }

            }


            const date =
                getDate(survey.createdAt);


            if(
                dateFilter === "today" &&
                !isToday(date)
            ){

                return false;

            }


            if(
                dateFilter === "week" &&
                !isThisWeek(date)
            ){

                return false;

            }


            if(
                dateFilter === "month" &&
                !isThisMonth(date)
            ){

                return false;

            }


            return true;

        });


    renderSurveyRecords();

});


// =====================================================
// CLEAR FILTER
// =====================================================

document
.getElementById("clearSurveyFilter")
?.addEventListener("click",function(){

    const ids = [

        "filterName",

        "filterMobile",

        "filterVillage",

        "filterSurveyor",

        "filterDate"

    ];


    ids.forEach(function(id){

        const element =
            document.getElementById(id);

        if(element){

            element.value = "";

        }

    });


    filteredSurveys =
        [...allSurveys];


    renderSurveyRecords();

});


// =====================================================
// RENDER SURVEY RECORDS
// =====================================================

function renderSurveyRecords(){

    const table =
        document.getElementById("surveyTable");

    if(!table) return;


    table.innerHTML = "";


    filteredSurveys.forEach(function(survey){

        const row =
            document.createElement("tr");


        row.innerHTML = `

<td>${escapeHTML(survey.name)}</td>

<td>${escapeHTML(survey.mobile)}</td>

<td>${escapeHTML(survey.age)}</td>

<td>${escapeHTML(survey.gender)}</td>

<td>${escapeHTML(survey.village)}</td>

<td>${escapeHTML(survey.party || "")}</td>

<td>${escapeHTML(survey.candidate || "")}</td>

<td>

<button
class="action-btn purple"
onclick="showAnswers('${survey.id}')">
📋 Answers
</button>

<button
class="action-btn primary"
onclick="editSurvey('${survey.id}')">
✏️ Edit
</button>

<button
class="action-btn danger"
onclick="deleteSurvey('${survey.id}')">
🗑️ Delete
</button>

</td>

`;


        table.appendChild(row);

    });


    setText(
        "filterResultCount",
        "Showing: " +
        filteredSurveys.length +
        " / " +
        allSurveys.length
    );

}


// =====================================================
// SHOW ANSWERS
// =====================================================

window.showAnswers = function(id){

    const survey =
        allSurveys.find(function(item){

            return item.id === id;

        });


    if(!survey) return;


    const modal =
        document.getElementById("answerModal");


    const body =
        document.getElementById("answerModalBody");


    if(!modal || !body) return;


    let html = `

<div class="respondent">

<div class="respondent-grid">

<div>
<b>Name</b><br>
${escapeHTML(survey.name)}
</div>

<div>
<b>Mobile</b><br>
${escapeHTML(survey.mobile)}
</div>

<div>
<b>Age</b><br>
${escapeHTML(survey.age)}
</div>

<div>
<b>Gender</b><br>
${escapeHTML(survey.gender)}
</div>

<div>
<b>Village</b><br>
${escapeHTML(survey.village)}
</div>

</div>

</div>

<h3>Survey Answers</h3>

`;


    const answers =
        survey.answers || {};


    const answerEntries =
        Object.entries(answers);


    if(answerEntries.length === 0){

        html +=
            "<p>No answers found.</p>";

    }
    else{

        answerEntries.forEach(function(entry,index){

            const questionId =
                entry[0];


            const answer =
                entry[1];


            const question =
                allQuestions.find(function(q){

                    return q.id === questionId;

                });


            const questionText =
                question
                ? question.question
                : "Question " + (index + 1);


            let answerText = "";


            if(Array.isArray(answer)){

                answerText =
                    answer.join(", ");

            }
            else{

                answerText =
                    String(answer || "");

            }


            html += `

<div class="answer-item">

<div class="answer-question">
${index + 1}. ${escapeHTML(questionText)}
</div>

<div class="answer-value">
${escapeHTML(answerText)}
</div>

</div>

`;

        });

    }


    body.innerHTML =
        html;


    modal.classList.add("show");

};


document
.getElementById("closeAnswerModal")
?.addEventListener("click",function(){

    const modal =
        document.getElementById("answerModal");

    if(modal){

        modal.classList.remove("show");

    }

});


document
.getElementById("answerModal")
?.addEventListener("click",function(e){

    if(e.target === this){

        this.classList.remove("show");

    }

});


// =====================================================
// EDIT SURVEY
// =====================================================

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


    db.collection("surveys")
    .doc(id)
    .update({

        name:name.trim(),

        mobile:mobile.trim(),

        age:age.trim(),

        gender:gender.trim(),

        village:village.trim(),

        party:party.trim(),

        candidate:candidate.trim()

    })
    .then(function(){

        loadSurveys();

    })
    .catch(function(error){

        alert(
            "Update failed: " +
            error.message
        );

    });

};


// =====================================================
// DELETE ONE SURVEY
// =====================================================

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

        loadSurveys();

    })
    .catch(function(error){

        alert(
            "Delete failed: " +
            error.message
        );

    });

};


// =====================================================
// DELETE ALL SURVEYS
// =====================================================

document
.getElementById("deleteAllSurveysBtn")
?.addEventListener("click",function(){

    if(allSurveys.length === 0){

        alert(
            "There are no surveys to delete."
        );

        return;

    }


    const firstConfirm =
        confirm(
            "⚠️ DELETE ALL SURVEYS?\n\n" +
            "This will permanently delete all " +
            allSurveys.length +
            " survey records."
        );


    if(!firstConfirm) return;


    const secondConfirm =
        prompt(
            "Type DELETE to confirm:"
        );


    if(secondConfirm !== "DELETE"){

        alert(
            "Delete cancelled."
        );

        return;

    }


    const button =
        this;


    button.disabled = true;

    button.textContent =
        "Deleting...";


    deleteSurveyBatch()

    .then(function(){

        alert(
            "✅ All surveys deleted successfully."
        );

        loadSurveys();

    })

    .catch(function(error){

        console.error(error);

        alert(
            "Delete failed: " +
            error.message
        );

    })

    .finally(function(){

        button.disabled = false;

        button.textContent =
            "🗑️ Delete All Surveys";

    });

});


function deleteSurveyBatch(){

    const chunks = [];


    for(
        let i = 0;
        i < allSurveys.length;
        i += 400
    ){

        chunks.push(
            allSurveys.slice(i,i + 400)
        );

    }


    let promise =
        Promise.resolve();


    chunks.forEach(function(chunk){

        promise =
            promise.then(function(){

                const batch =
                    db.batch();


                chunk.forEach(function(survey){

                    batch.delete(

                        db
                        .collection("surveys")
                        .doc(survey.id)

                    );

                });


                return batch.commit();

            });

    });


    return promise;

}


// =====================================================
// SURVEYOR MANAGEMENT
// =====================================================

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


        console.log(
            "Surveyors loaded:",
            allSurveyors.length
        );


        // Survey records already loaded hain
        // to immediately count update karein.

        renderSurveyorManagement();

    })

    .catch(function(error){

        console.error(
            "Surveyor load error:",
            error
        );

    });

}


// =====================================================
// SURVEYOR IDENTITY NORMALIZER
// =====================================================

function normalizeIdentity(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    return String(value)
        .trim()
        .toLowerCase();

}


// =====================================================
// GET ALL IDENTITIES OF A SURVEYOR
// =====================================================

function getSurveyorIdentities(surveyor){

    const identities = [];


    if(!surveyor) return identities;


    const possibleValues = [

        surveyor.email,

        surveyor.id,

        surveyor.uid,

        surveyor.userEmail,

        surveyor.surveyorEmail,

        surveyor.surveyorUid

    ];


    possibleValues.forEach(function(value){

        const normalized =
            normalizeIdentity(value);


        if(
            normalized &&
            identities.indexOf(normalized) === -1
        ){

            identities.push(normalized);

        }

    });


    return identities;

}


// =====================================================
// GET SURVEYOR IDENTITIES FROM SURVEY RECORD
// =====================================================

function getSurveyIdentities(survey){

    const identities = [];


    if(!survey) return identities;


    const possibleValues = [

        survey.surveyorEmail,

        survey.createdBy,

        survey.surveyor,

        survey.email,

        survey.userEmail,

        survey.surveyorId,

        survey.surveyorUid,

        survey.uid

    ];


    possibleValues.forEach(function(value){

        const normalized =
            normalizeIdentity(value);


        if(
            normalized &&
            identities.indexOf(normalized) === -1
        ){

            identities.push(normalized);

        }

    });


    return identities;

}


// =====================================================
// CHECK SURVEY BELONGS TO SURVEYOR
// =====================================================

function surveyBelongsToSurveyor(
    survey,
    surveyor
){

    const surveyorIdentities =
        getSurveyorIdentities(surveyor);


    const surveyIdentities =
        getSurveyIdentities(survey);


    if(
        surveyorIdentities.length === 0 ||
        surveyIdentities.length === 0
    ){

        return false;

    }


    return surveyorIdentities.some(
        function(identity){

            return surveyIdentities.indexOf(
                identity
            ) !== -1;

        }
    );

}


// =====================================================
// RENDER SURVEYOR MANAGEMENT
// =====================================================

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
            surveyor.id ||
            surveyor.userEmail ||
            surveyor.surveyorEmail ||
            "Unknown";


        let total = 0;

        let today = 0;

        let week = 0;

        let month = 0;


        // IMPORTANT FIX:
        // हर survey को सभी possible surveyor
        // fields से match किया जा रहा है.

        allSurveys.forEach(function(survey){

            if(
                !surveyBelongsToSurveyor(
                    survey,
                    surveyor
                )
            ){

                return;

            }


            total++;


            const date =
                getDate(
                    survey.createdAt
                );


            if(isToday(date)){

                today++;

            }


            if(isThisWeek(date)){

                week++;

            }


            if(isThisMonth(date)){

                month++;

            }

        });


        const enabled =
            surveyor.enabled !== false;


        const row =
            document.createElement("tr");


        const safeEmail =
            escapeHTML(email);


        row.innerHTML = `

<td>${safeEmail}</td>

<td>${total}</td>

<td>${today}</td>

<td>${week}</td>

<td>${month}</td>

<td>

${
enabled

?

`
<span
style="
color:#2e7d32;
font-weight:bold;
">
🟢 Active
</span>

<button
class="warning"
onclick="toggleSurveyor('${safeEmail}',false)">
Disable
</button>
`

:

`
<span
style="
color:#c62828;
font-weight:bold;
">
🔴 Disabled
</span>

<button
class="success"
onclick="toggleSurveyor('${safeEmail}',true)">
Enable
</button>
`

}

</td>

`;


        table.appendChild(row);

    });


    console.log(
        "Surveyor Management updated.",
        "Surveyors:",
        allSurveyors.length,
        "Surveys:",
        allSurveys.length
    );

}


// =====================================================
// ENABLE / DISABLE SURVEYOR
// =====================================================

window.toggleSurveyor =
function(email,enabled){

    // पहले email से document update करने की कोशिश

    db.collection("surveyors")
    .doc(email)
    .update({

        enabled:enabled

    })

    .then(function(){

        loadSurveyors();

    })

    .catch(function(error){

        console.error(
            "Direct surveyor update failed:",
            error
        );


        // अगर document ID email नहीं है,
        // तो email field से खोजकर update करें.

        db.collection("surveyors")
        .where("email","==",email)
        .get()

        .then(function(snapshot){

            if(snapshot.empty){

                throw new Error(
                    "Surveyor record not found."
                );

            }


            const batch =
                db.batch();


            snapshot.forEach(function(doc){

                batch.update(
                    doc.ref,
                    {
                        enabled:enabled
                    }
                );

            });


            return batch.commit();

        })

        .then(function(){

            loadSurveyors();

        })

        .catch(function(error2){

            alert(
                "Status update failed: " +
                error2.message
            );

        });

    });

};


// =====================================================
// DAILY LIMIT
// =====================================================

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


    if(
        !Number.isFinite(limit) ||
        limit < 1
    ){

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


// =====================================================
// LOGOUT
// =====================================================

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


// =====================================================
// START
// =====================================================

initializeQuestionBuilder();


// =====================================================
// REMOVE DUPLICATE FILTER
// =====================================================

function removeDuplicateSurveyFilter(){

    const headings =
        Array.from(
            document.querySelectorAll("*")
        )
        .filter(function(el){

            return(
                el.children.length === 0 &&
                el.textContent
                .trim()
                .includes(
                    "Filter Survey Records"
                )
            );

        });


    if(headings.length <= 1){

        return;

    }


    for(
        let i = 1;
        i < headings.length;
        i++
    ){

        const heading =
            headings[i];


        const parent =
            heading.parentElement;


        if(!parent) continue;


        let container =
            parent;


        for(
            let j = 0;
            j < 5;
            j++
        ){

            if(
                !container.parentElement
            ){

                break;

            }


            const text =
                container.textContent || "";


            if(
                text.includes("All Names") &&
                text.includes("All Mobiles") &&
                text.includes("All Villages") &&
                text.includes("All Surveyors") &&
                text.includes("All Dates")
            ){

                container.remove();

                break;

            }


            container =
                container.parentElement;

        }

    }

}


// =====================================================
// DUPLICATE FILTER CLEANUP
// =====================================================

document
.addEventListener(
    "DOMContentLoaded",
    function(){

        setTimeout(
            removeDuplicateSurveyFilter,
            500
        );


        setTimeout(
            removeDuplicateSurveyFilter,
            1500
        );

    }
);


// =====================================================
// MUTATION OBSERVER
// =====================================================

const filterObserver =
    new MutationObserver(
        function(){

            removeDuplicateSurveyFilter();

        }
    );


if(document.body){

    filterObserver.observe(
        document.body,
        {
            childList:true,
            subtree:true
        }
    );

}
