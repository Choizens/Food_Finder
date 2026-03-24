/**
 * account_status_checker.js
 * Periodically checks if the current user's account has been blocked.
 * If blocked, notifies the user and force-logs them out.
 */

(function() {
    // Check every 45 seconds (balance between responsiveness and server load)
    const CHECK_INTERVAL = 45000; 
    let isAlerting = false;

    async function checkStatus() {
        if (isAlerting) return;

        try {
            const response = await fetch('Phpfile/check_account_status.php');
            if (!response.ok) return;

            const data = await response.json();

            if (data.success && data.status === 'blocked' && data.force_logout) {
                isAlerting = true;
                handleForceLogout();
            }
        } catch (error) {
            console.error('Account status check failed:', error);
        }
    }

    function handleForceLogout() {
        // Use SweetAlert2 if available for professional look, fallback to alert
        const message = "Your account has been blocked by the superadmin.";
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Access Revoked',
                text: message,
                icon: 'error',
                allowOutsideClick: false,
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc2626'
            }).then(() => {
                performLogout();
            });
        } else {
            alert(message);
            performLogout();
        }
    }

    function performLogout() {
        // Redirect to logout script to clear server-side session
        window.location.href = 'Phpfile/logout.php';
    }

    // Initial check and set interval
    checkStatus();
    setInterval(checkStatus, CHECK_INTERVAL);

})();
