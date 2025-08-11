// Simple Email Service Test
// Run with: deno run --allow-net --allow-env --env-file=.env tools/test-email-simple.ts

import { EmailService } from "../src/services/EmailService.ts";

async function testEmailService() {
    console.log("🧪 Testing Email Service Connection...\n");

    try {
        // Initialize email service
        const emailService = new EmailService();

        // Debug environment variables
        console.log("🔍 Debug - Environment Variables:");
        console.log(`   SMTP_HOST: ${Deno.env.get("SMTP_HOST")}`);
        console.log(`   SMTP_PORT: ${Deno.env.get("SMTP_PORT")}`);
        console.log(`   SMTP_SECURE: ${Deno.env.get("SMTP_SECURE")}`);
        console.log(`   SMTP_USER: ${Deno.env.get("SMTP_USER")}`);
        console.log(`   SMTP_PASS: ${Deno.env.get("SMTP_PASS") ? "***SET***" : "NOT SET"}`);
        console.log(`   SMTP_FROM_EMAIL: ${Deno.env.get("SMTP_FROM_EMAIL")}`);

        // Test email service connection
        console.log("\n📧 Testing SMTP connection...");
        const isHealthy = await emailService.testConnection();

        if (isHealthy) {
            console.log("✅ Email service connection successful!");
            console.log("📋 Configuration:");
            console.log(`   Host: ${Deno.env.get("SMTP_HOST")}`);
            console.log(`   Port: ${Deno.env.get("SMTP_PORT")}`);
            console.log(`   User: ${Deno.env.get("SMTP_USER")}`);
            console.log(`   From: ${Deno.env.get("SMTP_FROM_EMAIL")}`);

            // Test sending an actual email if TEST_EMAIL_ADDRESS is provided
            const testEmail = Deno.env.get("TEST_EMAIL_ADDRESS");
            if (testEmail) {
                console.log(`\n📤 Sending test OTP email to: ${testEmail}`);

                const testOTP = "123456";
                const emailSent = await emailService.sendOTPEmail({
                    to: testEmail,
                    otp: testOTP,
                    username: "TestUser",
                    expiresIn: 10,
                });

                if (emailSent) {
                    console.log("✅ Test email sent successfully!");
                    console.log(
                        `📧 Check your email at ${testEmail} for the test OTP: ${testOTP}`
                    );
                } else {
                    console.log("❌ Failed to send test email");
                }
            } else {
                console.log(
                    "\n💡 To test actual email sending, set TEST_EMAIL_ADDRESS=your@email.com in your .env file"
                );
            }
        } else {
            console.log("❌ Email service connection failed!");
            console.log("\n🔧 Troubleshooting:");
            console.log("1. Check your SMTP credentials in .env file");
            console.log("2. For Zoho Mail, ensure:");
            console.log("   - SMTP_HOST=smtp.zoho.com");
            console.log("   - SMTP_PORT=587");
            console.log("   - SMTP_SECURE=false");
            console.log("   - Use your actual Zoho email and password");
            console.log("3. Make sure your Zoho account allows SMTP access");
        }
    } catch (error) {
        console.error("❌ Test failed with error:", error);
        console.log("\n🔧 Common issues:");
        console.log("1. Missing environment variables in .env file");
        console.log("2. Incorrect SMTP credentials");
        console.log("3. Network connectivity issues");
        console.log("4. Email provider blocking SMTP access");
    }
}

// Run the test
if (import.meta.main) {
    await testEmailService();
}
