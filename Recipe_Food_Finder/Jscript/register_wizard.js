async function goToRegisterStep(step) {
    // If moving to step 2, validate step 1 first
    if (step === 2) {
        const isValid = await validateRegisterStep1();
        if (!isValid) return;
    }

    // Hide all sections
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const activeSection = document.getElementById(`step${step}`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // Scroll to top of form
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
}

// Initial state
document.addEventListener('DOMContentLoaded', () => {
    // Registration form already has logic in java.js and get_question.js
    // We just need to initialize the wizard view
    // goToRegisterStep(1); // Usually called from HTML or handled by class "active"
});
