// App Loaded
console.log("App Loaded");

// Login Button
document.getElementById("loginBtn").addEventListener("click", function () {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("message");

    message.innerHTML = "";

    if (email === "" || password === "") {
        message.innerHTML = "Please enter Email and Password.";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)

    .then(function () {

        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", email);

        window.location.href = "survey.html";

    })

    .catch(function (error) {

        message.innerHTML = error.message;
        console.log(error);

    });

});
