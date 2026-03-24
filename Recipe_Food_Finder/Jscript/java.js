document.addEventListener("DOMContentLoaded", () => {
    // Helper function to check if an element exists and log an error if not
    function addEventListenerIfExists(selector, event, callback) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, callback);
        } else {
            console.error(`${selector} not found!`);
        }
    }

    // Attach input listener for ID validation
    addEventListenerIfExists("#idInput", "input", function () {
        validateNumber(this);
    });

    // Attach input listener for email validation
    addEventListenerIfExists("#emailInput", "input", function () {
        validateEmail(this);
    });

    // Attach submit listener for form validation
    addEventListenerIfExists("#registrationForm", "submit", function (event) {
        validateForm(event);
    });
});


// Function to toggle password visibility
function togglePassword(id) {
    const passwordField = document.getElementById(id);
    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
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

let isSubmitting = false; // Add a flag to prevent multiple submissions

async function validateForm(event) {
    // Prevent default form submission
    if (event && event.preventDefault) {
        event.preventDefault();
    } else {
        console.error("Event object is missing or invalid.");
        return false;
    }

    // If a submission is already in progress, do nothing
    if (isSubmitting) {
        return false;
    }

    // Set flag to indicate submission is in progress
    isSubmitting = true;

    // Retrieve input fields
    const fields = {
        firstName: document.getElementById("firstName"),
        middleName: document.getElementById("middleInitial"),
        lastName: document.getElementById("lastName"),
        idNo: document.getElementById("idInput"),
        email: document.getElementById("email"),
        extensionName: document.getElementById("extensionName"),
        username: document.getElementById("username"),
        purok: document.getElementById("purok"),
        barangay: document.getElementById("barangay"),
        city: document.getElementById("city"),
        province: document.getElementById("province"),
        country: document.getElementById("country"),
        zipCode: document.getElementById("zipCode"),
        password: document.getElementById("password"),
        confirmPassword: document.getElementById("confirmPassword"),
        birthdate: document.getElementById("custom-birthdate"),
        gender: document.getElementById("sex"),
        // Added security fields to the fields object
        q1: document.querySelector('select[name="security_q1"]'),
        q2: document.querySelector('select[name="security_q2"]'),
        q3: document.querySelector('select[name="security_q3"]'),
        a1: document.getElementsByName("answer1")[0],
        a2: document.getElementsByName("answer2")[0],
        a3: document.getElementsByName("answer3")[0],
    };

    const matchMessageLabel = document.getElementById("message100");

    // Validate that all required inputs exist in the DOM
    for (const key in fields) {
        if (!fields[key]) {
            console.warn(`The input field "${key}" is missing in the DOM.`);
        }
    }

    let validationPassed = true;

    // Validate individual fields if they exist
    if (fields.firstName && !validateName(fields.firstName)) validationPassed = false;
    if (fields.middleName && !validateMid(fields.middleName)) validationPassed = false;
    if (fields.lastName && !validateLast(fields.lastName)) validationPassed = false;
    if (fields.gender && !validateSex(fields.gender)) validationPassed = false;

    if (fields.idNo) {
        const idValidationResult = await validateNumber(fields.idNo);
        if (!idValidationResult) validationPassed = false;
    }

    if (fields.email && !validateEmail(fields.email)) validationPassed = false;

    if (fields.extensionName && !validateEx(fields.extensionName)) validationPassed = false;

    if (fields.username) {
        const usernameValid = await validateUser(fields.username);
        if (!usernameValid) validationPassed = false;
    }

    if (fields.purok && !validatePurok(fields.purok)) validationPassed = false;
    if (fields.barangay && !validateBarangay(fields.barangay)) validationPassed = false;
    if (fields.city && !validateCity(fields.city)) validationPassed = false;
    if (fields.province && !validateProvince(fields.province)) validationPassed = false;
    if (fields.country && !validateCountry(fields.country)) validationPassed = false;
    if (fields.zipCode && !validateZip(fields.zipCode)) validationPassed = false;

    // Validate Security Questions
    if (!validateSecurityAnswer(1)) validationPassed = false;
    if (!validateSecurityAnswer(2)) validationPassed = false;
    if (!validateSecurityAnswer(3)) validationPassed = false;

    if (fields.password) {
        const passwordValue = fields.password.value.trim();
        if (!validatePasswordStrength(passwordValue)) validationPassed = false;

        if (fields.confirmPassword) {
            const confirmPasswordValue = fields.confirmPassword.value.trim();
            if (!validatePasswordMatch(passwordValue, confirmPasswordValue, matchMessageLabel)) {
                validationPassed = false;
            }
        }
    }

    if (fields.birthdate) {
        calculateAge();
        const ageMessage = document.getElementById('message16');
        if (ageMessage && ageMessage.textContent.trim()) {
            validationPassed = false;
        }
    }

    const allEmpty = Object.values(fields).every(input => !input || input.value.trim() === "");

    if (allEmpty) {
        Swal.fire({
            icon: "error",
            title: "Form Submission Error",
            text: "Please fill in at least one required field.",
        });
        isSubmitting = false; // Reset the flag
        return false;
    }

    if (!validationPassed) {
        Swal.fire({
            icon: "error",
            title: "Form Validation Error",
            text: "Please fix the errors in the form before submitting.",
        });
        isSubmitting = false; // Reset the flag
        return false;
    }

    const form = document.getElementById("registrationForm");
    if (form) {
        form.submit();
    } else {
        console.error("Registration form element is missing.");
    }

    isSubmitting = false; // Reset the flag after successful submission
    return true;
}

// Added validateSecurityAnswer function to match your Country validation logic
function validateSecurityAnswer(index) {
    const selectElement = document.querySelector(`select[name="security_q${index}"]`);
    const inputElement = document.querySelector(`input[name="answer${index}"]`);
    const messageLabel = document.getElementById(`error-q${index}`);

    const namePattern = /^[A-Za-zÑñ\s'-]+$/;
    const threeConsecutiveLettersPattern = /(.)\1{2}/;
    const consecutiveSpacesPattern = /\s{2,}/;
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/;
    const allUppercasePattern = /^[A-ZÑ\s'-]+$/;

    if (!selectElement || !inputElement) return false;

    const rawValue = inputElement.value;
    const trimmedValue = rawValue.trim();

    // Check if question is selected
    if (selectElement.value === "") {
        if (messageLabel) messageLabel.textContent = "Please select a security question.";
        return false;
    }

    // Check if answer is empty
    if (trimmedValue === '') {
        if (messageLabel) messageLabel.textContent = 'Answer cannot be empty.';
        return false;
    }

    // Length check
    if (trimmedValue.length < 2 || trimmedValue.length > 50) {
        if (messageLabel) messageLabel.textContent = 'Answer must be 2-50 characters long.';
        return false;
    }

    // Pattern checks
    if (consecutiveSpacesPattern.test(rawValue)) {
        if (messageLabel) messageLabel.textContent = 'Answer cannot contain consecutive spaces.';
        return false;
    }

    if (!namePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Answer must only contain letters.';
        return false;
    }

    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    if (allUppercasePattern.test(trimmedValue) && trimmedValue.length > 1) {
        if (messageLabel) messageLabel.textContent = 'Answer must not be entirely uppercase.';
        return false;
    }

    // Uppercase start check
    const words = trimmedValue.split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0 && !validWordPattern.test(words[i])) {
            if (messageLabel) messageLabel.textContent = `Word "${words[i]}" must start with uppercase.`;
            return false;
        }
    }

    if (messageLabel) messageLabel.textContent = '';
    return true;
}






function calculateAge() {
    const birthdateInput = document.getElementById('custom-birthdate');
    const ageInput = document.getElementById('custom-age');
    const message16 = document.getElementById('message16');
    
    // Clear outputs initially
    ageInput.value = '';
    message16.textContent = '';
    
    // Check if birthdate is empty
    if (!birthdateInput.value) {
        message16.textContent = 'Birthday cannot be empty.';
        return;
    }

    const today = new Date();
    const birthdate = new Date(birthdateInput.value);
    const age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    const dayDiff = today.getDate() - birthdate.getDate();

    // Adjust age if birth month or day is after today's date
    const adjustedAge = monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0) ? age : age - 1;

    if (adjustedAge < 0) {
        message16.textContent = 'Invalid birthdate.';
        return;
    }
    
    ageInput.value = adjustedAge;
    
    // Check for age restriction
    if (adjustedAge < 18) {
        message16.textContent = '18 below are not qualified to register.';
    }
}


let passwordExists = false; // Global variable to track the state

function validatePasswordStrength(password) {
    const msg = document.getElementById("mess");
    const stret = document.getElementById("stret");
    const message95 = document.getElementById("message95");
    
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // 1. Reset UI if empty
    if (password === '') {
        msg.style.display = "none";
        stret.textContent = '';
        message95.textContent = '';
        passwordExists = false; 
        return false;
    }

    msg.style.display = "block";

    // 2. Determine Strength Logic
    let strength = "";
    let color = "";
    let isValid = false;

    if (password.length < 6) {
        strength = "Password is Weak (Too short)";
        color = "red";
    } else if (password.length >= 6 && (!hasLetters || !hasDigits)) {
        strength = "Password is Weak (Must include letters and numbers)";
        color = "red";
    } else if (password.length >= 6 && password.length < 10 && hasLetters && hasDigits && !hasSpecialChars) {
        strength = "Password is Medium";
        color = "orange";
    } else if (password.length >= 8 && hasLetters && hasDigits && hasSpecialChars) {
        strength = "Password is Strong";
        color = "green";
        isValid = true; // Minimum requirement for a "valid" password
    } else {
        // Fallback for length without special chars
        strength = "Password is Medium";
        color = "orange";
    }

    // Apply basic strength UI
    stret.textContent = strength;
    stret.style.color = color;
    msg.style.color = color;

    // 3. Availability Check (AJAX)
    // Only check database if the password is at least "Strong" (8+ chars, L, D, S)
    if (isValid) {
        fetch('Phpfile/check_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                stret.textContent = "Password already exists";
                stret.style.color = "red";
                msg.style.color = "red";
                passwordExists = true;
            } else {
                stret.textContent = "Password available & Strong";
                stret.style.color = "green";
                msg.style.color = "green";
                passwordExists = false;
            }
        })
        .catch(error => {
            console.error("Error:", error);
            message95.textContent = "Database connection error.";
            message95.style.color = "red";
        });
    } else {
        message95.textContent = '';
        passwordExists = false;
    }

    // 4. Return true only if it meets your "Strong" criteria
    return isValid;
}




// Function to validate password match
function validatePasswordMatch(password, confirmPassword, matchMessageLabel) {
    if (confirmPassword === "") {
        matchMessageLabel.textContent = "";
        return true;
    }

    if (password !== confirmPassword) {
        matchMessageLabel.textContent = "Passwords do not match.";
        matchMessageLabel.style.color = "red";
        return false;
    } else {
        matchMessageLabel.textContent = "Passwords match.";
        matchMessageLabel.style.color = "green";
        return true;
    }
}




/* PASS */


function togglePassword(passwordFieldId) {
    const passwordInput = document.getElementById(passwordFieldId);
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
}

/* Check if an input is empty and set validity message */
function checkEmptyInput(input, message) {
    if (!input.value.trim()) {
        input.setCustomValidity(message);
    } else {
        input.setCustomValidity("");
    }
}

/* FIRST NAME VALIDATION */
function validateName(input) {
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces anywhere
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; // Valid characters only
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const allCapsPattern = /^[A-ZÑ\s]+$/; // Reject names in all caps
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; // Words must start with uppercase, followed by lowercase

    const value = input.value; // Do NOT trim here initially
    const messageLabel = document.querySelector('label[for="message"]');

    // Clear the message label initially
    if (messageLabel) messageLabel.textContent = '';

    // Validation: Consecutive spaces (2 or more) anywhere in the input
    if (consecutiveSpacesPattern.test(value)) {
        messageLabel.textContent = 'First Name cannot contain consecutive spaces.';
        return false;
    }

    // Validation: Reject input with only spaces after trimming
    if (value.trim() === '') {
        messageLabel.textContent = 'First Name cannot be empty.';
        return false;
    }

    // Trim the input after space validation
    const trimmedValue = value.trim();

    // Validation: Length check (2-30 characters)
    if (trimmedValue.length < 2 || trimmedValue.length > 30) {
        messageLabel.textContent = 'First Name must be 2-30 characters long.';
        return false;
    }

    // Validation: Invalid characters
    if (!namePattern.test(trimmedValue)) {
        messageLabel.textContent = 'Use only valid characters.';
        return false;
    }

    // Validation: Triple consecutive letters
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    // Validation: All caps
    if (allCapsPattern.test(trimmedValue)) {
        messageLabel.textContent = 'First Name cannot be in all capital letters.';
        return false;
    }

    // Validation: Word capitalization
    const words = trimmedValue.split(/\s+/);
    for (const word of words) {
        if (!validWordPattern.test(word)) {
            messageLabel.textContent = 'First letter of each word must start with an uppercase letter and followed by small letters.';
            return false;
        }
    }

    // If all checks pass
    return true;
}




/* MIDDLE NAME VALIDATION */
function validateMid(input) {
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces anywhere
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; // Valid characters only
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const allCapsPattern = /^[A-ZÑ\s]+$/; // Reject names in all caps
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; // Words must start with uppercase, followed by lowercase
    const onlySpacesPattern = /^\s+$/; // Name must not contain only spaces
    const noWordFullyCapitalizedPattern = /^(?!.*\b[A-ZÑ]{2,}\b)/; // Reject fully capitalized words

    const value = input.value; // Do NOT trim initially
    const messageLabel = document.querySelector('label[for="message12"]');

    // Clear the message label initially
    if (messageLabel) messageLabel.textContent = '';

    // Validation: Consecutive spaces (2 or more) anywhere in the input
    if (consecutiveSpacesPattern.test(value)) {
        messageLabel.textContent = 'Middle Name cannot contain consecutive spaces.';
        return false;
    }

    // Skip validation if input is empty or contains only spaces
    if (value.trim() === '') {
        return true; // Skip validation if input is empty or only spaces
    }

    // Trim input after validating spaces
    const trimmedValue = value.trim();

    // Validation: Invalid characters
    if (!namePattern.test(trimmedValue)) {
        messageLabel.textContent = 'Use only valid characters.';
        return false;
    }

    // Validation: Triple consecutive letters
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    // Validation: All caps
    if (allCapsPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Middle Name cannot be in all capital letters.';
        return false;
    }

    // Validation: Fully capitalized words
    if (!noWordFullyCapitalizedPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Avoid fully capitalized words.';
        return false;
    }

    // Validation: Word capitalization
    const words = trimmedValue.split(/\s+/);
    for (const word of words) {
        if (!validWordPattern.test(word)) {
            messageLabel.textContent = 'Each word must start with an uppercase letter and followed by lowercase letters.';
            return false;
        }
    }

    // If all checks pass
    return true;
}





/* LAST NAME VALIDATION */
function validateLast(input) {
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces anywhere
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; // Valid characters only
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const allCapsPattern = /^[A-ZÑ\s]+$/; // Reject names in all caps
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; // Words must start with uppercase, followed by lowercase
    const onlySpacesPattern = /^\s+$/; // Reject inputs with only spaces

    const value = input.value; // Do NOT trim initially
    const messageLabel = document.querySelector('label[for="message2"]');

    // Clear the message label initially
    if (messageLabel) messageLabel.textContent = '';

    // Validation: Consecutive spaces (2 or more) anywhere in the input
    if (consecutiveSpacesPattern.test(value)) {
        messageLabel.textContent = 'Last Name cannot contain consecutive spaces.';
        return false;
    }

    // Validation: Reject input with only spaces after trimming
    if (value.trim() === '') {
        messageLabel.textContent = 'Last Name cannot be empty.';
        return false;
    }

    // Validation: Input with only spaces (raw input check)
    if (onlySpacesPattern.test(value)) {
        messageLabel.textContent = 'Last Name cannot contain only spaces.';
        return false;
    }

    // Trim input after space validation
    const trimmedValue = value.trim();

    // Validation: Length check (2-30 characters)
    if (trimmedValue.length < 2 || trimmedValue.length > 30) {
        messageLabel.textContent = 'Last Name must be 2-30 characters long.';
        return false;
    }

    // Validation: Invalid characters
    if (!namePattern.test(trimmedValue)) {
        messageLabel.textContent = 'Use only valid characters.';
        return false;
    }

    // Validation: Triple consecutive letters
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    // Validation: All caps
    if (allCapsPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Last Name cannot be in all capital letters.';
        return false;
    }

    // Validation: Word capitalization
    const words = trimmedValue.split(/\s+/);
    for (const word of words) {
        if (!validWordPattern.test(word)) {
            messageLabel.textContent = 'First letter of each word must start with an uppercase letter and be followed by small letters.';
            return false;
        }
    }

    // If all checks pass
    return true;
}

function validateEx(input) {
    const messageElement = document.getElementById('message22'); // Reference to the message element
    const value = input.value; // Use raw input value without trimming

    // Clear any previous error messages
    messageElement.textContent = '';

    // Check for consecutive spaces (2 or more), including at the beginning
    const consecutiveSpacesPattern = /^\s{2,}|\s{2,}/; // Matches 2+ spaces at the beginning or anywhere in the input
    if (consecutiveSpacesPattern.test(value)) {
        messageElement.textContent = 'Extension name cannot contain consecutive spaces.';
        return false;
    }

    // Skip validation if input is empty or consists only of spaces
    if (value.trim() === '') {
        return true; // No validation error for empty input
    }

    // Patterns for valid extension names
    const validPattern = /^(Jr|Sr|I|II|III|IV|V|VI|VII|VIII|VIIII|X|XI|\d+)$/; // Validates Jr, Sr, Roman numerals, or numbers

    // Validation Rule: Check against valid patterns
    if (!validPattern.test(value)) {
        messageElement.textContent = 'Extension name must be "Jr", "Sr", Roman numerals, or numbers.';
        return false;
    }

    // Clear the message if all validations pass
    messageElement.textContent = '';
    return true;
}



function validateSex(input) {
    const messageElement = document.getElementById('message90'); // Reference to the message element
    const value = input.value; // Use raw input value without trimming

    // Check if the input is empty or not selected
    if (value === '') {
        messageElement.textContent = 'Sex must be selected.';
        return false;
    }

    // Clear the message if a valid value is selected
    messageElement.textContent = '';
    return true;
}





/* NUMBER VALIDATION */
// Full JavaScript Code
// Full JavaScript Code
function validateNumber(input) {
    const formatPattern = /^[0-9]{4}-[0-9]{4}$/; // Matches exactly XXXX-XXXX format
    const consecutiveSpacesPattern = /\s{2,3}/; // Matches 2 or 3 consecutive spaces
    const messageElement = document.getElementById('message3'); // Reference to the message element
    const value = input.value; // Do not trim here initially to check for spaces correctly

    // Clear existing message
    messageElement.textContent = '';

    return new Promise((resolve) => {
        // Skip validation if the input is empty
        if (value === '') {
            messageElement.style.color = 'red';
            messageElement.textContent = 'ID No. cannot be empty.';
            resolve(false);
            return;
        }

        // Validation: Consecutive spaces (2 or 3) anywhere in the input
        if (consecutiveSpacesPattern.test(value)) {
            messageElement.style.color = 'red';
            messageElement.textContent = 'ID No. must not contain consecutive spaces.';
            resolve(false);
            return;
        }

        // Validation: Length check (exactly 9 characters)
        if (value.length !== 9) { // XXXX (4) + '-' (1) + XXXX (4) = 9 characters
            messageElement.style.color = 'red';
            messageElement.textContent = 'ID No. must be 9 numbers in the format xxxx-xxxx.';
            resolve(false);
            return;
        } 

        // Validation: Format check
        if (!formatPattern.test(value)) {
            messageElement.style.color = 'red';
            messageElement.textContent = 'ID No. must match the format xxxx-xxxx and contain only numbers.';
            resolve(false);
            return;
        }

        // Check ID in the database using Fetch API
        fetch('./Phpfile/check_id.php', { // Adjust this path if necessary
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idnum: value }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data.error) {
                    messageElement.style.color = 'red';
                    messageElement.textContent = data.error;
                    resolve(false);
                } else if (data.exists) {
                    messageElement.style.color = 'red';
                    messageElement.textContent = 'ID No. already exists.';
                    resolve(false);
                } else {
                    messageElement.style.color = 'green';
                    messageElement.textContent = 'ID No. is available.';
                    resolve(true);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                messageElement.style.color = 'red';
                messageElement.textContent = 'An error occurred while checking the ID.';
                resolve(false);
            });
    });
}

// Attach the event listener







/* EMAIL VALIDATION */
async function validateEmail(input) {
    const messageElement = document.getElementById('message5'); // The container to display messages
    const email = input.value; // Keep raw email input for space validation
    const trimmedEmail = email.trim(); // Trim input for other validations

    // Clear previous messages
    messageElement.textContent = '';

    // Validation: Check for consecutive spaces in the raw email (before trimming)
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    if (consecutiveSpacesPattern.test(email)) {
        messageElement.textContent = 'Email cannot contain consecutive spaces.';
        return false;
    }

    // Validation: Email cannot be empty (this is the first check)
    if (trimmedEmail === '') {
        messageElement.textContent = 'Email cannot be empty.';
        input.focus();
        return false;
    }

    // Patterns for validation
    const startsWithNumberPattern = /^\d/; // Matches input starting with a number
    const allUppercasePattern = /([a-z0-9]+[A-Z]+[a-z0-9]*|\b[A-Z]+\b)/; // Ensures no part is fully uppercase
    const consecutiveLetterPattern = /([a-zA-Z])\1{2,}/; // Matches 3 or more consecutive identical letters
    const validEmailPattern = /^[^ ]+@[^ ]+\.[a-zA-Z]+$/; // Basic email format validation

    // Validation: Length check (2-50 characters)
    if (email.length < 2 || email.length > 50) {
        messageElement.textContent = 'Email must be 2-50 characters long.';
        return false;
    }

    // Validation: Email cannot start with a number
    if (startsWithNumberPattern.test(trimmedEmail)) {
        messageElement.textContent = 'The email cannot start with a number.';
        return false;
    }

    // Validation: Email cannot be all uppercase letters (no part of the email can be fully uppercase)
    if (allUppercasePattern.test(trimmedEmail)) {
        messageElement.textContent = 'The email cannot be in all capital letters in any part of the email.';
        return false;
    }

    // Validation: Email cannot contain three consecutive identical letters
    if (consecutiveLetterPattern.test(trimmedEmail)) {
        messageElement.textContent = 'Email cannot contain three consecutive identical letters.';
        return false;
    }

    // Validation: Basic email format check
    if (!validEmailPattern.test(trimmedEmail)) {
        messageElement.textContent = 'Enter a valid email address.';
        return false;
    }

    // AJAX call to validate email with the server
    try {
        const response = await fetch('./Phpfile/check-email.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `email=${encodeURIComponent(trimmedEmail)}`
        });

        if (response.ok) {
            const result = await response.text();

            // Handle server response
            if (result.trim() === 'Email already exists.') {
                messageElement.textContent = 'Email already exists.';
                return false;
            } else if (result.trim() === 'Email is available.') {
                messageElement.textContent = ''; // Clear message if email is available
                return true;
            }
        } else {
            console.error('Request failed with status:', response.status);
            messageElement.textContent = 'An error occurred during the email check.';
            return false;
        }
    } catch (error) {
        console.error('An error occurred during the AJAX request:', error);
        messageElement.textContent = 'An error occurred while checking the email.';
        return false;
    }
}





// Function to validate the username input
async function validateUser(input) {
    const message = document.getElementById("message4"); // Reference to the message element
    
    // Patterns for validation
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const startsWithNumberPattern = /^\d/; // Matches input starting with a number
    const startsWithUppercasePattern = /^[A-Z]/; // Matches input starting with an uppercase letter
    const allUppercasePattern = /^[A-Z\s]+$/; // Matches all uppercase letters and spaces only
    const uppercaseSequencePattern = /(?<![a-z])[A-Z]{2,}(?![a-z])/; // Matches uppercase-only sequences of 2 or more letters
    const alphanumericPattern = /^[A-Za-z0-9.\s]+$/; // Allows alphanumeric characters, spaces, and dots

    const value = input.value; // Use the input value directly without trimming

    // Validation: Input cannot be empty
    if (value === "") {
        message.textContent = "Username cannot be empty.";
        return false;
    }

    // Validation: Check if the username already exists in the database
    const usernameExists = await checkUsernameExists(value);
    if (usernameExists.exists) {
        message.textContent = usernameExists.message; // Message returned from server
        return false;
    }

    // Validation: Input cannot start with a number
    if (startsWithNumberPattern.test(value)) {
        message.textContent = "The username cannot start with a number.";
        return false;
    }

    // Validation: Input cannot start with an uppercase letter
    if (startsWithUppercasePattern.test(value)) {
        message.textContent = "The username cannot start with an uppercase letter.";
        return false;
    }

    // Validation: Input must not contain 2 or more consecutive spaces
    if (consecutiveSpacesPattern.test(value)) {
        message.textContent = "Username cannot contain consecutive spaces.";
        return false;
    }

    // Validation: Username cannot be all uppercase letters
    if (allUppercasePattern.test(value)) {
        message.textContent = "The username cannot contain all uppercase letters.";
        return false;
    }

    // Validation: Input cannot contain uppercase-only sequences (2 or more uppercase letters)
    if (uppercaseSequencePattern.test(value)) {
        message.textContent = "Username Cannot be in all Capital letters";
        return false;
    }

    // Validation: Input must contain only letters, numbers, spaces, and dots
    if (!alphanumericPattern.test(value)) {
        message.textContent = "The username must contain only letters and numbers";
        return false;
    }

    // If all validations pass, clear any previous error message
    message.textContent = "";
    return true;
}




// Function to check if the username exists in the database
async function checkUsernameExists(username) {
    try {
        const response = await fetch('./Phpfile/check-username.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // Parse the JSON response
        const result = await response.json();
        return result; // Expected response: { exists: true/false, message: "Username already exists." }
    } catch (error) {
        console.error('Error checking username:', error);
        return { exists: false, message: "Error connecting to the server. Please try again later." };
    }
}


/* ADDRESS VALIDATION */
function validatePurok(input) {
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const startsWithNumberPattern = /^[\d]/; // Reject if input starts with a number
    const numberFollowedByLetterPattern = /^[\d][A-Za-z]/; // Reject if starts with a number followed immediately by a letter


    const value = input.value; // Do not trim the input here
    const messageLabel = document.querySelector('label[for="message96"]');

    // Check for consecutive spaces (2 or more spaces) at the beginning of validation
    if (consecutiveSpacesPattern.test(value)) {
        if (messageLabel) messageLabel.textContent = "Purok cannot contain consecutive spaces.";
        return false;
    }

    // Allow empty input without triggering validation
    if (value.trim() === '') { // Trim just for the empty check
        if (messageLabel) messageLabel.textContent = 'Purok cannot be empty.';
        return false;
    }

    // Check for input length
    if (value.length < 1 || value.length > 30) {
        if (messageLabel) messageLabel.textContent = 'Purok must be 1-30 characters long.';
        return false;
    }

    // Reject if input starts with a number followed immediately by a letter
    if (numberFollowedByLetterPattern.test(value)) {
        if (messageLabel) messageLabel.textContent = 'Purok cannot start with a number followed immediately by a letter.';
        return false;
    }

    // Allow number-only inputs
    if (startsWithNumberPattern.test(value) && !/[A-Za-z]/.test(value)) {
        // Allow only numbers if no letters follow
        if (messageLabel) messageLabel.textContent = '';
        return true;
    }


    // Check for three consecutive identical letters
    if (threeConsecutiveLettersPattern.test(value)) {
        if (messageLabel) messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    // Check if the first letter is uppercase
    if (!/^[A-ZÑ]/.test(value.charAt(0))) {
        if (messageLabel) messageLabel.textContent = 'The first letter must be uppercase.';
        return false;
    }

    // Check for valid "Purok - 1B" format

    // Clear the message on successful validation
    if (messageLabel) messageLabel.textContent = '';
    return true;
}







/* BARANGAY VALIDATION */
function validateBarangay(input) {
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const startsWithNumberPattern = /^[\d]/; // Reject if input starts with a number
    const numberFollowedByLetterPattern = /^[\d][A-Za-z]/; // Reject if starts with a number followed immediately by a letter

    const rawValue = input.value; // Use raw input value for initial validation
    const trimmedValue = rawValue.trim(); // Trimmed value for further checks
    const messageLabel = document.querySelector('label[for="message7"]');

    // Reject consecutive spaces anywhere (including the beginning)
    if (consecutiveSpacesPattern.test(rawValue)) {
        if (messageLabel) messageLabel.textContent = 'Barangay cannot contain consecutive spaces.';
        return false;
    }

    // Allow empty input without triggering validation
    if (trimmedValue === '') {
        if (messageLabel) messageLabel.textContent = 'Barangay cannot be empty.';
        return false;
    }

    // Check for input length
    if (trimmedValue.length < 1 || trimmedValue.length > 30) {
        if (messageLabel) messageLabel.textContent = 'Barangay must be 1-30 characters long.';
        return false;
    }

    // Reject if input starts with a number followed immediately by a letter
    if (numberFollowedByLetterPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Barangay cannot start with a number followed immediately by a letter.';
        return false;
    }

    // Allow number-only inputs
    if (startsWithNumberPattern.test(trimmedValue) && !/[A-Za-z]/.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = '';
        return true;
    }

    // Check for three consecutive identical letters
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    // Check if the first letter is uppercase
    if (!/^[A-ZÑ]/.test(trimmedValue.charAt(0))) {
        if (messageLabel) messageLabel.textContent = 'The first letter must be uppercase.';
        return false;
    }

    // Clear the message on successful validation
    if (messageLabel) messageLabel.textContent = '';
    return true;
}



/* CITY VALIDATION */
function validateCity(input) {
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; // Allow only valid characters
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const startsWithNumberPattern = /^\d/; // Reject if input starts with a number
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; // Words must start with uppercase and followed by lowercase
    const allUppercasePattern = /^[A-ZÑ\s'-]+$/; // Reject if all letters are uppercase

    const rawValue = input.value; // Use the raw input value for validation
    const trimmedValue = rawValue.trim(); // Trimmed value for further checks
    const messageLabel = document.querySelector('label[for="message8"]');

    // Check for consecutive spaces anywhere in the raw value
    if (consecutiveSpacesPattern.test(rawValue)) {
        if (messageLabel) messageLabel.textContent = 'City cannot contain consecutive spaces.';
        return false;
    }

    // Allow empty input without triggering validation
    if (trimmedValue === '') {
        if (messageLabel) messageLabel.textContent = 'City cannot be empty.';
        return false;
    }

    // Check for input length
    if (trimmedValue.length < 2 || trimmedValue.length > 30) {
        if (messageLabel) messageLabel.textContent = 'City must be 2-30 characters long.';
        return false;
    }

    // Reject input starting with a number
    if (startsWithNumberPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'City must not start with a number.';
        return false;
    }

    // Check for invalid characters
    if (!namePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'City must not contain with a number';
        return false;
    }

    // Check for three consecutive identical letters
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    // Reject entirely uppercase input
    if (allUppercasePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'City must not be entirely uppercase.';
        return false;
    }

    // Check that the first letter of each word is uppercase
    const words = trimmedValue.split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0 && !validWordPattern.test(words[i])) {
            if (messageLabel) messageLabel.textContent = `The first letter of the word "${words[i]}" must be uppercase.`;
            return false;
        }
    }

    // Clear the message on successful validation
    if (messageLabel) messageLabel.textContent = '';
    return true;
}

/* Question validation */
function validateSecurityAnswer(index) {
    // Select the specific inputs and error message for this question set
    const selectElement = document.querySelector(`select[name="security_q${index}"]`);
    const inputElement = document.querySelector(`input[name="answer${index}"]`);
    const messageLabel = document.getElementById(`error-q${index}`);

    // Validation Patterns
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; 
    const threeConsecutiveLettersPattern = /(.)\1{2}/; 
    const consecutiveSpacesPattern = /\s{2,}/; 
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; 
    const allUppercasePattern = /^[A-ZÑ\s'-]+$/; 

    const rawValue = inputElement.value;
    const trimmedValue = rawValue.trim();

    // 1. Check if a question is selected
    if (selectElement.value === "") {
        messageLabel.textContent = "Please select a security question.";
        return false;
    }

    // 2. Check for empty answer
    if (trimmedValue === '') {
        messageLabel.textContent = 'Answer cannot be empty.';
        return false;
    }

    // 3. Check for length
    if (trimmedValue.length < 2 || trimmedValue.length > 50) {
        messageLabel.textContent = 'Answer must be 2-50 characters long.';
        return false;
    }

    // 4. Pattern checks (Same logic as Country)
    if (consecutiveSpacesPattern.test(rawValue)) {
        messageLabel.textContent = 'Answer cannot contain consecutive spaces.';
        return false;
    }

    if (!namePattern.test(trimmedValue)) {
        messageLabel.textContent = 'Answer must only contain letters.';
        return false;
    }

    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }

    if (allUppercasePattern.test(trimmedValue) && trimmedValue.length > 1) {
        messageLabel.textContent = 'Answer must not be entirely uppercase.';
        return false;
    }

    // 5. Check first letter uppercase
    const words = trimmedValue.split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0 && !validWordPattern.test(words[i])) {
            messageLabel.textContent = `Word "${words[i]}" must start with an uppercase letter.`;
            return false;
        }
    }

    // Clear message if everything is valid
    messageLabel.textContent = '';
    return true;
}




/* COUNTRY VALIDATION */
function validateCountry(input) {
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; // Allow only valid characters
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const onlySpacesPattern = /^\s+$/; // Reject input containing only spaces
    const startsWithNumberPattern = /^\d/; // Reject if input starts with a number
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; // Words must start with uppercase and followed by lowercase
    const allUppercasePattern = /^[A-ZÑ\s'-]+$/; // Reject if all letters are uppercase

    const rawValue = input.value; // Use raw value for certain checks
    const trimmedValue = rawValue.trim(); // Trimmed value for other validations
    const messageLabel = document.querySelector('label[for="message10"]');

    // Check for consecutive spaces anywhere in the raw value
    if (consecutiveSpacesPattern.test(rawValue)) {
        if (messageLabel) messageLabel.textContent = 'Country cannot contain consecutive spaces.';
        return false;
    }

    // Allow empty input without triggering validation
    if (trimmedValue === '') {
        if (messageLabel) messageLabel.textContent = 'Country cannot be empty.';
        return false;
    }

    // Check for input length
    if (trimmedValue.length < 2 || trimmedValue.length > 30) {
        if (messageLabel) messageLabel.textContent = 'Country must be 2-30 characters long.';
        return false;
    }

    // Check for invalid patterns
    if (startsWithNumberPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Country must not start with a number.';
        return false;
    }
    if (!namePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Country must not contain with a number.';
        return false;
    }
    if (onlySpacesPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Country cannot contain only spaces.';
        return false;
    }
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }
    if (allUppercasePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Country must not be entirely uppercase.';
        return false;
    }

    // Check that the first letter of each word is uppercase
    const words = trimmedValue.split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0 && !validWordPattern.test(words[i])) {
            if (messageLabel) messageLabel.textContent = `The first letter of the word "${words[i]}" must be uppercase.`;
            return false;
        }
    }

    // Clear the message on successful validation
    if (messageLabel) messageLabel.textContent = '';
    return true;
}





/* PROVINCE VALIDATION */
function validateProvince(input) {
    const namePattern = /^[A-Za-zÑñ\s'-]+$/; // Allow only valid characters
    const threeConsecutiveLettersPattern = /(.)\1{2}/; // Avoid triple consecutive letters
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const onlySpacesPattern = /^\s+$/; // Reject input containing only spaces
    const startsWithNumberPattern = /^\d/; // Reject if input starts with a number
    const validWordPattern = /^[A-ZÑ][a-zñ]*$/; // Words must start with uppercase and followed by lowercase
    const allUppercasePattern = /^[A-ZÑ\s'-]+$/; // Reject if all letters are uppercase

    const rawValue = input.value; // Use raw value for certain checks
    const trimmedValue = rawValue.trim(); // Trimmed value for other validations
    const messageLabel = document.querySelector('label[for="message9"]');

    // Check for consecutive spaces anywhere in the raw value
    if (consecutiveSpacesPattern.test(rawValue)) {
        if (messageLabel) messageLabel.textContent = 'Province cannot contain consecutive spaces.';
        return false;
    }

    // Allow empty input without triggering validation
    if (trimmedValue === '') {
        if (messageLabel) messageLabel.textContent = 'Province cannot be empty.';
        return false;
    }

    // Check for input length
    if (trimmedValue.length < 2 || trimmedValue.length > 30) {
        if (messageLabel) messageLabel.textContent = 'Province must be 2-30 characters long.';
        return false;
    }

    // Check for invalid patterns
    if (startsWithNumberPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Province must not start with a number.';
        return false;
    }
    if (!namePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Province must not contain with a number.';
        return false;
    }
    if (onlySpacesPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Province cannot contain only spaces.';
        return false;
    }
    if (threeConsecutiveLettersPattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Avoid triple consecutive characters.';
        return false;
    }
    if (allUppercasePattern.test(trimmedValue)) {
        if (messageLabel) messageLabel.textContent = 'Province must not be entirely uppercase.';
        return false;
    }

    // Check that the first letter of each word is uppercase
    const words = trimmedValue.split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0 && !validWordPattern.test(words[i])) {
            if (messageLabel) messageLabel.textContent = `The first letter of the word "${words[i]}" must be uppercase.`;
            return false;
        }
    }

    // Clear the message on successful validation
    if (messageLabel) messageLabel.textContent = '';
    return true;
}




/* ZIP CODE VALIDATION */
function validateZip(input) {
    const numberPattern = /^[0-9]{4}$/; // Ensures exactly 4 digits
    const onlyNumbersPattern = /^[0-9]+$/; // Ensures only numbers
    const consecutiveSpacesPattern = /\s{2,}/; // Matches 2 or more consecutive spaces
    const value = input.value; // Use raw input to check for consecutive spaces
    const trimmedValue = value.trim(); // Trimmed value for other validations
    const messageElement = document.getElementById('message11'); // Reference to the message element

    // Check for consecutive spaces
    if (consecutiveSpacesPattern.test(value)) {
        messageElement.textContent = 'Zip code cannot contain consecutive spaces.';
        return false;
    }

    // Check for empty input
    if (trimmedValue === '') {
        messageElement.textContent = 'Zip cannot be empty.';
        return false;
    }

    // Check for only numbers
    if (!onlyNumbersPattern.test(trimmedValue)) {
        messageElement.textContent = 'Zip code only accept numbers.';
        return false;
    }

    // Check for exactly 4 digits
    if (trimmedValue.length !== 4) {
        messageElement.textContent = 'Zip code must be exactly 4 digits.';
        return false;
    }

    // Clear the message if validation passes
    messageElement.textContent = '';
    return true;
}


document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', validateForm);
    } else {
        console.error("Form with id 'registrationForm' not found.");
    }
});
function destroyHistory() {
    // Initially push 100 states
    for (let i = 0; i < 50; i++) {
        window.history.pushState(null, null, window.location.href);
}

// Continuously push the current state into the history every 100 milliseconds
setInterval(function() {
    window.history.pushState(null, null, window.location.href);
}, 100);  // Adjust the interval as needed

// Capture the popstate event and prevent back navigation
window.onpopstate = function() {
    window.history.pushState(null, null, window.location.href);  // Re-push the state to block back navigation
};
}



window.onload = function () {
if(sessionStorage.getItem('username')){
    window.location.href = 'dashboard.html';
    return;
}
    const currentTime = Date.now();
    const lockoutTime = localStorage.getItem('lockoutTime');

    if (lockoutTime && currentTime < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - currentTime) / 1000);       
        // Redirect to the last visited page or a default (login.html)
        const lastPage = sessionStorage.getItem('currentPage') || 'index.html';
        window.location.href = lastPage;
    }
    destroyHistory()
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if lockout state exists in localStorage
    const lockoutEndTime = localStorage.getItem('lockoutEndTime');
    const currentTime = Date.now();

    // If lockoutEndTime is set and still active, redirect to the login page
    if (lockoutEndTime && currentTime < parseInt(lockoutEndTime)) {
        window.location.href = 'home.html'; // Redirect to your login page
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Check if lockout state exists in localStorage
    const lockoutEndTime = localStorage.getItem('lockoutEndTime');
    const currentTime = Date.now();

    // If lockoutEndTime is set and still active, redirect to the login page
    if (lockoutEndTime && currentTime < parseInt(lockoutEndTime)) {
        window.location.href = 'home.html'; // Redirect to your login page
    }
});
// Function to validate only Step 1 fields
async function validateRegisterStep1() {
    let validationPassed = true;
    
    const fields = {
        firstName: document.getElementById("firstName"),
        middleName: document.getElementById("middleInitial"),
        lastName: document.getElementById("lastName"),
        idNo: document.getElementById("idInput"),
        email: document.getElementById("emailInput"), // Fixed ID
        username: document.getElementById("username"),
        password: document.getElementById("password"),
        confirmPassword: document.getElementById("confirmPassword"),
        birthdate: document.getElementById("custom-birthdate"),
        gender: document.getElementById("sex"),
        purok: document.getElementById("purok"),
        barangay: document.getElementById("barangay"),
        city: document.getElementById("city"),
        province: document.getElementById("province"),
        country: document.getElementById("country"),
        zipCode: document.getElementById("zipCode"),
    };

    // Check individual fields
    if (fields.firstName && !validateName(fields.firstName)) validationPassed = false;
    if (fields.middleName && !validateMid(fields.middleName)) validationPassed = false;
    if (fields.lastName && !validateLast(fields.lastName)) validationPassed = false;
    if (fields.gender && !validateSex(fields.gender)) validationPassed = false;
    
    if (fields.idNo) {
        if (!await validateNumber(fields.idNo)) validationPassed = false;
    }
    
    if (fields.email && !validateEmail(fields.email)) validationPassed = false;
    
    if (fields.username) {
        if (!await validateUser(fields.username)) validationPassed = false;
    }
    
    if (fields.password) {
        const passwordValue = fields.password.value.trim();
        if (!validatePasswordStrength(passwordValue)) validationPassed = false;
        
        if (fields.confirmPassword) {
            const confirmPasswordValue = fields.confirmPassword.value.trim();
            const matchMessageLabel = document.getElementById("message100");
            if (!validatePasswordMatch(passwordValue, confirmPasswordValue, matchMessageLabel)) {
                validationPassed = false;
            }
        }
    }
    
    if (fields.birthdate) {
        calculateAge();
        const ageMessage = document.getElementById('message16');
        if (ageMessage && ageMessage.textContent.trim()) {
            validationPassed = false;
        }
        if (!fields.birthdate.value) {
            if (ageMessage) ageMessage.textContent = "Birthday cannot be empty.";
            validationPassed = false;
        }
    }

    if (fields.purok && !validatePurok(fields.purok)) validationPassed = false;
    if (fields.barangay && !validateBarangay(fields.barangay)) validationPassed = false;
    if (fields.city && !validateCity(fields.city)) validationPassed = false;
    if (fields.province && !validateProvince(fields.province)) validationPassed = false;
    if (fields.country && !validateCountry(fields.country)) validationPassed = false;
    if (fields.zipCode && !validateZip(fields.zipCode)) validationPassed = false;

    if (!validationPassed) {
        Swal.fire({
            icon: "warning",
            title: "Wait!",
            text: "Please complete the profile information correctly before proceeding.",
        });
    }
    
    return validationPassed;
}
