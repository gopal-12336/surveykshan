// Admin Panel Loaded
console.log("Admin Panel Loaded");

// Sirf Admin ko access
auth.onAuthStateChanged(function(user){

    if(!user){
        window.location.href = "index.html";
        return;
    }

    if(user.email !== "ramgopal140103@gmail.com"){
        alert("Access Denied");
        window.location.href = "survey.html";
        return;
    }

    loadSurvey();

});

// Survey Load
function loadSurvey(){

    let total = 0;
    let bjp = 0;
    let congress = 0;
    let aap = 0;
    let other = 0;

    const table = document.getElementById("surveyTable");
    table.innerHTML = "";

    db.collection("surveys")
    .orderBy("createdAt","desc")
    .get()

    .then(function(snapshot){

        snapshot.forEach(function(doc){

            const data = doc.data();

            total++;

            if(data.party==="BJP") bjp++;
            else if(data.party==="Congress") congress++;
            else if(data.party==="AAP") aap++;
            else other++;

            table.innerHTML += `
            <tr>
                <td>${data.name || ""}</td>
                <td>${data.mobile || ""}</td>
                <td>${data.age || ""}</td>
                <td>${data.gender || ""}</td>
                <td>${data.village || ""}</td>
                <td>${data.party || ""}</td>
                <td>${data.candidate || ""}</td>
                <td>${data.feedback || ""}</td>
            </tr>
            `;

        });

        document.getElementById("totalSurvey").innerHTML = total;
        document.getElementById("bjpCount").innerHTML = bjp;
        document.getElementById("congressCount").innerHTML = congress;
        document.getElementById("aapCount").innerHTML = aap;
        document.getElementById("otherCount").innerHTML = other;

    })

    .catch(function(error){

        alert(error.message);

    });

}

// Logout
document.getElementById("logoutBtn").addEventListener("click",function(){

    auth.signOut().then(function(){

        window.location.href="index.html";

    });

});
