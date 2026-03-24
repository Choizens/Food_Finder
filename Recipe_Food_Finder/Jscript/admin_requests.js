// =====================================================
// ADMIN REQUESTS JS — admin_requests.js
// FILE LOCATION: Jscript/admin_requests.js
// =====================================================
// SCOPE is defined globally by admin_dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    loadPendingRequests();
});

function loadPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;

    // Show loading state
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading requests...</div>`;
    fetchPendingRequests(container);
}

function fetchPendingRequests(container) {
    fetch(`Phpfile/admin_requests.php?action=get_pending&scope=${SCOPE}`)
        .then(response => response.json())
        .then(data => {
            if (data.success === false && data.message === 'Unauthorized access') {
                container.innerHTML = `<p style="color:red;padding:1rem;"><i class="fas fa-lock"></i> Access Denied: Super Admin only.</p>`;
                return;
            }

            if (data.success) {
                renderRequests(data.requests);
                updateRequestBadge(data.requests.length);
            } else {
                container.innerHTML = `<p class="error-msg">Failed to load requests: ${data.message}</p>`;
            }
        })
        .catch(error => {
            console.error('Error loading requests:', error);
            container.innerHTML = `<p class="error-msg"><i class="fas fa-exclamation-triangle"></i> Error loading requests. Check console.</p>`;
        });
}

function renderRequests(requests) {
    const container = document.getElementById('pendingRequestsContainer');

    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No pending requests.</p>
            </div>`;
        return;
    }

    let html = '<div class="requests-grid">';

    requests.forEach(req => {
        const data = req.target_data || {};
        let details = '';
        let icon = '';
        let colorClass = '';

        // Format details based on action type
        switch (req.action_type) {
            case 'create_user':
            case 'register_user':
                icon = 'fa-user-plus';
                colorClass = 'req-create';
                details = `
                    <strong>${req.action_type === 'register_user' ? 'New Registration:' : 'Create User:'}</strong> ${data.username || data.fname + ' ' + (data.lname || '')}<br>
                    <small>Email: ${data.email || data.emailadd || 'N/A'} | Role: ${data.role || 'user'}</small>
                `;
                break;
            case 'update_status':
                icon = 'fa-user-shield';
                colorClass = data.status === 'blocked' ? 'req-delete' : 'req-update';
                const action = data.status === 'blocked' ? 'Block' : 'Activate';
                details = `
                    <strong>${action} User:</strong> ${data.username || 'Unknown'}<br>
                    <small>Email: ${data.email || 'N/A'} | Role: ${data.current_role || 'N/A'}</small><br>
                    <small>New Status: <span style="font-weight: 600; color: ${data.status === 'blocked' ? '#EF4444' : '#10B981'}">${data.status}</span></small>
                `;
                break;
            case 'update_role':
                icon = 'fa-user-tag';
                colorClass = 'req-update';
                details = `
                    <strong>Change Role:</strong> ${data.username || 'Unknown'}<br>
                    <small>Email: ${data.email || 'N/A'}</small><br>
                    <small>Role: ${data.current_role || 'N/A'} → ${data.new_role || data.role || 'N/A'}</small>
                `;
                break;
            case 'delete_user':
                icon = 'fa-user-times';
                colorClass = 'req-delete';
                details = `
                    <strong>Delete User:</strong> ${data.username || 'Unknown'}<br>
                    <small>Email: ${data.email || 'N/A'} | Role: ${data.role || 'N/A'}</small>
                `;
                break;
            default:
                icon = 'fa-question';
                details = 'Unknown Action';
        }

        html += `
            <div class="request-card ${colorClass}" data-request-id="${req.id}">
                <div class="req-header">
                    <span class="req-type"><i class="fas ${icon}"></i> ${req.action_type.replace(/_/g, ' ').toUpperCase()}</span>
                    <span class="req-date">${new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                <div class="req-body">
                    <p style="margin-bottom:6px;">
                        <span style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;padding:4px 10px;border-radius:20px;font-size:0.82rem;">
                            <i class="fas fa-user-shield" style="color:#8b5cf6;"></i>
                            <strong>Requested by Admin:</strong>&nbsp;${req.requester_username}
                        </span>
                    </p>
                    <p class="req-details">${details}</p>
                </div>
                <div class="req-actions">
                    <button class="btn-approve" onclick="approveRequest('${req.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="rejectRequest('${req.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button class="btn-delete-request" onclick="deleteRequest('${req.id}')" title="Delete/Purge Request">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function updateRequestBadge(count) {
    const badge = document.getElementById('requestCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Also sync the other badge ID if used in sidebar
    const sidebarBadge = document.getElementById('pendingRequestsBadge');
    if (sidebarBadge) {
        sidebarBadge.textContent = count;
        sidebarBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Also update dashboard stat if exists
    const stat = document.getElementById('totalPendingRequests');
    if (stat) stat.textContent = count;
}

function approveRequest(id) {
    if (!confirm('Are you sure you want to approve this request?')) return;

    // Instant UI Update: Remove the card immediately
    const reqCard = document.querySelector(`.request-card[data-request-id="${id}"]`) ||
        document.querySelector(`button[onclick="approveRequest(${id})"]`)?.closest('.request-card');

    if (reqCard) reqCard.remove();

    const formData = new FormData();
    formData.append('action', 'approve');
    formData.append('request_id', id);
    formData.append('scope', SCOPE);

    fetch('Phpfile/admin_requests.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Request Approved and Executed! ✨', 'success');
                if (typeof refreshAdminUI === 'function') {
                    refreshAdminUI(true); // silent refresh
                }
            } else {
                // Restore if failed
                loadPendingRequests();
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadPendingRequests();
        });
}

function rejectRequest(id) {
    if (!confirm('Are you sure you want to reject this request?')) return;

    // Instant UI Update: Remove the card immediately
    const reqCard = document.querySelector(`.request-card[data-request-id="${id}"]`) ||
        document.querySelector(`button[onclick="rejectRequest(${id})"]`)?.closest('.request-card');

    if (reqCard) reqCard.remove();

    const formData = new FormData();
    formData.append('action', 'reject');
    formData.append('request_id', id);
    formData.append('scope', SCOPE);

    fetch('Phpfile/admin_requests.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Request Rejected.', 'info');
                if (typeof refreshAdminUI === 'function') refreshAdminUI(true);
            } else {
                // Restore if failed
                loadPendingRequests();
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadPendingRequests();
        });
}

function deleteRequest(id) {
    if (!confirm('PERMANENT: Purge this request record? This cannot be undone.')) return;

    // Instant UI Update: Remove the card immediately
    const reqCard = document.querySelector(`.request-card[data-request-id="${id}"]`) ||
        document.querySelector(`button[onclick="deleteRequest(${id})"]`)?.closest('.request-card');

    if (reqCard) reqCard.remove();

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('request_id', id);
    formData.append('scope', SCOPE);

    fetch('Phpfile/admin_requests.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Request purged.', 'success');
                if (typeof refreshAdminUI === 'function') refreshAdminUI(true);
            } else {
                // Restore if failed
                loadPendingRequests();
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadPendingRequests();
        });
}

// Helper to show notifications if not defined
if (typeof showNotification !== 'function') {
    window.showNotification = (msg, type) => {
        alert(msg);
    };
}
