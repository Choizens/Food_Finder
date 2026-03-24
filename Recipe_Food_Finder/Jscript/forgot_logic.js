let currentUserEmail = "";
let otpTimer; // Variable to hold the countdown interval
let otpExpiryTime = null; // Store when OTP expires

// Helper to switch between steps
function goToStep(step) {
    // Hide all sections
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step4').style.display = 'none';

    // Show active section
    document.getElementById(`step${step}`).style.display = 'block';

    // Update visual dots
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`step${i}-dot`);
        if (i <= step) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    }

    // Update the progress line width
    // Step 1: 0%, Step 2: 33%, Step 3: 66%, Step 4: 100%
    const progressLine = document.querySelector('.progress-line');
    const width = ((step - 1) / 3) * 100;
    progressLine.style.setProperty('--progress-width', `${width}%`);

    // Clear OTP inputs when going to step 2
    if (step === 2) {
        clearOTPInputs();
        // Focus first OTP input
        setTimeout(() => {
            const firstInput = document.querySelector('.otp-input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // Initialize password validation when going to step 4
    if (step === 4) {
        initializePasswordValidation();
    }

    // Save current step to sessionStorage
    sessionStorage.setItem('currentStep', step);
}

// Email username lookup logic
let usernameLookupTimeout;

function debouncedFetchUsername() {
    clearTimeout(usernameLookupTimeout);
    const email = document.getElementById('reset-email').value;
    const display = document.getElementById('username-display');
    const errorDisplay = document.getElementById('error1');

    if (!email || !email.includes('@')) {
        display.textContent = "";
        return;
    }

    usernameLookupTimeout = setTimeout(() => {
        fetchUsername(email);
    }, 500); // 500ms debounce
}

async function fetchUsername(email) {
    const display = document.getElementById('username-display');

    try {
        const res = await fetch('Phpfile/reset_logic.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_email', email: email })
        });
        const data = await res.json();

        if (data.success) {
            display.textContent = `Username: ${data.username}`;
            display.style.color = "#27ae60"; // Green for success
        } else {
            display.textContent = "Email not registered";
            display.style.color = "#e74c3c"; // Red for not found
        }
    } catch (err) {
        console.error("Error fetching username:", err);
    }
}

// STEP 1: Modified for "Sending..." state
async function verifyEmailAndSendOTP() {
    const email = document.getElementById('reset-email').value;
    const btn = document.querySelector('input[onclick="verifyEmailAndSendOTP()"]');
    const errorDisplay = document.getElementById('error1');

    if (!email) return alert("Please enter your email.");

    // Change button to professional "Sending" state
    btn.value = "Sending OTP...";
    btn.disabled = true;
    errorDisplay.textContent = "";

    try {
        const res = await fetch('Phpfile/reset_logic.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_otp', email: email })
        });
        const data = await res.json();

        if (data.success) {
            currentUserEmail = email;
            // Save email to sessionStorage
            sessionStorage.setItem('resetEmail', email);

            // Populate user details in Step 2
            const step2Username = document.getElementById('step2-username');
            const step2Idno = document.getElementById('step2-idno');
            if (step2Username) step2Username.textContent = data.username || 'N/A';
            if (step2Idno) step2Idno.textContent = data.idnum || 'N/A';

            goToStep(2);
            startCountdown(120); // Start 120 second timer
        } else {
            errorDisplay.textContent = data.message;
            btn.value = "Send OTP";
            btn.disabled = false;
        }
    } catch (err) {
        errorDisplay.textContent = "Server error. Please try again later.";
        btn.value = "Send OTP";
        btn.disabled = false;
    }
}

// Timer Logic with persistence
function startCountdown(seconds) {
    // Calculate expiry time
    otpExpiryTime = Date.now() + (seconds * 1000);
    sessionStorage.setItem('otpExpiryTime', otpExpiryTime);

    // Clear any existing timer
    clearInterval(otpTimer);

    runCountdown();
}

function runCountdown() {
    const timerDisplay = document.getElementById('error2');

    otpTimer = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.floor((otpExpiryTime - now) / 1000);

        if (timeLeft > 0) {
            timerDisplay.style.color = "#d35400";
            timerDisplay.textContent = `Time remaining: ${timeLeft}s`;
        } else {
            clearInterval(otpTimer);
            clearSessionData();
            alert("OTP has expired. Returning to Email Validation.");
            resetToStep1();
        }
    }, 1000);
}

function resetToStep1() {
    clearInterval(otpTimer);
    clearSessionData();
    clearOTPInputs();
    document.getElementById('error2').textContent = "";

    // Reset the first button
    const btn = document.querySelector('input[onclick="verifyEmailAndSendOTP()"]');
    btn.value = "Send OTP";
    btn.disabled = false;

    goToStep(1);
}

function clearSessionData() {
    sessionStorage.removeItem('otpExpiryTime');
    sessionStorage.removeItem('currentStep');
    sessionStorage.removeItem('resetEmail');
}

// STEP 2: Modified to stop the timer on success
async function verifyOTP() {
    const otp = document.getElementById('otp-input').value;

    if (!otp || otp.length !== 6) {
        document.getElementById('error2').textContent = "Please enter the complete 6-digit OTP";
        document.getElementById('error2').style.color = "red";
        return;
    }

    const res = await fetch('Phpfile/reset_logic.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', email: currentUserEmail, otp: otp })
    });
    const data = await res.json();

    if (data.success) {
        clearInterval(otpTimer);
        clearSessionData(); // Clear session data after successful verification

        // Populate all 3 questions
        if (data.questions && data.questions.length >= 3) {
            document.getElementById('q1-text').textContent = data.questions[0].text;
            document.getElementById('q2-text').textContent = data.questions[1].text;
            document.getElementById('q3-text').textContent = data.questions[2].text;
        }

        goToStep(3);
    } else {
        document.getElementById('error2').textContent = data.message;
        document.getElementById('error2').style.color = "red";
    }
}

async function verifySecurityAnswer() {
    const ans1 = document.getElementById('ans1').value;
    const ans2 = document.getElementById('ans2').value;
    const ans3 = document.getElementById('ans3').value;
    const errorDisplay = document.getElementById('error3');

    if (!ans1 || !ans2 || !ans3) {
        errorDisplay.textContent = "Please answer all security questions.";
        return;
    }

    const res = await fetch('Phpfile/reset_logic.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'verify_answer',
            email: currentUserEmail,
            ans1: ans1,
            ans2: ans2,
            ans3: ans3
        })
    });

    const data = await res.json();

    if (data.success) {
        goToStep(4);
    } else {
        errorDisplay.textContent = data.message;
        errorDisplay.style.color = "red";
    }
}

function toggleVisibility(id, icon) {
    const field = document.getElementById(id);
    if (field.type === "password") {
        field.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ============================================
// PASSWORD VALIDATION FUNCTIONS
// ============================================

function initializePasswordValidation() {
    const passwordInput = document.getElementById('new-password');

    // Add real-time validation on input
    passwordInput.addEventListener('input', function () {
        validatePasswordRequirements(this.value);
    });

    // Initial validation (empty state)
    validatePasswordRequirements('');
}

function validatePasswordRequirements(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Update visual indicators
    updateRequirement('req-length', requirements.length);
    updateRequirement('req-uppercase', requirements.uppercase);
    updateRequirement('req-lowercase', requirements.lowercase);
    updateRequirement('req-number', requirements.number);
    updateRequirement('req-special', requirements.special);

    return requirements;
}

function updateRequirement(elementId, isMet) {
    const element = document.getElementById(elementId);
    const icon = element.querySelector('.req-icon');

    if (isMet) {
        element.classList.add('met');
        icon.textContent = '✓';
        icon.style.color = '#27ae60';
    } else {
        element.classList.remove('met');
        icon.textContent = '○';
        icon.style.color = '#95a5a6';
    }
}

function checkPasswordRequirements(password) {
    const requirements = validatePasswordRequirements(password);
    return Object.values(requirements).every(req => req === true);
}

// STEP 4: Update Password with validation
async function updatePassword() {
    const p1 = document.getElementById('new-password').value;
    const p2 = document.getElementById('confirm-new-password').value;
    const errorDisplay = document.getElementById('error4');

    // Check if password meets all requirements
    if (!checkPasswordRequirements(p1)) {
        errorDisplay.textContent = "Password does not meet all requirements";
        errorDisplay.style.color = "red";
        return;
    }

    // Check if passwords match
    if (p1 !== p2) {
        errorDisplay.textContent = "Passwords do not match";
        errorDisplay.style.color = "red";
        return;
    }

    const res = await fetch('Phpfile/reset_logic.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_password', email: currentUserEmail, password: p1 })
    });
    const data = await res.json();

    if (data.success) {
        alert("Password updated successfully!");
        clearSessionData(); // Clear session data on success
        window.location.href = "base.html";
    } else {
        errorDisplay.textContent = data.message;
        errorDisplay.style.color = "red";
    }
}

// ============================================
// MODERN OTP INPUT FUNCTIONALITY
// ============================================

// Initialize OTP inputs when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeOTPInputs();
    restoreSession(); // Restore session on page load
});

function initializeOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const hiddenOtpInput = document.getElementById('otp-input');

    if (!otpInputs.length) return; // Exit if OTP inputs don't exist yet

    otpInputs.forEach((input, index) => {
        // Handle input
        input.addEventListener('input', function (e) {
            const value = e.target.value;

            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            // Update hidden input with complete OTP
            updateHiddenOTP();

            // Auto-focus next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        // Handle backspace
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        // Handle paste
        input.addEventListener('paste', function (e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').slice(0, 6);

            if (!/^\d+$/.test(pastedData)) return;

            pastedData.split('').forEach((char, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = char;
                }
            });

            updateHiddenOTP();

            // Focus the next empty input or the last one
            const nextIndex = Math.min(pastedData.length, otpInputs.length - 1);
            otpInputs[nextIndex].focus();
        });

        // Select all on focus
        input.addEventListener('focus', function () {
            this.select();
        });
    });

    function updateHiddenOTP() {
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        hiddenOtpInput.value = otp;
    }
}

// Function to clear OTP inputs
function clearOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => input.value = '');
    const hiddenInput = document.getElementById('otp-input');
    if (hiddenInput) hiddenInput.value = '';
}

// Resend OTP function
async function resendOTP() {
    if (!currentUserEmail) {
        alert("Session expired. Please start over.");
        resetToStep1();
        return;
    }

    clearOTPInputs();
    clearInterval(otpTimer);

    const errorDisplay = document.getElementById('error2');
    errorDisplay.textContent = "Resending OTP...";
    errorDisplay.style.color = "#d35400";

    try {
        const res = await fetch('Phpfile/reset_logic.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_otp', email: currentUserEmail })
        });
        const data = await res.json();

        if (data.success) {
            errorDisplay.textContent = "New OTP sent successfully!";
            errorDisplay.style.color = "green";
            startCountdown(120);

            // Focus first OTP input
            setTimeout(() => {
                const firstInput = document.querySelector('.otp-input');
                if (firstInput) firstInput.focus();
            }, 100);
        } else {
            errorDisplay.textContent = data.message;
            errorDisplay.style.color = "red";
        }
    } catch (err) {
        errorDisplay.textContent = "Failed to resend OTP. Please try again.";
        errorDisplay.style.color = "red";
    }
}

// ============================================
// SESSION RESTORATION & PAGE REFRESH PREVENTION
// ============================================

function restoreSession() {
    const savedStep = sessionStorage.getItem('currentStep');
    const savedEmail = sessionStorage.getItem('resetEmail');
    const savedExpiryTime = sessionStorage.getItem('otpExpiryTime');

    if (savedStep && savedEmail) {
        currentUserEmail = savedEmail;

        // If user was on step 2 and timer was running
        if (savedStep === '2' && savedExpiryTime) {
            otpExpiryTime = parseInt(savedExpiryTime);
            const now = Date.now();
            const timeLeft = Math.floor((otpExpiryTime - now) / 1000);

            if (timeLeft > 0) {
                // Timer is still valid, restore step 2 and continue countdown
                goToStep(2);
                runCountdown();
            } else {
                // Timer expired, go back to step 1
                alert("OTP has expired. Please request a new one.");
                resetToStep1();
            }
        } else if (savedStep === '3' || savedStep === '4') {
            // Restore other steps if user was there
            goToStep(parseInt(savedStep));
        }
    }
}

// Prevent page refresh/close during OTP verification
window.addEventListener('beforeunload', function (e) {
    const currentStep = sessionStorage.getItem('currentStep');

    // Only show warning if user is on step 2 (OTP verification)
    if (currentStep === '2') {
        const confirmationMessage = 'Your OTP verification is in progress. Are you sure you want to leave?';
        e.returnValue = confirmationMessage;
        return confirmationMessage;
    }
});

// Optional: Warn user if they try to navigate away
window.addEventListener('popstate', function (e) {
    const currentStep = sessionStorage.getItem('currentStep');

    if (currentStep === '2') {
        const confirmLeave = confirm('Your OTP verification is in progress. Do you want to leave this page?');
        if (!confirmLeave) {
            // Push state back to prevent navigation
            history.pushState(null, null, window.location.href);
        } else {
            clearSessionData();
        }
    }
});

// Set initial history state
window.history.pushState(null, null, window.location.href);