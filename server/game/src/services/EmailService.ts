// Email Service using Nodemailer for OTP functionality
import nodemailer from "nodemailer";

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    authMethod?: string;
    tls?: {
        rejectUnauthorized: boolean;
        ciphers?: string;
    };
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

    constructor() {
        this.fromEmail =
            Deno.env.get("SMTP_FROM_EMAIL") || "no-reply@dhaniverse.in";

        const config: EmailConfig = {
            host: Deno.env.get("SMTP_HOST") || "smtp.zoho.com",
            port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
            secure: Deno.env.get("SMTP_SECURE") === "true", // true for 465, false for other ports
            auth: {
                user: Deno.env.get("SMTP_USER") || "",
                pass: Deno.env.get("SMTP_PASS") || "", // App password for Zoho
            },
            authMethod: "PLAIN",
            tls: {
                rejectUnauthorized: false,
            },
        };

        this.transporter = nodemailer.createTransport(config);
    }

    /**
     * Send OTP email for email verification
     */
    async sendOTPEmail(data: OTPEmailData): Promise<boolean> {
        try {
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

            const info = await this.transporter.sendMail(mailOptions);
            console.log("OTP email sent successfully:", info.messageId);
            return true;
        } catch (error) {
            console.error("Failed to send OTP email:", error);
            return false;
        }
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
                subject: "Welcome to Dhaniverse! 🎮",
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
                subject: "Reset Your Dhaniverse Password",
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎮 Dhaniverse</h1>
                <p>Your Financial Gaming Adventure Awaits!</p>
            </div>
            <div class="content">
                <h2>Hello${username ? ` ${username}` : ""}! 👋</h2>
                <p>Welcome to Dhaniverse! To complete your registration and start your financial learning journey, please use the verification code below:</p>
                
                <div class="otp-box">
                    <p>Your Verification Code:</p>
                    <div class="otp-code">${otp}</div>
                    <p><small>This code expires in ${expiresIn} minutes</small></p>
                </div>

                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul>
                        <li>Never share this code with anyone</li>
                        <li>Dhaniverse will never ask for this code via phone or email</li>
                        <li>If you didn't request this code, please ignore this email</li>
                    </ul>
                </div>

                <p>Once verified, you'll be able to:</p>
                <ul>
                    <li>🏦 Learn banking and investment concepts through gameplay</li>
                    <li>📈 Practice stock trading in a safe environment</li>
                    <li>🔗 Explore Web3 and blockchain technology</li>
                    <li>👥 Connect with friends and compete on leaderboards</li>
                </ul>

                <p>Ready to start your financial education adventure? Enter the code above and let's begin!</p>
            </div>
            <div class="footer">
                <p>© 2025 Dhaniverse. All rights reserved.</p>
                <p>Building the future of financial education through gaming.</p>
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
Hello${username ? ` ${username}` : ""}!

Welcome to Dhaniverse! To complete your registration and start your financial learning journey, please use the verification code below:

Your Verification Code: ${otp}

This code expires in ${expiresIn} minutes.

SECURITY NOTICE:
- Never share this code with anyone
- Dhaniverse will never ask for this code via phone or email
- If you didn't request this code, please ignore this email

Once verified, you'll be able to:
- Learn banking and investment concepts through gameplay
- Practice stock trading in a safe environment
- Explore Web3 and blockchain technology
- Connect with friends and compete on leaderboards

Ready to start your financial education adventure? Enter the code above and let's begin!

© 2025 Dhaniverse. All rights reserved.
Building the future of financial education through gaming.
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
        <title>Welcome to Dhaniverse!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature-box { background: white; border-radius: 10px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Dhaniverse, ${username}!</h1>
                <p>Your Financial Gaming Adventure Starts Now!</p>
            </div>
            <div class="content">
                <h2>Congratulations! 🎮</h2>
                <p>You've successfully joined Dhaniverse, where learning finance is as fun as playing your favorite game!</p>

                <div class="feature-box">
                    <h3>🏦 Master Banking & Investing</h3>
                    <p>Learn real-world financial concepts through interactive gameplay. From savings accounts to stock trading, we've got you covered!</p>
                </div>

                <div class="feature-box">
                    <h3>🔗 Explore Web3 & Blockchain</h3>
                    <p>Ready for the future? Discover cryptocurrency, DeFi, and blockchain technology in a beginner-friendly way.</p>
                </div>

                <div class="feature-box">
                    <h3>👥 Connect & Compete</h3>
                    <p>Join a community of learners! Challenge friends, climb leaderboards, and share your financial journey.</p>
                </div>

                <div style="text-align: center;">
                    <a href="${
                        Deno.env.get("FRONTEND_URL") || "https://dhaniverse.in"
                    }" class="cta-button">Start Playing Now! 🚀</a>
                </div>

                <p><strong>Pro Tips for New Players:</strong></p>
                <ul>
                    <li>Start with the tutorial to learn the basics</li>
                    <li>Visit the bank to understand savings and interest</li>
                    <li>Try the stock market when you're ready to invest</li>
                    <li>Connect with friends for a more fun experience</li>
                </ul>

                <p>Need help? Our community is here to support you every step of the way!</p>
            </div>
            <div class="footer">
                <p>© 2025 Dhaniverse. All rights reserved.</p>
                <p>Building the future of financial education through gaming.</p>
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
Welcome to Dhaniverse, ${username}!

Congratulations! You've successfully joined Dhaniverse, where learning finance is as fun as playing your favorite game!

WHAT YOU CAN DO:
🏦 Master Banking & Investing
Learn real-world financial concepts through interactive gameplay. From savings accounts to stock trading, we've got you covered!

🔗 Explore Web3 & Blockchain
Ready for the future? Discover cryptocurrency, DeFi, and blockchain technology in a beginner-friendly way.

👥 Connect & Compete
Join a community of learners! Challenge friends, climb leaderboards, and share your financial journey.

PRO TIPS FOR NEW PLAYERS:
- Start with the tutorial to learn the basics
- Visit the bank to understand savings and interest
- Try the stock market when you're ready to invest
- Connect with friends for a more fun experience

Ready to start? Visit: ${
            Deno.env.get("FRONTEND_URL") || "https://dhaniverse.in"
        }

Need help? Our community is here to support you every step of the way!

© 2025 Dhaniverse. All rights reserved.
Building the future of financial education through gaming.
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
        <title>Reset Your Dhaniverse Password</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset</h1>
                <p>Dhaniverse Account Security</p>
            </div>
            <div class="content">
                <h2>Hello${username ? ` ${username}` : ""}!</h2>
                <p>We received a request to reset your Dhaniverse password. If you made this request, click the button below to create a new password:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="cta-button">Reset My Password 🔑</a>
                </div>

                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul>
                        <li>This link expires in 1 hour for security</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your current password remains unchanged until you create a new one</li>
                    </ul>
                </div>

                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${resetUrl}</p>

                <p>Having trouble? Contact our support team and we'll help you get back into your account.</p>
            </div>
            <div class="footer">
                <p>© 2025 Dhaniverse. All rights reserved.</p>
                <p>Building the future of financial education through gaming.</p>
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
Hello${username ? ` ${username}` : ""}!

We received a request to reset your Dhaniverse password. If you made this request, visit the link below to create a new password:

${resetUrl}

SECURITY NOTICE:
- This link expires in 1 hour for security
- If you didn't request this reset, please ignore this email
- Your current password remains unchanged until you create a new one

Having trouble? Contact our support team and we'll help you get back into your account.

© 2025 Dhaniverse. All rights reserved.
Building the future of financial education through gaming.
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
