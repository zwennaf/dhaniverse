// Magic Link Service for passwordless authentication
import { ObjectId } from "mongodb";
import { mongodb } from "../db/mongo.ts";
import { EmailService } from "./EmailService.ts";
import { createToken } from "../auth/jwt.ts";
import type { UserDocument } from "../db/schemas.ts";

interface MagicLinkData {
    token: string;
    email: string;
    userId?: string;
    expiresAt: Date;
    used: boolean;
    purpose: 'signin' | 'signup';
}

interface MagicLinkRequest {
    email: string;
    purpose?: 'signin' | 'signup';
    gameUsername?: string;
    selectedCharacter?: string;
}

export class MagicLinkService {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Generate a secure random token
     */
    private generateSecureToken(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Send magic link for sign in/sign up
     */
    async sendMagicLink(data: MagicLinkRequest): Promise<{
        success: boolean;
        message: string;
        expiresAt?: Date;
    }> {
        try {
            const { email, purpose = 'signin', gameUsername, selectedCharacter } = data;

            // Check if user exists
            const existingUser = await mongodb.findUserByEmail(email);
            
            // Determine the actual purpose based on user existence
            const actualPurpose = existingUser ? 'signin' : 'signup';

            // Generate secure token
            const token = this.generateSecureToken();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store magic link in database
            const magicLinks = mongodb.getCollection('magic_links');
            const magicLinkDoc: MagicLinkData = {
                token,
                email: email.toLowerCase(),
                userId: existingUser?.id,
                expiresAt,
                used: false,
                purpose: actualPurpose
            };

            await magicLinks.insertOne(magicLinkDoc);

            // Send email
            const emailSent = await this.emailService.sendMagicLinkEmail({
                to: email,
                token,
                purpose: actualPurpose,
                gameUsername: existingUser?.gameUsername || gameUsername,
                expiresIn: 15
            });

            if (!emailSent) {
                return {
                    success: false,
                    message: "Failed to send magic link email. Please try again."
                };
            }

            return {
                success: true,
                message: actualPurpose === 'signin' 
                    ? "Magic link sent! Check your email to sign in."
                    : "Magic link sent! Check your email to create your account.",
                expiresAt
            };

        } catch (error) {
            console.error('Send magic link error:', error);
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    /**
     * Verify and consume magic link
     */
    async verifyMagicLink(token: string): Promise<{
        success: boolean;
        message: string;
        user?: any;
        authToken?: string;
        isNewUser?: boolean;
    }> {
        try {
            const magicLinks = mongodb.getCollection('magic_links');
            
            // Find the magic link
            const magicLink = await magicLinks.findOne({
                token,
                used: false,
                expiresAt: { $gt: new Date() }
            });

            if (!magicLink) {
                return {
                    success: false,
                    message: "Invalid or expired magic link. Please request a new one."
                };
            }

            // Mark as used
            await magicLinks.updateOne(
                { _id: magicLink._id },
                { $set: { used: true } }
            );

            let user: any;
            let isNewUser = false;

            if (magicLink.purpose === 'signin' && magicLink.userId) {
                // Sign in existing user
                const users = mongodb.getCollection<UserDocument>("users");
                const userDoc = await users.findOne({
                    _id: new ObjectId(magicLink.userId)
                });

                if (!userDoc) {
                    return {
                        success: false,
                        message: "User not found"
                    };
                }

                user = {
                    id: userDoc._id?.toString() || "",
                    email: userDoc.email,
                    gameUsername: userDoc.gameUsername,
                    selectedCharacter: userDoc.selectedCharacter || "C2"
                };

                // Update last login
                await users.updateOne(
                    { _id: userDoc._id },
                    { $set: { lastLoginAt: new Date() } }
                );

            } else if (magicLink.purpose === 'signup') {
                // Create new user
                const defaultGameUsername = magicLink.email.split("@")[0] + "_" + Math.floor(Math.random() * 1000);
                
                // Ensure unique username
                let gameUsername = defaultGameUsername;
                let counter = 1;
                while (await mongodb.findUserByGameUsername(gameUsername)) {
                    gameUsername = defaultGameUsername + "_" + counter;
                    counter++;
                }

                const newUser = await mongodb.createUser({
                    email: magicLink.email,
                    passwordHash: "", // No password for magic link users
                    gameUsername,
                    selectedCharacter: "C2",
                    createdAt: new Date()
                });

                // Create initial player state
                await mongodb.createInitialPlayerState(newUser.id);

                // Send welcome email
                await this.emailService.sendWelcomeEmail(magicLink.email, gameUsername);

                user = {
                    id: newUser.id,
                    email: newUser.email,
                    gameUsername: newUser.gameUsername,
                    selectedCharacter: newUser.selectedCharacter || "C2"
                };

                isNewUser = true;
            }

            // Generate JWT token
            const authToken = await createToken(user.id, user.gameUsername);

            return {
                success: true,
                message: isNewUser ? "Account created successfully!" : "Signed in successfully!",
                user,
                authToken,
                isNewUser
            };

        } catch (error) {
            console.error('Verify magic link error:', error);
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    /**
     * Clean up expired magic links
     */
    async cleanupExpiredLinks(): Promise<number> {
        try {
            const magicLinks = mongodb.getCollection('magic_links');
            const result = await magicLinks.deleteMany({
                expiresAt: { $lt: new Date() }
            });
            return result.deletedCount || 0;
        } catch (error) {
            console.error('Cleanup expired magic links error:', error);
            return 0;
        }
    }

    /**
     * Get magic link statistics
     */
    async getMagicLinkStats(): Promise<{
        total: number;
        active: number;
        expired: number;
        used: number;
    }> {
        try {
            const magicLinks = mongodb.getCollection('magic_links');
            const now = new Date();

            const [total, active, expired, used] = await Promise.all([
                magicLinks.countDocuments({}),
                magicLinks.countDocuments({ used: false, expiresAt: { $gt: now } }),
                magicLinks.countDocuments({ expiresAt: { $lt: now } }),
                magicLinks.countDocuments({ used: true })
            ]);

            return { total, active, expired, used };
        } catch (error) {
            console.error('Get magic link stats error:', error);
            return { total: 0, active: 0, expired: 0, used: 0 };
        }
    }
}
