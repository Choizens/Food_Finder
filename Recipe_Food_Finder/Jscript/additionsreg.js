// ===================================
// FETCH AND DISPLAY APPROVED RECIPES
// ===================================

// Function to fetch approved recipes from backend
async function fetchApprovedRecipes() {
    try {
        const response = await fetch('Phpfile/get_recipes.php');
        if (!response.ok) {
            throw new Error('Failed to fetch recipes');
        }
        const recipes = await response.json();
        return recipes;
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }
}

// -------------------------------------------------------
// FIX: Helper to build the correct image URL.
// Your HTML pages live at the project root, and images
// are stored at:  /your-project/photos/Recipe_pictures/
// The DB stores:  photos/Recipe_pictures/filename.jpg
// So the <img src> should just be:  photos/Recipe_pictures/filename.jpg
// -------------------------------------------------------
function getImageSrc(imagePath) {
    if (!imagePath) return 'Foodpic/food1.png';

    // Strip any accidental leading slash or "Phpfile/" prefix
    let path = imagePath.replace(/^\/+/, '');
    if (path.startsWith('Phpfile/')) {
        path = path.slice('Phpfile/'.length);
    }

    return path;
}

// Function to create recipe card HTML
function createRecipeCard(recipe, index) {
    const modalId = `modal_${recipe.id}`;

    // Determine badge class based on category
    const badgeClass = recipe.category.toLowerCase().replace(/\s+/g, '-');

    // Use helper to get correct image path
    const imgSrc = getImageSrc(recipe.image_path);

    const cardHTML = `
        <div class="recipe-card" data-category="${recipe.category}">
            <div class="recipe-image-wrapper">
                <img src="${imgSrc}"
                     alt="${recipe.recipe_name}"
                     class="recipe-img"
                     onerror="this.onerror=null; this.src='Foodpic/food1.png';">
                <div class="recipe-overlay">
                    <button class="overlay-btn favorite-btn"><i class="far fa-heart"></i></button>
                    <button class="overlay-btn share-btn"><i class="fas fa-share-alt"></i></button>
                </div>
                <span class="recipe-badge ${badgeClass}">${recipe.category}</span>
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
                            <iframe width="560" height="315" src="${recipe.video_url}"
                                title="YouTube video player" frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
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

// Function to load and display approved recipes
async function loadApprovedRecipes() {
    const recipes = await fetchApprovedRecipes();

    if (recipes.length === 0) {
        console.log('No approved recipes found');
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

    recipes.forEach((recipe, index) => {
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

    console.log(`✅ Loaded ${recipes.length} approved recipes`);

    // Re-initialize filter functionality after adding new cards
    initializeFilters();
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
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            newButton.classList.add('active');

            const filterCategory = newButton.getAttribute('data-category');

            document.querySelectorAll('.recipe-card').forEach(card => {
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        loadApprovedRecipes();
    }, 500);
});

// Make function available globally
window.loadApprovedRecipes = loadApprovedRecipes;