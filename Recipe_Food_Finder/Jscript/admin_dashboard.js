// ===================================
// FLAVOURSOME ADMIN DASHBOARD JS - WITH DELETE
// ===================================

let allRecipes = [];
let currentFilter = 'all';

// ===================================
// DOCUMENT READY
// ===================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('Admin Dashboard initialized!');

    // Initial sync from hash
    syncFromHash();

    updateCurrentUser(); // Update UI with real user info
    loadRecipes();
    setupFilterTabs();
    setupSearch();
    setupNavigation();

    // Listen for hash changes (e.g. browser back/forward or manual edits)
    window.addEventListener('hashchange', syncFromHash);

    // Setup Admin Edit Modal Image Preview
    setupAdminEditImagePreview();

    showNotification('Welcome to Admin Dashboard! 👨‍💼', 'success');
    startStatusHeartbeat();
    startAutoRefresh(); // Start auto-refresh polling
});

function setupAdminEditImagePreview() {
    const preview = document.getElementById('adminEditImagePreview');
    const input = document.getElementById('adminEditRecipeImage');

    if (preview && input) {
        preview.addEventListener('click', () => input.click());

        input.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    preview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    preview.classList.add('has-image');
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
}

let autoRefreshInterval;

function startAutoRefresh() {
    // Clear existing interval if any
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);

    // Refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        console.log('🔄 Periodic auto-refresh...');
        refreshAdminUI(true); // pass true to indicate it's a background refresh (silent)
    }, 30000);
}

async function refreshAdminUI(silent = false) {
    if (!silent) console.log('🔄 Refreshing all Admin UI modules...');

    // 1. Refresh Recipes and Stats
    await loadRecipes();

    // 2. Refresh Users if we are in that section
    if (typeof loadUsers === 'function') {
        const usersSection = document.getElementById('usersSection');
        if (usersSection && usersSection.style.display !== 'none') {
            await loadUsers();
        }
    }

    // 3. Refresh Pending Requests if we are in that section
    if (typeof loadPendingRequests === 'function') {
        const requestsSection = document.getElementById('requestsSection');
        if (requestsSection && requestsSection.style.display !== 'none') {
            loadPendingRequests();
        }
    }

    // 4. Refresh Logs if we are in that section
    if (typeof fetchAndDisplayLogs === 'function') {
        const logsSection = document.getElementById('logsSection');
        if (logsSection && logsSection.style.display !== 'none') {
            fetchAndDisplayLogs();
        }
    }
}

// Make globally available
window.refreshAdminUI = refreshAdminUI;

function startStatusHeartbeat() {
    setInterval(async () => {
        try {
            const response = await fetch('Phpfile/check_account_status.php');
            const data = await response.json();

            if (data.force_logout) {
                alert('Your account has been blocked by the Super Admin. You will be automatically logged out.');
                window.location.href = 'Phpfile/logout.php?forced=1';
            }
        } catch (error) {
            console.error('Status check failed:', error);
        }
    }, 5000); // Check every 5 seconds for very fast response during testing
}

// Navigation function for manual triggers (used in Super Admin Quick Actions)
function navigateToSection(section) {
    window.location.hash = section;
}

// Helper to sync filter and section from URL hash
function syncFromHash() {
    const hash = window.location.hash || '#dashboard';
    console.log('Central Navigation: Syncing from hash:', hash);

    const hashId = hash.substring(1);

    // 1. Determine which section to show and what filter to apply
    let sectionName = 'recipes';
    let filterStatus = 'all';

    if (['pending', 'approved', 'rejected'].includes(hashId)) {
        filterStatus = hashId;
        sectionName = 'recipes';
    } else if (['dashboard', 'users', 'logs', 'settings', 'requests', 'recipesModule'].includes(hashId)) {
        sectionName = hashId;
    }

    // 2. Hide all sections and show the target one
    const targetSectionId = sectionName + 'Section';
    const sections = document.querySelectorAll('div[id$="Section"]');
    sections.forEach(s => s.style.display = 'none');

    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // 3. Update Global Filter State (if in recipes)
    currentFilter = filterStatus;

    // 4. Update Sidebar Active State
    const navLinks = document.querySelectorAll('.nav-link, .sidebar-menu-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        // Match either the full href or data-section+hash logic
        const linkHref = link.getAttribute('href');
        const linkSection = link.getAttribute('data-section');

        if (linkHref === hash) {
            link.classList.add('active');
        } else if (linkSection === sectionName) {
            link.classList.add('active');
        }
    });

    // 5. Update UI Titles and Breadcrumbs
    const pageTitle = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('breadcrumbCurrent');

    // Find active link text for breadcrumb
    const activeLink = document.querySelector('.sidebar-menu-link.active');
    if (activeLink && breadcrumb) {
        breadcrumb.textContent = activeLink.querySelector('span').textContent.trim();
    }

    // 6. Handle Section/Module Specific Logic
    if (sectionName === 'recipes') {
        if (pageTitle) {
            pageTitle.textContent = currentFilter === 'all' ? 'Recipe Management' : `${capitalizeFirst(currentFilter)} Recipes`;
        }

        // Sync top filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-status') === currentFilter) {
                tab.classList.add('active');
            }
        });

        filterRecipes();
    } else {
        if (pageTitle) pageTitle.textContent = capitalizeFirst(sectionName) + ' Management';

        // Initialize sub-modules
        if (sectionName === 'users' && typeof initializeUserManagement === 'function') {
            initializeUserManagement();
        } else if (sectionName === 'logs' && typeof initializeLogs === 'function') {
            initializeLogs();
        } else if (sectionName === 'settings' && typeof initializeSettings === 'function') {
            initializeSettings();
        } else if (sectionName === 'recipesModule') {
            loadRecipesModule();
            setupRecipeModuleSearch();
        }
    }
}

// ===================================
// LOAD RECIPES FROM SERVER
// ===================================

async function loadRecipes() {
    const container = document.getElementById('recipesContainer');

    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading recipes...</p>
        </div>
    `;

    try {
        const response = await fetch('Phpfile/admin_dashboard_status.php?action=get_recipes');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Loaded recipes:', data);

        if (data.success) {
            allRecipes = data.recipes;
            updateStatistics();
            // Call filterRecipes instead of displayRecipes to respect current filter state
            filterRecipes();
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading recipes: ${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load recipes. Please check the console and refresh the page.</p>
                <p style="font-size: 0.9rem; margin-top: 1rem; color: var(--danger-red);">${error.message}</p>
            </div>
        `;
    }
}

// ===================================
// UPDATE STATISTICS
// ===================================

function updateStatistics() {
    const pending = allRecipes.filter(r => r.status === 'pending').length;
    const approved = allRecipes.filter(r => r.status === 'approved').length;
    const rejected = allRecipes.filter(r => r.status === 'rejected').length;
    const total = allRecipes.length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('notificationCount').textContent = pending;
}

// ===================================
// DISPLAY RECIPES
// ===================================

function displayRecipes(recipes) {
    const container = document.getElementById('recipesContainer');

    if (recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No recipes found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recipes.map(recipe => {
        const recipeId = recipe.id;
        return `
            <div class="recipe-card-admin" data-id="${recipeId}" data-status="${recipe.status}">
                <img src="${recipe.image_path}" alt="${recipe.recipe_name}" class="recipe-image-admin" onerror="this.src='Foodpic/placeholder.png'">
                
                <div class="recipe-info-admin">
                    <div class="recipe-header-admin">
                        <div>
                            <h3 class="recipe-title-admin">${recipe.recipe_name}</h3>
                            <span class="recipe-status status-${recipe.status}">${capitalizeFirst(recipe.status)}</span>
                        </div>
                    </div>
                    
                    <div class="recipe-meta-admin">
                        <div class="meta-item-admin">
                            <i class="fas fa-tag"></i>
                            <span>${recipe.category}</span>
                        </div>
                        <div class="meta-item-admin">
                            <i class="fas fa-signal"></i>
                            <span>${recipe.difficulty}</span>
                        </div>
                        <div class="meta-item-admin">
                            <i class="fas fa-clock"></i>
                            <span>${recipe.prep_time}</span>
                        </div>
                        <div class="meta-item-admin">
                            <i class="fas fa-users"></i>
                            <span>${recipe.servings} servings</span>
                        </div>
                    </div>
                    
                    <p class="recipe-submitter">
                        <strong>Submitted by:</strong> ${recipe.submitted_by} 
                        <span style="color: var(--medium-gray);">| ${formatDate(recipe.created_at)}</span>
                    </p>
                </div>
                
                <div class="recipe-actions-admin">
                    <button class="btn-view" data-recipe-id="${recipeId}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn-delete" data-recipe-id="${recipeId}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners after creating the HTML
    attachButtonListeners();
}

// ===================================
// ATTACH EVENT LISTENERS TO BUTTONS
// ===================================

function attachButtonListeners() {
    // View buttons
    document.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', function () {
            const recipeId = parseInt(this.getAttribute('data-recipe-id'));
            viewRecipeDetail(recipeId);
        });
    });

    // Approve buttons
    document.querySelectorAll('.btn-approve').forEach(button => {
        button.addEventListener('click', function () {
            const recipeId = parseInt(this.getAttribute('data-recipe-id'));
            approveRecipe(recipeId);
        });
    });

    // Reject buttons
    document.querySelectorAll('.btn-reject').forEach(button => {
        button.addEventListener('click', function () {
            const recipeId = parseInt(this.getAttribute('data-recipe-id'));
            openRejectionModal(recipeId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', function () {
            const recipeId = parseInt(this.getAttribute('data-recipe-id'));
            deleteRecipe(recipeId);
        });
    });
}

// ===================================
// VIEW RECIPE DETAIL
// ===================================

function viewRecipeDetail(recipeId) {
    console.log('Viewing recipe:', recipeId);
    const recipe = allRecipes.find(r => r.id === recipeId);

    if (!recipe) {
        console.error('Recipe not found:', recipeId);
        showNotification('Recipe not found', 'error');
        return;
    }

    const modal = document.getElementById('recipeDetailModal');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    document.getElementById('modalRecipeName').textContent = recipe.recipe_name;

    const ingredientsList = recipe.ingredients.split('\n').filter(i => i.trim());
    const instructionsList = recipe.instructions.split('\n').filter(i => i.trim());

    modalBody.innerHTML = `
        <div class="recipe-detail-grid">
            <div class="detail-section">
                <img src="${recipe.image_path}" alt="${recipe.recipe_name}" class="detail-image" onerror="this.src='Foodpic/placeholder.png'">
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                <div class="recipe-meta-admin">
                    <div class="meta-item-admin">
                        <i class="fas fa-tag"></i>
                        <span><strong>Category:</strong> ${recipe.category}</span>
                    </div>
                    <div class="meta-item-admin">
                        <i class="fas fa-signal"></i>
                        <span><strong>Difficulty:</strong> ${recipe.difficulty}</span>
                    </div>
                    <div class="meta-item-admin">
                        <i class="fas fa-clock"></i>
                        <span><strong>Prep Time:</strong> ${recipe.prep_time}</span>
                    </div>
                    <div class="meta-item-admin">
                        <i class="fas fa-users"></i>
                        <span><strong>Servings:</strong> ${recipe.servings}</span>
                    </div>
                </div>
                <p style="margin-top: 1rem;">
                    <strong>Status:</strong> 
                    <span class="recipe-status status-${recipe.status}">${capitalizeFirst(recipe.status)}</span>
                </p>
                <p><strong>Submitted by:</strong> ${recipe.submitted_by}</p>
                <p><strong>Submitted on:</strong> ${formatDate(recipe.created_at)}</p>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-list-ul"></i> Ingredients</h3>
                <ul class="ingredients-list">
                    ${ingredientsList.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-tasks"></i> Instructions</h3>
                <ol class="instructions-list">
                    ${instructionsList.map((item, index) => `
                        <li>
                            <span class="step-number">${index + 1}</span>
                            <span>${item.replace(/^\d+\.\s*/, '')}</span>
                        </li>
                    `).join('')}
                </ol>
            </div>
        </div>
    `;

    if (recipe.status === 'pending') {
        modalFooter.innerHTML = `
            <button class="btn-secondary" onclick="closeDetailModal()">Close</button>
            <button class="btn-danger" onclick="closeDetailModal(); openRejectionModal(${recipe.id})">
                <i class="fas fa-times"></i> Reject
            </button>
            <button class="btn-primary" onclick="approveRecipe(${recipe.id}); closeDetailModal()">
                <i class="fas fa-check"></i> Approve
            </button>
        `;
    } else {
        // If it's a Super Admin, show the Edit button
        const isSuperAdmin = window.location.href.includes('super_admin_dashboard.html');

        modalFooter.innerHTML = `
            <button class="btn-secondary" onclick="closeDetailModal()">Close</button>
            ${isSuperAdmin ? `
                <button class="btn-info" onclick="closeDetailModal(); openEditRecipeModal(${recipe.id})" style="background: var(--info-blue); color: white;">
                    <i class="fas fa-edit"></i> Edit Recipe
                </button>
            ` : ''}
            <button class="btn-danger" onclick="deleteRecipe(${recipe.id}); closeDetailModal()">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    const modal = document.getElementById('recipeDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ===================================
// APPROVE RECIPE
// ===================================

async function approveRecipe(recipeId) {
    console.log('Approving recipe:', recipeId);
    const recipe = allRecipes.find(r => r.id === recipeId);

    if (!recipe) {
        showNotification('Recipe not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to approve "${recipe.recipe_name}"?`)) {
        return;
    }

    // Disable the button to prevent double clicks
    const approveBtn = document.querySelector(`.btn-approve[data-recipe-id="${recipeId}"]`);
    if (approveBtn) {
        approveBtn.disabled = true;
        approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    }

    try {
        const formData = new FormData();
        formData.append('action', 'approve');
        formData.append('recipe_id', recipeId);

        console.log('Sending approve request for recipe ID:', recipeId);

        const response = await fetch('Phpfile/admin_dashboard_status.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Approve response:', data);

        if (data.success) {
            showNotification('Recipe approved successfully! ✅', 'success');
            await loadRecipes();
        } else {
            throw new Error(data.message || 'Failed to approve recipe');
        }
    } catch (error) {
        console.error('Error approving recipe:', error);
        showNotification('Error: ' + error.message, 'error');

        // Re-enable button on error
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
        }
    }
}

// ===================================
// REJECT RECIPE
// ===================================

function openRejectionModal(recipeId) {
    console.log('Opening rejection modal for recipe:', recipeId);
    const modal = document.getElementById('rejectionModal');
    document.getElementById('rejectionRecipeId').value = recipeId;
    document.getElementById('rejectionReason').value = '';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeRejectionModal() {
    const modal = document.getElementById('rejectionModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function confirmRejection() {
    const recipeId = document.getElementById('rejectionRecipeId').value;
    const reason = document.getElementById('rejectionReason').value.trim();

    if (!reason) {
        showNotification('Please provide a reason for rejection', 'warning');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'reject');
        formData.append('recipe_id', recipeId);
        formData.append('reason', reason);

        console.log('Sending reject request for recipe ID:', recipeId);

        const response = await fetch('Phpfile/admin_dashboard_status.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Reject response:', data);

        if (data.success) {
            showNotification('Recipe rejected', 'info');
            closeRejectionModal();
            await loadRecipes();
        } else {
            throw new Error(data.message || 'Failed to reject recipe');
        }
    } catch (error) {
        console.error('Error rejecting recipe:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// ===================================
// DELETE RECIPE
// ===================================

async function deleteRecipe(recipeId) {
    console.log('Deleting recipe:', recipeId);
    const recipe = allRecipes.find(r => r.id === recipeId);

    if (!recipe) {
        showNotification('Recipe not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to DELETE "${recipe.recipe_name}"? This action cannot be undone and will remove it from both the admin panel and user dashboard.`)) {
        return;
    }

    // Instant UI Update: Remove the card immediately
    const recipeCard = document.querySelector(`.recipe-card-admin[data-id="${recipeId}"]`);
    if (recipeCard) recipeCard.remove();

    // Update local state early
    allRecipes = allRecipes.filter(r => r.id !== recipeId);
    updateStatistics();
    filterRecipes();

    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('recipe_id', recipeId);

        console.log('Sending delete request for recipe ID:', recipeId);

        const response = await fetch('Phpfile/admin_dashboard_status.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Delete response:', data);

        if (data.success) {
            showNotification('Recipe deleted successfully! 🗑️', 'success');

            // Remove from DOM if still there
            if (recipeCard) recipeCard.remove();

            // Update local state without full reload
            allRecipes = allRecipes.filter(r => r.id !== recipeId);

            // Re-render to update pagination/stats (optional but recommended)
            filterRecipes();
            updateStatistics();

            // Reload approved recipes on user dashboard if the function exists
            if (typeof window.loadApprovedRecipes === 'function') {
                window.loadApprovedRecipes();
            }
        } else {
            throw new Error(data.message || 'Failed to delete recipe');
        }
    } catch (error) {
        console.error('Error deleting recipe:', error);
        showNotification('Error: ' + error.message, 'error');

        // Re-enable button on error
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        }
    }
}

// ===================================
// FILTER FUNCTIONALITY
// ===================================

function setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.filter-tab');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            currentFilter = this.getAttribute('data-status');
            filterRecipes();
        });
    });
}

function filterRecipes() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    console.log(`Filtering recipes for status: ${currentFilter}, Search: ${searchTerm}`);

    let filtered = allRecipes;

    if (currentFilter !== 'all') {
        // Use lowercase comparison for robustness
        filtered = filtered.filter(r => r.status.toLowerCase() === currentFilter.toLowerCase());
    }

    if (searchTerm) {
        filtered = filtered.filter(r =>
            r.recipe_name.toLowerCase().includes(searchTerm) ||
            r.category.toLowerCase().includes(searchTerm) ||
            r.submitted_by.toLowerCase().includes(searchTerm)
        );
    }

    displayRecipes(filtered);

    // Update section titles for better clarity
    const pageTitle = document.getElementById('pageTitle');
    // More specific selector to avoid matching usersSection headers
    const tableTitle = document.querySelector('#recipesSection .section-header h2');

    if (pageTitle && currentFilter !== 'all') { // Only update if not on "all" to allow syncFromHash to set it sometimes
        if (currentFilter === 'all') {
            pageTitle.textContent = 'Recipe Requests';
        } else {
            pageTitle.textContent = `${capitalizeFirst(currentFilter)} Requests`;
        }
    }

    if (tableTitle) {
        if (currentFilter === 'all') {
            tableTitle.textContent = 'All Recipe Submissions';
        } else {
            tableTitle.textContent = `${capitalizeFirst(currentFilter)} Submissions`;
        }
    }
}

// ===================================
// NEW: RECIPES MODULE (GRID VIEW)
// ===================================

async function loadRecipesModule() {
    const grid = document.getElementById('recipesModuleGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-state" style="grid-column: 1/-1;">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading recipes library...</p>
        </div>
    `;

    try {
        // We reuse the same API but render it differently
        const response = await fetch('Phpfile/admin_dashboard_status.php?action=get_recipes');
        const data = await response.json();

        if (data.success) {
            allRecipes = data.recipes; // Update global state
            displayRecipesModuleGrid(allRecipes);
        } else {
            grid.innerHTML = `<p class="error-msg">Error: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Error loading recipes module:', error);
        grid.innerHTML = `<p class="error-msg">Failed to load recipes library.</p>`;
    }
}

function displayRecipesModuleGrid(recipes) {
    const grid = document.getElementById('recipesModuleGrid');
    if (!grid) return;

    if (recipes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-utensils"></i>
                <p>No recipes in the library yet.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = recipes.map(recipe => {
        const badgeClass = `status-${recipe.status}`;
        return `
            <div class="recipe-card" data-category="${recipe.category}">
                <div class="recipe-image-wrapper">
                    <img src="${recipe.image_path}" alt="${recipe.recipe_name}" class="recipe-img" onerror="this.src='Foodpic/placeholder.png'">
                    <div class="recipe-overlay">
                        <button class="overlay-btn edit-btn" onclick="openEditRecipeModal(${recipe.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="overlay-btn delete-btn" onclick="deleteRecipe(${recipe.id})" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                    <span class="recipe-badge">${recipe.category}</span>
                    <span class="status-badge ${badgeClass}">${capitalizeFirst(recipe.status)}</span>
                </div>
                <div class="recipe-details">
                    <h3 class="recipe-name">${recipe.recipe_name}</h3>
                    <div class="recipe-info">
                        <span><i class="far fa-clock"></i> ${recipe.prep_time}</span>
                        <span><i class="fas fa-signal"></i> ${recipe.difficulty}</span>
                    </div>
                    <div class="recipe-footer">
                        <span class="submitter-name">By ${recipe.submitted_by}</span>
                        <button class="view-btn" onclick="viewRecipeDetail(${recipe.id})">Details</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function setupRecipeModuleSearch() {
    const searchInput = document.getElementById('recipeModuleSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce(function () {
        const term = this.value.toLowerCase();
        const filtered = allRecipes.filter(r =>
            r.recipe_name.toLowerCase().includes(term) ||
            r.category.toLowerCase().includes(term) ||
            r.submitted_by.toLowerCase().includes(term)
        );
        displayRecipesModuleGrid(filtered);
    }, 300));
}

// ===================================
// SEARCH FUNCTIONALITY
// ===================================

function setupSearch() {
    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', debounce(function () {
        filterRecipes();
    }, 300));
}

// ===================================
// NAVIGATION
// ===================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .sidebar-menu-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                // If we're already on that hash, browser won't trigger hashchange, so we force sync
                if (window.location.hash === href) {
                    syncFromHash();
                }
                // default behavior updates the hash, which triggers our hashchange listener
            }
        });
    });
}

// ===================================
// NOTIFICATION SYSTEM
// ===================================

function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;

    let icon = '';
    let borderColor = '';
    let iconColor = '';

    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            borderColor = 'var(--success-green)';
            iconColor = 'var(--success-green)';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            borderColor = 'var(--danger-red)';
            iconColor = 'var(--danger-red)';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            borderColor = 'var(--warning-amber)';
            iconColor = 'var(--warning-amber)';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
            borderColor = 'var(--info-blue)';
            iconColor = 'var(--info-blue)';
    }

    notification.innerHTML = `${icon}<span>${message}</span>`;

    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: white;
        color: var(--charcoal);
        padding: 1.2rem 1.8rem;
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        border-left: 4px solid ${borderColor};
        min-width: 320px;
        font-family: 'Montserrat', sans-serif;
    `;

    notification.querySelector('i').style.color = iconColor;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

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

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Close modals when clicking outside
// DISABLED: Prevents accidental modal closure while viewing details or filling forms
// window.onclick = function(event) {
//     const detailModal = document.getElementById('recipeDetailModal');
//     const rejectionModal = document.getElementById('rejectionModal');
//     
//     if (event.target === detailModal) {
//         closeDetailModal();
//     }
//     if (event.target === rejectionModal) {
//         closeRejectionModal();
//     }
// }

// Close modals with Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        closeDetailModal();
        closeRejectionModal();
        closeEditRecipeModal();
    }
});

// ===================================
// EDIT RECIPE (SUPER ADMIN ONLY)
// ===================================

function openEditRecipeModal(recipeId) {
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (!recipe) return;

    document.getElementById('editRecipeId').value = recipe.id;
    document.getElementById('editRecipeName').value = recipe.recipe_name;
    document.getElementById('editCategory').value = recipe.category;
    document.getElementById('editDifficulty').value = recipe.difficulty;
    document.getElementById('editPrepTime').value = recipe.prep_time;
    document.getElementById('editServings').value = recipe.servings;
    document.getElementById('editIngredients').value = recipe.ingredients;
    document.getElementById('editInstructions').value = recipe.instructions;

    // Image preview for admin
    const preview = document.getElementById('adminEditImagePreview');
    if (preview) {
        preview.innerHTML = `<img src="${recipe.image_path}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='Foodpic/placeholder.png'">`;
        preview.classList.add('has-image');
    }

    document.getElementById('editRecipeModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditRecipeModal() {
    const modal = document.getElementById('editRecipeModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function submitEditRecipe(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('action', 'update_recipe');

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const response = await fetch('Phpfile/admin_dashboard_status.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Recipe updated successfully! ✨', 'success');
            closeEditRecipeModal();
            await loadRecipes();
        } else {
            throw new Error(data.message || 'Failed to update recipe');
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ===================================
// UPDATE CURRENT USER UI
// ===================================
// Safe Global Scope detection
if (typeof window.SCOPE === 'undefined') {
    window.SCOPE = window.location.href.includes('super_') ? 'super_admin' : 'admin';
}
const SCOPE = window.SCOPE;

async function updateCurrentUser() {
    try {
        const response = await fetch(`Phpfile/admin_users.php?action=get_current_user&scope=${SCOPE}`);
        const data = await response.json();

        if (data.success) {
            const username = data.username;
            const rawRole = data.role.toLowerCase(); // Ensure lowercase comparison

            // Redirect Super Admin to their actual dashboard (only if not already on a super_ page)
            const isOnSuperPage = window.location.pathname.split('/').pop().startsWith('super_');
            if (rawRole === 'super admin' && !isOnSuperPage) {
                console.log('Redirecting Admin to Super Dashboard...');
                window.location.href = 'super_dashboard.html#dashboard';
                return;
            }

            // Capitalize role for display
            const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

            // Update Sidebar
            const sidebarName = document.getElementById('sidebarUsername') || document.querySelector('.sidebar-user-name');
            const sidebarRole = document.querySelector('.sidebar-user-role');
            if (sidebarName) sidebarName.textContent = username;
            if (sidebarRole) {
                sidebarRole.textContent = (rawRole === 'super admin') ? 'Super Administrator' : role;
            }

            // Update Profile Button
            const navUser = document.getElementById('navUsername') || document.querySelector('.nav-user-name');
            if (navUser) navUser.textContent = username;

            // Updated for Super Admin Recipe Creation / Session data
            const userEmailSpan = document.getElementById('userEmail');
            const userFullNameSpan = document.getElementById('userFullName');
            if (userEmailSpan && data.email) userEmailSpan.textContent = data.email;
            if (userFullNameSpan) userFullNameSpan.textContent = data.full_name || username;

            console.log('Current User updated:', username, role, 'Scope:', SCOPE);
        }
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
}

// ===================================
// LOGOUT LOGIC
// ===================================
window.handleLogout = async function() {
    console.log('Logging out... Scope:', typeof SCOPE !== 'undefined' ? SCOPE : 'all');
    try {
        const scope = typeof SCOPE !== 'undefined' ? SCOPE : 'all';
        const response = await fetch(`Phpfile/logout.php?scope=${scope}`);
        const data = await response.json();
        if (data.success) {
            window.location.href = 'home.html';
        } else {
            console.error('Logout failed:', data.message);
            window.location.href = 'home.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'home.html';
    }
};
