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

        const photoURL =
            survey.photos &&
            survey.photos.photo1 &&
            survey.photos.photo1.url
                ? survey.photos.photo1.url
                : "";

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

        row.innerHTML = `

<td>
${
photoURL
?
`<img
src="${escapeHTML(photoURL)}"
alt="Survey Photo"
style="
width:70px;
height:70px;
object-fit:cover;
border-radius:8px;
border:2px solid #ddd;
cursor:pointer;
"
onclick="window.open('${escapeHTML(photoURL)}','_blank')"
>`
:
`<span style="color:#888;">No Photo</span>`
}
</td>

<td>${name}</td>

<td>${mobile}</td>

<td>${age}</td>

<td>${gender}</td>

<td>${village}</td>

<td>
${
photoURL
?
`<img
src="${escapeHTML(photoURL)}"
alt="Survey Photo"
style="
width:70px;
height:70px;
object-fit:cover;
border-radius:8px;
border:2px solid #ddd;
cursor:pointer;
"
onclick="window.open('${escapeHTML(photoURL)}','_blank')"
>`
:
`<span style="color:#888;">No Photo</span>`
}
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
