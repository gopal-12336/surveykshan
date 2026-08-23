console.log("Surveykshan Survey JS Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";
const DAILY_LIMIT = 20;

let currentQuestion = 0;
let answers = {
    basic: {},
    questions: {}
};

let questions = [];


// =====================================================
// START
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const submitButton = document.getElementById("submitSurvey");

    if (submitButton) {
        submitButton.addEventListener("click", submitSurvey);
    }

    const basicNext = document.getElementById("basicNextButton");

    if (basicNext) {
        basicNext.addEventListener("click", saveBasicDetails);
    }

    const nextButton = document.getElementById("nextButton");

    if (nextButton) {
        nextButton.addEventListener("click", nextQuestion);
    }

    const previousButton = document.getElementById("previousButton");

    if (previousButton) {
        previousButton.addEventListener("click", previousQuestion);
    }

    checkLogin();

});


// =====================================================
// LOGIN CHECK
// =====================================================

function checkLogin() {

    firebase.auth().onAuthStateChanged(function (user) {

        if (!user) {
            window.location.href = "index.html";
            return;
        }

        if (
            user.email &&
            user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        ) {
            window.location.href = "admin.html";
            return;
        }

        checkDailyLimit(user);

    });

}


// =====================================================
// DAILY LIMIT
// =====================================================

function checkDailyLimit(user) {

    getTodayCount(user)
        .then(function (count) {

            updateDailyProgress(count);

            if (count >= DAILY_LIMIT) {

                showMessage(
                    "Today's survey limit is completed.",
                    false
                );

                disableButtons();

            }

        })
        .catch(function (error) {

            console.error(error);

        });

}


function getTodayCount(user) {

    const start = new Date();

    start.setHours(0, 0, 0, 0);

    return db.collection("surveys")
        .where("surveyorEmail", "==", user.email)
        .get()
        .then(function (snapshot) {

            let count = 0;

            snapshot.forEach(function (doc) {

                const data = doc.data();

                if (!data.createdAt) return;

                let date;

                if (
                    data.createdAt &&
                    typeof data.createdAt.toDate === "function"
                ) {

                    date = data.createdAt.toDate();

                }

                if (date && date >= start) {
                    count++;
                }

            });

            return count;

        });

}


// =====================================================
// DAILY PROGRESS
// =====================================================

function updateDailyProgress(count) {

    const text =
        document.getElementById("dailyProgressText");

    const remaining =
        document.getElementById("dailyRemainingText");

    const bar =
        document.getElementById("dailyProgressBar");

    if (!text || !remaining || !bar) return;

    const percent =
        Math.min((count / DAILY_LIMIT) * 100, 100);

    text.textContent =
        count + " / " + DAILY_LIMIT;

    remaining.textContent =
        count >= DAILY_LIMIT
            ? "Daily limit reached"
            : "Remaining today: " +
              (DAILY_LIMIT - count);

    bar.style.width = percent + "%";

    if (count >= DAILY_LIMIT) {

        bar.style.background = "#c62828";

    } else if (percent >= 80) {

        bar.style.background = "#ef6c00";

    } else {

        bar.style.background = "#1565c0";

    }

}


// =====================================================
// BASIC DETAILS
// =====================================================

function saveBasicDetails() {

    const name =
        document.getElementById("name").value.trim();

    const mobile =
        document.getElementById("mobile").value.trim();

    const age =
        document.getElementById("age").value.trim();

    const gender =
        document.getElementById("gender").value;

    const village =
        document.getElementById("village").value.trim();

    const assembly =
        document.getElementById("assembly").value.trim();

    const party =
        document.getElementById("party").value;

    const candidate =
        document.getElementById("candidate").value.trim();


    if (
        !name ||
        !mobile ||
        !age ||
        !gender ||
        !village ||
        !assembly ||
        !party
    ) {

        showMessage(
            "Please fill all required details.",
            false
        );

        return;

    }


    answers.basic = {

        name: name,
        mobile: mobile,
        age: age,
        gender: gender,
        village: village,
        assembly: assembly,
        party: party,
        candidate: candidate

    };


    loadQuestions();

}


// =====================================================
// LOAD QUESTIONS FROM FIRESTORE
// =====================================================

function loadQuestions() {

    db.collection("questions")
        .get()
        .then(function (snapshot) {

            questions = [];

            snapshot.forEach(function (doc) {

                const data = doc.data();

                questions.push({

                    id: doc.id,

                    question:
                        data.question || "",

                    type:
                        data.type || "radio",

                    options:
                        Array.isArray(data.options)
                            ? data.options
                            : []

                });

            });


            if (questions.length === 0) {

                showMessage(
                    "No questions available.",
                    false
                );

                return;

            }


            currentQuestion = 0;

            showQuestionPage();

        })
        .catch(function (error) {

            console.error(
                "Question loading error:",
                error
            );

            showMessage(
                "Unable to load questions.",
                false
            );

        });

}


// =====================================================
// SHOW QUESTION PAGE
// =====================================================

function showQuestionPage() {

    const basic =
        document.getElementById("basicDetailsStep");

    const question =
        document.getElementById("questionStep");

    if (basic) {
        basic.classList.remove("active");
    }

    if (question) {
        question.classList.add("active");
    }

    renderQuestion();

}


// =====================================================
// RENDER QUESTION
// =====================================================

function renderQuestion() {

    if (!questions.length) return;

    const q =
        questions[currentQuestion];


    const number =
        document.getElementById("questionNumber");

    const text =
        document.getElementById("questionText");

    const options =
        document.getElementById("questionOptions");

    const previous =
        document.getElementById("previousButton");

    const next =
        document.getElementById("nextButton");

    const submit =
        document.getElementById("submitSurvey");


    number.textContent =
        "Question " +
        (currentQuestion + 1) +
        " of " +
        questions.length;


    text.textContent =
        q.question;


    options.innerHTML = "";


    const saved =
        answers.questions[currentQuestion];


    q.options.forEach(function (option) {

        const label =
            document.createElement("label");

        label.className = "option-label";


        const input =
            document.createElement("input");


        input.value = option;


        // MULTIPLE CHOICE

        if (q.type === "checkbox") {

            input.type = "checkbox";

            input.name =
                "question_" + currentQuestion;


            if (
                Array.isArray(saved) &&
                saved.includes(option)
            ) {

                input.checked = true;

                label.classList.add("selected");

            }


            input.addEventListener(
                "change",
                function () {

                    let selected =
                        answers.questions[currentQuestion];

                    if (!Array.isArray(selected)) {
                        selected = [];
                    }


                    if (this.checked) {

                        if (!selected.includes(option)) {
                            selected.push(option);
                        }

                        label.classList.add("selected");

                    } else {

                        selected =
                            selected.filter(function (item) {
                                return item !== option;
                            });

                        label.classList.remove("selected");

                    }


                    answers.questions[currentQuestion] =
                        selected;

                }
            );


        }

        // SINGLE CHOICE

        else {

            input.type = "radio";

            input.name = "surveyQuestion";


            if (saved === option) {

                input.checked = true;

                label.classList.add("selected");

            }


            input.addEventListener(
                "change",
                function () {

                    answers.questions[currentQuestion] =
                        this.value;


                    options
                        .querySelectorAll(".option-label")
                        .forEach(function (item) {

                            item.classList.remove(
                                "selected"
                            );

                        });


                    label.classList.add("selected");

                }
            );

        }


        label.appendChild(input);

        label.appendChild(
            document.createTextNode(" " + option)
        );

        options.appendChild(label);

    });


    previous.style.display =
        currentQuestion === 0
            ? "none"
            : "block";


    if (
        currentQuestion ===
        questions.length - 1
    ) {

        next.style.display = "none";

        submit.style.display = "block";

    } else {

        next.style.display = "block";

        submit.style.display = "none";

    }


    updateQuestionProgress();

}


// =====================================================
// NEXT
// =====================================================

function nextQuestion() {

    if (!isCurrentQuestionAnswered()) {

        showMessage(
            "Please select at least one option.",
            false
        );

        return;

    }


    if (
        currentQuestion <
        questions.length - 1
    ) {

        currentQuestion++;

        clearMessage();

        renderQuestion();

    }

}


// =====================================================
// PREVIOUS
// =====================================================

function previousQuestion() {

    if (currentQuestion > 0) {

        currentQuestion--;

        clearMessage();

        renderQuestion();

    }

}


// =====================================================
// CHECK ANSWER
// =====================================================

function isCurrentQuestionAnswered() {

    const answer =
        answers.questions[currentQuestion];


    if (Array.isArray(answer)) {

        return answer.length > 0;

    }


    return (
        answer !== undefined &&
        answer !== null &&
        answer !== ""
    );

}


// =====================================================
// PROGRESS
// =====================================================

function updateQuestionProgress() {

    const bar =
        document.getElementById("surveyProgressBar");

    const progress =
        document.getElementById("questionProgress");

    const title =
        document.getElementById("stepTitle");


    const percent =
        ((currentQuestion + 1) /
        questions.length) * 100;


    if (bar) {
        bar.style.width =
            percent + "%";
    }


    if (progress) {

        progress.textContent =
            "Question " +
            (currentQuestion + 1) +
            " / " +
            questions.length;

    }


    if (title) {

        title.textContent =
            "Survey Questions";

    }

}


// =====================================================
// SUBMIT SURVEY
// =====================================================

function submitSurvey() {

    const user =
        firebase.auth().currentUser;


    if (!user) {

        showMessage(
            "Please login again.",
            false
        );

        return;

    }


    if (!isCurrentQuestionAnswered()) {

        showMessage(
            "Please answer this question.",
            false
        );

        return;

    }


    for (
        let i = 0;
        i < questions.length;
        i++
    ) {

        const answer =
            answers.questions[i];


        if (
            answer === undefined ||
            answer === "" ||
            (
                Array.isArray(answer) &&
                answer.length === 0
            )
        ) {

            currentQuestion = i;

            renderQuestion();

            showMessage(
                "Please answer Question " +
                (i + 1) +
                ".",
                false
            );

            return;

        }

    }


    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting...";


    getTodayCount(user)

        .then(function (count) {

            if (count >= DAILY_LIMIT) {

                throw new Error(
                    "Daily limit reached."
                );

            }


            const questionAnswers = {};


            questions.forEach(function (q, index) {

                questionAnswers[
                    "question_" + (index + 1)
                ] = {

                    question: q.question,

                    type: q.type,

                    answer:
                        answers.questions[index]

                };

            });


            return db.collection("surveys").add({

                name:
                    answers.basic.name,

                mobile:
                    answers.basic.mobile,

                age:
                    answers.basic.age,

                gender:
                    answers.basic.gender,

                village:
                    answers.basic.village,

                assembly:
                    answers.basic.assembly,

                party:
                    answers.basic.party,

                candidate:
                    answers.basic.candidate,

                questions:
                    questionAnswers,

                surveyorEmail:
                    user.email,

                surveyorId:
                    user.uid,

                createdAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            });

        })

        .then(function () {

            showMessage(
                "✅ Survey submitted successfully!",
                true
            );


            answers = {
                basic: {},
                questions: {}
            };


            currentQuestion = 0;


            clearBasicForm();


            document
                .getElementById("questionStep")
                .classList.remove("active");


            document
                .getElementById("basicDetailsStep")
                .classList.add("active");


            document
                .getElementById("stepTitle")
                .textContent =
                "Respondent Details";


            document
                .getElementById("questionProgress")
                .textContent =
                "Basic Details";


            document
                .getElementById("surveyProgressBar")
                .style.width = "0%";


            submitButton.disabled = false;

            submitButton.textContent =
                "Submit Survey";


            return getTodayCount(user);

        })

        .then(function (newCount) {

            updateDailyProgress(newCount);

        })

        .catch(function (error) {

            console.error(
                "Submit error:",
                error
            );


            showMessage(
                "❌ " + error.message,
                false
            );


            submitButton.disabled = false;

            submitButton.textContent =
                "Submit Survey";

        });

}


// =====================================================
// CLEAR FORM
// =====================================================

function clearBasicForm() {

    [
        "name",
        "mobile",
        "age",
        "village",
        "assembly",
        "candidate"
    ].forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });


    const gender =
        document.getElementById("gender");

    if (gender) {
        gender.value = "";
    }


    const party =
        document.getElementById("party");

    if (party) {
        party.value = "";
    }

}


// =====================================================
// BUTTON CONTROL
// =====================================================

function disableButtons() {

    [
        "basicNextButton",
        "nextButton",
        "previousButton",
        "submitSurvey"
    ].forEach(function (id) {

        const button =
            document.getElementById(id);

        if (button) {
            button.disabled = true;
        }

    });

}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(text, success) {

    const message =
        document.getElementById("message");

    if (!message) return;

    message.textContent = text;

    message.style.color =
        success
            ? "green"
            : "red";

}


function clearMessage() {

    const message =
        document.getElementById("message");

    if (message) {
        message.textContent = "";
    }

}
