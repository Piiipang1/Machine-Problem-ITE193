
const showPass = document.getElementById("showPass");
if (showPass) {
    showPass.addEventListener("change", function () {
        const pass = document.getElementById("password");
        pass.type = this.checked ? "text" : "password";
    });
}


function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const message = document.getElementById("message");

    fetch("credential.json")
        .then(response => response.json())
        .then(data => {

            let users = JSON.parse(localStorage.getItem("users")) || data.users;

            const found = users.find(u => u.username === user && u.password === pass);

            if (found) {
                localStorage.setItem("loggedUser", user);
                localStorage.setItem("users", JSON.stringify(users));

                message.style.color = "green";
                message.textContent = "Login successful!";

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 800);

            } else {
                message.style.color = "red";
                message.textContent = "Invalid username or password.";
            }
        });
}


if (document.getElementById("profileUser")) {
    const user = localStorage.getItem("loggedUser");
    document.getElementById("profileUser").textContent = user;
}


function logout() {
    localStorage.removeItem("loggedUser");
    window.location.href = "index.html";
}


function toggleChangePass() {
    const box = document.getElementById("changeBox");
    box.style.display = box.style.display === "block" ? "none" : "block";
}


function changePassword() {

    const oldPass = document.getElementById("oldPass").value;
    const newPass = document.getElementById("newPass").value;
    const confirmPass = document.getElementById("confirmPass").value;
    const message = document.getElementById("passMessage");

    let users = JSON.parse(localStorage.getItem("users"));
    const currentUser = localStorage.getItem("loggedUser");

    const userObj = users.find(u => u.username === currentUser);


    if (userObj.password !== oldPass) {
        message.style.color = "red";
        message.textContent = "Old password incorrect.";
        return;
    }


    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!regex.test(newPass)) {
        message.style.color = "red";
        message.textContent = "Password must be 8+ chars with small, big & special character.";
        return;
    }

    if (newPass !== confirmPass) {
        message.style.color = "red";
        message.textContent = "Passwords do not match.";
        return;
    }


    userObj.password = newPass;
    localStorage.setItem("users", JSON.stringify(users));

    message.style.color = "green";
    message.textContent = "Password successfully updated!";


    document.getElementById("oldPass").value = "";
    document.getElementById("newPass").value = "";
    document.getElementById("confirmPass").value = "";


    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ users: users }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "credential.json");
    dlAnchorElem.click();
}