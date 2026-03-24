// super_users.js — SUPER ADMIN ONLY User Management
// All actions execute directly (no pending requests, no approvals needed)

let allUsers = [];
let currentRoleFilter = 'all';
let currentStatusFilter = 'all';
let currentPage = 1;
const itemsPerPage = 10;
let isUserManagementSetup = false;

// ===================================
// INIT
// ===================================
function initializeUserManagement() {
    console.log('Super Admin User Management initialized!');
    loadUsers();

    if (!isUserManagementSetup) {
        setupUserFilters();
        setupUserSearch();
        isUserManagementSetup = true;
    }
}

// ===================================
// LOAD USERS
// ===================================
async function loadUsers() {
    const container = document.getElementById('usersContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading User Management...</p>
        </div>
    `;

    try {
        const searchInput = document.getElementById('userSearchInput');
        const searchTerm  = searchInput ? searchInput.value : '';

        const params = new URLSearchParams({
            action: 'get_users',
            role:   currentRoleFilter,
            status: currentStatusFilter,
            search: searchTerm
        });

        const response = await fetch('Phpfile/super_users.php?' + params);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

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
                <p>Failed to load users. Please refresh the page.</p>
                <p style="font-size:0.9rem;margin-top:1rem;color:var(--danger);">${error.message}</p>
            </div>
        `;
    }
}

// ===================================
// STATISTICS
// ===================================
function updateUserStatistics(stats) {
    const elements = {
        totalUsers:   document.getElementById('totalUsersCount'),
        regularUsers: document.getElementById('regularUsersCount'),
        adminUsers:   document.getElementById('adminUsersCount'),
        blockedUsers: document.getElementById('blockedUsersCount')
    };

    if (elements.totalUsers)   elements.totalUsers.textContent   = stats.total;
    if (elements.regularUsers) elements.regularUsers.textContent = stats.users;
    if (elements.adminUsers)   elements.adminUsers.textContent   = stats.admins + stats.super_admins;
    if (elements.blockedUsers) elements.blockedUsers.textContent = stats.blocked;
}

// ===================================
// DISPLAY USERS TABLE
// ===================================
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

    // ── Pagination slice ───────────────────────────────────────
    const totalUsers = users.length;
    const totalPages = Math.ceil(totalUsers / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx   = (currentPage - 1) * itemsPerPage;
    const pageUsers  = users.slice(startIdx, startIdx + itemsPerPage);
    // ──────────────────────────────────────────────────────────

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
                        <th>Joined</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="userTableBody">
                    ${pageUsers.map(user => {
                        const userId     = user.id;
                        const fullName   = `${user.fname} ${user.lname}`;
                        const userRole   = user.role || 'user';
                        const userStatus = user.status || 'active';
                        const statusClass    = userStatus === 'active' ? 'status-active' : 'status-blocked';
                        const roleBadgeClass = getRoleClass(userRole);
                        const privileges     = getPrivilegesForRole(userRole);

                        const privilegeTags = privileges.map(p => {
                            const pClass = p.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            return `<span class="privilege-tag p-tag-${pClass}"><i class="fas ${p.icon}"></i> ${p.text}</span>`;
                        }).join('');

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
                                    <div class="privilege-tags-wrapper">${privilegeTags}</div>
                                </td>
                                <td><span class="user-date-cell">${formatDate(user.created_at)}</span></td>
                                <td>
                                    <div class="user-actions">
                                        <!-- View -->
                                        <button class="btn-table-action btn-user-view" data-user-id="${userId}" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>

                                        <!-- Change Role -->
                                        <button class="btn-table-action btn-role btn-user-role"
                                                data-user-id="${userId}"
                                                title="Change Role">
                                            <i class="fas fa-user-tag"></i>
                                        </button>

                                        <!-- Block / Unblock (DIRECT — no approval needed) -->
                                        <button class="btn-table-action btn-block btn-user-block ${userStatus === 'blocked' ? 'btn-user-unblock' : ''}"
                                                data-user-id="${userId}"
                                                title="${userStatus === 'blocked' ? 'Unblock User' : 'Block User'}">
                                            <i class="fas ${userStatus === 'blocked' ? 'fa-unlock' : 'fa-ban'}"></i>
                                        </button>

                                        <!-- Delete (DIRECT with confirmation modal) -->
                                        <button class="btn-table-action btn-delete btn-user-delete"
                                                data-user-id="${userId}"
                                                data-username="${user.username}"
                                                data-fullname="${fullName}"
                                                title="Delete Account">
                                            <i class="fas fa-trash"></i>
                                        </button>
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

// ── PAGINATION ───────────────────────────────────────────────
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
    const end   = Math.min(currentPage * itemsPerPage, totalItems);

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
    const container = document.getElementById('usersContainer');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================================
// BUTTON LISTENERS
// ===================================
function attachUserButtonListeners() {
    // View
    document.querySelectorAll('.btn-user-view').forEach(btn => {
        btn.addEventListener('click', function () {
            viewUserDetails(parseInt(this.getAttribute('data-user-id')));
        });
    });

    // Role
    document.querySelectorAll('.btn-user-role').forEach(btn => {
        btn.addEventListener('click', function () {
            openRoleChangeModal(parseInt(this.getAttribute('data-user-id')));
        });
    });

    // Block / Unblock
    document.querySelectorAll('.btn-user-block').forEach(btn => {
        btn.addEventListener('click', function () {
            const userId   = parseInt(this.getAttribute('data-user-id'));
            const isUnblock = this.classList.contains('btn-user-unblock');
            updateUserStatus(userId, isUnblock ? 'active' : 'blocked');
        });
    });

    // Delete
    document.querySelectorAll('.btn-user-delete').forEach(btn => {
        btn.addEventListener('click', function () {
            const userId   = parseInt(this.getAttribute('data-user-id'));
            const username = this.getAttribute('data-username');
            const fullName = this.getAttribute('data-fullname');
            openDeleteConfirmModal(userId, username, fullName);
        });
    });
}

// ===================================
// VIEW USER DETAILS
// ===================================
async function viewUserDetails(userId) {
    try {
        const response = await fetch(`Phpfile/super_users.php?action=get_user_details&user_id=${userId}`);
        const data = await response.json();

        if (!data.success) {
            showNotification('Failed to load user details: ' + data.message, 'error');
            return;
        }

        const user = data.user;
        const modal = document.getElementById('userDetailModal');
        const modalName = document.getElementById('userModalName');
        const modalBody = document.getElementById('userModalBody');

        if (!modal) return;

        modalName.textContent = `${user.fname} ${user.lname}`;

        const activities = data.activities || [];
        const activityHTML = activities.length > 0
            ? activities.map(a => `
                <div class="activity-item">
                    <i class="fas ${getActivityIcon(a.action_type)}"></i>
                    <div>
                        <p>${a.description}</p>
                        <small>${formatDate(a.created_at)}</small>
                    </div>
                </div>
            `).join('')
            : '<p style="color:#888;">No recent activity.</p>';

        modalBody.innerHTML = `
            <div class="user-detail-grid">
                <div class="detail-section">
                    <h3><i class="fas fa-user"></i> Profile</h3>
                    <div class="detail-row"><span>Full Name:</span><strong>${user.fname} ${user.lname}</strong></div>
                    <div class="detail-row"><span>Username:</span><strong>@${user.username}</strong></div>
                    <div class="detail-row"><span>Email:</span><strong>${user.emailadd}</strong></div>
                    <div class="detail-row"><span>Role:</span><span class="user-role-badge ${getRoleClass(user.role)}">${user.role}</span></div>
                    <div class="detail-row"><span>Status:</span><span class="user-status ${user.status === 'active' ? 'status-active' : 'status-blocked'}">${user.status}</span></div>
                    <div class="detail-row"><span>Joined:</span><strong>${formatDate(user.created_at)}</strong></div>
                    <div class="detail-row"><span>Last Login:</span><strong>${user.last_login ? formatDate(user.last_login) : 'Never'}</strong></div>
                    <div class="detail-row"><span>Last Logout:</span><strong>${user.last_logout ? formatDate(user.last_logout) : 'Never'}</strong></div>
                    <div class="detail-row"><span>Recipes Submitted:</span><strong>${user.recipe_count}</strong></div>
                </div>
                <div class="detail-section">
                    <h3><i class="fas fa-history"></i> Recent Activity</h3>
                    <div class="activity-list">${activityHTML}</div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        showNotification('Error loading user details: ' + error.message, 'error');
    }
}

function closeUserDetailModal() {
    const modal = document.getElementById('userDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// ===================================
// ROLE CHANGE MODAL
// ===================================
let hasHappenedRoleChange = false;

function openRoleChangeModal(userId) {
    const user = allUsers.find(u => Number(u.id) === Number(userId));
    if (!user) {
        showNotification('User not found.', 'error');
        return;
    }

    const roleSelect = document.getElementById('newRoleSelect');
    if (!roleSelect) {
        showNotification('Modal not found.', 'error');
        return;
    }

    // Super Admin can promote to any role
    roleSelect.innerHTML = `
        <option value="user">User - Restricted access</option>
        <option value="admin">Admin - Managerial access</option>
        <option value="super admin">Super Admin - Full system access</option>
    `;

    document.getElementById('roleChangeUserId').value = userId;
    const currentRole = user.role || 'user';
    roleSelect.value = currentRole;
    updateRoleChangePreview(currentRole);

    const form       = document.querySelector('#roleChangeModal .cu-form');
    const successMsg = document.getElementById('roleChangeSuccessMsg');
    if (form)       form.style.display = 'block';
    if (successMsg) successMsg.style.display = 'none';

    hasHappenedRoleChange = false;

    const modal = document.getElementById('roleChangeModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeRoleChangeModal() {
    const modal = document.getElementById('roleChangeModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    document.body.style.overflow = '';

    if (hasHappenedRoleChange) {
        loadUsers();
        hasHappenedRoleChange = false;
    }
}

function finishRoleChange() {
    closeRoleChangeModal();
    location.reload();
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
    const userId     = document.getElementById('roleChangeUserId').value;
    const roleSelect = document.getElementById('newRoleSelect');
    const submitBtn  = document.getElementById('roleChangeSubmitBtn');

    if (!userId || !roleSelect) return;

    const newRole = roleSelect.value;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    }

    try {
        const formData = new FormData();
        formData.append('action', 'update_role');
        formData.append('user_id', userId);
        formData.append('role', newRole);

        const response = await fetch('Phpfile/super_users.php', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            hasHappenedRoleChange = true;
            const idx = allUsers.findIndex(u => Number(u.id) === Number(userId));
            if (idx !== -1) allUsers[idx].role = newRole;

            const form    = document.querySelector('#roleChangeModal .cu-form');
            const success = document.getElementById('roleChangeSuccessMsg');
            const txt     = document.getElementById('roleChangeSuccessText');
            if (form)    form.style.display = 'none';
            if (success) {
                success.style.display = 'block';
                if (txt) txt.textContent = data.message || `Role updated to ${newRole.toUpperCase()}.`;
            }
            displayUsers(allUsers);
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Update Role';
            }
            showNotification(data.message || 'Failed to update role', 'error');
        }
    } catch (error) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Update Role';
        }
        showNotification('An error occurred: ' + error.message, 'error');
    }
}

// ===================================
// BLOCK / UNBLOCK  (DIRECT)
// ===================================
async function updateUserStatus(userId, newStatus) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }

    const action = newStatus === 'blocked' ? 'block' : 'unblock';

    if (!confirm(`Are you sure you want to ${action} "${user.username}"?`)) return;

    try {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('user_id', userId);
        formData.append('status', newStatus);

        const response = await fetch('Phpfile/super_users.php', { method: 'POST', body: formData });
        const data     = await response.json();

        if (data.success) {
            showNotification(data.message || 'User status updated successfully', 'success');
            await loadUsers();
        } else {
            throw new Error(data.message || `Failed to ${action} user`);
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// ===================================
// DELETE CONFIRMATION MODAL
// ===================================
function openDeleteConfirmModal(userId, username, fullName) {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;

    document.getElementById('deleteConfirmUsername').textContent = fullName + ' (@' + username + ')';
    document.getElementById('deleteConfirmUserId').value = userId;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

async function confirmDeleteUser() {
    const userId  = document.getElementById('deleteConfirmUserId').value;
    const confirmBtn = document.getElementById('deleteConfirmBtn');

    if (!userId) return;

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const formData = new FormData();
        formData.append('action', 'delete_user');
        formData.append('user_id', userId);

        const response = await fetch('Phpfile/super_users.php', { method: 'POST', body: formData });
        const data     = await response.json();

        if (data.success) {
            closeDeleteConfirmModal();
            showNotification(data.message || 'User deleted successfully', 'success');

            // Optimistic UI: remove row
            allUsers = allUsers.filter(u => u.id !== parseInt(userId));
            displayUsers(allUsers);
        } else {
            throw new Error(data.message || 'Failed to delete user');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Yes, Delete';
        }
    }
}

// ===================================
// FILTERS & SEARCH
// ===================================
function setupUserFilters() {
    const roleSelect   = document.getElementById('roleFilterSelect');
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
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            loadUsers();
        }, 300));
    }
}

// ===================================
// HELPER UTILITIES
// ===================================
function getPrivilegesForRole(role) {
    const r = role.toLowerCase();
    if (r === 'super admin') {
        return [
            { icon: 'fa-trash-alt',    text: 'Delete' },
            { icon: 'fa-edit',         text: 'Edit' },
            { icon: 'fa-user-plus',    text: 'Add User' },
            { icon: 'fa-user-shield',  text: 'Full Management' },
            { icon: 'fa-history',      text: 'Logs' },
            { icon: 'fa-ban',          text: 'Block' },
            { icon: 'fa-check-circle', text: 'Accept Request' }
        ];
    } else if (r === 'admin') {
        return [
            { icon: 'fa-eye',          text: 'View' },
            { icon: 'fa-check',        text: 'Accept' },
            { icon: 'fa-times',        text: 'Reject' },
            { icon: 'fa-user-plus',    text: 'Create User' },
            { icon: 'fa-history',      text: 'Activity Logs' },
            { icon: 'fa-ban',          text: 'Block' }
        ];
    } else {
        return [
            { icon: 'fa-book-open',    text: 'View Recipes' },
            { icon: 'fa-search',       text: 'Search' },
            { icon: 'fa-paper-plane',  text: 'Request Recipes' }
        ];
    }
}

function getRoleClass(role) {
    const map = { 'user': 'role-user', 'admin': 'role-admin', 'super admin': 'role-super-admin' };
    return map[role] || 'role-user';
}

function getRoleIcon(role) {
    const map = { 'user': 'fa-user', 'admin': 'fa-user-tie', 'super admin': 'fa-user-shield' };
    return map[role] || 'fa-user';
}

function getActivityIcon(actionType) {
    const map = {
        'status_update': 'fa-toggle-on',
        'role_update':   'fa-user-shield',
        'user_delete':   'fa-trash',
        'login':         'fa-sign-in-alt',
        'logout':        'fa-sign-out-alt'
    };
    return map[actionType] || 'fa-circle';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function showNotification(message, type = 'info') {
    document.querySelectorAll('.notification-toast').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s ease;
        font-family: inherit; font-size: 0.95rem;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}
