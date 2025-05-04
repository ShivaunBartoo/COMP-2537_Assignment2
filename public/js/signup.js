let submitButton = document.querySelector("#submit");
submitButton.addEventListener("click", async (event) => {
    const data = {
        username: document.querySelector("[name='username']").value,
        email: document.querySelector("[name='email']").value,
        password: document.querySelector("[name='password']").value,
    };
    fetch("/signupSubmit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.status == "bad") {
                const displayError = (field, message) => {
                    let errorMessage = document.getElementById(`${field}-error`);
                    if (message) {
                        errorMessage.style.display = "block";
                        errorMessage.innerHTML = message;
                    } else {
                        errorMessage.style.display = "none";
                    }
                };
                displayError("username", data.username);
                displayError("email", data.email);
                displayError("password", data.password);
            } else {
                window.location.href = "/members";
            }
        })
        .catch((error) => {
            console.error("Error:", error);
        });
});
