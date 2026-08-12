console.log("Login App Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

    loginBtn.addEventListener("click", function () {

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value.trim();

        const message =
            document.getElementById("message");

        message.textContent = "";

        if (!email || !password) {

            message.textContent =
                "Please enter Email and Password.";

            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";


        firebase.auth()
            .signInWithEmailAndPassword(
                email,
                password
            )

            .then(function (result) {

                const user = result.user;

                localStorage.setItem(
                    "userLoggedIn",
                    "true"
                );

                localStorage.setItem(
                    "userEmail",
                    user.email
                );


                if (
                    user.email.toLowerCase() ===
                    ADMIN_EMAIL.toLowerCase()
                ) {

                    window.location.replace(
                        "admin.html"
                    );

                } else {

                    window.location.replace(
                        "survey.html"
                    );

                }

            })

            .catch(function (error) {

                console.error(
                    "Login Error:",
                    error
                );

                message.textContent =
                    "Login failed: " +
                    error.message;

                loginBtn.disabled = false;
                loginBtn.textContent = "Login";

            });

    });

}
