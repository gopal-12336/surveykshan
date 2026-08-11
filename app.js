// ===============================
// APP LOADED
// ===============================

console.log("App Loaded");

// ===============================
// ADMIN EMAIL
// ===============================

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

// ===============================
// LOGIN BUTTON
// ===============================

document
    .getElementById("loginBtn")
    .addEventListener(
        "click",
        function () {

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value
                    .trim();

            const message =
                document.getElementById(
                    "message"
                );

            message.innerHTML = "";

            // ===============================
            // VALIDATION
            // ===============================

            if (
                email === "" ||
                password === ""
            ) {

                message.innerHTML =
                    "Please enter Email and Password.";

                return;

            }

            // ===============================
            // FIREBASE LOGIN
            // ===============================

            auth
                .signInWithEmailAndPassword(
                    email,
                    password
                )

                .then(
                    function (userCredential) {

                        const user =
                            userCredential.user;

                        console.log(
                            "Login successful:",
                            user.email
                        );

                        // ===============================
                        // SAVE LOGIN
                        // ===============================

                        localStorage.setItem(
                            "userLoggedIn",
                            "true"
                        );

                        localStorage.setItem(
                            "userEmail",
                            user.email
                        );

                        // ===============================
                        // ADMIN CHECK
                        // ===============================

                        if (
                            user.email &&
                            user.email
                                .toLowerCase() ===
                            ADMIN_EMAIL.toLowerCase()
                        ) {

                            console.log(
                                "Admin login detected."
                            );

                            window.location.href =
                                "admin.html";

                            return;

                        }

                        // ===============================
                        // SURVEYOR LOGIN
                        // ===============================

                        console.log(
                            "Surveyor login detected."
                        );

                        window.location.href =
                            "survey.html";

                    }
                )

                .catch(
                    function (error) {

                        console.error(
                            "Login Error:",
                            error
                        );

                        message.innerHTML =
                            error.message;

                    }
                );

        }
    );
