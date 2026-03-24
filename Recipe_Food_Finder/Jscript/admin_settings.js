/* ================================================
   ADMIN SETTINGS LOGIC
   ================================================ */

function initializeSettings() {
    console.log('Admin Settings initialized!');
    loadAdminProfile();
    setupSettingsEventListeners();
}

async function loadAdminProfile() {
    try {
        const response = await fetch('Phpfile/admin_users.php?action=get_current_user&scope=auto');
        const data = await response.json();

        if (data.success) {
            document.getElementById('adminUsername').value = data.username;
            document.getElementById('adminEmail').value = data.email || '';
            renderPrivileges(data.role);
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
    }
}

function renderPrivileges(role) {
    const list = document.getElementById('adminPrivilegesList');
    if (!list) return;

    const isSuper = (role.toLowerCase() === 'super admin');
    
    const commonPrivs = [
        { icon: 'fa-history', text: 'Activity Logs' },
        { icon: 'fa-utensils', text: 'Recipe Management' },
        { icon: 'fa-users', text: 'User Directory' }
    ];

    const adminPrivs = [
        { icon: 'fa-clipboard-list', text: 'Update Requests' }
    ];

    const superPrivs = [
        { icon: 'fa-user-shield', text: 'Direct User Control' },
        { icon: 'fa-trash-alt', text: 'Account Deletion' },
        { icon: 'fa-check-square', text: 'Request Approval' }
    ];

    let html = '';
    commonPrivs.forEach(p => html += `<div class="privilege-item"><i class="fas ${p.icon}"></i> ${p.text}</div>`);
    
    if (isSuper) {
        superPrivs.forEach(p => html += `<div class="privilege-item"><i class="fas ${p.icon}"></i> ${p.text}</div>`);
    } else {
        adminPrivs.forEach(p => html += `<div class="privilege-item"><i class="fas ${p.icon}"></i> ${p.text}</div>`);
    }

    list.innerHTML = html;
}

function setupSettingsEventListeners() {
    // Profile Form
    const profileForm = document.getElementById('adminProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;

            try {
                const formData = new FormData();
                formData.append('action', 'update_profile');
                formData.append('email', email);

                const response = await fetch('Phpfile/admin_settings.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    showNotification(data.message + ' ✅', 'success');
                } else {
                    showNotification(data.message + ' ❌', 'error');
                }
            } catch (error) {
                showNotification('Connection error! ⚠️', 'error');
            }
        });
    }

    // Security Form
    const securityForm = document.getElementById('adminSecurityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            if (newPass !== confirmPass) {
                showNotification('Passwords do not match! ❌', 'error');
                return;
            }

            if (newPass.length < 8) {
                showNotification('Password must be at least 8 characters! ⚠️', 'warning');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'change_password');
                formData.append('current_password', currentPass);
                formData.append('new_password', newPass);

                const response = await fetch('Phpfile/admin_settings.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    showNotification(data.message + ' 🔒', 'success');
                    securityForm.reset();
                } else {
                    showNotification(data.message + ' ❌', 'error');
                }
            } catch (error) {
                showNotification('Connection error! ⚠️', 'error');
            }
        });
    }

    // Preferences
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function () {
            if (this.checked) {
                document.body.classList.add('dark-mode');
                showNotification('Dark mode enabled (Simulation) 🌓', 'info');
            } else {
                document.body.classList.remove('dark-mode');
                showNotification('Light mode enabled (Simulation) ☀️', 'info');
            }
        });
    }
}

// Call initialization when section is shown
const originalSetupNavigation = setupNavigation;
window.setupNavigation = function () {
    // Hook into existing nav link clicks if needed, 
    // or just call initializeSettings when section switches.
    // In admin_dashboard.html, initializeSettings is called via the sidebar script.
};

// We need to make sure initializeSettings works when called from admin_dashboard.html
window.initializeSettings = initializeSettings;
