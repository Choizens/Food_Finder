// =====================================================
// ADMIN LOGS JS — admin_logs.js
// FILE LOCATION: Jscript/admin_logs.js
// =====================================================

const LOGS_PER_PAGE = 25;
let logsCurrentPage = 1;
let logsTotalCount = 0;
let logsCurrentType = 'all';
let logsSearchTerm = '';
let logsDebounceTimer = null;

// ── Initialize (called when Logs section is shown) ──
function initializeLogs() {
    logsCurrentPage = 1;
    logsCurrentType = 'all';
    logsSearchTerm = '';

    // Reset search input
    const searchInput = document.getElementById('logsSearchInput');
    if (searchInput) {
        searchInput.value = '';
        const newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);
        newInput.addEventListener('input', function () {
            clearTimeout(logsDebounceTimer);
            logsDebounceTimer = setTimeout(() => {
                logsSearchTerm = this.value.trim();
                logsCurrentPage = 1;
                fetchAndDisplayLogs();
            }, 320);
        });
    }

    // Reset + reattach filter pills
    document.querySelectorAll('.log-filter-pill').forEach(pill => {
        const newPill = pill.cloneNode(true);
        pill.parentNode.replaceChild(newPill, pill);
    });
    document.querySelectorAll('.log-filter-pill').forEach(pill => {
        pill.addEventListener('click', function () {
            document.querySelectorAll('.log-filter-pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            logsCurrentType = this.getAttribute('data-type');
            logsCurrentPage = 1;
            fetchAndDisplayLogs();
        });
    });

    fetchAndDisplayLogs();
}

// ── Fetch logs from server ──────────────────────────
async function fetchAndDisplayLogs() {
    showLogsLoading();
    try {
        const params = new URLSearchParams({
            action: 'get_all',
            type: logsCurrentType,
            search: logsSearchTerm,
            limit: LOGS_PER_PAGE,
            offset: (logsCurrentPage - 1) * LOGS_PER_PAGE
        });

        const response = await fetch('Phpfile/get_logs.php?' + params);
        if (!response.ok) throw new Error('Network error ' + response.status);

        const data = await response.json();

        if (data.success) {
            logsTotalCount = data.total;
            renderLogsStats(data.stats);
            renderLogsTable(data.logs);
            renderLogsPagination();
        } else {
            showLogsError(data.message || 'Failed to load logs');
        }
    } catch (err) {
        console.error('Logs fetch error:', err);
        showLogsError('Failed to connect to server.');
    }
}

// ── Render stats cards ──────────────────────────────
function renderLogsStats(stats) {
    const ids = {
        logStatTotal: stats.total,
        logStatLogins: stats.logins,
        logStatLogouts: stats.logouts,
        logStatStatus: stats.status,
        logStatDeletes: stats.deletes,
        logStatCreates: stats.creates,
        logStatRoles: stats.roles
    };
    Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val ?? 0;
    });
}

// ── Render the table ────────────────────────────────
function renderLogsTable(logs) {
    const tbody = document.getElementById('logsTableBody');
    const table = tbody ? tbody.closest('table') : null;
    const countEl = document.getElementById('logsCountBadge');
    if (!tbody || !table) return;

    if (countEl) countEl.textContent = logsTotalCount + ' entries';

    // Determine if we show "Full" session view or "Simplified" action view
    // Mode A (Full): 'all', 'login'
    // Mode B (Simplified): 'status_update', 'user_delete', 'create_user', 'role_update'
    const isSimplified = !['all', 'login'].includes(logsCurrentType);
    const colCount = isSimplified ? 6 : 8;

    // 1. Update Table Headers if needed
    const thead = table.querySelector('thead');
    if (thead) {
        if (isSimplified) {
            thead.innerHTML = `
                <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Time</th>
                    <th>Target</th>
                    <th>Device</th>
                    <th>Description</th>
                </tr>`;
        } else {
            thead.innerHTML = `
                <tr>
                    <th>User</th>
                    <th>Action Login</th>
                    <th>Login Time</th>
                    <th>Action Logout</th>
                    <th>Logout Time</th>
                    <th>Target</th>
                    <th>Device</th>
                    <th>Description</th>
                </tr>`;
        }
    }

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}">
                    <div class="logs-empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No activity logs found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const typeBadge = makeTypeBadge(log.action_type);
        const deviceInfo = parseDevice(log.device || 'Unknown');
        const timeInfo = formatLogTime(log.created_at);
        const initials = (log.admin_username || '?').substring(0, 2).toUpperCase();

        if (isSimplified) {
            // Simplified columns: User, Action, Time, Target, Device, Description
            return `
                <tr>
                    <td>
                        <div class="log-user-cell">
                            <div class="log-user-avatar">${initials}</div>
                            <span class="log-username">${escHtml(log.admin_username)}</span>
                        </div>
                    </td>
                    <td>${typeBadge}</td>
                    <td>
                        <div class="log-time-cell">
                            <span class="log-time-date">${timeInfo.date}</span>
                            <span class="log-time-time">${timeInfo.time}</span>
                        </div>
                    </td>
                    <td>${escHtml(log.target_user || '—')}</td>
                    <td>
                        <div class="log-device-cell">
                            <span class="log-device-main">${escHtml(deviceInfo.type)} · ${escHtml(deviceInfo.os)}</span>
                            <span class="log-device-sub">${escHtml(deviceInfo.browser)}</span>
                        </div>
                    </td>
                    <td><span class="log-desc" title="${escHtml(log.description)}">${escHtml(log.description)}</span></td>
                </tr>`;
        } else {
            // Full columns: User, Action Login, Login Time, Action Logout, Logout Time, Target, Device, Description
            const loginAction = log.action_type === 'login' ? typeBadge : (log.action_type === 'logout' ? '' : typeBadge);
            const loginTime = log.action_type === 'login' ? `
                <div class="log-time-cell">
                    <span class="log-time-date">${timeInfo.date}</span>
                    <span class="log-time-time">${timeInfo.time}</span>
                </div>` : (log.action_type === 'logout' ? '—' : `
                <div class="log-time-cell">
                    <span class="log-time-date">${timeInfo.date}</span>
                    <span class="log-time-time">${timeInfo.time}</span>
                </div>`);

            const logoutAction = log.session_logout_time ? makeTypeBadge('logout') : (log.action_type === 'login' ? '<span class="log-pending">Active</span>' : (log.action_type === 'logout' ? makeTypeBadge('logout') : '—'));

            const logoutTime = log.session_logout_time ? `
                <div class="log-time-cell">
                    <span class="log-time-date">${formatLogTime(log.session_logout_time).date}</span>
                    <span class="log-time-time">${formatLogTime(log.session_logout_time).time}</span>
                </div>` : (log.action_type === 'logout' ? `
                <div class="log-time-cell">
                    <span class="log-time-date">${timeInfo.date}</span>
                    <span class="log-time-time">${timeInfo.time}</span>
                </div>` : '—');

            return `
                <tr>
                    <td>
                        <div class="log-user-cell">
                            <div class="log-user-avatar">${initials}</div>
                            <span class="log-username">${escHtml(log.admin_username)}</span>
                        </div>
                    </td>
                    <td>${loginAction}</td>
                    <td>${loginTime}</td>
                    <td>${logoutAction}</td>
                    <td>${logoutTime}</td>
                    <td>${escHtml(log.target_user || '—')}</td>
                    <td>
                        <div class="log-device-cell">
                            <span class="log-device-main">${escHtml(deviceInfo.type)} · ${escHtml(deviceInfo.os)}</span>
                            <span class="log-device-sub">${escHtml(deviceInfo.browser)}</span>
                        </div>
                    </td>
                    <td><span class="log-desc" title="${escHtml(log.description)}">${escHtml(log.description)}</span></td>
                </tr>`;
        }
    }).join('');
}

// ── Render pagination ───────────────────────────────
function renderLogsPagination() {
    const totalPages = Math.max(1, Math.ceil(logsTotalCount / LOGS_PER_PAGE));
    const infoEl = document.getElementById('logsPaginationInfo');
    const btnsEl = document.getElementById('logsPaginationBtns');
    if (!btnsEl) return;

    const start = ((logsCurrentPage - 1) * LOGS_PER_PAGE) + 1;
    const end = Math.min(logsCurrentPage * LOGS_PER_PAGE, logsTotalCount);

    if (infoEl) {
        infoEl.textContent = logsTotalCount > 0
            ? 'Showing ' + start + '–' + end + ' of ' + logsTotalCount + ' entries'
            : 'No entries found';
    }

    btnsEl.innerHTML = '';

    // Prev
    const prev = document.createElement('button');
    prev.className = 'log-page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled = logsCurrentPage === 1;
    prev.onclick = () => { logsCurrentPage--; fetchAndDisplayLogs(); };
    btnsEl.appendChild(prev);

    // Page numbers
    const startP = Math.max(1, logsCurrentPage - 2);
    const endP = Math.min(totalPages, startP + 4);
    for (let p = startP; p <= endP; p++) {
        const btn = document.createElement('button');
        btn.className = 'log-page-btn' + (p === logsCurrentPage ? ' active' : '');
        btn.textContent = p;
        const pg = p;
        btn.onclick = () => { logsCurrentPage = pg; fetchAndDisplayLogs(); };
        btnsEl.appendChild(btn);
    }

    // Next
    const next = document.createElement('button');
    next.className = 'log-page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled = logsCurrentPage >= totalPages;
    next.onclick = () => { logsCurrentPage++; fetchAndDisplayLogs(); };
    btnsEl.appendChild(next);
}

// ── Loading / error helpers ─────────────────────────
function showLogsLoading() {
    const isSimplified = !['all', 'login'].includes(logsCurrentType);
    const colCount = isSimplified ? 6 : 8;
    const tbody = document.getElementById('logsTableBody');
    if (tbody) tbody.innerHTML = `
        <tr><td colspan="${colCount}" class="logs-loading">
            <i class="fas fa-spinner fa-spin"></i> Loading logs…
        </td></tr>`;
}

function showLogsError(msg) {
    const isSimplified = !['all', 'login'].includes(logsCurrentType);
    const colCount = isSimplified ? 6 : 8;
    const tbody = document.getElementById('logsTableBody');
    if (tbody) tbody.innerHTML = `
        <tr><td colspan="${colCount}">
            <div class="logs-empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>${escHtml(msg)}</p>
            </div>
        </td></tr>`;
}

// ── Helpers ─────────────────────────────────────────
function makeTypeBadge(type) {
    const cfg = {
        login: { icon: 'fa-sign-in-alt', label: 'Login' },
        logout: { icon: 'fa-sign-out-alt', label: 'Logout' },
        status_update: { icon: 'fa-toggle-on', label: 'Status Update' },
        user_delete: { icon: 'fa-user-times', label: 'User Deleted' },
        create_user: { icon: 'fa-user-plus', label: 'User Created' },
        role_update: { icon: 'fa-user-tag', label: 'Role Update' },
        approve: { icon: 'fa-check', label: 'Approved' },
        reject: { icon: 'fa-times', label: 'Rejected' },
        delete: { icon: 'fa-trash', label: 'Deleted' },
        approve_user: { icon: 'fa-user-check', label: 'User Approved' },
        reject_user: { icon: 'fa-user-slash', label: 'User Rejected' },
        recipe_approved: { icon: 'fa-check-circle', label: 'Recipe Approved' },
        recipe_rejected: { icon: 'fa-times-circle', label: 'Recipe Rejected' },
        recipe_deleted: { icon: 'fa-trash-alt', label: 'Recipe Deleted' },
        recipe_update: { icon: 'fa-edit', label: 'Recipe Updated' },
        request_created: { icon: 'fa-paper-plane', label: 'Request Created' }
    };
    const c = cfg[type] || { icon: 'fa-circle', label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
    return `<span class="log-type-badge type-${escHtml(type)}">
                <i class="fas ${c.icon}"></i> ${escHtml(c.label)}
            </span>`;
}

function parseDevice(device) {
    const parts = device.split('·').map(s => s.trim());
    return { type: parts[0] || 'Unknown', os: parts[1] || '', browser: parts[2] || '' };
}

function formatLogTime(dateStr) {
    if (!dateStr) return { date: '—', time: '' };
    const d = new Date(dateStr);
    return {
        date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.initializeLogs = initializeLogs;
window.fetchAndDisplayLogs = fetchAndDisplayLogs;
