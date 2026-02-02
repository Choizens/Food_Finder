let currentUserEmail = "";
let otpTimer; // Variable to hold the countdown interval

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
}

// STEP 1: Modified for "Sending..." state
async function verifyEmailAndSendOTP() {
    const email = document.getElementById('reset-email').value;
    const btn = document.querySelector('input[onclick="verifyEmailAndSendOTP()"]');
    const errorDisplay = document.getElementById('error1');

    if(!email) return alert("Please enter your email.");
    
    // Change button to professional "Sending" state
    btn.value = "Sending OTP...";
    btn.disabled = true;
    errorDisplay.textContent = "";

    try {
        const res = await fetch('Phpfile/reset_logic.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'send_otp', email: email })
        });
        const data = await res.json();
        
        if(data.success) {
            currentUserEmail = email;
            goToStep(2);
            startCountdown(120); // Start 60 second timer
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

// Timer Logic
function startCountdown(seconds) {
    let timeLeft = seconds;
    const timerDisplay = document.getElementById('error2'); // Using error2 area for the timer
    
    // Clear any existing timer
    clearInterval(otpTimer);

    otpTimer = setInterval(() => {
        timeLeft--;
        timerDisplay.style.color = "#d35400";
        timerDisplay.textContent = `Time remaining: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            alert("OTP has expired. Returning to Step 1.");
            resetToStep1();
        }
    }, 1000);
}

function resetToStep1() {
    clearInterval(otpTimer);
    document.getElementById('otp-input').value = "";
    document.getElementById('error2').textContent = "";
    
    // Reset the first button
    const btn = document.querySelector('input[onclick="verifyEmailAndSendOTP()"]');
    btn.value = "Send OTP";
    btn.disabled = false;
    
    goToStep(1);
}

// STEP 2: Modified to stop the timer on success
async function verifyOTP() {
    const otp = document.getElementById('otp-input').value;
    const res = await fetch('Phpfile/reset_logic.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'verify_otp', email: currentUserEmail, otp: otp })
    });
    const data = await res.json();
    
    if(data.success) {
        clearInterval(otpTimer);
        const select = document.getElementById('security-q-reset');
        select.innerHTML = ""; // Clear old options

        // Populate dropdown with all available questions from the account
        data.questions.forEach(q => {
            let option = document.createElement('option');
            option.value = q.type; // This will be 'a1', 'a2', or 'a3'
            option.textContent = q.text;
            select.appendChild(option);
        });

        goToStep(3);
    } else {
        document.getElementById('error2').textContent = data.message;
    }
}

async function verifySecurityAnswer() {
    const ans = document.getElementById('security-a-reset').value;
    const qColumn = document.getElementById('security-q-reset').value; // This gets 'a1', 'a2', or 'a3'
    const errorDisplay = document.getElementById('error3');

    if(!ans) {
        errorDisplay.textContent = "Please enter your answer.";
        return;
    }

    const res = await fetch('Phpfile/reset_logic.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            action: 'verify_answer', 
            email: currentUserEmail, 
            answer: ans,
            column: qColumn // Sending the specific column to check
        })
    });
    
    const data = await res.json();
    
    if(data.success) {
        goToStep(4);
    } else {
        errorDisplay.textContent = data.message;
        errorDisplay.style.color = "red";
    }
}

// STEP 4: Update Password
async function updatePassword() {
    const p1 = document.getElementById('new-password').value;
    const p2 = document.getElementById('confirm-new-password').value;
    
    if(p1 !== p2) {
        document.getElementById('error4').textContent = "Passwords do not match";
        return;
    }

    const res = await fetch('Phpfile/reset_logic.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'update_password', email: currentUserEmail, password: p1 })
    });
    const data = await res.json();
    
    if(data.success) {
        alert("Password updated successfully!");
        window.location.href = "base.html";
    } else {
        document.getElementById('error4').textContent = data.message;
    }
}