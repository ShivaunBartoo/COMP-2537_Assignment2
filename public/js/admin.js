async function changeUserType(userID, userType){
    const response = await fetch("/userStatus", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userID, user_type: userType }),
    });
    if(response.ok){
        document.getElementById(`${userID}`).innerHTML = userType;
    }
    else{
        const error = await response.text()
        console.log("error: " + error);
    }
}