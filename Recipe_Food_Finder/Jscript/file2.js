let eyecon = document.getElementById("eyes");
let passwordInput = document.getElementById("password");
let msg = document.getElementById("mess");
let stret = document.getElementById("stret");

// Toggle password visibility
eyecon.onclick = function() {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyecon.src = "photos/eye1.png";
    } else {
        passwordInput.type = "password";
        eyecon.src = "photos/eye2.png";
    }
};

// Password strength checker
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;

    // Show or hide message
    msg.style.display = password.length > 0 ? "block" : "none";

    const hasNumbers = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (hasLetters && hasNumbers && hasSpecialChars) {
        if (password.length < 6) {
            stret.innerHTML = "Weak";
            msg.style.color = "#ff5925";
            passwordInput.style.borderColor = "#ff5925";
        } else if (password.length < 12) {
            stret.innerHTML = "Medium";
            msg.style.color = "yellow";
            passwordInput.style.borderColor = "yellow";
        } else {
            stret.innerHTML = "Strong";
            msg.style.color = "green";
            passwordInput.style.borderColor = "green";
        }
    } else {
        stret.innerHTML = "Weak";
        msg.style.color = "#ff5925";
        passwordInput.style.borderColor = "#ff5925";
    }
});

// Prevent context menu and certain keyboard shortcuts
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123 || (e.ctrlKey && (e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) || e.keyCode == 'U'.charCodeAt(0))) {
        return false;
    }
};