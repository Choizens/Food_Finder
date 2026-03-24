let countdownTimer = null;
let lockoutTime = 0;
const lockoutMessages = [
    "15 seconds lockout due to 3 failed attempts",
    "30 seconds lockout due to 6 failed attempts",
    "60 seconds lockout due to 9 failed attempts",
    "60 seconds lockout due to 13 failed attempts"
];

let failedAttempts = 0; // Initialize failedAttempts variable

document.addEventListener('DOMContentLoaded', () => {
    const messElement = document.getElementById('mess');
    const forgotPasswordMsgElement = document.getElementById('forgot-password-msg');

    // Check for blocked redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('blocked')) {
        messElement.textContent = 'Your account has been blocked by the super admin';
        messElement.style.display = 'block';
        messElement.style.color = 'red';
    }

    const savedLockoutEndTime = localStorage.getItem('lockoutEndTime');
    const savedFailedAttempts = localStorage.getItem('failedAttempts');
    const savedMessage = localStorage.getItem('errorMessage');
    const savedForgotPasswordMessage = localStorage.getItem('forgotPasswordMessage');

    if (savedFailedAttempts) {
        failedAttempts = parseInt(savedFailedAttempts);
    }

    if (savedMessage) {
        messElement.textContent = savedMessage;
        messElement.style.display = "block";
    }

    if (savedForgotPasswordMessage === "true") {
        forgotPasswordMsgElement.style.display = "block";
    }

    if (savedLockoutEndTime) {
        const currentTime = new Date().getTime();
        const remainingTime = Math.ceil((parseInt(savedLockoutEndTime) - currentTime) / 1000);

        if (remainingTime > 0) {
            lockoutTime = remainingTime;
            const lockoutMessage = localStorage.getItem('lockoutMessage') || "You are locked out.";
            showLockoutMessage(lockoutMessage);
            disableLoginUI(true);
            startCountdown(lockoutTime);
        } else {
            clearLockoutState();
        }
    }

    // Add event listener to forgot password link to clear state
    const forgotPasswordLinks = document.querySelectorAll('a[href="Forgot_password.html"]');
    forgotPasswordLinks.forEach(link => {
        link.addEventListener('click', handleForgotPasswordClick);
    });
});

function handleForgotPasswordClick(event) {
    // Clear all lockout and error states when navigating to forgot password
    clearLockoutState();

    // Clear the countdown timer if active
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    // Clear UI elements
    document.getElementById('mess').style.display = "none";
    document.getElementById('mess').textContent = "";
    document.getElementById('forgot-password-msg').style.display = "none";
    document.getElementById('countdown-display').textContent = '';

    // Re-enable login UI
    disableLoginUI(false);

    // Clear input fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    // Reset failed attempts counter
    failedAttempts = 0;
}

function handleLogin(event) {
    event.preventDefault();
    if (countdownTimer) return;

    const formData = new FormData(event.target);

    fetch(event.target.action, {
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            const messElement = document.getElementById('mess');
            const forgotPasswordMsgElement = document.getElementById('forgot-password-msg');

            if (data.status === 'success') {
                clearLockoutState();
                window.location.href = data.redirect;
            } else {
                failedAttempts++;

                if (failedAttempts > 13) {
                    failedAttempts = 1; // Reset failed attempts after 13
                }

                localStorage.setItem('failedAttempts', failedAttempts);

                if (failedAttempts % 3 === 2 || failedAttempts % 3 === 0) {
                    forgotPasswordMsgElement.style.display = "block";
                    localStorage.setItem('forgotPasswordMessage', "true");
                }

                if (failedAttempts === 3 || failedAttempts === 6 || failedAttempts === 9 || failedAttempts === 13) {
                    lockoutTime = failedAttempts === 13 ? 60 : [15, 30, 60][Math.floor(failedAttempts / 3) - 1];
                    const lockoutMessage = lockoutMessages[Math.min(Math.floor(failedAttempts / 3) - 1, 3)];
                    showLockoutMessage(lockoutMessage);
                    disableLoginUI(true);
                    startCountdown(lockoutTime);
                } else {
                    messElement.textContent = data.message;
                    messElement.style.display = "block";
                    localStorage.setItem('errorMessage', data.message);
                }
            }
        });
}

function showLockoutMessage(message) {
    document.getElementById('countdown-display').textContent = message;
    localStorage.setItem('lockoutMessage', message);
}

function startCountdown(seconds) {
    const endTime = new Date().getTime() + seconds * 1000;
    localStorage.setItem('lockoutEndTime', endTime);

    countdownTimer = setInterval(() => {
        const currentTime = new Date().getTime();
        const remainingTime = Math.ceil((parseInt(localStorage.getItem('lockoutEndTime')) - currentTime) / 1000);

        if (remainingTime > 0) {
            document.getElementById('countdown-display').textContent = `Please wait ${remainingTime}s...`;
            hideInputValues(); // Hide input values during countdown
        } else {
            clearInterval(countdownTimer);
            countdownTimer = null;
            document.getElementById('countdown-display').textContent = '';
            disableLoginUI(false);
            clearLockoutState();
            showInputValues(); // Show input values after countdown ends

            document.getElementById('mess').style.display = "none";
            document.getElementById('forgot-password-msg').style.display = "none";
        }
    }, 1000);
}

function hideInputValues() {
    document.getElementById('username').value = ''; // Clear the username field
    document.getElementById('password').value = ''; // Clear the password field
}

function showInputValues() {
    // Reassign the values to the input fields if you have stored them elsewhere
    // For this to work, you need to store the values before hiding them and reassign them here
    // This is just a placeholder and needs implementation for real values storage
    // Example (assumes you store them somewhere, e.g., in variables or localStorage):
    // document.getElementById('username').value = storedUsername;
    // document.getElementById('password').value = storedPassword;
}

function disableLoginUI(disable) {
    document.getElementById('login-button').disabled = disable;
    document.getElementById('username').disabled = disable;
    document.getElementById('password').disabled = disable;

    const registerLink = document.getElementById('register-link');
    if (disable) {
        registerLink.classList.add('disabled-link');
        registerLink.onclick = (event) => event.preventDefault();
    } else {
        registerLink.classList.remove('disabled-link');
        registerLink.onclick = null;
    }
}

function clearLockoutState() {
    localStorage.removeItem('lockoutEndTime');
    localStorage.removeItem('lockoutMessage');
    localStorage.removeItem('failedAttempts');
    localStorage.removeItem('errorMessage');
    localStorage.removeItem('forgotPasswordMessage');
}

function togglePasswordVisibility() {
    const passwordField = document.getElementById('password');
    passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
}