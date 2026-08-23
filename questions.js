console.log("Surveykshan Question Management Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

let editingId = null;


// =====================================================
// AUTHENTICATION
// =====================================================

firebase.auth().onAuthStateChanged(function(user){

    if(!user){

        window.location.href = "index.html";
        return;

    }

    if(
        !user.email ||
        user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ){

        window.location.href = "survey.html";
        return;

    }

    loadQuestions();

});


// =====================================================
// QUESTION TYPE
// =====================================================

document.addEventListener("DOMContentLoaded", function(){

    const questionType =
        document.getElementById("questionType");

    const optionsSection =
        document.getElementById("optionsSection");

    const typeInfo =
        document.getElementById("typeInfo");


    if(questionType){

        questionType.addEventListener("change", function(){

            if(this.value === "radio"){

                optionsSection.style.display = "block";

                typeInfo.textContent =
                    "Single Choice: Respondent can select only one option.";

            }

            else if(this.value === "checkbox"){

                optionsSection.style.display = "block";

                typeInfo.textContent =
                    "Multiple Choice: Respondent can select more than one option.";

            }

            else{

                optionsSection.style.display = "none";

                typeInfo.textContent =
                    "Text Answer: Respondent will type an answer.";

            }

        });

    }


    const addButton =
        document.getElementById("addOption");

    if(addButton){

        addButton.addEventListener(
            "click",
            addOption
        );

    }


    document.addEventListener(
        "click",
        function(event){

            if(
                event.target.classList.contains(
                    "remove-option"
                )
            ){

                removeOption(
                    event.target
                );

            }

        }
    );


    const saveButton =
        document.getElementById(
            "saveQuestion"
        );

    if(saveButton){

        saveButton.addEventListener(
            "click",
            saveQuestion
        );

    }

});


// =====================================================
// ADD OPTION
// =====================================================

function addOption(){

    const optionsBox =
        document.getElementById(
            "optionsBox"
        );

    if(!optionsBox){
        return;
    }


    const count =
        optionsBox.querySelectorAll(
            ".option-row"
        ).length + 1;


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

    input.type = "text";

    input.className =
        "optionInput";

    input.placeholder =
        "Option " + count;


    const button =
        document.createElement(
            "button"
        );

    button.type = "button";

    button.className =
        "remove-option";

    button.textContent = "×";


    row.appendChild(input);

    row.appendChild(button);

    optionsBox.appendChild(row);

}


// =====================================================
// REMOVE OPTION
// =====================================================

function removeOption(button){

    const optionsBox =
        document.getElementById(
            "optionsBox"
        );

    if(!optionsBox){
        return;
    }


    const rows =
        optionsBox.querySelectorAll(
            ".option-row"
        );


    if(rows.length <= 2){

        showMessage(
            "At least 2 options are required.",
            false
        );

        return;

    }


    button.parentElement.remove();

}


// =====================================================
// SAVE / UPDATE QUESTION
// =====================================================

function saveQuestion(){

    const questionInput =
        document.getElementById(
            "questionText"
        );

    const questionType =
        document.getElementById(
            "questionType"
        );


    if(!questionInput || !questionType){
        return;
    }


    const question =
        questionInput.value.trim();

    const type =
        questionType.value;


    if(!question){

        showMessage(
            "Please enter a question.",
            false
        );

        questionInput.focus();

        return;

    }


    let options = [];


    if(
        type === "radio" ||
        type === "checkbox"
    ){

        const inputs =
            document.querySelectorAll(
                ".optionInput"
            );


        inputs.forEach(function(input){

            const value =
                input.value.trim();

            if(value){
                options.push(value);
            }

        });


        if(options.length < 2){

            showMessage(
                "Please enter at least 2 answer options.",
                false
            );

            return;

        }

    }


    const data = {

        question: question,

        type: type,

        options: options,

        updatedAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

    };


    let operation;


    if(editingId){

        operation =
            db.collection("questions")
            .doc(editingId)
            .update(data);

    }

    else{

        operation =
            db.collection("questions")
            .add({

                question: question,

                type: type,

                options: options,

                createdAt:
                    firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

                updatedAt:
                    firebase.firestore
                    .FieldValue
                    .serverTimestamp()

            });

    }


    operation

    .then(function(){

        if(editingId){

            showMessage(
                "✅ Question updated successfully.",
                true
            );

        }

        else{

            showMessage(
                "✅ Question saved successfully.",
                true
            );

        }


        editingId = null;


        resetQuestionForm();


        loadQuestions();

    })


    .catch(function(error){

        console.error(
            "Question Save Error:",
            error
        );


        showMessage(
            "❌ " + error.message,
            false
        );

    });

}


// =====================================================
// RESET FORM
// =====================================================

function resetQuestionForm(){

    const questionText =
        document.getElementById(
            "questionText"
        );

    const questionType =
        document.getElementById(
            "questionType"
        );

    const optionsBox =
        document.getElementById(
            "optionsBox"
        );

    const optionsSection =
        document.getElementById(
            "optionsSection"
        );

    const typeInfo =
        document.getElementById(
            "typeInfo"
        );

    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if(questionText){
        questionText.value = "";
    }


    if(questionType){
        questionType.value = "radio";
    }


    if(optionsSection){
        optionsSection.style.display = "block";
    }


    if(typeInfo){

        typeInfo.textContent =
            "Single Choice: Respondent can select only one option.";

    }


    if(optionsBox){

        optionsBox.innerHTML = `

            <div class="option-row">

                <input
                    class="optionInput"
                    type="text"
                    placeholder="Option 1">

                <button
                    type="button"
                    class="remove-option">
                    ×
                </button>

            </div>

            <div class="option-row">

                <input
                    class="optionInput"
                    type="text"
                    placeholder="Option 2">

                <button
                    type="button"
                    class="remove-option">
                    ×
                </button>

            </div>

            <div class="option-row">

                <input
                    class="optionInput"
                    type="text"
                    placeholder="Option 3">

                <button
                    type="button"
                    class="remove-option">
                    ×
                </button>

            </div>

            <div class="option-row">

                <input
                    class="optionInput"
                    type="text"
                    placeholder="Option 4">

                <button
                    type="button"
                    class="remove-option">
                    ×
                </button>

            </div>

        `;

    }


    if(saveButton){

        saveButton.textContent =
            "💾 Save Question";

    }

}


// =====================================================
// LOAD QUESTIONS
// =====================================================

function loadQuestions(){

    const list =
        document.getElementById(
            "questionsList"
        );


    if(!list){
        return;
    }


    list.innerHTML =
        "Loading questions...";


    db.collection("questions")
    .orderBy("createdAt", "asc")
    .get()

    .then(function(snapshot){

        list.innerHTML = "";


        if(snapshot.empty){

            list.innerHTML =
                "<p>No questions added yet.</p>";

            return;

        }


        snapshot.forEach(function(doc){

            const data =
                doc.data();


            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "question-card";


            let typeName;


            if(data.type === "radio"){

                typeName =
                    "Single Choice";

            }

            else if(data.type === "checkbox"){

                typeName =
                    "Multiple Choice";

            }

            else{

                typeName =
                    "Text Answer";

            }


            let optionsHTML = "";


            if(
                Array.isArray(data.options) &&
                data.options.length > 0
            ){

                optionsHTML = `

                    <div class="question-options">

                        <strong>
                            Answer Options:
                        </strong>

                        <ol>

                            ${data.options.map(
                                function(option){

                                    return `
                                        <li>
                                            ${escapeHTML(option)}
                                        </li>
                                    `;

                                }
                            ).join("")}

                        </ol>

                    </div>

                `;

            }


            card.innerHTML = `

                <div>

                    <strong>
                        Question:
                    </strong>

                    <span>
                        ${escapeHTML(data.question)}
                    </span>

                </div>

                <br>

                <div>

                    <strong>
                        Type:
                    </strong>

                    ${typeName}

                </div>

                ${optionsHTML}

                <div class="card-buttons">

                    <button
                        type="button"
                        class="edit">
                        ✏️ Edit
                    </button>

                    <button
                        type="button"
                        class="delete">
                        🗑️ Delete
                    </button>

                </div>

            `;


            const editButton =
                card.querySelector(
                    ".edit"
                );


            const deleteButton =
                card.querySelector(
                    ".delete"
                );


            editButton.onclick =
                function(){

                    editQuestion(
                        doc.id,
                        data
                    );

                };


            deleteButton.onclick =
                function(){

                    deleteQuestion(
                        doc.id
                    );

                };


            list.appendChild(card);

        });

    })


    .catch(function(error){

        console.error(
            "Load Questions Error:",
            error
        );


        /*
         * If orderBy fails because old
         * questions do not have createdAt,
         * load without orderBy.
         */

        db.collection("questions")
        .get()

        .then(function(snapshot){

            list.innerHTML = "";


            if(snapshot.empty){

                list.innerHTML =
                    "<p>No questions added yet.</p>";

                return;

            }


            snapshot.forEach(function(doc){

                createQuestionCard(
                    doc.id,
                    doc.data(),
                    list
                );

            });

        })

        .catch(function(secondError){

            list.innerHTML =
                "❌ Unable to load questions: " +
                secondError.message;

        });

    });

}


// =====================================================
// CREATE QUESTION CARD
// =====================================================

function createQuestionCard(
    id,
    data,
    list
){

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "question-card";


    let typeName;


    if(data.type === "radio"){

        typeName =
            "Single Choice";

    }

    else if(data.type === "checkbox"){

        typeName =
            "Multiple Choice";

    }

    else{

        typeName =
            "Text Answer";

    }


    let optionsHTML = "";


    if(
        Array.isArray(data.options) &&
        data.options.length
    ){

        optionsHTML = `

            <div class="question-options">

                <strong>
                    Answer Options:
                </strong>

                <ol>

                    ${data.options.map(
                        function(option){

                            return `
                                <li>
                                    ${escapeHTML(option)}
                                </li>
                            `;

                        }
                    ).join("")}

                </ol>

            </div>

        `;

    }


    card.innerHTML = `

        <div>

            <strong>
                Question:
            </strong>

            ${escapeHTML(data.question)}

        </div>

        <br>

        <div>

            <strong>
                Type:
            </strong>

            ${typeName}

        </div>

        ${optionsHTML}

        <div class="card-buttons">

            <button
                type="button"
                class="edit">
                ✏️ Edit
            </button>

            <button
                type="button"
                class="delete">
                🗑️ Delete
            </button>

        </div>

    `;


    card.querySelector(".edit").onclick =
        function(){

            editQuestion(
                id,
                data
            );

        };


    card.querySelector(".delete").onclick =
        function(){

            deleteQuestion(
                id
            );

        };


    list.appendChild(card);

}


// =====================================================
// EDIT QUESTION
// =====================================================

function editQuestion(
    id,
    data
){

    editingId = id;


    const questionText =
        document.getElementById(
            "questionText"
        );

    const questionType =
        document.getElementById(
            "questionType"
        );

    const optionsBox =
        document.getElementById(
            "optionsBox"
        );

    const optionsSection =
        document.getElementById(
            "optionsSection"
        );

    const typeInfo =
        document.getElementById(
            "typeInfo"
        );

    const saveButton =
        document.getElementById(
            "saveQuestion"
        );


    if(questionText){

        questionText.value =
            data.question || "";

    }


    if(questionType){

        questionType.value =
            data.type || "radio";

    }


    if(
        data.type === "radio" ||
        data.type === "checkbox"
    ){

        optionsSection.style.display =
            "block";


        if(data.type === "radio"){

            typeInfo.textContent =
                "Single Choice: Respondent can select only one option.";

        }

        else{

            typeInfo.textContent =
                "Multiple Choice: Respondent can select more than one option.";

        }


        optionsBox.innerHTML = "";


        const options =
            Array.isArray(data.options)
            ? data.options
            : [];


        options.forEach(
            function(option,index){

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

                input.type = "text";

                input.className =
                    "optionInput";

                input.value =
                    option || "";

                input.placeholder =
                    "Option " +
                    (index + 1);


                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.className =
                    "remove-option";

                button.textContent =
                    "×";


                row.appendChild(input);

                row.appendChild(button);

                optionsBox.appendChild(row);

            }
        );


        if(options.length === 0){

            addOption();
            addOption();

        }

    }

    else{

        optionsSection.style.display =
            "none";

    }


    if(saveButton){

        saveButton.textContent =
            "💾 Update Question";

    }


    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

}


// =====================================================
// DELETE QUESTION
// =====================================================

function deleteQuestion(id){

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this question?"
        );


    if(!confirmDelete){
        return;
    }


    db.collection("questions")
    .doc(id)
    .delete()

    .then(function(){

        showMessage(
            "✅ Question deleted successfully.",
            true
        );

        loadQuestions();

    })

    .catch(function(error){

        console.error(
            "Delete Question Error:",
            error
        );


        showMessage(
            "❌ Delete failed: " +
            error.message,
            false
        );

    });

}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    text,
    success
){

    const message =
        document.getElementById(
            "message"
        );


    if(!message){
        return;
    }


    message.textContent =
        text;


    message.style.color =
        success
        ? "#2e7d32"
        : "#c62828";

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value){

    return String(
        value == null
        ? ""
        : value
    )

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
