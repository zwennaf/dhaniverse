// Debug script for testing email configuration in production
// Run this to diagnose SMTP issues

import { EmailService } from "./src/services/EmailService.ts";

async function debugEmailService() {
    console.log("🔍 Debugging Email Service Configuration...\n");
    
    // Check environment variables
    console.log("📋 Environment Variables:");
    console.log("EMAIL_PROVIDER:", Deno.env.get("EMAIL_PROVIDER") || "zoho (default)");
    console.log("SMTP_HOST:", Deno.env.get("SMTP_HOST") || "smtp.zoho.com (default)");
    console.log("SMTP_PORT:", Deno.env.get("SMTP_PORT") || "587 (default)");
    console.log("SMTP_SECURE:", Deno.env.get("SMTP_SECURE") || "false (default)");
    console.log("SMTP_USER:", Deno.env.get("SMTP_USER") ? "✅ Set" : "❌ Not set");
    console.log("SMTP_PASS:", Deno.env.get("SMTP_PASS") ? "✅ Set" : "❌ Not set");
    console.log("SMTP_FROM_EMAIL:", Deno.env.get("SMTP_FROM_EMAIL") || "no-reply@dhaniverse.in (default)");
    console.log("");

    // Test connection
    console.log("🔌 Testing SMTP Connection...");
    const emailService = new EmailService();
    
    const connectionResult = await emailService.testConnection();
    if (connectionResult) {
        console.log("✅ SMTP Connection: SUCCESS");
    } else {
        console.log("❌ SMTP Connection: FAILED");
        console.log("\n💡 Troubleshooting suggestions:");
        console.log("1. Check your SMTP credentials");
        console.log("2. Try using port 587 instead of 465");
        console.log("3. Set EMAIL_PROVIDER=gmail and use Gmail with App Password");
        console.log("4. Consider using SendGrid for production");
        console.log("5. Check if your hosting provider blocks SMTP ports");
    }

    // Test sending a magic link email (if connection works)
    if (connectionResult) {
        console.log("\n📧 Testing Magic Link Email...");
        try {
            const testEmail = Deno.env.get("TEST_EMAIL") || "test@example.com";
            const result = await emailService.sendMagicLinkEmail({
                to: testEmail,
                token: "test-token-123",
                purpose: "signin",
                gameUsername: "TestUser",
                expiresIn: 15
            });
            
            if (result) {
                console.log(`✅ Test email sent successfully to ${testEmail}`);
            } else {
                console.log("❌ Failed to send test email");
            }
        } catch (error) {
            console.log("❌ Error sending test email:", error);
        }
    }

    console.log("\n🏁 Debugging complete!");
}

export { debugEmailService };

// To run this script: 
// deno run --allow-net --allow-env debug-email.ts
