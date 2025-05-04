let submitButton = document.querySelector("#submit");
submitButton.addEventListener("click", async (event) => {
    const data = {
        email: document.querySelector("[name='email']").value,
        password: document.querySelector("[name='password']").value,
    };
    fetch("/loginSubmit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.status == "bad") {
                let errorMessage = document.getElementById(`error`);
                errorMessage.style.display = "block";
            } else {
                window.location.href = "/members";
            }
        })
        .catch((error) => {
            console.error("Error:", error);
        });
});
