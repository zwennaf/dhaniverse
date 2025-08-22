# SMTP Configuration Guide for Production

Your production email service is now configured to use Gmail instead of Zoho.

## Current Configuration
```
Email Provider: Gmail
SMTP User: dhaniverse.game@gmail.com
App Password: fquz ehgi cztc adim
```

## Environment Variables for Production

Set these environment variables in your production environment:

### Option 1: Use Default Gmail Configuration (Recommended)
```bash
# Gmail is now the default - no environment variables needed
# The service will automatically use:
# SMTP_USER=dhaniverse.game@gmail.com
# SMTP_PASS=fquz ehgi cztc adim
```

### Option 2: Override with Environment Variables
```bash
EMAIL_PROVIDER=gmail
SMTP_USER=dhaniverse.game@gmail.com
SMTP_PASS=fquz ehgi cztc adim
SMTP_FROM_EMAIL=dhaniverse.game@gmail.com
```

### Option 3: Use SendGrid (Alternative)
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SMTP_FROM_EMAIL=dhaniverse.game@gmail.com
```

## Gmail Setup Requirements

1. **App Password**: The password `fquz ehgi cztc adim` should be a Gmail App Password
2. **2-Factor Authentication**: Must be enabled on the Gmail account
3. **Less Secure Apps**: Not needed with App Passwords

## Testing Your Configuration

The EmailService now includes:
- ✅ Gmail as default provider
- ✅ Automatic retry logic (3 attempts)
- ✅ Alternative SMTP server fallback
- ✅ Better error handling
- ✅ Connection timeouts

## Quick Test Commands

Test your email config with the debug endpoint:
```bash
curl https://your-domain.com/auth/debug-email
```

## Troubleshooting

If emails still fail:

1. **Verify App Password**: Make sure `fquz ehgi cztc adim` is correct
2. **Check 2FA**: Ensure 2-factor authentication is enabled on dhaniverse.game@gmail.com
3. **Gmail Security**: Check Gmail account for any security blocks
4. **Hosting Provider**: Some hosts may still block SMTP - Gmail is usually more reliable

## Production Notes

Gmail is much more reliable than Zoho for production use:
- ✅ Better delivery rates
- ✅ Less likely to be blocked by hosting providers
- ✅ More stable SMTP servers
- ✅ Better error reporting

Your magic link emails should now work reliably in production!
