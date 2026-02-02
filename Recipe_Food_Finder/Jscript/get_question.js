// Jscript/get_question.js
document.addEventListener("DOMContentLoaded", function() {
    // 1. Fetch data from your PHP provider
    fetch('Phpfile/get_questions.php')
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            // 2. Target the three security question dropdowns
            const dropdowns = [
                document.querySelector('select[name="security_q1"]'),
                document.querySelector('select[name="security_q2"]'),
                document.querySelector('select[name="security_q3"]')
            ];

            dropdowns.forEach(select => {
                if (select) {
                    // 3. Clear the "Loading..." placeholder
                    select.innerHTML = '<option value="" disabled selected>Select a question</option>';
                    
                    // 4. Populate with data from database
                    data.forEach(q => {
                        let option = document.createElement('option');
                        option.value = q.id; 
                        option.textContent = q.question_text;
                        select.appendChild(option);
                    });
                }
            });
        })
        .catch(err => {
            console.error("Error loading questions:", err);
            // Fallback in case the database is down
            const selects = document.querySelectorAll('select[name^="security_q"]');
            selects.forEach(s => s.innerHTML = '<option value="" disabled>Error loading questions</option>');
        });
});