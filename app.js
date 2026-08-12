console.log("App Loaded");

firebase.auth().onAuthStateChanged(function (user) {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Admin ko survey form se dashboard par bhejo
    if (user.email === "goswamivinod2305@gmail.com") {
        window.location.href = "admin.html";
        return;
    }

    console.log("Surveyor logged in:", user.email);
});


// LOGIN
document.getElementById("loginBtn").addEventListener("click", function () {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("message");

    message.innerHTML = "";

    if (!email || !password) {
        message.innerHTML = "Please enter Email and Password.";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)

        .then(function (result) {

            const user = result.user;

            localStorage.setItem("userLoggedIn", "true");
            localStorage.setItem("userEmail", user.email);

            if (
                user.email.toLowerCase() ===
                "goswamivinod2305@gmail.com"
            ) {

                window.location.href = "admin.html";

            } else {

                window.location.href = "survey.html";

            }

        })

        .catch(function (error) {

            console.error(error);

            message.innerHTML =
                "Login failed: " + error.message;

        });

});
