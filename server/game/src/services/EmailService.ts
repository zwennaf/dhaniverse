// Email Service using Nodemailer for OTP functionality
import nodemailer from "nodemailer";



interface EmailConfig {
    host?: string;
    port?: number;
    secure?: boolean;
    service?: string;
    auth: {
        user: string;
        pass: string;
    };
    authMethod?: string;
    tls?: {
        rejectUnauthorized: boolean;
        ciphers?: string;
    };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
}

interface OTPEmailData {
    to: string;
    otp: string;
    username?: string;
    expiresIn?: number; // minutes
}

export class EmailService {
    private transporter: nodemailer.Transporter;
    private fromEmail: string;
    private maxRetries: number = 3;

    constructor() {
        this.fromEmail =
            Deno.env.get("SMTP_FROM_EMAIL") || "dhaniverse.game@gmail.com";

        const config: EmailConfig = this.getEmailConfig();
        this.transporter = nodemailer.createTransport(config);
    }

    private getEmailConfig(): EmailConfig {
        const provider = Deno.env.get("EMAIL_PROVIDER") || "zoho";
        const host = Deno.env.get("SMTP_HOST");
        const port = Deno.env.get("SMTP_PORT");
        const secure = Deno.env.get("SMTP_SECURE");

        // If custom SMTP settings are provided, use them
        if (host && port) {
            return {
                host,
                port: parseInt(port),
                secure: secure === "true",
                auth: {
                    user: Deno.env.get("SMTP_USER") || "",
                    pass: Deno.env.get("SMTP_PASS") || "",
                },
                authMethod: "PLAIN",
                tls: {
                    rejectUnauthorized: false,
                    ciphers: "SSLv3",
                },
                connectionTimeout: 10000,
                greetingTimeout: 5000,
                socketTimeout: 10000,
            };
        }

        // Predefined provider configurations
        switch (provider.toLowerCase()) {
            case "gmail":
            default: // Make Gmail the default instead of Zoho
                return {
                    service: "gmail",
                    auth: {
                        user: Deno.env.get("SMTP_USER") || "dhaniverse.game@gmail.com",
                        pass: Deno.env.get("SMTP_PASS") || "fquz ehgi cztc adim", // App password
                    },
                    tls: {
                        rejectUnauthorized: false,
                    },
                    connectionTimeout: 10000,
                    greetingTimeout: 5000,
                    socketTimeout: 10000,
                };

            case "sendgrid":
                return {
                    host: "smtp.sendgrid.net",
                    port: 587,
                    secure: false,
                    auth: {
                        user: "apikey",
                        pass: Deno.env.get("SENDGRID_API_KEY") || "",
                    },
                    connectionTimeout: 10000,
                };

            case "mailgun":
                return {
                    host: "smtp.mailgun.org",
                    port: 587,
                    secure: false,
                    auth: {
                        user: Deno.env.get("MAILGUN_SMTP_LOGIN") || "",
                        pass: Deno.env.get("MAILGUN_SMTP_PASSWORD") || "",
                    },
                    connectionTimeout: 10000,
                };

            case "zoho":
                return {
                    host: "smtp.zoho.com",
                    port: 587,
                    secure: false,
                    auth: {
                        user: Deno.env.get("SMTP_USER") || "",
                        pass: Deno.env.get("SMTP_PASS") || "",
                    },
                    authMethod: "PLAIN",
                    tls: {
                        rejectUnauthorized: false,
                    },
                    connectionTimeout: 15000,
                    greetingTimeout: 10000,
                    socketTimeout: 15000,
                };
        }
    }

    private async sendEmailWithRetry(mailOptions: nodemailer.SendMailOptions, retries: number = 0): Promise<boolean> {
        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully:`, info.messageId);
            return true;
        } catch (error) {
            console.error(`❌ Email send attempt ${retries + 1} failed:`, error);
            
            if (retries < this.maxRetries) {
                console.log(`🔄 Retrying email send (attempt ${retries + 2}/${this.maxRetries + 1})...`);
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
                
                // Try with alternative configuration on specific retry attempts
                if (retries === 1) {
                    await this.reconfigureWithAlternative();
                }
                
                return this.sendEmailWithRetry(mailOptions, retries + 1);
            }
            
            console.error(`❌ All email send attempts failed. Final error:`, error);
            return false;
        }
    }

    private reconfigureWithAlternative(): Promise<void> {
        try {
            console.log("🔄 Trying alternative email configuration...");
            
            // Try alternative Gmail configuration with explicit SMTP settings
            const alternativeConfig: EmailConfig = {
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    user: "dhaniverse.game@gmail.com",
                    pass: "fquz ehgi cztc adim",
                },
                tls: {
                    rejectUnauthorized: false,
                },
                connectionTimeout: 20000,
                greetingTimeout: 15000,
                socketTimeout: 20000,
            };
            
            this.transporter = nodemailer.createTransport(alternativeConfig);
            console.log("✅ Transporter reconfigured with Gmail SMTP settings");
        } catch (error) {
            console.error("❌ Failed to reconfigure transporter:", error);
        }
        return Promise.resolve();
    }

    /**
     * Send OTP email for email verification
     */
    async sendOTPEmail(data: OTPEmailData): Promise<boolean> {
        const { to, otp, username, expiresIn = 10 } = data;

        const mailOptions = {
            from: {
                name: "Dhaniverse",
                address: this.fromEmail,
            },
            to: to,
            subject: "Your Dhaniverse Verification Code",
            html: this.generateOTPEmailHTML(otp, username, expiresIn),
            text: this.generateOTPEmailText(otp, username, expiresIn),
        };

        return await this.sendEmailWithRetry(mailOptions);
    }

    /**
     * Send welcome email after successful registration
     */
    async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
        try {
            const mailOptions = {
                from: {
                    name: "Dhaniverse Team",
                    address: this.fromEmail,
                },
                to: to,
                subject: "Welcome to Dhaniverse",
                html: this.generateWelcomeEmailHTML(username),
                text: this.generateWelcomeEmailText(username),
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log("Welcome email sent successfully:", info.messageId);
            return true;
        } catch (error) {
            console.error("Failed to send welcome email:", error);
            return false;
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(
        to: string,
        resetToken: string,
        username?: string
    ): Promise<boolean> {
        try {
            const resetUrl = `${
                Deno.env.get("FRONTEND_URL") || "https://dhaniverse.in"
            }/reset-password?token=${resetToken}`;

            const mailOptions = {
                from: {
                    name: "Dhaniverse Security",
                    address: this.fromEmail,
                },
                to: to,
                subject: "Dhaniverse Password Reset",
                html: this.generatePasswordResetEmailHTML(resetUrl, username),
                text: this.generatePasswordResetEmailText(resetUrl, username),
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(
                "Password reset email sent successfully:",
                info.messageId
            );
            return true;
        } catch (error) {
            console.error("Failed to send password reset email:", error);
            return false;
        }
    }

    /**
     * Generate HTML template for OTP email
     */
    private generateOTPEmailHTML(
        otp: string,
        username?: string,
        expiresIn: number = 10
    ): string {
        return `
        <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dhaniverse Verification Code</title>
        <style>
            /* Email-safe styles without CSS variables */
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                line-height: 1.6;
                color: #1a1a1a !important;
                background: #ffffff !important;
                margin: 0;
                padding: 20px;
            }

            /* Reset link colors */
            a {
                color: #d4af37 !important;
                text-decoration: none;
            }

            a:hover {
                color: #b8860b !important;
            }

            /* Reset text colors */
            p, div, span, h1, h2, h3, h4, h5, h6 {
                color: inherit !important;
            }

            .container {
                max-width: 680px;
                width: 100%;
                margin: 0 auto;
                background: #f8f9fa;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            }

            .header {
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                padding: 48px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
                border-bottom: 1px solid #e9ecef;
            }

            .header::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #d4af37, #f5d167, #d4af37);
                box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
            }

            .header-badge {
                display: inline-block;
                padding: 8px 16px;
                border: 2px solid rgba(212, 175, 55, 0.3);
                border-radius: 4px;
                margin-bottom: 24px;
                background: rgba(212, 175, 55, 0.05);
            }

            .header-badge-text {
                font-size: 12px;
                color: #4a4a4a !important;
                font-weight: 500;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin: 0;
            }

            .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px auto;
                display: block;
                border-radius: 12px;
            }

            .brand {
                font-family: 'Courier New', Courier, monospace;
                font-size: 36px;
                color: #d4af37 !important;
                margin: 0 0 16px 0;
                font-weight: bold;
                letter-spacing: 2px;
                position: relative;
                z-index: 1;
                text-transform: uppercase;
            }

            .tagline {
                font-size: 16px;
                color: #4a4a4a !important;
                margin: 0;
                font-weight: 400;
                letter-spacing: 1px;
                line-height: 1.5;
            }

            .content {
                background: #ffffff;
                padding: 40px;
                position: relative;
            }

            .greeting {
                font-size: 24px;
                font-family: 'Courier New', Courier, monospace;
                color: #1a1a1a !important;
                margin-bottom: 25px;
                letter-spacing: 1px;
                position: relative;
                display: inline-block;
                font-weight: bold;
            }

            .greeting::after {
                content: "";
                position: absolute;
                bottom: -8px;
                left: 0;
                width: 60px;
                height: 3px;
                background: #d4af37;
                border-radius: 2px;
            }

            .intro-text {
                color: #4a4a4a !important;
                margin-bottom: 30px;
                font-size: 17px;
                line-height: 1.7;
            }

            .otp-container {
                background: rgba(248, 249, 250, 0.8);
                border: 1px solid rgba(212, 175, 55, 0.2);
                border-radius: 12px;
                padding: 35px 20px;
                text-align: center;
                margin: 35px 0;
                position: relative;
                overflow: hidden;
                box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.1);
            }

            @media (prefers-color-scheme: dark) {
                .otp-container {
                    box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.5);
                }
                
                .otp-container::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        135deg,
                        rgba(212, 175, 55, 0.05) 0%,
                        transparent 50%,
                        rgba(212, 175, 55, 0.05) 100%
                    );
                    pointer-events: none;
                }
            }

            .otp-label {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                color: #d4af37 !important;
                margin-bottom: 15px;
                letter-spacing: 2px;
                text-transform: uppercase;
                font-weight: bold;
            }

            .otp-code {
                font-family: 'Courier New', Courier, monospace;
                font-size: 48px;
                font-weight: bold;
                color: #d4af37 !important;
                letter-spacing: 8px;
                margin: 20px 0;
                background: rgba(212, 175, 55, 0.1);
                padding: 15px 25px;
                display: inline-block;
                border-radius: 8px;
                border: 2px solid #d4af37;
            }

            .otp-expiry {
                font-size: 15px;
                color: #666666 !important;
                margin-top: 15px;
                font-weight: 500;
            }

            .security-notice {
                background: #fff8e1;
                border: 1px solid rgba(212, 175, 55, 0.3);
                border-radius: 8px;
                padding: 25px;
                margin: 35px 0;
                border-left: 4px solid #d4af37;
            }

            .security-title {
                font-family: 'Courier New', Courier, monospace;
                font-size: 14px;
                color: #d4af37 !important;
                margin-bottom: 15px;
                letter-spacing: 1px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .security-list {
                color: #4a4a4a !important;
                margin: 0;
                padding-left: 28px;
                font-size: 15px;
            }

            .security-list li {
                margin-bottom: 10px;
                line-height: 1.6;
                position: relative;
                color: #4a4a4a !important;
            }

            .security-list li::before {
                content: "•";
                color: #d4af37 !important;
                position: absolute;
                left: -15px;
                font-size: 18px;
            }

            .features-section {
                margin: 35px 0;
            }

            .features-title {
                font-family: 'Courier New', Courier, monospace;
                font-size: 16px;
                color: #d4af37 !important;
                margin-bottom: 20px;
                letter-spacing: 1px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .features-list {
                color: #4a4a4a !important;
                margin: 0;
                padding-left: 28px;
                font-size: 16px;
            }

            .features-list li {
                margin-bottom: 12px;
                position: relative;
                padding-left: 10px;
                color: #4a4a4a !important;
            }

            .features-list li::before {
                content: "▹";
                color: #f5d167 !important;
                position: absolute;
                left: -15px;
            }

            .highlight {
                color: #d4af37 !important;
                font-weight: 500;
            }

            .cta-text {
                color: #4a4a4a !important;
                font-size: 17px;
                margin-top: 35px;
                text-align: center;
                font-style: italic;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }

            .footer {
                text-align: center;
                margin-top: 40px;
                color: var(--text-tertiary);
                font-size: 13px;
                padding: 40px 30px;
                border-top: 1px solid var(--border-primary);
                background: var(--footer-bg);
                line-height: 1.8;
                position: relative;
            }

            .footer::before {
                content: "";
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 3px;
                background: var(--gold-primary);
                border-radius: 2px;
            }

            .footer-brand {
                font-family: 'Courier New', Courier, monospace;
                color: var(--gold-primary);
                font-size: 16px;
                margin-bottom: 12px;
                letter-spacing: 1px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .footer-links {
                text-align: center;
                margin: 16px 0;
                line-height: 1.8;
            }

            .footer-links a {
                display: inline-block;
                margin: 0 8px;
            }

            .footer-link {
                color: var(--text-secondary);
                text-decoration: none;
                font-size: 12px;
                transition: color 0.3s ease;
            }

            .footer-link:hover {
                color: var(--gold-primary);
            }

            .footer-copyright {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid var(--border-primary);
                font-size: 11px;
                opacity: 0.8;
            }

            @media (max-width: 600px) {
                .header,
                .content {
                    padding: 30px 20px;
                }

                .brand {
                    font-size: 28px;
                }

                .otp-code {
                    font-size: 36px;
                    letter-spacing: 6px;
                    padding: 12px 15px;
                }

                .features-list,
                .security-list {
                    padding-left: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-badge">
                    <p class="header-badge-text">Learn Personal Finance with Fun</p>
                </div>
                <img src="https://dhaniverse.in/android-chrome-192x192.png" alt="Dhaniverse Logo" class="logo" width="80" height="80" />
                <h1 class="brand">Dhaniverse</h1>
                <p class="tagline">No lectures. Just quests, coins, maps, and clarity.</p>
            </div>

            <div class="content">
                <h2 class="greeting">
                    Hello${username ? ` ${username}` : " Player"}
                </h2>

                <p class="intro-text">
                    Welcome to Dhaniverse! Your journey to financial mastery
                    begins now. To complete your registration and unlock the
                    full experience, please use the verification code below.
                </p>

                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otp}</div>
                    <div class="otp-expiry">
                        Expires in ${expiresIn} minutes
                    </div>
                </div>

                <div class="security-notice">
                    <div class="security-title">Security Notice</div>
                    <ul class="security-list">
                        <li>
                            Never share this code with anyone, including
                            Dhaniverse staff
                        </li>
                        <li>
                            This code provides access to your account - treat it
                            like a password
                        </li>
                        <li>
                            Dhaniverse will never ask for this code via phone or
                            email
                        </li>
                        <li>
                            If you didn't request this, please contact support
                            immediately
                        </li>
                    </ul>
                </div>

                <div class="features-section">
                    <div class="features-title">
                        What Awaits You in Dhaniverse
                    </div>
                    <ul class="features-list">
                        <li>
                            <span class="highlight">No lectures</span> - Learn
                            through engaging gameplay and real-world scenarios
                        </li>
                        <li>
                            <span class="highlight"
                                >Dummy currency, real skills</span
                            >
                            - Earn coins while mastering financial concepts
                        </li>
                        <li>
                            <span class="highlight">Ethical gaming</span> -
                            Ad-free experience focused on genuine learning
                        </li>
                        <li>
                            <span class="highlight">Social finance</span> -
                            Connect with friends and climb the leaderboards
                        </li>
                        <li>
                            <span class="highlight"
                                >Real-world application</span
                            >
                            - Practical skills you can use immediately
                        </li>
                    </ul>
                </div>

                <p class="cta-text">
                    "No lectures. Just quests, coins, maps, and clarity."<br />
                    Your financial adventure begins now!
                </p>
            </div>

            <div class="footer">
                <div class="footer-brand">DHANIVERSE</div>
                <p>Building the future of financial education through gaming</p>
                
                <div class="footer-links">
                    <a href="https://dhaniverse.in/game" class="footer-link">Financial RPG Game</a> • 
                    <a href="https://dhaniverse.in/sign-up" class="footer-link">Create Account</a> • 
                    <a href="https://dhaniverse.in/sign-in" class="footer-link">Sign In</a> • 
                    <a href="https://dhaniverse.in/#features" class="footer-link">Features</a> • 
                    <a href="https://dhaniverse.in/#testimonials" class="footer-link">Reviews</a>
                </div>
                
                <div class="footer-copyright">
                    <p>© 2025 Dhaniverse. All rights reserved.</p>
                    <p>This email was sent as part of your Dhaniverse registration.</p>
                    <p style="margin-top: 12px;">
                        Questions? Contact us at <a href="mailto:support@dhaniverse.in" class="footer-link">support@dhaniverse.in</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Generate plain text template for OTP email
     */
    private generateOTPEmailText(
        otp: string,
        username?: string,
        expiresIn: number = 10
    ): string {
        return `
DHANIVERSE - VERIFICATION CODE

Hello${username ? ` ${username}` : ""}

Complete your account verification using the code below:

VERIFICATION CODE: ${otp}

This code expires in ${expiresIn} minutes.

SECURITY INFORMATION:
- Never share this code with anyone
- We will never ask for this code via phone or email
- If you didn't request this code, please ignore this email

© 2025 Dhaniverse. All rights reserved.
Financial education platform.
    `;
    }

    /**
     * Generate HTML template for welcome email
     */
    private generateWelcomeEmailHTML(username: string): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Dhaniverse</title>
        <style>
            /* Fallback fonts for email clients that block external fonts */
            
            :root {
                --gold-primary: #d4af37;
                --gold-secondary: #f5d167;
                --bg-primary: #ffffff;
                --bg-secondary: #f8f9fa;
                --bg-card: #ffffff;
                --border-primary: #e9ecef;
                --border-secondary: rgba(212, 175, 55, 0.2);
                --text-primary: #1a1a1a;
                --text-secondary: #4a4a4a;
                --text-tertiary: #666666;
                --header-bg: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                --footer-bg: #f8f9fa;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: var(--text-primary);
                background: var(--bg-primary);
                margin: 0;
                padding: 20px;
            }

            .container {
                max-width: 680px;
                width: 100%;
                margin: 0 auto;
                background: var(--bg-secondary);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
                border: 1px solid var(--border-primary);
            }

            .header {
                background: var(--header-bg);
                padding: 48px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
                border-bottom: 1px solid var(--border-primary);
            }

            .header::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(
                    90deg,
                    var(--gold-primary),
                    var(--gold-secondary),
                    var(--gold-primary)
                );
                box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
            }

            .header-badge {
                display: inline-block;
                padding: 8px 16px;
                border: 2px solid rgba(212, 175, 55, 0.3);
                border-radius: 4px;
                margin-bottom: 24px;
                background: rgba(212, 175, 55, 0.05);
            }

            .header-badge-text {
                font-size: 12px;
                color: var(--text-secondary);
                font-weight: 500;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin: 0;
            }

            .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px auto;
                display: block;
                border-radius: 12px;
            }

            .brand {
                font-family: 'Courier New', Courier, monospace;
                font-size: 36px;
                color: var(--gold-primary);
                margin: 0 0 16px 0;
                font-weight: bold;
                letter-spacing: 2px;
                position: relative;
                z-index: 1;
                text-transform: uppercase;
            }

            .tagline {
                font-size: 16px;
                color: var(--text-secondary);
                margin: 0;
                font-weight: 400;
                letter-spacing: 1px;
                line-height: 1.5;
            }

            .content {
                background: var(--bg-card);
                padding: 40px;
                position: relative;
            }

            .greeting {
                font-size: 24px;
                font-family: 'Courier New', Courier, monospace;
                color: var(--text-primary);
                margin-bottom: 25px;
                letter-spacing: 1px;
                position: relative;
                display: inline-block;
                font-weight: bold;
            }

            .greeting::after {
                content: "";
                position: absolute;
                bottom: -8px;
                left: 0;
                width: 60px;
                height: 3px;
                background: var(--gold-primary);
                border-radius: 2px;
            }

            .intro-text {
                color: var(--text-secondary);
                margin-bottom: 30px;
                font-size: 17px;
                line-height: 1.7;
            }

            .feature-card {
                background: var(--bg-secondary);
                border-radius: 8px;
                padding: 20px;
                margin: 16px 0;
                border-left: 3px solid var(--gold-primary);
            }

            .feature-title {
                font-family: 'Courier New', Courier, monospace;
                font-size: 16px;
                color: var(--gold-primary);
                margin: 0 0 8px 0;
                font-weight: bold;
                text-transform: uppercase;
            }

            .feature-desc {
                color: var(--text-secondary);
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
            }

            .cta-section {
                text-align: center;
                margin: 40px 0;
                padding: 32px 24px;
                background: var(--bg-secondary);
                border-radius: 12px;
                border: 1px solid var(--border-primary);
            }

            .cta-button {
                display: inline-block;
                background: var(--gold-primary);
                color: #ffffff;
                padding: 14px 28px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                border-radius: 8px;
                margin: 0 0 16px 0;
                transition: all 0.2s ease;
            }

            .cta-button:hover {
                background: #b8941f;
            }

            .cta-subtitle {
                color: var(--text-tertiary);
                margin: 0;
                font-size: 13px;
            }

            .tips-section {
                margin: 40px 0 0 0;
            }

            .tips-title {
                font-family: 'Courier New', Courier, monospace;
                font-size: 16px;
                color: var(--gold-primary);
                margin: 0 0 16px 0;
                font-weight: bold;
                text-transform: uppercase;
            }

            .tips-list {
                color: var(--text-secondary);
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .tips-list li {
                margin: 0 0 8px 0;
                font-size: 14px;
                position: relative;
                padding-left: 16px;
            }

            .tips-list li:before {
                content: "•";
                color: var(--gold-primary);
                position: absolute;
                left: 0;
            }

            .tips-list li:last-child {
                margin-bottom: 0;
            }

            .footer {
                text-align: center;
                margin-top: 40px;
                color: var(--text-tertiary);
                font-size: 13px;
                padding: 40px 30px;
                border-top: 1px solid var(--border-primary);
                background: var(--footer-bg);
                line-height: 1.8;
                position: relative;
            }

            .footer::before {
                content: "";
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 3px;
                background: var(--gold-primary);
                border-radius: 2px;
            }

            .footer-brand {
                font-family: 'Courier New', Courier, monospace;
                color: var(--gold-primary);
                font-size: 14px;
                margin-bottom: 12px;
                letter-spacing: 1px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .footer-links {
                text-align: center;
                margin: 16px 0;
                line-height: 1.8;
            }

            .footer-links a {
                display: inline-block;
                margin: 0 8px;
            }

            .footer-link {
                color: var(--text-secondary);
                text-decoration: none;
                font-size: 12px;
                transition: color 0.3s ease;
            }

            .footer-link:hover {
                color: var(--gold-primary);
            }

            .footer-copyright {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid var(--border-primary);
                font-size: 11px;
                opacity: 0.8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-badge">
                    <p class="header-badge-text">Learn Personal Finance with Fun</p>
                </div>
                <img src="https://dhaniverse.in/android-chrome-192x192.png" alt="Dhaniverse Logo" class="logo" width="80" height="80" />
                <h1 class="brand">Dhaniverse</h1>
                <p class="tagline">Welcome to your financial adventure, ${username}!</p>
            </div>

            <div class="content">
                <h2 class="greeting">Your glow-up starts here</h2>
                <p class="intro-text">You've successfully joined Dhaniverse, where learning finance is as fun as your favorite game! Your financial adventure begins now.</p>

                <div class="feature-card">
                    <div class="feature-title">No mental stress — just clarity</div>
                    <div class="feature-desc">Learn through gameplay, not lectures. No trauma. No pressure. Just understanding.</div>
                </div>

                <div class="feature-card">
                    <div class="feature-title">Dummy currency, real skills</div>
                    <div class="feature-desc">Earn in-game coins & level up while learning real-world money skills.</div>
                </div>

                <div class="feature-card">
                    <div class="feature-title">Ethical, real-world adventure</div>
                    <div class="feature-desc">No ads. Just fun quests that teach real financial wisdom.</div>
                </div>

                <div class="cta-section">
                    <a href="${
                        Deno.env.get("FRONTEND_URL") || "https://dhaniverse.in"
                    }" class="cta-button">Access Platform</a>
                    <p class="cta-subtitle">Begin your financial education journey</p>
                </div>

                <div class="tips-section">
                    <div class="tips-title">Getting Started</div>
                    <ul class="tips-list">
                        <li>Complete the introductory tutorial</li>
                        <li>Explore the banking simulation</li>
                        <li>Practice investment strategies</li>
                        <li>Track your learning progress</li>
                    </ul>
                </div>
            </div>

            <div class="footer">
                <div class="footer-brand">DHANIVERSE</div>
                <p>Building the future of financial education through gaming</p>
                
                <div class="footer-links">
                    <a href="https://dhaniverse.in/game" class="footer-link">Financial RPG Game</a> • 
                    <a href="https://dhaniverse.in/sign-up" class="footer-link">Create Account</a> • 
                    <a href="https://dhaniverse.in/sign-in" class="footer-link">Sign In</a> • 
                    <a href="https://dhaniverse.in/#features" class="footer-link">Features</a> • 
                    <a href="https://dhaniverse.in/#testimonials" class="footer-link">Reviews</a>
                </div>
                
                <div class="footer-copyright">
                    <p>© 2025 Dhaniverse. All rights reserved.</p>
                    <p>This email was sent as part of your Dhaniverse registration.</p>
                    <p style="margin-top: 12px;">
                        Questions? Contact us at <a href="mailto:support@dhaniverse.in" class="footer-link">support@dhaniverse.in</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Generate plain text template for welcome email
     */
    private generateWelcomeEmailText(username: string): string {
        return `
DHANIVERSE - WELCOME

Hello ${username}

Your Dhaniverse account is now active. Start your financial education journey through interactive gameplay and practical learning.

PLATFORM FEATURES:
- Interactive Learning: Master financial concepts through gameplay
- Practical Skills: Develop real-world money management abilities
- Progressive System: Advance through structured lessons

GETTING STARTED:
- Complete the introductory tutorial
- Explore the banking simulation
- Practice investment strategies
- Track your learning progress

Access Platform: ${Deno.env.get("FRONTEND_URL") || "https://dhaniverse.in"}

© 2025 Dhaniverse. All rights reserved.
Financial education platform.
    `;
    }

    /**
     * Generate HTML template for password reset email
     */
    private generatePasswordResetEmailHTML(
        resetUrl: string,
        username?: string
    ): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dhaniverse Password Reset</title>
        <style>
            /* Fallback fonts for email clients that block external fonts */
            
            :root {
                --gold-primary: #d4af37;
                --gold-secondary: #f5d167;
                --bg-primary: #ffffff;
                --bg-secondary: #f8f9fa;
                --bg-card: #ffffff;
                --border-primary: #e9ecef;
                --text-primary: #1a1a1a;
                --text-secondary: #4a4a4a;
                --text-tertiary: #666666;
                --header-bg: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                --footer-bg: #f8f9fa;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                line-height: 1.6; 
                color: var(--text-primary); 
                background: var(--bg-primary);
                margin: 0;
                padding: 20px;
            }
            .container { 
                max-width: 680px; 
                width: 100%;
                margin: 0 auto; 
                background: var(--bg-secondary);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
                border: 1px solid var(--border-primary);
            }
            .header { 
                background: var(--header-bg);
                padding: 48px 40px;
                text-align: center; 
                position: relative;
                overflow: hidden;
                border-bottom: 1px solid var(--border-primary);
            }
            .header::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(
                    90deg,
                    var(--gold-primary),
                    var(--gold-secondary),
                    var(--gold-primary)
                );
                box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
            }
            .header-badge {
                display: inline-block;
                padding: 8px 16px;
                border: 2px solid rgba(212, 175, 55, 0.3);
                border-radius: 4px;
                margin-bottom: 24px;
                background: rgba(212, 175, 55, 0.05);
            }
            .header-badge-text {
                font-size: 12px;
                color: var(--text-secondary);
                font-weight: 500;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin: 0;
            }
            .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 16px auto;
                display: block;
                border-radius: 8px;
            }
            .brand { 
                font-family: 'Courier New', Courier, monospace; 
                font-size: 36px; 
                color: var(--gold-primary); 
                margin: 0 0 16px 0;
                font-weight: bold;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            .subtitle {
                font-size: 16px;
                color: var(--text-secondary);
                margin: 0;
                font-weight: 400;
                letter-spacing: 1px;
                line-height: 1.5;
            }
            .content { 
                background: var(--bg-card);
                padding: 40px;
                position: relative;
            }
            .greeting {
                font-size: 24px;
                font-family: 'Courier New', Courier, monospace;
                color: var(--text-primary);
                margin: 0 0 25px 0;
                font-weight: bold;
                letter-spacing: 1px;
                position: relative;
                display: inline-block;
            }
            .greeting::after {
                content: "";
                position: absolute;
                bottom: -8px;
                left: 0;
                width: 60px;
                height: 3px;
                background: var(--gold-primary);
                border-radius: 2px;
            }
            .intro-text {
                color: var(--text-secondary);
                margin: 0 0 30px 0;
                font-size: 17px;
                line-height: 1.7;
            }
            .cta-section {
                text-align: center;
                margin: 40px 0;
                padding: 32px 24px;
                background: #f8f9fa;
                border-radius: 12px;
                border: 1px solid #e9ecef;
            }
            .cta-button { 
                display: inline-block; 
                background: #D4AF37; 
                color: #ffffff; 
                padding: 14px 28px; 
                text-decoration: none; 
                font-weight: 600;
                font-size: 14px;
                border-radius: 8px;
                margin: 0;
                transition: all 0.2s ease;
            }
            .cta-button:hover {
                background: #b8941f;
            }
            .security-notice { 
                background: #fff8e1; 
                border-radius: 8px;
                padding: 20px; 
                margin: 40px 0;
                border-left: 4px solid #D4AF37;
            }
            .security-title {
                font-size: 14px;
                color: #1a1a1a;
                margin: 0 0 12px 0;
                font-weight: 600;
            }
            .security-list {
                color: #4a4a4a;
                margin: 0;
                padding: 0;
                list-style: none;
            }
            .security-list li {
                margin: 0 0 8px 0;
                font-size: 14px;
                position: relative;
                padding-left: 16px;
            }
            .security-list li:before {
                content: "•";
                color: #D4AF37;
                position: absolute;
                left: 0;
            }
            .security-list li:last-child {
                margin-bottom: 0;
            }
            .url-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                border: 1px solid #e9ecef;
            }
            .url-label {
                font-size: 12px;
                color: #666666;
                margin: 0 0 8px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 500;
            }
            .url-text {
                word-break: break-all;
                color: #D4AF37;
                font-size: 12px;
                margin: 0;
                font-family: monospace;
            }
            .footer { 
                text-align: center; 
                margin-top: 60px; 
                padding-top: 40px;
                color: #999999; 
                font-size: 12px;
                border-top: 1px solid #f0f0f0;
            }
            .footer-brand {
                font-family: 'Press Start 2P', monospace;
                color: #D4AF37;
                font-size: 10px;
                margin: 0 0 8px 0;
            }
            .footer p {
                margin: 4px 0;
                line-height: 1.4;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://dhaniverse.in/android-chrome-192x192.png" alt="Dhaniverse" class="logo" width="48" height="48" />
                <h1 class="brand">DHANIVERSE</h1>
                <p class="subtitle">Account Security</p>
            </div>
            <div class="content">
                <h2 class="greeting">Password Reset Request</h2>
                <p class="intro-text">Hello${
                    username ? ` ${username}` : ""
                }. We received a request to reset your account password. Use the button below to create a new password.</p>

                <div class="cta-section">
                    <a href="${resetUrl}" class="cta-button">Reset Password</a>
                </div>

                <div class="security-notice">
                    <div class="security-title">Security Information</div>
                    <ul class="security-list">
                        <li>This link expires in 1 hour for security purposes</li>
                        <li>If you didn't request this reset, ignore this email</li>
                        <li>Your current password remains active until changed</li>
                    </ul>
                </div>

                <div class="url-section">
                    <div class="url-label">Alternative Access</div>
                    <p class="url-text">${resetUrl}</p>
                </div>
            </div>
            <div class="footer">
                <div class="footer-brand">DHANIVERSE</div>
                <p>© 2025 Dhaniverse. All rights reserved.</p>
                <p>Financial education platform.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    /**
     * Generate plain text template for password reset email
     */
    private generatePasswordResetEmailText(
        resetUrl: string,
        username?: string
    ): string {
        return `
DHANIVERSE - PASSWORD RESET

Hello${username ? ` ${username}` : ""}

We received a request to reset your account password. Use the link below to create a new password:

${resetUrl}

SECURITY INFORMATION:
- This link expires in 1 hour for security purposes
- If you didn't request this reset, ignore this email
- Your current password remains active until changed

© 2025 Dhaniverse. All rights reserved.
Financial education platform.
    `;
    }

    /**
     * Send magic link email for passwordless authentication
     */
    async sendMagicLinkEmail(data: {
        to: string;
        token: string;
        purpose: 'signin' | 'signup';
        gameUsername?: string;
        expiresIn?: number;
    }): Promise<boolean> {
        const { to, token, purpose, gameUsername, expiresIn = 15 } = data;
        const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://dhaniverse.in";
        const magicUrl = `${frontendUrl}/auth/magic?token=${token}`;

        const mailOptions = {
            from: {
                name: "Dhaniverse",
                address: this.fromEmail,
            },
            to: to,
            subject: purpose === 'signin' 
                ? "Sign in to Dhaniverse" 
                : "Welcome to Dhaniverse",
            html: this.generateMagicLinkEmailHTML(magicUrl, purpose, gameUsername, expiresIn),
            text: this.generateMagicLinkEmailText(magicUrl, purpose, gameUsername, expiresIn),
        };

        return await this.sendEmailWithRetry(mailOptions);
    }

    /**
     * Generate HTML template for magic link email
     */
    private generateMagicLinkEmailHTML(
        magicUrl: string,
        purpose: 'signin' | 'signup',
        gameUsername?: string,
        expiresIn: number = 15
    ): string {
        const isSignUp = purpose === 'signup';
        const title = isSignUp ? "Welcome to Dhaniverse" : "Sign in to Dhaniverse";
        const greeting = isSignUp ? "Welcome to the adventure!" : `Welcome back${gameUsername ? `, ${gameUsername}` : ""}!`;
        const description = isSignUp 
            ? "Click the button below to create your account and start your financial learning journey."
            : "Click the button below to sign in to your account.";

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                    line-height: 1.6;
                    color: #1a1a1a !important;
                    background: #ffffff !important;
                    margin: 0;
                    padding: 20px;
                }

                .container {
                    max-width: 680px;
                    width: 100%;
                    margin: 0 auto;
                    background: #f8f9fa;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e9ecef;
                }

                .header {
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    padding: 48px 40px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                    border-bottom: 1px solid #e9ecef;
                }

                .header::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #d4af37, #f5d167, #d4af37);
                    box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
                }

                .logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px auto;
                    display: block;
                    border-radius: 12px;
                }

                .brand {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 36px;
                    color: #d4af37 !important;
                    margin: 0 0 16px 0;
                    font-weight: bold;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }

                .tagline {
                    font-size: 16px;
                    color: #4a4a4a !important;
                    margin: 0;
                    font-weight: 400;
                    letter-spacing: 1px;
                    line-height: 1.5;
                }

                .content {
                    background: #ffffff;
                    padding: 40px;
                    position: relative;
                }

                .greeting {
                    font-size: 24px;
                    font-family: 'Courier New', Courier, monospace;
                    color: #1a1a1a !important;
                    margin-bottom: 25px;
                    letter-spacing: 1px;
                    position: relative;
                    display: inline-block;
                    font-weight: bold;
                }

                .greeting::after {
                    content: "";
                    position: absolute;
                    bottom: -8px;
                    left: 0;
                    width: 60px;
                    height: 3px;
                    background: #d4af37;
                    border-radius: 2px;
                }

                .intro-text {
                    color: #4a4a4a !important;
                    margin-bottom: 30px;
                    font-size: 17px;
                    line-height: 1.7;
                }

                .magic-link-container {
                    background: rgba(248, 249, 250, 0.8);
                    border: 1px solid rgba(212, 175, 55, 0.2);
                    border-radius: 12px;
                    padding: 35px 20px;
                    text-align: center;
                    margin: 35px 0;
                }

                .cta-button {
                    display: inline-block;
                    background: #d4af37;
                    color: #ffffff !important;
                    padding: 16px 32px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 16px;
                    border-radius: 8px;
                    margin: 0 0 20px 0;
                    transition: all 0.2s ease;
                    font-family: 'Courier New', Courier, monospace;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .cta-button:hover {
                    background: #b8941f;
                }

                .expiry-text {
                    font-size: 14px;
                    color: #666666 !important;
                    margin-top: 15px;
                }

                .security-notice {
                    background: #fff8e1;
                    border: 1px solid rgba(212, 175, 55, 0.3);
                    border-radius: 8px;
                    padding: 25px;
                    margin: 35px 0;
                    border-left: 4px solid #d4af37;
                }

                .security-title {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 14px;
                    color: #d4af37 !important;
                    margin-bottom: 15px;
                    letter-spacing: 1px;
                    font-weight: bold;
                    text-transform: uppercase;
                }

                .url-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 24px 0;
                    border: 1px solid #e9ecef;
                }

                .url-label {
                    font-size: 12px;
                    color: #666666 !important;
                    margin: 0 0 8px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 500;
                }

                .url-text {
                    word-break: break-all;
                    color: #d4af37 !important;
                    font-size: 12px;
                    margin: 0;
                    font-family: monospace;
                }

                .footer {
                    text-align: center;
                    margin-top: 40px;
                    color: #666666 !important;
                    font-size: 13px;
                    padding: 40px 30px;
                    border-top: 1px solid #e9ecef;
                    background: #f8f9fa;
                    line-height: 1.8;
                }

                .footer-brand {
                    font-family: 'Courier New', Courier, monospace;
                    color: #d4af37 !important;
                    font-size: 16px;
                    margin-bottom: 12px;
                    letter-spacing: 1px;
                    font-weight: bold;
                    text-transform: uppercase;
                }

                @media (max-width: 600px) {
                    .header,
                    .content {
                        padding: 30px 20px;
                    }

                    .brand {
                        font-size: 28px;
                    }

                    .cta-button {
                        padding: 14px 24px;
                        font-size: 14px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://dhaniverse.in/android-chrome-192x192.png" alt="Dhaniverse Logo" class="logo" width="80" height="80" />
                    <h1 class="brand">Dhaniverse</h1>
                    <p class="tagline">No lectures. Just quests, coins, maps, and clarity.</p>
                </div>

                <div class="content">
                    <h2 class="greeting">${greeting}</h2>
                    <p class="intro-text">${description}</p>

                    <div class="magic-link-container">
                        <a href="${magicUrl}" class="cta-button">
                            ${isSignUp ? "Create Account" : "Sign In"}
                        </a>
                        <div class="expiry-text">
                            This link expires in ${expiresIn} minutes
                        </div>
                    </div>

                    <div class="security-notice">
                        <div class="security-title">Security Notice</div>
                        <p style="color: #4a4a4a; margin: 0; font-size: 14px;">
                            This is a secure magic link that will ${isSignUp ? "create your account and" : ""} sign you in automatically. 
                            Keep this link private and don't share it with anyone.
                        </p>
                    </div>

                    <div class="url-section">
                        <div class="url-label">Alternative Access</div>
                        <p class="url-text">${magicUrl}</p>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-brand">DHANIVERSE</div>
                    <p>Building the future of financial education through gaming</p>
                    <p>© 2025 Dhaniverse. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate plain text template for magic link email
     */
    private generateMagicLinkEmailText(
        magicUrl: string,
        purpose: 'signin' | 'signup',
        gameUsername?: string,
        expiresIn: number = 15
    ): string {
        const isSignUp = purpose === 'signup';
        const title = isSignUp ? "WELCOME TO DHANIVERSE" : "SIGN IN TO DHANIVERSE";
        const greeting = isSignUp ? "Welcome to the adventure!" : `Welcome back${gameUsername ? `, ${gameUsername}` : ""}!`;
        const action = isSignUp ? "Create your account" : "Sign in";

        return `
${title}

${greeting}

${action} using the secure link below:

${magicUrl}

This link expires in ${expiresIn} minutes.

SECURITY INFORMATION:
- This is a secure magic link for your account
- Keep this link private and don't share it with anyone
- The link will ${isSignUp ? "create your account and" : ""} sign you in automatically

© 2025 Dhaniverse. All rights reserved.
Financial education platform.
        `;
    }

    /**
     * Test email configuration
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            console.log("Email service connection verified successfully");
            return true;
        } catch (error) {
            console.error("Email service connection failed:", error);
            return false;
        }
    }
}
