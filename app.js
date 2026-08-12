console.log("Login App Loaded");

const ADMIN_EMAIL = "goswamivinod2305@gmail.com";

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

    loginBtn.addEventListener("click", async function () {

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

        try {

            // IMPORTANT:
            // Login session will remain ONLY in this browser tab.
            await firebase.auth().setPersistence(
                firebase.auth.Auth.Persistence.SESSION
            );

            const result =
                await firebase.auth()
                    .signInWithEmailAndPassword(
                        email,
                        password
                    );

            const user = result.user;

            if (
                user.email.toLowerCase() ===
                ADMIN_EMAIL.toLowerCase()
            ) {

                window.location.replace("admin.html");

            } else {

                window.location.replace("survey.html");

            }

        } catch (error) {

            console.error("Login Error:", error);

            message.textContent =
                "Login failed: " + error.message;

            loginBtn.disabled = false;
            loginBtn.textContent = "Login";
        }

    });

}
