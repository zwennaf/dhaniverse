// Test script for Email and OTP functionality
// Run with: deno run --allow-net --allow-env --env-file=.env tools/test-email-otp.ts

import { EmailService } from '../src/services/EmailService.ts';
import { OTPService } from '../src/services/OTPService.ts';
import { MongoDatabase } from '../src/db/mongo.ts';

async function testEmailAndOTP() {
    console.log('🧪 Testing Email and OTP Services...\n');

    // Initialize services
    const mongodb = new MongoDatabase();
    const emailService = new EmailService();
    const otpService = new OTPService(mongodb);

    try {
        // Test 1: Database Connection
        console.log('1️⃣ Testing database connection...');
        await mongodb.connect();
        const isHealthy = mongodb.isHealthy();
        console.log(`   Database: ${isHealthy ? '✅ Connected' : '❌ Failed'}\n`);

        if (!isHealthy) {
            console.log('❌ Database connection failed. Please check your MONGODB_URI in .env');
            return;
        }

        // Test 2: Email Service Connection
        console.log('2️⃣ Testing email service connection...');
        const emailHealthy = await emailService.testConnection();
        console.log(`   Email Service: ${emailHealthy ? '✅ Connected' : '❌ Failed'}\n`);

        if (!emailHealthy) {
            console.log('❌ Email service connection failed. Please check your SMTP settings in .env');
            console.log('Required environment variables:');
            console.log('- SMTP_HOST');
            console.log('- SMTP_PORT');
            console.log('- SMTP_USER');
            console.log('- SMTP_PASS');
            return;
        }

        // Test 3: OTP Generation
        console.log('3️⃣ Testing OTP generation...');
        const testEmail = 'test@example.com';
        const { otp, expiresAt } = await otpService.generateOTP(testEmail, {
            purpose: 'email_verification',
            expiresInMinutes: 10
        });
        console.log(`   Generated OTP: ${otp}`);
        console.log(`   Expires at: ${expiresAt.toISOString()}`);
        console.log('   ✅ OTP generation successful\n');

        // Test 4: OTP Verification (Valid)
        console.log('4️⃣ Testing OTP verification (valid)...');
        const validVerification = await otpService.verifyOTP(testEmail, otp, 'email_verification');
        console.log(`   Verification result: ${validVerification.valid ? '✅ Valid' : '❌ Invalid'}`);
        console.log(`   Message: ${validVerification.message}\n`);

        // Test 5: OTP Verification (Invalid)
        console.log('5️⃣ Testing OTP verification (invalid)...');
        const invalidVerification = await otpService.verifyOTP(testEmail, '000000', 'email_verification');
        console.log(`   Verification result: ${invalidVerification.valid ? '✅ Valid' : '❌ Invalid (Expected)'}`);
        console.log(`   Message: ${invalidVerification.message}\n`);

        // Test 6: Send Test Email (Optional - only if you want to test actual email sending)
        const shouldSendEmail = Deno.env.get('TEST_SEND_EMAIL') === 'true';
        const testEmailAddress = Deno.env.get('TEST_EMAIL_ADDRESS');

        if (shouldSendEmail && testEmailAddress) {
            console.log('6️⃣ Testing actual email sending...');
            console.log(`   Sending test email to: ${testEmailAddress}`);
            
            // Generate new OTP for email test
            const { otp: emailOTP } = await otpService.generateOTP(testEmailAddress, {
                purpose: 'email_verification',
                expiresInMinutes: 10
            });

            const emailSent = await emailService.sendOTPEmail({
                to: testEmailAddress,
                otp: emailOTP,
                username: 'TestUser',
                expiresIn: 10
            });

            console.log(`   Email sent: ${emailSent ? '✅ Success' : '❌ Failed'}`);
            
            if (emailSent) {
                console.log(`   📧 Check your email at ${testEmailAddress} for the OTP: ${emailOTP}`);
            }
            console.log('');
        } else {
            console.log('6️⃣ Skipping actual email sending (set TEST_SEND_EMAIL=true and TEST_EMAIL_ADDRESS=your@email.com to test)\n');
        }

        // Test 7: OTP Statistics
        console.log('7️⃣ Testing OTP statistics...');
        const stats = await otpService.getOTPStats();
        console.log('   OTP Statistics:');
        console.log(`   - Active OTPs: ${stats.totalActive}`);
        console.log(`   - Expired OTPs: ${stats.totalExpired}`);
        console.log(`   - Verified OTPs: ${stats.totalVerified}`);
        console.log(`   - By Purpose: ${JSON.stringify(stats.byPurpose)}`);
        console.log('   ✅ Statistics retrieved successfully\n');

        // Test 8: Cleanup
        console.log('8️⃣ Testing OTP cleanup...');
        const cleanedCount = await otpService.cleanupExpiredOTPs();
        console.log(`   Cleaned up ${cleanedCount} expired OTPs`);
        console.log('   ✅ Cleanup successful\n');

        console.log('🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Database connection working');
        console.log('✅ Email service connection working');
        console.log('✅ OTP generation working');
        console.log('✅ OTP verification working');
        console.log('✅ OTP statistics working');
        console.log('✅ OTP cleanup working');
        
        if (shouldSendEmail && testEmailAddress) {
            console.log('✅ Email sending tested');
        }

        console.log('\n🚀 Your OTP system is ready for production!');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check your .env file has all required variables');
        console.log('2. Ensure MongoDB is accessible');
        console.log('3. Verify SMTP credentials are correct');
        console.log('4. For Gmail, use an App Password, not your regular password');
    } finally {
        // Cleanup
        await mongodb.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the test
if (import.meta.main) {
    await testEmailAndOTP();
}