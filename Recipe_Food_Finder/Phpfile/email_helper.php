<?php
// email_helper.php
// Centralized helper for sending email notifications using PHPMailer

require_once dirname(__DIR__) . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Send an email notification to a user.
 * 
 * @param string $to Email address of the recipient
 * @param string $subject Subject of the email
 * @param string $body HTML body of the email
 * @return bool True if sent, false otherwise
 */
function sendRecipeNotification($to, $subject, $body) {
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'teofilochristian37@gmail.com';
        $mail->Password   = 'cedx ytcc lhnu nzti';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom('teofilochristian37@gmail.com', 'Recipe Food Finder');
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;

        $mail->send();
        error_log("Email sent successfully to: " . $to);
        return true;
    } catch (Exception $e) {
        error_log("Email sending failed. Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}

/**
 * Generate HTML body for recipe approval.
 * 
 * @param string $requesterName Name of the user
 * @param string $recipeName Name of the recipe
 * @return string HTML body
 */
function getApprovalEmailBody($requesterName, $recipeName) {
    return "
    <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;'>
        <div style='text-align: center; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;'>
            <h1 style='color: #4CAF50; margin: 0;'>Recipe Approved!</h1>
        </div>
        <div style='padding: 20px 0;'>
            <p>Hello <strong>$requesterName</strong>,</p>
            <p>Great news! Your recipe submission for <strong>\"$recipeName\"</strong> has been reviewed and <strong>accepted</strong>.</p>
            <p>It is now live on the Recipe Food Finder platform for everyone to see and try!</p>
            <p>Thank you for contributing to our community. Keep sharing your delicious recipes!</p>
        </div>
        <div style='text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #777; font-size: 12px;'>
            <p>&copy; 2024 Recipe Food Finder. All rights reserved.</p>
        </div>
    </div>";
}

/**
 * Generate HTML body for recipe rejection.
 * 
 * @param string $requesterName Name of the user
 * @param string $recipeName Name of the recipe
 * @param string $reason Reason for rejection (optional)
 * @return string HTML body
 */
function getRejectionEmailBody($requesterName, $recipeName, $reason = '') {
    $reasonHtml = !empty($reason) ? "<p style='background: #fff5f5; border-left: 4px solid #f44336; padding: 10px;'><strong>Reason:</strong> $reason</p>" : "";
    
    return "
    <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;'>
        <div style='text-align: center; border-bottom: 2px solid #f44336; padding-bottom: 10px;'>
            <h1 style='color: #f44336; margin: 0;'>Recipe Submission Update</h1>
        </div>
        <div style='padding: 20px 0;'>
            <p>Hello <strong>$requesterName</strong>,</p>
            <p>Thank you for submitting your recipe <strong>\"$recipeName\"</strong>.</p>
            <p>After reviewing it, we're sorry to inform you that your request has been <strong>rejected</strong> at this time.</p>
            $reasonHtml
            <p>Don't be discouraged! You can refine your recipe and try submitting it again later.</p>
        </div>
        <div style='text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #777; font-size: 12px;'>
            <p>&copy; 2024 Recipe Food Finder. All rights reserved.</p>
        </div>
    </div>";
}
