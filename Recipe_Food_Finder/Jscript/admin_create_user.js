// ==============================================
// CREATE USER MODAL — admin_create_user.js
// ==============================================

// ---------- Open / Close ----------

function openCreateUserModal() {
    const overlay = document.getElementById('createUserModal');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('active'));
    document.body.style.overflow = 'hidden';

    // Directly initialize for User
    const formUser = document.getElementById('cuFormUser');
    const divider = document.getElementById('cuFormDivider');
    if (formUser) formUser.style.display = 'block';
    if (divider) divider.style.display = 'block';

    // Initial privilege preview for User
    updatePrivilegesPreview('user', 'cuPrivilegesContainer');
}

function closeCreateUserModal() {
    const overlay = document.getElementById('createUserModal');
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '';
        overlay.style.transition = '';
        overlay.classList.remove('active');
        resetCreateUserModal();
        document.body.style.overflow = '';
    }, 200);
}

// Escape key closes modal
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('createUserModal');
        if (overlay && overlay.style.display !== 'none') {
            closeCreateUserModal();
        }
    }
});

// ---------- Reset Modal ----------

function resetCreateUserModal() {
    const form = document.getElementById('cuFormUser');
    if (form) {
        form.reset();
        form.querySelectorAll('.cu-error').forEach(el => el.classList.remove('cu-error'));
        form.querySelectorAll('.cu-field-error').forEach(el => el.remove());
        form.querySelectorAll('.cu-form-error-banner').forEach(el => el.remove());
    }
    const success = document.getElementById('cuSuccessMsg');
    if (success) success.style.display = 'none';
    const divider = document.getElementById('cuFormDivider');
    if (divider) divider.style.display = 'block';

    // Reset role pills
    document.querySelectorAll('.cu-role-pill').forEach(p => p.classList.remove('active'));
    const userPill = document.querySelector('.cu-role-pill[data-role="user"]');
    if (userPill) userPill.classList.add('active');

    // Reset submit button color
    const submitBtn = document.getElementById('cuSubmitBtn');
    if (submitBtn) {
        submitBtn.className = 'cu-btn-submit cu-btn-user';
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create User Account';
    }

    updatePrivilegesPreview('user', 'cuPrivilegesContainer');
}

// ---------- Role Selection & Privileges ----------

function selectRole(role, btn) {
    // Update active state of pills
    document.querySelectorAll('.cu-role-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');

    // Update submit button style
    const submitBtn = document.getElementById('cuSubmitBtn');
    if (submitBtn) {
        submitBtn.classList.remove('cu-btn-user', 'cu-btn-admin', 'cu-btn-superadmin');
        const btnClass = role === 'super admin' ? 'cu-btn-superadmin' : `cu-btn-${role}`;
        submitBtn.classList.add(btnClass);
        submitBtn.innerHTML = `<i class="fas fa-user-plus"></i> Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account`;
    }

    // Update preview
    updatePrivilegesPreview(role, 'cuPrivilegesContainer');
}

function updatePrivilegesPreview(role, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let privileges = [];
    if (role === 'super admin') {
        privileges = ['Delete', 'Edit', 'Add User', 'Full Management', 'Logs', 'Block', 'Accept Request'];
    } else if (role === 'admin') {
        privileges = ['View', 'Accept', 'Reject', 'Create User', 'Activity Logs', 'Block'];
    } else {
        privileges = ['View Recipes', 'Search', 'Request Recipes'];
    }

    container.innerHTML = privileges.map(p => {
        const pClass = p.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return `<span class="privilege-tag p-tag-${pClass}">${p}</span>`;
    }).join('');
}

// ---------- Password Toggle ----------

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// ---------- Validation Helpers (Matching java.js) ----------

const validationRules = {
    name: {
        pattern: /^[A-Za-zÑñ\s'-]+$/,
        consecutiveSpaces: /\s{2,}/,
        tripleChar: /(.)\1{2}/,
        allCaps: /^[A-ZÑ\s]+$/,
        validWord: /^[A-ZÑ][a-zñ]*$/
    },
    username: {
        consecutiveSpaces: /\s{2,}/,
        startsWithNumber: /^\d/,
        startsWithUppercase: /^[A-Z]/,
        allUppercase: /^[A-Z\s]+$/,
        uppercaseSequence: /(?<![a-z])[A-Z]{2,}(?![a-z])/,
        alphanumeric: /^[A-Za-z0-9.\s]+$/
    },
    idNo: {
        format: /^[0-9]{4}-[0-9]{4}$/,
        consecutiveSpaces: /\s{2,3}/
    },
    extension: /^(Jr|Sr|I|II|III|IV|V|VI|VII|VIII|VIIII|X|XI|\d+)$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

function validateNameField(value, fieldName) {
    if (!value.trim()) return `${fieldName} cannot be empty.`;
    if (validationRules.name.consecutiveSpaces.test(value)) return `${fieldName} cannot contain consecutive spaces.`;

    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 30) return `${fieldName} must be 2-30 characters long.`;
    if (!validationRules.name.pattern.test(trimmed)) return `${fieldName} contains invalid characters.`;
    if (validationRules.name.tripleChar.test(trimmed)) return `Avoid triple consecutive characters in ${fieldName}.`;
    if (validationRules.name.allCaps.test(trimmed)) return `${fieldName} cannot be in all capital letters.`;

    const words = trimmed.split(/\s+/);
    for (const word of words) {
        if (!validationRules.name.validWord.test(word)) {
            return `Each word in ${fieldName} must start with uppercase followed by lowercase.`;
        }
    }
    return null;
}

async function checkUsernameAvailability(username) {
    if (!username) return "Username cannot be empty.";
    if (validationRules.username.startsWithNumber.test(username)) return "The username cannot start with a number.";
    if (validationRules.username.startsWithUppercase.test(username)) return "The username cannot start with an uppercase letter.";
    if (validationRules.username.consecutiveSpaces.test(username)) return "Username cannot contain consecutive spaces.";
    if (validationRules.username.allUppercase.test(username)) return "The username cannot contain all uppercase letters.";
    if (validationRules.username.uppercaseSequence.test(username)) return "Username cannot be in all capital letters.";
    if (!validationRules.username.alphanumeric.test(username)) return "The username must contain only letters and numbers.";

    try {
        const res = await fetch('Phpfile/check-username.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const result = await res.json();
        if (result.exists) return result.message || "Username already exists.";
        return null;
    } catch (e) {
        return "Error checking username availability.";
    }
}

async function checkEmailAvailability(email) {
    if (!validationRules.email.test(email)) return "Please enter a valid email address.";

    try {
        const res = await fetch('Phpfile/check-email.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `email=${encodeURIComponent(email)}`
        });
        const text = await res.text();
        if (text.trim() === 'Email already exists.') return "Email already exists.";
        return null;
    } catch (e) {
        return "Error checking email availability.";
    }
}

async function checkIdAvailability(idNum) {
    if (!idNum) return null; // Optional in admin creation
    if (validationRules.idNo.consecutiveSpaces.test(idNum)) return "ID No. must not contain consecutive spaces.";
    if (idNum.length !== 9 || !validationRules.idNo.format.test(idNum)) {
        return "ID No. must be 9 numbers in the format xxxx-xxxx.";
    }

    try {
        const res = await fetch('Phpfile/check_id.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idnum: idNum })
        });
        const result = await res.json();
        if (result.exists) return "ID No. already exists.";
        return null;
    } catch (e) {
        return "Error checking ID availability.";
    }
}

// ---------- Form Submission ----------

async function submitCreateUser(e, role) {
    e.preventDefault();

    const form = document.getElementById('cuFormUser');
    const submitBtn = form.querySelector('.cu-btn-submit');

    // Clear previous errors
    form.querySelectorAll('.cu-error').forEach(el => el.classList.remove('cu-error'));
    form.querySelectorAll('.cu-field-error').forEach(el => el.remove());
    const existingBanner = form.querySelector('.cu-form-error-banner');
    if (existingBanner) existingBanner.remove();

    // Collect form data
    const formData = new FormData(form);
    const fname = formData.get('fname');
    const lname = formData.get('lname');
    const middle = formData.get('middle');
    const exname = formData.get('exname');
    const email = formData.get('emailadd');
    const username = formData.get('username');
    const ldnum = formData.get('ldnum');
    const password = formData.get('password') || '';
    const confirm = formData.get('confirm_password') || '';

    // --- Validation ---
    let firstError = null;

    // Names
    const fnameErr = validateNameField(fname, 'First Name');
    if (fnameErr) { showFieldError(form.querySelector('[name="fname"]'), fnameErr); if (!firstError) firstError = fnameErr; }

    if (middle.trim()) {
        const midErr = validateNameField(middle, 'Middle Name');
        if (midErr) { showFieldError(form.querySelector('[name="middle"]'), midErr); if (!firstError) firstError = midErr; }
    }

    const lnameErr = validateNameField(lname, 'Last Name');
    if (lnameErr) { showFieldError(form.querySelector('[name="lname"]'), lnameErr); if (!firstError) firstError = lnameErr; }

    if (exname.trim() && !validationRules.extension.test(exname.trim())) {
        const exErr = 'Extension name must be "Jr", "Sr", Roman numerals, or numbers.';
        showFieldError(form.querySelector('[name="exname"]'), exErr);
        if (!firstError) firstError = exErr;
    }


    // Security
    if (password.length < 8) {
        const pwErr = 'Password must be at least 8 characters.';
        showFieldError(form.querySelector('[name="password"]'), pwErr);
        if (!firstError) firstError = pwErr;
    } else if (password !== confirm) {
        const matchErr = 'Passwords do not match.';
        showFieldError(form.querySelector('[name="confirm_password"]'), matchErr);
        if (!firstError) firstError = matchErr;
    }

    // STOP if basic client validation fails
    if (firstError) {
        showFormError(form, 'Please correct the errors in the form.');
        return;
    }

    // --- Async / AJAX Validation ---
    setButtonLoading(submitBtn, true);

    try {
        const [userErr, emailErr, idErr] = await Promise.all([
            checkUsernameAvailability(username),
            checkEmailAvailability(email),
            checkIdAvailability(ldnum)
        ]);

        if (userErr) { showFieldError(form.querySelector('[name="username"]'), userErr); if (!firstError) firstError = userErr; }
        if (emailErr) { showFieldError(form.querySelector('[name="emailadd"]'), emailErr); if (!firstError) firstError = emailErr; }
        if (idErr) { showFieldError(form.querySelector('[name="ldnum"]'), idErr); if (!firstError) firstError = idErr; }

        if (firstError) {
            showFormError(form, 'Please correct the highlighted fields.');
            setButtonLoading(submitBtn, false);
            return;
        }

        // Final Submission
        const activeRolePill = document.querySelector('.cu-role-pill.active');
        const selectedRole = activeRolePill ? activeRolePill.dataset.role : 'user';

        formData.append('role', selectedRole);
        formData.append('action', 'create_user');

        const response = await fetch('Phpfile/admin_users.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            form.style.display = 'none';
            document.getElementById('cuFormDivider').style.display = 'none';

            const successMsg = document.getElementById('cuSuccessMsg');
            const successText = document.getElementById('cuSuccessText');
            successText.textContent = `User account "${formData.get('username')}" has been created successfully.`;
            successMsg.style.display = 'block';

            if (typeof refreshAdminUI === 'function') {
                setTimeout(refreshAdminUI, 600);
            } else if (typeof loadUsers === 'function') {
                setTimeout(loadUsers, 600);
            }
        } else {
            showFormError(form, result.message || 'Failed to create account.');
        }

    } catch (err) {
        console.error('Create user error:', err);
        showFormError(form, 'A network error occurred. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// ---------- Real-Time Validation Hook ----------

async function validateAdminInput(input, type) {
    const field = input.closest('.cu-field');
    const value = input.value;

    // Clear existing field-specific error
    field.querySelectorAll('.cu-field-error').forEach(el => el.remove());
    input.classList.remove('cu-error');

    let error = null;

    switch (type) {
        case 'fname': error = validateNameField(value, 'First Name'); break;
        case 'middle': if (value.trim()) error = validateNameField(value, 'Middle Name'); break;
        case 'lname': error = validateNameField(value, 'Last Name'); break;
        case 'exname':
            if (value.trim() && !validationRules.extension.test(value.trim())) {
                error = 'Extension name must be "Jr", "Sr", Roman numerals, or numbers.';
            }
            break;
        case 'sex': if (!value) error = 'Please select a sex.'; break;
        case 'email':
            if (!validationRules.email.test(value)) {
                error = 'Please enter a valid email address.';
            }
            break;
        case 'username':
            if (!value) error = "Username cannot be empty.";
            else if (validationRules.username.startsWithNumber.test(value)) error = "Cannot start with a number.";
            else if (validationRules.username.startsWithUppercase.test(value)) error = "Cannot start with uppercase.";
            else if (validationRules.username.consecutiveSpaces.test(value)) error = "Cannot contain consecutive spaces.";
            else if (validationRules.username.allUppercase.test(value)) error = "Cannot be all uppercase.";
            else if (validationRules.username.uppercaseSequence.test(value)) error = "Cannot contain uppercase sequences.";
            else if (!validationRules.username.alphanumeric.test(value)) error = "Only letters and numbers allowed.";
            break;
        case 'password':
            if (value.length < 8) error = 'Min. 8 characters required.';
            break;
        case 'confirm_password':
            const pw = document.getElementById('cuUserPassword').value;
            if (value !== pw) error = 'Passwords do not match.';
            break;
        case 'ldnum':
            if (value && (value.length !== 9 || !validationRules.idNo.format.test(value))) {
                error = "Format: xxxx-xxxx";
            }
            break;
        // Address Validations (Mirroring java.js logic)
        case 'purok':
        case 'barangay':
        case 'city':
        case 'province':
        case 'country':
            const labelStr = type.charAt(0).toUpperCase() + type.slice(1);
            if (!value.trim()) error = `${labelStr} cannot be empty.`;
            else if (value.length > 30) error = `${labelStr} is too long.`;
            else if (/\s{2,}/.test(value)) error = "No consecutive spaces.";
            else if (/^[\d][A-Za-z]/.test(value)) error = "Cannot start with number then letter.";
            else if (/(.)\1{2}/.test(value)) error = "Avoid triple consecutive characters.";
            else if (/[a-zA-Z]/.test(value) && !/^[A-ZÑ]/.test(value.trim().charAt(0))) {
                error = "Must start with uppercase letter.";
            }
            break;
        case 'zipcode':
            if (!/^\d{4}$/.test(value)) error = "Must be exactly 4 digits.";
            break;
    }

    if (error) {
        showFieldError(input, error);
    }
}

// ---------- Helpers ----------

function showFieldError(inputEl, message) {
    if (!inputEl) return;
    const field = inputEl.closest('.cu-field');
    if (!field) return;

    // Clear existing first
    field.querySelectorAll('.cu-field-error').forEach(el => el.remove());

    inputEl.classList.add('cu-error');

    const errSpan = document.createElement('span');
    errSpan.className = 'cu-field-error';
    errSpan.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    field.appendChild(errSpan);
}

function showFormError(form, message) {
    const existing = form.querySelector('.cu-form-error-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'cu-form-error-banner';
    banner.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>${message}</span>`;
    banner.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        background: #fef2f2; border: 1px solid #fca5a5;
        color: #dc2626; border-radius: 8px;
        padding: 12px 16px; font-size: 0.85rem; font-weight: 500;
        margin-bottom: 16px; animation: cuFormIn 0.3s ease;
    `;

    const actions = form.querySelector('.cu-form-actions');
    if (actions) {
        form.insertBefore(banner, actions);
    } else {
        form.prepend(banner);
    }
}

function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="cu-spinner"></span> Creating...`;
        btn.classList.add('cu-loading');
        btn.disabled = true;
    } else {
        if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
        btn.classList.remove('cu-loading');
        btn.disabled = false;
    }
}

// ==============================================
// SUPER ADMIN EXPANDED CREATE USER HANDLER
// ==============================================

async function submitSuperAdminCreateUser(event) {
    event.preventDefault();
    const form = document.getElementById('cuFormUser');
    const submitBtn = document.getElementById('suSubmitBtn');
    
    // Run java.js validators synchronously where possible
    const vName = validateName(document.getElementById('firstName'));
    const vLast = validateLast(document.getElementById('lastName'));
    const vSex = validateSex(document.getElementById('sex'));
    const vPurok = validatePurok(document.getElementById('purok'));
    const vBarangay = validateBarangay(document.getElementById('barangay'));
    const vCity = validateCity(document.getElementById('city'));
    const vProv = validateProvince(document.getElementById('province'));
    const vCoun = validateCountry(document.getElementById('country'));
    const vZip = validateZip(document.getElementById('zipCode'));
    const vQ1 = validateSecurityAnswer(1);
    const vQ2 = validateSecurityAnswer(2);
    const vQ3 = validateSecurityAnswer(3);
    
    const pw = document.getElementById('password').value;
    const cpw = document.getElementById('confirmPassword').value;
    const vPw = validatePasswordStrength(pw);
    const vPwM = validatePasswordMatch(pw, cpw, document.getElementById('message100'));
    
    calculateAge();
    const ageValid = document.getElementById('message16').textContent === '';

    // Async validators
    setButtonLoading(submitBtn, true);
    
    let vId = false, vUser = false, vEmail = false;
    try {
        vId = await validateNumber(document.getElementById('idInput'));
        vUser = await validateUser(document.getElementById('username'));
        vEmail = await validateEmail(document.getElementById('emailInput'));
    } catch (e) {
        console.error("Async validation error", e);
    }
    
    setButtonLoading(submitBtn, false);

    // If any validation failed, the inline functions in java.js will display the red text
    if (!vName || !vLast || !vSex || !vPurok || !vBarangay || !vCity || !vProv || !vCoun || !vZip || !vPw || !vPwM || !ageValid || !vId || !vUser || !vEmail || !vQ1 || !vQ2 || !vQ3) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please correctly fill out all highlighted fields before submitting.',
                background: '#1e293b',
                color: '#f8fafc'
            });
        }
        return false;
    }

    // Prepare payload
    const formData = new FormData(form);
    formData.append('action', 'create_user');

    try {
        setButtonLoading(submitBtn, true);
        const response = await fetch('Phpfile/super_users.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Account Created',
                    text: `Successfully created new ${formData.get('role')} account! Status is inactive.`,
                    background: '#1e293b',
                    color: '#f8fafc'
                });
            }
            closeCreateUserModal();
            loadUsers();
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Creation Failed',
                    text: result.message || 'An error occurred while saving to the database.',
                    background: '#1e293b',
                    color: '#f8fafc'
                });
            }
        }
    } catch (err) {
        console.error('Submission error:', err);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Failed to contact the server.',
                background: '#1e293b',
                color: '#f8fafc'
            });
        }
    } finally {
        setButtonLoading(submitBtn, false);
    }
}
