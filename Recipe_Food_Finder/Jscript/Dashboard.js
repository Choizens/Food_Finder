// ===================================
// FLAVOURSOME RECIPE DASHBOARD JS - ENHANCED WITH MANAGEMENT
// ===================================

// ===================================
// MODAL FUNCTIONS - MUST BE GLOBAL
// ===================================

function openAddRecipeModal() {
    const modal = document.getElementById('addRecipeModal');
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        const modalContent = modal.querySelector('.modal-content-recipe');
        if (modalContent) {
            modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.165, 0.840, 0.440, 1.000)';
        }
    }
}

function closeAddRecipeModal() {
    const modal = document.getElementById('addRecipeModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content-recipe');
        if (modalContent) {
            modalContent.style.animation = 'modalSlideOut 0.3s ease';
        }

        setTimeout(() => {
            modal.style.display = "none";
            document.body.style.overflow = "auto";

            // Reset form
            const form = document.getElementById('addRecipeForm');
            if (form) {
                form.reset();
            }
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.classList.remove('has-image');
                const existingImg = preview.querySelector('img');
                if (existingImg) existingImg.remove();
            }
        }, 300);
    }
}

// Edit Recipe Modal Functions
function closeEditRecipeModal() {
    const modal = document.getElementById('editRecipeModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content-recipe');
        if (modalContent) {
            modalContent.style.animation = 'modalSlideOut 0.3s ease';
        }

        setTimeout(() => {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
            const form = document.getElementById('editRecipeForm');
            if (form) form.reset();
            const preview = document.getElementById('editImagePreview');
            if (preview) {
                preview.classList.remove('has-image');
                const existingImg = preview.querySelector('img');
                if (existingImg) existingImg.remove();
            }
        }, 300);
    }
}

// ===================================
// GLOBAL SUBMISSION FLAG
// ===================================
let FORM_IS_SUBMITTING = false;

let currentUserRole = 'user'; // Default
let allRecipes = [];

// Function to fetch recipes from backend
async function fetchRecipes() {
    try {
        // Fetch all recipes using the admin API (which returns status)
        const response = await fetch('Phpfile/admin_dashboard_status.php?action=get_recipes');
        if (!response.ok) {
            throw new Error('Failed to fetch recipes');
        }
        const data = await response.json();
        return data.success ? data.recipes : [];
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }
}

// Function to create recipe card HTML
function createRecipeCard(recipe, index) {
    const modalId = `modal_${recipe.id}`; // Use recipe ID for unique modal

    // Determine badge class based on category
    const badgeClass = recipe.category.toLowerCase().replace(/\s+/g, '-');

    const cardHTML = `
        <div class="recipe-card" data-category="${recipe.category}" id="recipe-card-${recipe.id}">
            <div class="recipe-image-wrapper">
                <img src="${recipe.image_path}" alt="${recipe.recipe_name}" class="recipe-img" onerror="this.src='Foodpic/food1.png'">
                <div class="recipe-overlay">
                    <button class="overlay-btn favorite-btn"><i class="far fa-heart"></i></button>
                    <button class="overlay-btn share-btn"><i class="fas fa-share-alt"></i></button>
                    ${currentUserRole === 'super_admin' ? `
                        <button class="overlay-btn edit-btn" onclick="openEditRecipeModal(${recipe.id})"><i class="fas fa-edit"></i></button>
                        <button class="overlay-btn delete-btn" onclick="deleteRecipe(${recipe.id})"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </div>
                <span class="recipe-badge ${badgeClass}">${recipe.category}</span>
                ${recipe.status !== 'approved' ? `<span class="status-badge ${recipe.status}">${recipe.status}</span>` : ''}
            </div>
            <div class="recipe-details">
                <h3 class="recipe-name">${recipe.recipe_name}</h3>
                <p class="recipe-description">${recipe.description || 'Delicious homemade recipe'}</p>
                <div class="recipe-info">
                    <div class="info-item">
                        <i class="far fa-clock"></i>
                        <span>${recipe.prep_time}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-signal"></i>
                        <span>${recipe.difficulty}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>${recipe.servings} servings</span>
                    </div>
                </div>
                <div class="recipe-footer">
                    <div class="rating">
                        <i class="fas fa-star"></i>
                        <span>${recipe.rating || '4.0'}</span>
                        <span class="reviews">(${recipe.reviews || '0'} reviews)</span>
                    </div>
                    <button class="view-btn" onclick="openModal('${modalId}')">View Recipe</button>
                </div>
            </div>
        </div>
    `;

    return cardHTML;
}

// Function to create recipe modal HTML
function createRecipeModal(recipe, index) {
    const modalId = `modal_${recipe.id}`;

    // Parse ingredients and instructions
    const ingredientsArray = recipe.ingredients.split('\n').filter(item => item.trim());
    const instructionsArray = recipe.instructions.split('\n').filter(item => item.trim());

    const ingredientsHTML = ingredientsArray.map(ingredient =>
        `<li><span class="check-icon">✓</span> ${ingredient}</li>`
    ).join('');

    const instructionsHTML = instructionsArray.map((instruction, idx) => {
        // Remove number prefix if it exists (e.g., "1. " or "1) ")
        const cleanInstruction = instruction.replace(/^\d+[\.\)]\s*/, '');
        return `<li><span class="step-number">${idx + 1}</span> ${cleanInstruction}</li>`;
    }).join('');

    const modalHTML = `
        <div id="${modalId}" class="recipe-modal">
            <div class="modal-content-recipe">
                <div class="modal-header">
                    <h2><i class="fas fa-utensils"></i> ${recipe.recipe_name}</h2>
                    <span class="close-modal" onclick="closeModal('${modalId}')">
                        <i class="fas fa-times"></i>
                    </span>
                </div>
                <div class="modal-body">
                    <div class="recipe-hero-image">
                        <img src="${recipe.image_path}" alt="${recipe.recipe_name}" onerror="this.src='Foodpic/food1.png'">
                    </div>
                    ${recipe.video_url ? `
                    <div class="video-section">
                        <div class="video-container">
                            <iframe width="560" height="315" src="${recipe.video_url}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                        </div>
                    </div>
                    ` : ''}
                    <div class="recipe-content">
                        <div class="recipe-meta">
                            <div class="meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${recipe.prep_time}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>${recipe.servings} servings</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-signal"></i>
                                <span>${recipe.difficulty}</span>
                            </div>
                        </div>
                        
                        <div class="ingredients-section">
                            <h3><i class="fas fa-list-ul"></i> Ingredients</h3>
                            <ul class="ingredients-list">
                                ${ingredientsHTML}
                            </ul>
                        </div>

                        <div class="instructions-section">
                            <h3><i class="fas fa-tasks"></i> Instructions</h3>
                            <ol class="instructions-list">
                                ${instructionsHTML}
                            </ol>
                        </div>
                        
                        ${recipe.submitted_by ? `
                        <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 12px;">
                            <p style="margin: 0; color: #6B7280; font-size: 0.9rem;">
                                <i class="fas fa-user-circle" style="color: var(--primary-color); margin-right: 8px;"></i>
                                Submitted by: <strong>${recipe.submitted_by}</strong>
                            </p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    return modalHTML;
}

// Function to load and display recipes
async function loadRecipes() {
    console.log('🔄 Loading recipes...');
    allRecipes = await fetchRecipes();

    if (allRecipes.length === 0) {
        console.log('No recipes found');
        return;
    }

    const recipesGrid = document.querySelector('.recipes-grid');
    const body = document.body;

    if (!recipesGrid) {
        console.error('Recipes grid not found');
        return;
    }

    // Remove any previously loaded dynamic recipes
    const existingDynamicCards = recipesGrid.querySelectorAll('[data-dynamic="true"]');
    existingDynamicCards.forEach(card => card.remove());

    const existingDynamicModals = document.querySelectorAll('.recipe-modal[data-dynamic="true"]');
    existingDynamicModals.forEach(modal => modal.remove());

    allRecipes.forEach((recipe, index) => {
        // Add recipe card to grid
        const cardHTML = createRecipeCard(recipe, index);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;
        cardElement.setAttribute('data-dynamic', 'true');
        recipesGrid.appendChild(cardElement);

        // Add recipe modal to body
        const modalHTML = createRecipeModal(recipe, index);
        const tempModalDiv = document.createElement('div');
        tempModalDiv.innerHTML = modalHTML;
        const modalElement = tempModalDiv.firstElementChild;
        modalElement.setAttribute('data-dynamic', 'true');
        body.appendChild(modalElement);
    });

    console.log(`✅ Loaded ${allRecipes.length} recipes`);

    // Re-initialize filter functionality after adding new cards
    initializeFilters();

    // Re-attach event listeners for dynamically added elements
    attachDynamicEventListeners();
}

// Function to initialize filter functionality for all cards
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const recipeCards = document.querySelectorAll('.recipe-card');

    filterButtons.forEach(button => {
        // Remove existing listeners by replacing the element
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            newButton.classList.add('active');

            const filterCategory = newButton.getAttribute('data-category');

            recipeCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');

                if (filterCategory === 'all' || cardCategory === filterCategory) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeInUp 0.5s ease';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Function to attach event listeners to dynamically added elements
function attachDynamicEventListeners() {
    // Favorite buttons
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(btn => {
        // Remove old listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            this.classList.toggle('active');
            const icon = this.querySelector('i');

            if (this.classList.contains('active')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                showNotification('Added to favorites!', 'success');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                showNotification('Removed from favorites', 'info');
            }
        });
    });

    // Share buttons
    const shareButtons = document.querySelectorAll('.share-btn');
    shareButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            const recipeCard = this.closest('.recipe-card');
            const recipeName = recipeCard.querySelector('.recipe-name').textContent;

            showNotification(`Share: ${recipeName}`, 'info');
        });
    });
}

// Make functions available globally
window.loadApprovedRecipes = loadRecipes;
window.openEditRecipeModal = openEditRecipeModal;
window.closeEditRecipeModal = closeEditRecipeModal;
window.deleteRecipe = deleteRecipe;

async function openEditRecipeModal(recipeId) {
    const recipe = allRecipes.find(r => r.id == recipeId);
    if (!recipe) {
        showNotification('Recipe not found!', 'error');
        return;
    }

    const modal = document.getElementById('editRecipeModal');
    if (!modal) return;

    // Populate form
    document.getElementById('editRecipeId').value = recipe.id;
    document.getElementById('editRecipeName').value = recipe.recipe_name;
    document.getElementById('editCategory').value = recipe.category;
    document.getElementById('editDifficulty').value = recipe.difficulty;
    document.getElementById('editPrepTime').value = recipe.prep_time;
    document.getElementById('editServings').value = recipe.servings;
    document.getElementById('editIngredients').value = recipe.ingredients;
    document.getElementById('editInstructions').value = recipe.instructions;

    // Image preview
    const preview = document.getElementById('editImagePreview');
    if (preview) {
        preview.classList.add('has-image');
        const existingImg = preview.querySelector('img');
        if (existingImg) existingImg.remove();
        const img = document.createElement('img');
        img.src = recipe.image_path;
        preview.appendChild(img);
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function deleteRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch('Phpfile/admin_dashboard_status.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'delete_recipe',
                recipe_id: recipeId
            })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Recipe deleted successfully', 'success');
            // Optimistic UI update
            const card = document.getElementById(`recipe-card-${recipeId}`);
            if (card) {
                card.style.animation = 'fadeOutDown 0.5s ease forwards';
                setTimeout(() => card.remove(), 500);
            }
            loadRecipes();
        } else {
            showNotification('Delete failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting recipe:', error);
        showNotification('An error occurred while deleting', 'error');
    }
}

// ===================================
// DOCUMENT READY
// ===================================

document.addEventListener('DOMContentLoaded', function () {

    console.log('Dashboard initialized!');

    // Load recipes first
    setTimeout(() => {
        loadRecipes();
    }, 500);

    // Set up auto-refresh every 30 seconds to check for deleted recipes
    setInterval(() => {
        console.log('🔄 Auto-refreshing recipes...');
        loadRecipes();
    }, 30000); // 30 seconds

    // ===================================
    // NAVIGATION
    // ===================================

    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();

                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));

                // Add active class to clicked link
                this.classList.add('active');

                // Smooth scroll to section
                const targetId = this.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);

                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }

                showNotification(`Navigating to ${this.textContent.trim()}`, 'info');
            }
        });
    });

    // ===================================
    // SEARCH FUNCTIONALITY
    // ===================================

    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');

    function performSearch() {
        const recipeCards = document.querySelectorAll('.recipe-card');
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (searchTerm === '') {
            showNotification('Please enter a search term', 'warning');
            return;
        }

        let foundCount = 0;

        recipeCards.forEach(card => {
            const recipeName = card.querySelector('.recipe-name').textContent.toLowerCase();
            const recipeDesc = card.querySelector('.recipe-description').textContent.toLowerCase();
            const recipeBadge = card.querySelector('.recipe-badge').textContent.toLowerCase();

            if (recipeName.includes(searchTerm) || recipeDesc.includes(searchTerm) || recipeBadge.includes(searchTerm)) {
                card.style.display = 'block';
                foundCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (foundCount === 0) {
            showNotification('No recipes found matching your search', 'warning');
        } else {
            showNotification(`Found ${foundCount} recipe(s)`, 'success');
        }

        // Scroll to recipes section
        const recipesSection = document.getElementById('recipes');
        if (recipesSection) {
            recipesSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // ===================================
    // FILTER TAGS (Quick Filters)
    // ===================================

    const filterTags = document.querySelectorAll('.filter-tag');

    filterTags.forEach(tag => {
        tag.addEventListener('click', function () {
            // Toggle active class
            filterTags.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const filterType = this.getAttribute('data-filter');
            showNotification(`Filtering by: ${this.textContent.trim()}`, 'info');

            // You can implement actual filtering logic here
        });
    });

    // ===================================
    // ANALYTICS COUNTER ANIMATION
    // ===================================

    const analyticsCards = document.querySelectorAll('.analytics-card');

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cardNumber = entry.target.querySelector('.card-number');
                if (cardNumber) {
                    animateCounter(cardNumber);
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    analyticsCards.forEach(card => {
        observer.observe(card);
    });

    function animateCounter(element) {
        const target = parseFloat(element.getAttribute('data-target'));
        const isDecimal = target % 1 !== 0;
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;

            if (current >= target) {
                current = target;
                clearInterval(timer);
            }

            if (isDecimal) {
                element.textContent = current.toFixed(1);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, duration / steps);
    }

    // ===================================
    // RECIPE CARD ANIMATIONS
    // ===================================

    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                cardObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe all recipe cards (including dynamic ones)
    const observeRecipeCards = () => {
        const recipeCards = document.querySelectorAll('.recipe-card');
        recipeCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease';
            cardObserver.observe(card);
        });
    };

    observeRecipeCards();

    // Re-observe after loading recipes
    setTimeout(observeRecipeCards, 1000);

    // ===================================
    // CATEGORY CARDS
    // ===================================

    const categoryCards = document.querySelectorAll('.category-card');

    categoryCards.forEach(card => {
        card.addEventListener('click', function () {
            const categoryName = this.querySelector('h3').textContent;
            showNotification(`Exploring: ${categoryName}`, 'info');
        });
    });

    // ===================================
    // PROFILE & LOGOUT BUTTONS
    // ===================================

    const profileBtn = document.querySelector('.profile-btn');

    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
            showNotification('Opening profile settings...', 'info');
        });
    }

    // ===================================
    // VIEW ALL BUTTON
    // ===================================

    const viewAllBtn = document.querySelector('.view-all-btn');

    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function () {
            showNotification('Loading all categories...', 'info');
        });
    }

    // ===================================
    // SMOOTH SCROLL FOR ALL ANCHOR LINKS
    // ===================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // ===================================
    // NAVBAR SCROLL EFFECT
    // ===================================

    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        }

        lastScroll = currentScroll;
    });

    // ===================================
    // IMAGE UPLOAD PREVIEW
    // ===================================

    const imagePreview = document.getElementById('imagePreview');
    const imageInput = document.getElementById('recipeImage');

    if (imagePreview && imageInput) {
        // Click to upload
        imagePreview.addEventListener('click', () => {
            imageInput.click();
        });

        // Drag and drop
        imagePreview.addEventListener('dragover', (e) => {
            e.preventDefault();
            imagePreview.style.borderColor = 'var(--primary-color)';
        });

        imagePreview.addEventListener('dragleave', () => {
            imagePreview.style.borderColor = 'var(--gray-300)';
        });

        imagePreview.addEventListener('drop', (e) => {
            e.preventDefault();
            imagePreview.style.borderColor = 'var(--gray-300)';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                imageInput.files = files;
                previewImage(files[0]);
            }
        });

        // File input change
        imageInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                previewImage(this.files[0]);
            }
        });
    }

    function previewImage(file) {
        // Validate file type
        if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.classList.add('has-image');

            // Remove existing image if any
            const existingImg = imagePreview.querySelector('img');
            if (existingImg) existingImg.remove();

            // Add new image
            const img = document.createElement('img');
            img.src = e.target.result;
            imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }

    // ===================================
    // FORM SUBMISSION - BULLETPROOF SINGLE SUBMISSION
    // ===================================

    const addRecipeForm = document.getElementById('addRecipeForm');

    if (addRecipeForm) {
        // Remove any existing event listeners by cloning the form
        const newForm = addRecipeForm.cloneNode(true);
        addRecipeForm.parentNode.replaceChild(newForm, addRecipeForm);

        // Add single event listener to the new form
        newForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Verification Confirmation
            if (!confirm('Is all the information correct? Click OK to proceed with submission, or Cancel to go back and edit.')) {
                return;
            }

            // ============================================
            // TRIPLE LAYER PROTECTION AGAINST DOUBLE SUBMIT
            // ============================================

            // LAYER 1: Global flag check
            if (FORM_IS_SUBMITTING) {
                console.log('⚠️ Form already submitting - blocked by global flag');
                return false;
            }

            // LAYER 2: Button disabled check
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn.disabled) {
                console.log('⚠️ Form already submitting - blocked by button state');
                return false;
            }

            // LAYER 3: Button class check
            if (submitBtn.classList.contains('submitting')) {
                console.log('⚠️ Form already submitting - blocked by CSS class');
                return false;
            }

            // ============================================
            // SET ALL THREE PROTECTION LAYERS
            // ============================================
            FORM_IS_SUBMITTING = true;
            submitBtn.disabled = true;
            submitBtn.classList.add('submitting');

            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

            console.log('✅ Form submission started');

            // Create FormData
            const formData = new FormData(this);

            try {
                const response = await fetch('Phpfile/save_recipe.php', {
                    method: 'POST',
                    body: formData
                });

                // Check if response is OK
                if (!response.ok) {
                    throw new Error('Server error: ' + response.status);
                }

                // Get response text first
                const text = await response.text();
                console.log('Server response:', text);

                // Try to parse as JSON
                let result;
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error('Response text:', text);
                    throw new Error('Invalid server response. Please check if save_recipe.php exists.');
                }

                if (result.success) {
                    console.log('✅ Recipe submitted successfully');
                    showNotification(result.message || 'Recipe submitted successfully!', 'success');
                    closeAddRecipeModal();

                    // Reload approved recipes immediately
                    setTimeout(() => {
                        loadApprovedRecipes();
                    }, 1000);
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('❌ Submission Error:', error);
                showNotification('Error: ' + error.message, 'error');

                // Reset on error only
                FORM_IS_SUBMITTING = false;
                submitBtn.disabled = false;
                submitBtn.classList.remove('submitting');
                submitBtn.innerHTML = originalText;
            }

            return false;
        }, { once: false });
    }

    // ===================================
    // EDIT RECIPE FORM SUBMISSION
    // ===================================
    const editRecipeForm = document.getElementById('editRecipeForm');
    if (editRecipeForm) {
        editRecipeForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const formData = new FormData(this);

            try {
                const response = await fetch('Phpfile/admin_dashboard_status.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    showNotification('Recipe updated successfully', 'success');
                    closeEditRecipeModal();
                    loadRecipes();
                } else {
                    showNotification('Update failed: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error updating recipe:', error);
                showNotification('An error occurred during update', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ===================================
    // IMAGE UPLOAD PREVIEW (EDIT)
    // ===================================
    const editImagePreview = document.getElementById('editImagePreview');
    const editImageInput = document.getElementById('editRecipeImage');

    if (editImagePreview && editImageInput) {
        editImagePreview.addEventListener('click', () => editImageInput.click());
        editImageInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    editImagePreview.classList.add('has-image');
                    const existingImg = editImagePreview.querySelector('img');
                    if (existingImg) existingImg.remove();
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    editImagePreview.appendChild(img);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // ===================================
    // INITIALIZATION
    // ===================================

    console.log('Flavoursome Dashboard loaded successfully!');

    // Fetch and sync user session info
    const syncUserSession = async () => {
        try {
            const response = await fetch('Phpfile/get_current_user.php');
            const data = await response.json();

            if (data.success) {
                const user = data.user;
                console.log('User session sync:', user.username);
                currentUserRole = user.role; // Store globally

                // Populate hidden data for other scripts (like additionrecipe.js)
                const userEmailSpan = document.getElementById('userEmail');
                const userFullNameSpan = document.getElementById('userFullName');
                if (userEmailSpan) userEmailSpan.textContent = user.emailadd;
                if (userFullNameSpan) userFullNameSpan.textContent = user.fname;

                // Update Welcome header
                const welcomeHeader = document.querySelector('.welcome-text h1');
                if (welcomeHeader) {
                    welcomeHeader.textContent = `Welcome, ${user.fname}!`;
                }

                // Update Profile button
                const profileBtnSpan = document.querySelector('.profile-btn span');
                if (profileBtnSpan) {
                    profileBtnSpan.textContent = user.username;
                }
            }
        } catch (error) {
            console.error('Error syncing user session:', error);
        }
    };

    syncUserSession();
    startStatusHeartbeat();

    // Welcome notification
    setTimeout(() => {
        showNotification('Welcome to Flavoursome! 👨‍🍳', 'success');
    }, 500);
});

// ===================================
// LOGOUT FUNCTIONALITY
// ===================================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Show loading notification
        showNotification('Logging out...', 'info');

        fetch('Phpfile/logout.php?scope=user', {
            method: 'POST'
        })
            .then(response => {
                // Regardless of response, we redirect to home
                window.location.href = 'home.html';
            })
            .catch(error => {
                console.error('Logout error:', error);
                window.location.href = 'home.html';
            });
    }
}

// Make globally available
window.handleLogout = handleLogout;

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

// ===================================
// NOTIFICATION SYSTEM
// ===================================

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(notif => notif.remove());

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;

    // Icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }

    notification.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;

    // Styles
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: white;
        color: #1F2937;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        border-left: 4px solid;
        min-width: 300px;
    `;

    // Color based on type
    switch (type) {
        case 'success':
            notification.style.borderLeftColor = '#10B981';
            notification.querySelector('i').style.color = '#10B981';
            break;
        case 'error':
            notification.style.borderLeftColor = '#EF4444';
            notification.querySelector('i').style.color = '#EF4444';
            break;
        case 'warning':
            notification.style.borderLeftColor = '#F59E0B';
            notification.querySelector('i').style.color = '#F59E0B';
            break;
        default:
            notification.style.borderLeftColor = '#3B82F6';
            notification.querySelector('i').style.color = '#3B82F6';
    }

    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Debounce function
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

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Export for external use
window.FlavoursomeDashboard = {
    showNotification: showNotification,
    loadApprovedRecipes: loadApprovedRecipes
};

// Listen for storage events (in case of manual refresh from admin panel)
window.addEventListener('storage', function (e) {
    if (e.key === 'recipes_updated') {
        console.log('🔔 Recipes updated notification received');
        loadApprovedRecipes();
        localStorage.removeItem('recipes_updated');
    }
});