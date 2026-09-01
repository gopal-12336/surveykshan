console.log("Admin JS Loaded - FINAL VERSION + PHOTO");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let allSurveys = [];
let allSurveyors = [];
let allQuestions = [];

let filteredSurveys = [];

let editingQuestionId = null;


// ======================================================
// ADMIN AUTH
// ======================================================

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

    });

})
.catch(function(error){
    console.error("Auth error:", error);
});


// ======================================================
// HELPERS
// ======================================================

function setText(id,value){

    const el = document.getElementById(id);

    if(el){
        el.textContent = value;
    }

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


function normalizeValue(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase();

}


function getDate(value){

    if(!value){
        return null;
    }

    try{

        if(typeof value.toDate === "function"){
            return value.toDate();
        }

        if(value.seconds !== undefined){
            return new Date(value.seconds * 1000);
        }

        if(value._seconds !== undefined){
            return new Date(value._seconds * 1000);
        }

        const date = new Date(value);

        if(isNaN(date.getTime())){
            return null;
        }

        return date;

    }
    catch(error){
        return null;
    }

}


function isToday(date){

    if(!date){
        return false;
    }

    const now = new Date();

    return(
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );

}


function isThisWeek(date){

    if(!date){
        return false;
    }

    const now = new Date();

    const start = new Date(now);

    const day = start.getDay();

    const diff = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - diff);
    start.setHours(0,0,0,0);

    return date >= start;

}


function isThisMonth(date){

    if(!date){
        return false;
    }

    const now = new Date();

    return(
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );

}


// ======================================================
// QUESTION MANAGER
// ======================================================

function createOptionInput(value = ""){

    const container =
        document.getElementById("optionsContainer");

    if(!container){
        return;
    }

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


    remove.addEventListener("click",function(){

        row.remove();

    });


    row.appendChild(input);
    row.appendChild(remove);

    container.appendChild(row);

}


function initializeQuestionBuilder(){

    const container =
        document.getElementById("optionsContainer");

    if(!container){
        return;
    }

    if(container.children.length === 0){

        createOptionInput();
        createOptionInput();

    }

}


// ADD OPTION

document
.getElementById("addOption")
?.addEventListener("click",function(){

    createOptionInput();

});


// HIDE / SHOW QUESTION MANAGER

document
.getElementById("questionManagerToggle")
?.addEventListener("click",function(){

    const body =
        document.getElementById("questionManagerBody");

    if(!body){
        return;
    }

    const hidden =
        body.style.display === "none";

    if(hidden){

        body.style.display = "block";

        this.textContent = "🙈 Hide";

    }
    else{

        body.style.display = "none";

        this.textContent = "👁️ Show";

    }

});


// SAVE QUESTION

document
.getElementById("saveQuestion")
?.addEventListener("click",function(){

    const textElement =
        document.getElementById("questionText");

    const typeElement =
        document.getElementById("questionType");

    const saveButton = this;


    if(!textElement || !typeElement){
        return;
    }


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


    const questionData = {

        question: text,

        type: type,

        options: options,

        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()

    };


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

        console.error("Question save error:",error);

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


// LOAD QUESTIONS

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


        setText(
            "questionCount",
            allQuestions.length
        );


        renderQuestions();

    })

    .catch(function(error){

        console.warn(
            "Question orderBy failed. Loading without orderBy.",
            error
        );


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


            setText(
                "questionCount",
                allQuestions.length
            );


            renderQuestions();

        })

        .catch(function(error2){

            console.error(
                "Question loading error:",
                error2
            );

        });

    });

}


// RENDER QUESTIONS

function renderQuestions(){

    const container =
        document.getElementById("questionsList");

    if(!container){
        return;
    }


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


        (question.options || []).forEach(function(option){

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
        edit.type = "button";
        edit.textContent = "✏️ Edit";


        edit.addEventListener("click",function(){

            editQuestion(question.id);

        });


        const del =
            document.createElement("button");

        del.className = "danger";
        del.type = "button";
        del.textContent = "🗑️ Delete";


        del.addEventListener("click",function(){

            deleteQuestion(question.id);

        });


        card.appendChild(edit);
        card.appendChild(del);


        container.appendChild(card);

    });

}


// EDIT QUESTION

function editQuestion(id){

    const question =
        allQuestions.find(function(item){

            return item.id === id;

        });


    if(!question){
        return;
    }


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

        (question.options || []).forEach(function(option){

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


    const managerBody =
        document.getElementById("questionManagerBody");

    if(managerBody){
        managerBody.style.display = "block";
    }


    const toggle =
        document.getElementById("questionManagerToggle");

    if(toggle){
        toggle.textContent = "🙈 Hide";
    }


    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

}


// DELETE QUESTION

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

        alert("Question deleted successfully.");

        loadQuestions();

    })

    .catch(function(error){

        alert(
            "Delete failed: " +
            error.message
        );

    });

}


// CANCEL EDIT

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


function showQuestionMessage(text,success){

    const message =
        document.getElementById("questionMessage");

    if(!message){
        return;
    }

    message.textContent = text;

    message.style.color =
        success ? "green" : "red";

}


// ======================================================
// SURVEYS
// ======================================================

function loadSurveys(){

    db.collection("surveys")
    .get()

    .then(function(snapshot){

        allSurveys = [];

        snapshot.forEach(function(doc){

            allSurveys.push({

                id: doc.id,
                ...doc.data()

            });

        });


        filteredSurveys =
            allSurveys.slice();


        console.log(
            "Surveys loaded:",
            allSurveys.length
        );


        updateDashboard();

        populateFilterDropdowns();

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


// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard(){

    let today = 0;
    let week = 0;
    let month = 0;


    allSurveys.forEach(function(survey){

        const date =
            getDate(
                survey.createdAt ||
                survey.timestamp ||
                survey.submittedAt
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

function addUniqueOption(select,value,label){

    if(!select || !value){
        return;
    }


    const exists =
        Array.from(select.options)
        .some(function(option){

            return normalizeValue(option.value) ===
                   normalizeValue(value);

        });


    if(exists){
        return;
    }


    const option =
        document.createElement("option");

    option.value = value;
    option.textContent = label || value;

    select.appendChild(option);

}


function populateFilterDropdowns(){

    const nameSelect =
        document.getElementById("filterName");

    const mobileSelect =
        document.getElementById("filterMobile");

    const villageSelect =
        document.getElementById("filterVillage");

    const surveyorSelect =
        document.getElementById("filterSurveyor");


    if(nameSelect){

        nameSelect.innerHTML =
            '<option value="">👤 All Names</option>';

    }


    if(mobileSelect){

        mobileSelect.innerHTML =
            '<option value="">📱 All Mobiles</option>';

    }


    if(villageSelect){

        villageSelect.innerHTML =
            '<option value="">🏠 All Villages</option>';

    }


    if(surveyorSelect){

        surveyorSelect.innerHTML =
            '<option value="">🧑‍💼 All Surveyors</option>';

    }


    allSurveys.forEach(function(survey){

        addUniqueOption(
            nameSelect,
            survey.name,
            survey.name
        );


        addUniqueOption(
            mobileSelect,
            survey.mobile,
            survey.mobile
        );


        addUniqueOption(
            villageSelect,
            survey.village,
            survey.village
        );


        const surveyor =
            survey.surveyorEmail ||
            survey.surveyorId ||
            survey.createdBy;


        addUniqueOption(
            surveyorSelect,
            surveyor,
            surveyor
        );

    });


    allSurveyors.forEach(function(surveyor){

        const email =
            surveyor.email ||
            surveyor.surveyorEmail ||
            surveyor.id;


        addUniqueOption(
            surveyorSelect,
            email,
            email
        );

    });

}


// APPLY FILTER

document
.getElementById("applySurveyFilter")
?.addEventListener("click",function(){

    applySurveyFilter();

});


function applySurveyFilter(){

    const name =
        normalizeValue(
            document.getElementById("filterName")?.value
        );

    const mobile =
        normalizeValue(
            document.getElementById("filterMobile")?.value
        );

    const village =
        normalizeValue(
            document.getElementById("filterVillage")?.value
        );

    const surveyor =
        normalizeValue(
            document.getElementById("filterSurveyor")?.value
        );

    const dateFilter =
        document.getElementById("filterDate")?.value || "";


    filteredSurveys =
        allSurveys.filter(function(survey){

            if(
                name &&
                normalizeValue(survey.name) !== name
            ){
                return false;
            }


            if(
                mobile &&
                normalizeValue(survey.mobile) !== mobile
            ){
                return false;
            }


            if(
                village &&
                normalizeValue(survey.village) !== village
            ){
                return false;
            }


            const surveyorValue =
                normalizeValue(
                    survey.surveyorEmail ||
                    survey.surveyorId ||
                    survey.createdBy
                );


            if(
                surveyor &&
                surveyorValue !== surveyor
            ){
                return false;
            }


            const date =
                getDate(
                    survey.createdAt ||
                    survey.timestamp ||
                    survey.submittedAt
                );


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


    renderSurveyRecords();


    setText(
        "filterResultCount",
        "Showing: " +
        filteredSurveys.length +
        " / " +
        allSurveys.length
    );

}


// CLEAR FILTER

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
        allSurveys.slice();


    renderSurveyRecords();


    setText(
        "filterResultCount",
        "Showing: " +
        allSurveys.length +
        " / " +
        allSurveys.length
    );

});


// ======================================================
// GET PHOTO URL
// ======================================================

function getSurveyPhotoURL(survey){

    if(!survey){
        return "";
    }


    const possibleFields = [

        "photoURL",
        "photoUrl",
        "photo",
        "imageURL",
        "imageUrl",
        "image",
        "cloudinaryURL",
        "cloudinaryUrl",
        "cloudinary",
        "photoURLCloudinary",
        "uploadedPhoto",
        "uploadedImage"

    ];


    for(
        let i = 0;
        i < possibleFields.length;
        i++
    ){

        const value =
            survey[possibleFields[i]];


        if(
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ){

            return String(value).trim();

        }

    }


    return "";

}


// ======================================================
// OPEN PHOTO
// ======================================================

window.openSurveyPhoto = function(url){

    if(!url){
        return;
    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

};


// ======================================================
// SURVEY RECORDS
// ======================================================

function renderSurveyRecords(){

    const table =
        document.getElementById("surveyTable");

    if(!table){
        return;
    }


    table.innerHTML = "";


    filteredSurveys.forEach(function(survey){

        const row =
            document.createElement("tr");


        const name =
            escapeHTML(survey.name);

        const mobile =
            escapeHTML(survey.mobile);

        const age =
            escapeHTML(survey.age);

        const gender =
            escapeHTML(survey.gender);

        const village =
            escapeHTML(survey.village);


        const photoURL =
            getSurveyPhotoURL(survey);


        let photoHTML =
            '<span style="color:#888;">No Photo</span>';


        if(photoURL){

            photoHTML = `

                <img
                    src="${escapeHTML(photoURL)}"
                    alt="Survey Photo"
                    loading="lazy"
                    style="
                        width:70px;
                        height:70px;
                        object-fit:cover;
                        border-radius:10px;
                        border:2px solid #ddd;
                        cursor:pointer;
                        display:block;
                    "
                    onclick="openSurveyPhoto('${escapeHTML(photoURL)}')"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='inline';"
                >

                <span
                    style="
                        display:none;
                        color:red;
                    "
                >
                    Photo unavailable
                </span>

            `;

        }


        row.innerHTML = `

<td>${name}</td>

<td>${mobile}</td>

<td>${age}</td>

<td>${gender}</td>

<td>${village}</td>

<td>
    ${photoHTML}
</td>

<td>

<button
type="button"
class="purple action-btn answer-button">
📋 Answers
</button>

<button
type="button"
class="primary action-btn edit-button">
✏️ Edit
</button>

<button
type="button"
class="danger action-btn delete-button">
🗑️ Delete
</button>

</td>

`;


        row
        .querySelector(".answer-button")
        .addEventListener("click",function(){

            showSurveyAnswers(survey);

        });


        row
        .querySelector(".edit-button")
        .addEventListener("click",function(){

            editSurvey(survey.id);

        });


        row
        .querySelector(".delete-button")
        .addEventListener("click",function(){

            deleteSurvey(survey.id);

        });


        table.appendChild(row);

    });


    const count =
        document.getElementById("filterResultCount");


    if(count){

        count.textContent =
            "Showing: " +
            filteredSurveys.length +
            " / " +
            allSurveys.length;

    }

}


// ======================================================
// EDIT SURVEY
// ======================================================

window.editSurvey = function(id){

    const survey =
        allSurveys.find(function(item){

            return item.id === id;

        });


    if(!survey){
        return;
    }


    const name =
        prompt(
            "Name:",
            survey.name || ""
        );

    if(name === null){
        return;
    }


    const mobile =
        prompt(
            "Mobile:",
            survey.mobile || ""
        );

    if(mobile === null){
        return;
    }


    const age =
        prompt(
            "Age:",
            survey.age || ""
        );

    if(age === null){
        return;
    }


    const village =
        prompt(
            "Village:",
            survey.village || ""
        );

    if(village === null){
        return;
    }


    const gender =
        prompt(
            "Gender:",
            survey.gender || ""
        );

    if(gender === null){
        return;
    }


    db.collection("surveys")
    .doc(id)
    .update({

        name: name.trim(),

        mobile: mobile.trim(),

        age: age.trim(),

        village: village.trim(),

        gender: gender.trim()

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


// ======================================================
// DELETE SURVEY
// ======================================================

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


// ======================================================
// DELETE ALL SURVEYS
// ======================================================

document
.getElementById("deleteAllSurveysBtn")
?.addEventListener("click",function(){

    deleteAllSurveys();

});


function deleteAllSurveys(){

    if(allSurveys.length === 0){

        alert("There are no surveys to delete.");

        return;

    }


    const confirmed =
        prompt(
            "WARNING: This will permanently delete ALL survey records.\n\nType DELETE to confirm:"
        );


    if(confirmed !== "DELETE"){
        return;
    }


    const button =
        document.getElementById(
            "deleteAllSurveysBtn"
        );


    if(button){

        button.disabled = true;
        button.textContent = "Deleting...";

    }


    db.collection("surveys")
    .get()

    .then(function(snapshot){

        const docs =
            snapshot.docs;


        const batchSize = 400;


        function deleteBatch(startIndex){

            if(startIndex >= docs.length){

                return Promise.resolve();

            }


            const batch =
                db.batch();


            const end =
                Math.min(
                    startIndex + batchSize,
                    docs.length
                );


            for(
                let i = startIndex;
                i < end;
                i++
            ){

                batch.delete(
                    docs[i].ref
                );

            }


            return batch.commit()
            .then(function(){

                return deleteBatch(end);

            });

        }


        return deleteBatch(0);

    })

    .then(function(){

        alert(
            "All surveys deleted successfully."
        );

        loadSurveys();

    })

    .catch(function(error){

        console.error(
            "Delete all surveys error:",
            error
        );

        alert(
            "Delete all failed: " +
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


// ======================================================
// SURVEY ANSWERS
// ======================================================

function showSurveyAnswers(survey){

    const modal =
        document.getElementById("answerModal");

    const body =
        document.getElementById("answerModalBody");


    if(!modal || !body){
        return;
    }


    body.innerHTML = "";


    const photoURL =
        getSurveyPhotoURL(survey);


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

<div>
<strong>Surveyor</strong><br>
${escapeHTML(
    survey.surveyorEmail ||
    survey.surveyorId ||
    survey.createdBy ||
    ""
)}
</div>

</div>

${
photoURL
?
`
<div style="
    margin-top:20px;
    text-align:center;
">

<strong>📷 Survey Photo</strong>

<br><br>

<img
    src="${escapeHTML(photoURL)}"
    alt="Survey Photo"
    style="
        max-width:100%;
        width:300px;
        max-height:400px;
        object-fit:contain;
        border-radius:12px;
        border:2px solid #ddd;
        cursor:pointer;
    "
    onclick="openSurveyPhoto('${escapeHTML(photoURL)}')"
>

<br><br>

<button
    type="button"
    class="primary"
    onclick="openSurveyPhoto('${escapeHTML(photoURL)}')"
>
    🔍 Open Full Photo
</button>

</div>
`
:
`
<div style="
    margin-top:20px;
    color:#888;
    text-align:center;
">
    📷 No Photo Uploaded
</div>
`
}

`;


    body.appendChild(respondent);


    let answers =
        survey.answers ||
        survey.responses ||
        survey.questions ||
        survey.responsesData ||
        null;


    if(
        answers &&
        !Array.isArray(answers) &&
        typeof answers === "object"
    ){

        const converted = [];

        Object.keys(answers).forEach(function(key){

            converted.push({

                question: key,

                answer: answers[key]

            });

        });

        answers = converted;

    }


    if(Array.isArray(answers)){

        answers.forEach(function(item,index){

            const answerItem =
                document.createElement("div");

            answerItem.className =
                "answer-item";


            let questionText =
                item.question ||
                item.questionText ||
                item.text ||
                item.title ||
                ("Question " + (index + 1));


            let answerValue =
                item.answer;


            if(answerValue === undefined){
                answerValue = item.value;
            }


            if(answerValue === undefined){
                answerValue = item.response;
            }


            if(Array.isArray(answerValue)){
                answerValue =
                    answerValue.join(", ");
            }


            if(
                answerValue &&
                typeof answerValue === "object"
            ){

                answerValue =
                    JSON.stringify(
                        answerValue
                    );

            }


            answerItem.innerHTML = `

<div class="answer-question">
${escapeHTML(questionText)}
</div>

<div class="answer-value">
${escapeHTML(
    answerValue === undefined ||
    answerValue === null ||
    answerValue === ""
    ? "No answer"
    : answerValue
)}
</div>

`;


            body.appendChild(answerItem);

        });

    }
    else{

        const ignoredFields = [

            "name",
            "mobile",
            "age",
            "gender",
            "village",

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

            "photoURL",
            "photoUrl",
            "photo",
            "imageURL",
            "imageUrl",
            "image",
            "cloudinaryURL",
            "cloudinaryUrl",
            "cloudinary",
            "photoURLCloudinary",
            "uploadedPhoto",
            "uploadedImage"

        ];


        let found = false;


        Object.keys(survey).forEach(function(key){

            if(
                ignoredFields.includes(key) ||
                key === "id"
            ){
                return;
            }


            const value =
                survey[key];


            if(
                value === null ||
                value === undefined ||
                value === ""
            ){
                return;
            }


            found = true;


            const answerItem =
                document.createElement("div");

            answerItem.className =
                "answer-item";


            let displayValue = value;


            if(Array.isArray(value)){

                displayValue =
                    value.join(", ");

            }
            else if(
                typeof value === "object"
            ){

                displayValue =
                    JSON.stringify(value);

            }


            answerItem.innerHTML = `

<div class="answer-question">
${escapeHTML(key)}
</div>

<div class="answer-value">
${escapeHTML(displayValue)}
</div>

`;


            body.appendChild(answerItem);

        });


        if(!found){

            const noAnswer =
                document.createElement("p");

            noAnswer.textContent =
                "No answer data found for this survey.";

            body.appendChild(noAnswer);

        }

    }


    modal.classList.add("show");

}


// CLOSE ANSWER MODAL

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
?.addEventListener("click",function(event){

    if(event.target === this){

        this.classList.remove("show");

    }

});


// ======================================================
// SURVEYOR MANAGEMENT
// ======================================================

function loadSurveyors(){

    db.collection("surveyors")
    .get()

    .then(function(snapshot){

        allSurveyors = [];

        snapshot.forEach(function(doc){

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

        populateFilterDropdowns();

    })

    .catch(function(error){

        console.error(
            "Surveyor load error:",
            error
        );

    });

}


// ======================================================
// IMPORTANT SURVEYOR MATCHING FIX
// ======================================================

function getSurveyorIdentifiers(surveyor){

    const values = [

        surveyor.email,

        surveyor.surveyorEmail,

        surveyor.id,

        surveyor.uid,

        surveyor.userId

    ];


    return values

        .filter(function(value){

            return value !== undefined &&
                   value !== null &&
                   String(value).trim() !== "";

        })

        .map(function(value){

            return normalizeValue(value);

        });

}


function getSurveyIdentifiers(survey){

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

        .filter(function(value){

            return value !== undefined &&
                   value !== null &&
                   String(value).trim() !== "";

        })

        .map(function(value){

            return normalizeValue(value);

        });

}


function surveyBelongsToSurveyor(
    survey,
    surveyor
){

    const surveyorIdentifiers =
        getSurveyorIdentifiers(
            surveyor
        );


    const surveyIdentifiers =
        getSurveyIdentifiers(
            survey
        );


    if(
        surveyorIdentifiers.length === 0 ||
        surveyIdentifiers.length === 0
    ){

        return false;

    }


    return surveyorIdentifiers.some(function(id){

        return surveyIdentifiers.includes(id);

    });

}


// ======================================================
// RENDER SURVEYOR MANAGEMENT
// ======================================================

function renderSurveyorManagement(){

    const table =
        document.getElementById(
            "surveyorManagementTable"
        );


    if(!table){
        return;
    }


    table.innerHTML = "";


    allSurveyors.forEach(function(surveyor){

        let total = 0;
        let today = 0;
        let week = 0;
        let month = 0;


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
                    survey.createdAt ||
                    survey.timestamp ||
                    survey.submittedAt
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


        const email =
            surveyor.email ||
            surveyor.surveyorEmail ||
            surveyor.id;


        const row =
            document.createElement("tr");


        row.innerHTML = `

<td>
${escapeHTML(email)}
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

${
enabled

?

`<span style="
color:green;
font-weight:bold;
">
🟢 Active
</span>

<button
class="warning"
type="button"
>
Disable
</button>`

:

`<span style="
color:red;
font-weight:bold;
">
🔴 Disabled
</span>

<button
class="success"
type="button"
>
Enable
</button>`

}

</td>

`;


        const statusButton =
            row.querySelector("button");


        if(statusButton){

            statusButton.addEventListener(
                "click",
                function(){

                    toggleSurveyor(
                        email,
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

window.toggleSurveyor =
function(email,enabled){

    db.collection("surveyors")
    .doc(email)
    .update({

        enabled: enabled

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

        console.error(
            "Surveyor status update error:",
            error
        );


        db.collection("surveyors")
        .where("email","==",email)
        .get()

        .then(function(snapshot){

            if(snapshot.empty){

                throw error;

            }


            const updates = [];


            snapshot.forEach(function(doc){

                updates.push(
                    doc.ref.update({
                        enabled: enabled
                    })
                );

            });


            return Promise.all(updates);

        })

        .then(function(){

            alert(
                enabled
                ? "Surveyor enabled."
                : "Surveyor disabled."
            );


            loadSurveyors();

        })

        .catch(function(finalError){

            alert(
                "Status update failed: " +
                finalError.message
            );

        });

    });

};


// ======================================================
// DAILY LIMIT
// ======================================================

function loadDailyLimit(){

    const input =
        document.getElementById(
            "dailyLimitInput"
        );


    if(!input){
        return;
    }


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


    if(!input){
        return;
    }


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

        dailyLimit: limit,

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


// ======================================================
// LOGOUT
// ======================================================

document
.getElementById("logoutBtn")
?.addEventListener("click",function(){

    firebase.auth()
    .signOut()

    .then(function(){

        window.location.replace(
            "index.html"
        );

    })

    .catch(function(error){

        console.error(
            "Logout error:",
            error
        );

    });

});


// ======================================================
// START
// ======================================================

initializeQuestionBuilder();

console.log(
    "Admin JS initialized successfully."
);
