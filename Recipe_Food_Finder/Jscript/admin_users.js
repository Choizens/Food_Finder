// admin_users.js
let allUsers = [];
let currentRoleFilter = 'all';
let currentStatusFilter = 'all';
let currentPage = 1;
const itemsPerPage = 10;

let isUserManagementSetup = false;
let isSuperAdminDashboard = window.location.href.includes('super_admin_dashboard.html');
let hasHappenedRoleChange = false;

function initializeUserManagement() {
    console.log('User Management initialized!');
    loadUsers();

    if (!isUserManagementSetup) {
        setupUserFilters();
        setupUserSearch();
        isUserManagementSetup = true;
    }
}

async function loadUsers() {
    const container = document.getElementById('usersContainer');

    if (!container) {
        console.error('Users container not found');
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading User Management...</p>
        </div>
    `;

    try {
        const searchInput = document.getElementById('userSearchInput');
        const searchTerm = searchInput ? searchInput.value : '';

        const params = new URLSearchParams({
            action: 'get_users',
            role: currentRoleFilter,
            status: currentStatusFilter,
            search: searchTerm
        });

        const response = await fetch('Phpfile/admin_users.php?' + params);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Loaded users:', data);

        if (data.success) {
            allUsers = data.users;
            updateUserStatistics(data.stats);
            displayUsers(allUsers);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading users: ${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load users. Please check the console and refresh the page.</p>
                <p style="font-size: 0.9rem; margin-top: 1rem; color: var(--danger);">${error.message}</p>
            </div>
        `;
    }
}

function updateUserStatistics(stats) {
    const elements = {
        totalUsers: document.getElementById('totalUsersCount'),
        regularUsers: document.getElementById('regularUsersCount'),
        adminUsers: document.getElementById('adminUsersCount'),
        blockedUsers: document.getElementById('blockedUsersCount')
    };

    if (elements.totalUsers) elements.totalUsers.textContent = stats.total;
    if (elements.regularUsers) elements.regularUsers.textContent = stats.users;
    if (elements.adminUsers) elements.adminUsers.textContent = stats.admins + stats.super_admins;
    if (elements.blockedUsers) elements.blockedUsers.textContent = stats.blocked;
}

function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No users found.</p>
            </div>
        `;
        renderPagination(0);
        return;
    }

    // ── Pagination slice ──────────────────────────────────────
    const totalUsers = users.length;
    const totalPages = Math.ceil(totalUsers / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageUsers = users.slice(startIdx, startIdx + itemsPerPage);
    // ─────────────────────────────────────────────────────────

    const tableHTML = `
        <div class="user-table-wrapper">
            <table class="user-table">
                <thead>
                    <tr>
                        <th>User Information</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Privileges</th>
                        <th>${isSuperAdminDashboard ? 'Joined' : 'Account Created'}</th>
                        ${isSuperAdminDashboard ? `
                            <th>Last Login</th>
                            <th>Last Logout</th>
                        ` : ''}
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="userTableBody">
                    ${pageUsers.map(user => {
        const userId = user.id;
        const fullName = `${user.fname} ${user.lname}`;
        const userRole = user.role || 'user';
        let roleClass = 'role-user';
        if (userRole === 'admin') roleClass = 'role-admin';
        const privileges = getPrivilegesForRole(userRole);

        const privilegeTags = privileges.map(p => {
            const pClass = p.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return `<span class="privilege-tag p-tag-${pClass}"><i class="fas ${p.icon}"></i> ${p.text}</span>`;
        }).join('');
        const userStatus = user.status || 'active';
        const statusClass = userStatus === 'active' ? 'status-active' : 'status-blocked';
        const roleBadgeClass = getRoleClass(userRole);

        return `
                            <tr data-user-id="${userId}">
                                <td>
                                    <div class="user-info-cell">
                                        <div class="user-table-avatar">
                                            <i class="fas ${getRoleIcon(userRole)}"></i>
                                        </div>
                                        <div class="user-primary-info">
                                            <span class="user-name">${fullName}</span>
                                            <span class="user-username">@${user.username}</span>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="user-email-cell">${user.emailadd}</span></td>
                                <td>
                                    <span class="user-role-badge ${roleBadgeClass}">${userRole}</span>
                                </td>
                                <td><span class="user-status ${statusClass}">${userStatus}</span></td>
                                <td class="privileges-cell">
                                    <div class="privilege-tags-wrapper">
                                        ${privilegeTags}
                                    </div>
                                </td>
                                <td><span class="user-date-cell">${formatDate(user.created_at)}</span></td>
                                ${isSuperAdminDashboard ? `
                                    <td><span class="user-date-cell">${user.last_login ? formatDate(user.last_login) : 'Never'}</span></td>
                                    <td><span class="user-date-cell">${user.last_logout ? formatDate(user.last_logout) : 'Never'}</span></td>
                                ` : ''}
                                <td>
                                    <div class="user-actions">
                                        <button class="btn-table-action btn-user-view" data-user-id="${userId}" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>

                                        ${!isSuperAdminDashboard ? `
                                            <button class="btn-table-action btn-role btn-user-role ${userRole === 'super admin' ? 'restricted' : ''}" 
                                                    data-user-id="${userId}" 
                                                    data-restricted="${userRole === 'super admin' ? 'true' : 'false'}"
                                                    title="${userRole === 'super admin' ? 'Restricted: Super Admin' : 'Change Role'}">
                                                <i class="fas ${userRole === 'super admin' ? 'fa-user-lock' : 'fa-user-tag'}"></i>
                                            </button>
                                            ${userRole === 'super admin' ? `
                                                <button class="btn-table-action btn-block restricted" 
                                                        data-user-id="${userId}" 
                                                        data-restricted="true"
                                                        title="Cannot block a Super Admin" style="position:relative;opacity:0.7;">
                                                    <span class="fa-stack" style="font-size:0.55em;">
                                                        <i class="fas fa-ban fa-stack-2x" style="color:#EF4444;"></i>
                                                        <i class="fas fa-shield-alt fa-stack-1x" style="color:#64748b;"></i>
                                                    </span>
                                                </button>
                                            ` : `
                                                <button class="btn-table-action btn-block btn-user-block ${userStatus === 'blocked' ? 'btn-user-unblock' : ''}" 
                                                        data-user-id="${userId}" 
                                                        data-restricted="false"
                                                        title="${userStatus === 'blocked' ? 'Unblock User' : 'Block User (Request to Super Admin)'}">
                                                    <i class="fas ${userStatus === 'blocked' ? 'fa-unlock' : 'fa-ban'}"></i>
                                                </button>
                                            `}
                                        ` : `
                                            <button class="btn-table-action btn-role btn-user-role" data-user-id="${userId}" title="Change Role">
                                                <i class="fas fa-user-tag"></i>
                                            </button>
                                            <button class="btn-table-action btn-block btn-user-block ${userStatus === 'blocked' ? 'btn-user-unblock' : ''}" 
                                                    data-user-id="${userId}" 
                                                    title="${userStatus === 'blocked' ? 'Unblock User' : 'Block User'}">
                                                <i class="fas ${userStatus === 'blocked' ? 'fa-unlock' : 'fa-ban'}"></i>
                                            </button>
                                            <button class="btn-table-action btn-delete btn-user-delete" data-user-id="${userId}" title="Delete Account">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        `}
                                    </div>
                                </td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;
    attachUserButtonListeners();
    renderPagination(totalUsers);
}

// ── PAGINATION ────────────────────────────────────────────────
function renderPagination(totalItems) {
    let paginationEl = document.getElementById('userPagination');
    if (!paginationEl) {
        paginationEl = document.createElement('div');
        paginationEl.id = 'userPagination';
        const container = document.getElementById('usersContainer');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(paginationEl, container.nextSibling);
        }
    }

    if (totalItems === 0) { paginationEl.innerHTML = ''; return; }

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pagesHTML += `<button class="pg-btn ${i === currentPage ? 'pg-active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagesHTML += `<span class="pg-ellipsis">…</span>`;
        }
    }

    paginationEl.innerHTML = `
        <div class="pagination-wrapper">
            <span class="pg-info">Showing ${start}–${end} of ${totalItems} users</span>
            <div class="pg-controls">
                <button class="pg-btn pg-nav" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${pagesHTML}
                <button class="pg-btn pg-nav" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

function goToPage(page) {
    const totalPages = Math.ceil(allUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayUsers(allUsers);
    // Scroll table back to top
    const container = document.getElementById('usersContainer');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function attachUserButtonListeners() {
    document.querySelectorAll('.btn-user-view').forEach(button => {
        button.addEventListener('click', function () {
            const userId = parseInt(this.getAttribute('data-user-id'));
            viewUserDetails(userId);
        });
    });


    // document.querySelectorAll('.btn-user-role-save').forEach(button => {
    //     button.addEventListener('click', function () {
    //         const userId = parseInt(this.getAttribute('data-user-id'));
    //         const select = document.querySelector(`.inline-role-select[data-user-id="${userId}"]`);
    //         if (select) {
    //             updateUserRole(userId, select.value);
    //         }
    //     });
    // });

    document.querySelectorAll('.btn-user-role').forEach(button => {
        button.addEventListener('click', function () {
            const userId = parseInt(this.getAttribute('data-user-id'));
            const isRestricted = this.getAttribute('data-restricted') === 'true';

            if (isRestricted) {
                if (typeof showNotification === 'function') {
                    showNotification('Restricted: You do not have permission to modify Super Admin accounts.', 'error');
                } else {
                    alert('Restricted: You do not have permission to modify Super Admin accounts.');
                }
                return;
            }

            hasHappenedRoleChange = false; // Reset flag when opening
            openRoleChangeModal(userId);
        });
    });

    document.querySelectorAll('.btn-user-block').forEach(button => {
        button.addEventListener('click', function () {
            const userId = parseInt(this.getAttribute('data-user-id'));
            const isRestricted = this.getAttribute('data-restricted') === 'true';

            if (isRestricted) {
                if (typeof showNotification === 'function') {
                    showNotification('Restricted: You do not have permission to block Super Admin accounts.', 'error');
                } else {
                    alert('Restricted: You do not have permission to block Super Admin accounts.');
                }
                return;
            }

            const isUnblock = this.classList.contains('btn-user-unblock');
            updateUserStatus(userId, isUnblock ? 'active' : 'blocked');
        });
    });

    document.querySelectorAll('.btn-user-delete').forEach(button => {
        button.addEventListener('click', function () {
            const userId = parseInt(this.getAttribute('data-user-id'));
            deleteUser(userId);
        });
    });
}

function openRoleChangeModal(userId) {
    try {
        console.log('Opening Role Change Modal for User ID:', userId);

        // Show notification to track click
        if (typeof showNotification === 'function') {
            showNotification('Opening Role Change Modal...', 'info');
        }

        if (!allUsers || allUsers.length === 0) {
            console.error('allUsers array is empty. Cannot find user.');
            showNotification('Error: User list not initialized.', 'error');
            return;
        }

        const user = allUsers.find(u => Number(u.id) === Number(userId));
        if (!user) {
            console.error('User not found in allUsers array for ID:', userId);
            showNotification('Error: User details not found (ID: ' + userId + ').', 'error');
            return;
        }

        const roleSelect = document.getElementById('newRoleSelect');

        if (!roleSelect) {
            console.error('Role selection element not found (newRoleSelect).');
            showNotification('Error: Modal content not found.', 'error');
            return;
        }

        // Filter role options for regular admins
        if (!isSuperAdminDashboard) {
            roleSelect.innerHTML = `
                <option value="user">User - Restricted access</option>
                <option value="admin">Admin - Managerial access</option>
            `;
        } else {
            roleSelect.innerHTML = `
                <option value="user">User - Restricted access</option>
                <option value="admin">Admin - Managerial access</option>
                <option value="super admin">Super Admin - Full system access</option>
            `;
        }

        document.getElementById('roleChangeUserId').value = userId;
        const currentRole = user.role || 'user';
        roleSelect.value = currentRole;

        // Reset modal views to show form
        const form = document.querySelector('#roleChangeModal .cu-form');
        const successMsg = document.getElementById('roleChangeSuccessMsg');
        if (form) form.style.display = 'block';
        if (successMsg) successMsg.style.display = 'none';

        // Show initial preview
        updateRoleChangePreview(currentRole);

        const modal = document.getElementById('roleChangeModal');
        if (!modal) {
            console.error('Modal element not found (roleChangeModal).');
            showNotification('Error: Modal not found in dashboard.', 'error');
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        console.log('Modal opened successfully.');

        // Debug style after a delay
        setTimeout(() => {
            const m = document.getElementById('roleChangeModal');
            if (m) {
                const s = window.getComputedStyle(m);
                console.log('Final Modal Style Check:', s.display, s.opacity, s.zIndex, s.visibility);
                // If it's still not showing, tell the user why
                if (s.display === 'none' || s.opacity === '0' || s.visibility === 'hidden') {
                    showNotification(`Debug: Modal is hidden (${s.display}/${s.opacity}/${s.visibility})`, 'error');
                }
            }
        }, 800);

    } catch (error) {
        console.error('Error in openRoleChangeModal:', error);
        if (typeof showNotification === 'function') {
            showNotification('Unexpected Error: ' + error.message, 'error');
        }
    }
}

function closeRoleChangeModal() {
    const modal = document.getElementById('roleChangeModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    document.body.style.overflow = '';

    // If a role was changed, refresh the table automatically
    if (hasHappenedRoleChange) {
        loadUsers();
        hasHappenedRoleChange = false;
    }
}

function finishRoleChange() {
    closeRoleChangeModal();
    // Use full reload as requested to ensure all privileges and UI states are fresh
    location.reload();
}

function getPrivilegesForRole(role) {
    const r = role.toLowerCase();
    if (r === 'super admin') {
        return [
            { icon: 'fa-trash-alt', text: 'Delete' },
            { icon: 'fa-edit', text: 'Edit' },
            { icon: 'fa-user-plus', text: 'Add User' },
            { icon: 'fa-user-shield', text: 'Full Management' },
            { icon: 'fa-history', text: 'Logs' },
            { icon: 'fa-ban', text: 'Block' },
            { icon: 'fa-check-circle', text: 'Accept Request' }
        ];
    } else if (r === 'admin') {
        return [
            { icon: 'fa-eye', text: 'View' },
            { icon: 'fa-check', text: 'Accept' },
            { icon: 'fa-times', text: 'Reject' },
            { icon: 'fa-user-plus', text: 'Create User' },
            { icon: 'fa-history', text: 'Activity Logs' },
            { icon: 'fa-ban', text: 'Block' }
        ];
    } else {
        return [
            { icon: 'fa-book-open', text: 'View Recipes' },
            { icon: 'fa-search', text: 'Search' },
            { icon: 'fa-paper-plane', text: 'Request Recipes' }
        ];
    }
}

function updateRoleChangePreview(role) {
    const container = document.getElementById('roleChangePrivilegesPreview');
    if (!container) return;

    const privileges = getPrivilegesForRole(role);

    container.innerHTML = privileges.map(p => {
        const pClass = p.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return `<span class="privilege-tag p-tag-${pClass}"><i class="fas ${p.icon}"></i> ${p.text}</span>`;
    }).join('');
}

async function submitRoleChange() {
    const userId = document.getElementById('roleChangeUserId').value;
    const roleSelect = document.getElementById('newRoleSelect');
    const submitBtn = document.getElementById('roleChangeSubmitBtn');

    if (!userId || !roleSelect) return;

    const newRole = roleSelect.value;

    // Disable button to prevent double-click
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    }

    try {
        const formData = new FormData();
        formData.append('action', 'update_role');
        formData.append('user_id', userId);
        formData.append('role', newRole);
        if (isSuperAdminDashboard) {
            formData.append('scope', 'super_admin');
        }

        const response = await fetch('Phpfile/admin_users.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            hasHappenedRoleChange = true;

            // Update local allUsers array so table reflects change even before a full load/reload
            const userIndex = allUsers.findIndex(u => Number(u.id) === Number(userId));
            if (userIndex !== -1) {
                allUsers[userIndex].role = newRole;
                console.log('Updated local user role:', allUsers[userIndex]);
            }

            // Hide form and show success view
            const form = document.querySelector('#roleChangeModal .cu-form');
            const success = document.getElementById('roleChangeSuccessMsg');
            const successText = document.getElementById('roleChangeSuccessText');

            if (form) form.style.display = 'none';
            if (success) {
                success.style.display = 'block';
                if (successText) successText.textContent = data.message || `Role for User #${userId} has been successfully updated to ${newRole.toUpperCase()}.`;
            }

            // Trigger internal table refresh early
            displayUsers(allUsers);
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Update Role';
            }
            if (typeof showNotification === 'function') {
                showNotification(data.message || 'Failed to update role', 'error');
            } else {
                alert(data.message || 'Failed to update role');
            }
        }
    } catch (error) {
        console.error('Error changing role:', error);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Update Role';
        }
        if (typeof showNotification === 'function') {
            showNotification('An error occurred while updating the role.', 'error');
        } else {
            alert('An error occurred while updating the role.');
        }
    }
}





async function updateUserStatus(userId, newStatus) {
    const user = allUsers.find(u => u.id === userId);

    if (!user) {
        showNotification('User not found', 'error');
        return;
    }

    const action = newStatus === 'blocked' ? 'block' : 'unblock';

    if (!isSuperAdminDashboard) {
        if (!confirm(`Are you sure you want to ${action} "${user.username}"?`)) {
            return;
        }
    }

    try {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('user_id', userId);
        formData.append('status', newStatus);
        formData.append('scope', isSuperAdminDashboard ? 'super_admin' : 'admin');

        const response = await fetch('Phpfile/admin_users.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showNotification(data.message || (data.is_request ? 'Your request has been sent to the super admin' : 'User status updated successfully'), 'success');
            if (typeof refreshAdminUI === 'function') {
                refreshAdminUI();
            } else {
                await loadUsers();
            }
        } else {
            throw new Error(data.message || `Failed to ${action} user`);
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

async function updateUserRole(userId, inlineRole = null) {
    let newRole;

    if (inlineRole) {
        newRole = inlineRole;
    } else {
        const roleSelect = document.getElementById('roleSelect');
        if (!roleSelect) {
            showNotification('Role selector not found', 'error');
            return;
        }
        newRole = roleSelect.value;
    }

    if (!isSuperAdminDashboard) {
        if (!confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) {
            return;
        }
    }

    try {
        const formData = new FormData();
        formData.append('action', 'update_role');
        formData.append('user_id', userId);
        formData.append('role', newRole);
        formData.append('scope', isSuperAdminDashboard ? 'super_admin' : 'admin');

        const response = await fetch('Phpfile/admin_users.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            closeUserDetailModal();
            if (typeof refreshAdminUI === 'function') {
                refreshAdminUI();
            } else {
                await loadUsers();
            }
        } else {
            throw new Error(data.message || 'Failed to update user role');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}
async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }


    if (!isSuperAdminDashboard) {
        if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE the account for "${user.username}"? This action cannot be undone.`)) {
            return;
        }
    }

    // Instant UI Update: Remove the row immediately
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    const originalDisplay = userRow ? userRow.style.display : '';
    if (userRow) userRow.remove();

    // Update local state early
    allUsers = allUsers.filter(u => u.id !== userId);
    if (typeof renderUsers === 'function') renderUsers(allUsers);
    if (typeof updateDashboardStats === 'function') updateDashboardStats();

    try {
        const formData = new FormData();
        formData.append('action', 'delete_user');
        formData.append('user_id', userId);
        formData.append('scope', isSuperAdminDashboard ? 'super_admin' : 'admin'); // Ensure scope is provided

        const response = await fetch('Phpfile/admin_users.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            if (typeof refreshAdminUI === 'function') {
                refreshAdminUI(true); // silent refresh for other modules
            }
        } else {
            // Restore if failed
            loadUsers(); // Full reload to be safe
            throw new Error(data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}


function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.textContent = message;

    // Very basic styling as fallback
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        background: ${type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#3B82F6')};
        color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function setupUserFilters() {
    const roleSelect = document.getElementById('roleFilterSelect');
    const statusSelect = document.getElementById('statusFilterSelect');

    if (roleSelect) {
        roleSelect.addEventListener('change', function () {
            currentRoleFilter = this.value;
            currentPage = 1;
            loadUsers();
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', function () {
            currentStatusFilter = this.value;
            currentPage = 1;
            loadUsers();
        });
    }
}

function setupUserSearch() {
    const searchInput = document.getElementById('userSearchInput');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(function () {
            currentPage = 1;
            loadUsers();
        }, 300));
    }
}

// Client-side filtering removed as we now use server-side filtering for search as well
// filterUsers(searchTerm) function removed

function getRoleClass(role) {
    const roleClasses = {
        'user': 'role-user',
        'admin': 'role-admin',
        'super admin': 'role-super-admin'
    };
    return roleClasses[role] || 'role-user';
}

function getRoleIcon(role) {
    const roleIcons = {
        'user': 'fa-user',
        'admin': 'fa-user-tie',
        'super admin': 'fa-user-shield'
    };
    return roleIcons[role] || 'fa-user';
}

function getActivityIcon(actionType) {
    const icons = {
        'status_update': 'fa-toggle-on',
        'role_update': 'fa-user-shield',
        'user_delete': 'fa-trash',
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt'
    };
    return icons[actionType] || 'fa-circle';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// DISABLED: Prevents accidental modal closure while viewing user details
// window.onclick = function(event) {
//     const userModal = document.getElementById('userDetailModal');
//     if (event.target === userModal) {
//         closeUserDetailModal();
//     }
// }

document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        closeUserDetailModal();
    }
});

async function viewUserDetails(userId) {
    console.log('Viewing user details:', userId);

    const modal = document.getElementById('userDetailModal');
    const modalBody = document.getElementById('userModalBody');
    const modalFooter = document.getElementById('userModalFooter');

    if (!modal || !modalBody || !modalFooter) {
        console.error('Modal elements missing:', { modal, modalBody, modalFooter });
        if (typeof showNotification === 'function') {
            showNotification('Error: User detail modal elements not found in this dashboard.', 'error');
        }
        return;
    }

    modalBody.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading User details...</p>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(`Phpfile/admin_users.php?action=get_user_details&user_id=${userId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load user details');
        }

        const user = data.user;
        const activities = data.activities || [];
        const userRole = user.role || 'user';
        const userStatus = user.status || 'active';

        document.getElementById('userModalName').textContent = `${user.fname} ${user.lname}`;

        modalBody.innerHTML = `
            <div class="user-detail-grid">
                <div class="detail-section">
                    <h3><i class="fas fa-user-circle"></i> Basic Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Full Name:</label>
                            <span>${user.fname} ${user.lname}</span>
                        </div>
                        <div class="info-item">
                            <label>Username:</label>
                            <span>@${user.username}</span>
                        </div>
                        <div class="info-item">
                            <label>Email:</label>
                            <span>${user.emailadd}</span>
                        </div>
                        <div class="info-item">
                            <label>Role:</label>
                            <span class="user-role ${getRoleClass(userRole)}">${userRole}</span>
                        </div>
                        <div class="info-item">
                            <label>Status:</label>
                            <span class="user-status ${userStatus === 'active' ? 'status-active' : 'status-blocked'}">${userStatus}</span>
                        </div>
                        <div class="info-item">
                            <label>Joined:</label>
                            <span>${formatDate(user.created_at)}</span>
                        </div>
                        <div class="info-item">
                            <label>Last Login:</label>
                            <span>${user.last_login ? formatDate(user.last_login) : 'Never'}</span>
                        </div>
                        <div class="info-item">
                            <label>Last Logout:</label>
                            <span>${user.last_logout ? formatDate(user.last_logout) : 'Never'}</span>
                        </div>
                        <div class="info-item">
                            <label>Submitted Recipes:</label>
                            <span>${user.recipe_count}</span>
                        </div>
                    </div>
                </div>
                
                ${(userRole !== 'super admin' && isSuperAdminDashboard) ? `
                <div class="detail-section">
                    <h3><i class="fas fa-user-shield"></i> Role Management</h3>
                    <div class="role-selector">
                        <label for="roleSelect">Change User Role:</label>
                        <select id="roleSelect" class="role-select">
                            <option value="user" ${userRole === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="super admin" ${userRole === 'super admin' ? 'selected' : ''}>Super Admin</option>
                        </select>
                        <button class="btn-primary" onclick="updateUserRole(${user.id})">
                            <i class="fas fa-save"></i> Update Role
                        </button>
                    </div>
                </div>
                ` : ''}
                
                ${activities.length > 0 ? `
                <div class="detail-section">
                    <h3><i class="fas fa-history"></i> Recent Activity</h3>
                    <div class="activity-list">
                        ${activities.map(activity => `
                            <div class="activity-item">
                                <div class="activity-icon">
                                    <i class="fas ${getActivityIcon(activity.action_type)}"></i>
                                </div>
                                <div class="activity-content">
                                    <p>${activity.description}</p>
                                    <span class="activity-time">${formatDate(activity.created_at)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn-secondary" onclick="closeUserDetailModal()">Close</button>
        `;

    } catch (error) {
        console.error('Error loading user details:', error);
        modalBody.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

function closeUserDetailModal() {
    const modal = document.getElementById('userDetailModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}