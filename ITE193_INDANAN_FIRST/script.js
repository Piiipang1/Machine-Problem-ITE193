// show / hide password
document.getElementById("showPass").addEventListener("change", function () {
    const pass = document.getElementById("password");
    pass.type = this.checked ? "text" : "password";
});

function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const message = document.getElementById("message");

    fetch("credentials.json")
        .then(response => response.json())
        .then(data => {
            const found = data.users.find(u => u.username === user && u.password === pass);

            if (found) {
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

function exitApp() {
    window.close();
}
