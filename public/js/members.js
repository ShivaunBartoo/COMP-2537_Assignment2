setImage();

async function setImage() {
    console.log("getting cat");
    const cat = document.getElementById("cat");
    const response = await fetch("/cat");
    if (!response.ok) {
        throw new Error("Failed to fetch cat path");
    }
    const catPath = await response.text();
    console.log("path: ", catPath);
    cat.setAttribute("src", catPath);
    cat.style.visibility = "";
}
