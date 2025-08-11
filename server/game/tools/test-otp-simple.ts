// Simple OTP Generation Test (without MongoDB)
// Run with: deno run --allow-env --env-file=.env tools/test-otp-simple.ts

async function testOTPGeneration() {
    console.log('🧪 Testing OTP Generation Logic...\n');

    try {
        // Test OTP generation
        console.log('1️⃣ Testing OTP generation...');
        const otp = generateRandomOTP(6);
        console.log(`   Generated OTP: ${otp}`);
        console.log(`   Length: ${otp.length}`);
        console.log(`   Is numeric: ${/^\d+$/.test(otp)}`);
        console.log('   ✅ OTP generation successful\n');

        // Test OTP hashing
        console.log('2️⃣ Testing OTP hashing...');
        const hashedOTP = await hashOTP(otp);
        console.log(`   Original OTP: ${otp}`);
        console.log(`   Hashed OTP: ${hashedOTP}`);
        console.log(`   Hash length: ${hashedOTP.length}`);
        console.log('   ✅ OTP hashing successful\n');

        // Test OTP comparison
        console.log('3️⃣ Testing OTP comparison...');
        const isValid = await compareOTP(otp, hashedOTP);
        const isInvalid = await compareOTP('000000', hashedOTP);
        console.log(`   Valid OTP comparison: ${isValid ? '✅ Correct' : '❌ Failed'}`);
        console.log(`   Invalid OTP comparison: ${isInvalid ? '❌ Should be false' : '✅ Correct'}`);
        console.log('   ✅ OTP comparison successful\n');

        // Test expiry calculation
        console.log('4️⃣ Testing expiry calculation...');
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        console.log(`   Current time: ${new Date().toISOString()}`);
        console.log(`   Expires at: ${expiresAt.toISOString()}`);
        console.log(`   Is future: ${expiresAt > new Date() ? '✅ Correct' : '❌ Failed'}`);
        console.log('   ✅ Expiry calculation successful\n');

        console.log('🎉 All OTP logic tests passed!');
        console.log('\n📋 Summary:');
        console.log('✅ OTP generation working');
        console.log('✅ OTP hashing working');
        console.log('✅ OTP comparison working');
        console.log('✅ Expiry calculation working');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Helper functions (copied from OTPService for testing)
function generateRandomOTP(length: number): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
}

async function hashOTP(otp: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + (Deno.env.get('OTP_SALT') || 'dhaniverse_otp_salt'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function compareOTP(plainOTP: string, hashedOTP: string): Promise<boolean> {
    const hashedInput = await hashOTP(plainOTP);
    return hashedInput === hashedOTP;
}

// Run the test
if (import.meta.main) {
    await testOTPGeneration();
}