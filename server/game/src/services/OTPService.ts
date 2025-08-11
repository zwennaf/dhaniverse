// OTP Service for managing one-time passwords
import { MongoDatabase } from '../db/mongo.ts';

interface OTPDocument {
  _id?: any;
  email: string;
  otp: string;
  hashedOTP: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
  purpose: 'email_verification' | 'password_reset' | 'login';
}

interface OTPGenerationOptions {
  length?: number;
  expiresInMinutes?: number;
  purpose?: 'email_verification' | 'password_reset' | 'login';
}

export class OTPService {
  private mongodb: MongoDatabase;
  private readonly MAX_ATTEMPTS = 3;
  private readonly DEFAULT_EXPIRY_MINUTES = 10;
  private readonly DEFAULT_OTP_LENGTH = 6;

  constructor(mongodb: MongoDatabase) {
    this.mongodb = mongodb;
  }

  /**
   * Generate a new OTP for the given email
   */
  async generateOTP(
    email: string, 
    options: OTPGenerationOptions = {}
  ): Promise<{ otp: string; expiresAt: Date }> {
    const {
      length = this.DEFAULT_OTP_LENGTH,
      expiresInMinutes = this.DEFAULT_EXPIRY_MINUTES,
      purpose = 'email_verification'
    } = options;

    // Generate random OTP
    const otp = this.generateRandomOTP(length);
    
    // Hash the OTP for storage
    const hashedOTP = await this.hashOTP(otp);
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // Invalidate any existing OTPs for this email and purpose
    await this.invalidateExistingOTPs(email, purpose);

    // Store the new OTP
    const otpDocument: OTPDocument = {
      email: email.toLowerCase(),
      otp: otp, // Store plain text for debugging (remove in production)
      hashedOTP,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: new Date(),
      purpose
    };

    try {
      const collection = this.mongodb.getCollection('otps');
      await collection.insertOne(otpDocument);
      
      console.log(`OTP generated for ${email} (${purpose}), expires at ${expiresAt}`);
      return { otp, expiresAt };
    } catch (error) {
      console.error('Failed to store OTP:', error);
      throw new Error('Failed to generate OTP');
    }
  }

  /**
   * Verify an OTP for the given email
   */
  async verifyOTP(
    email: string, 
    otp: string, 
    purpose: 'email_verification' | 'password_reset' | 'login' = 'email_verification'
  ): Promise<{ valid: boolean; message: string }> {
    try {
      const collection = this.mongodb.getCollection('otps');
      
      // Find the most recent OTP for this email and purpose
      const otpDoc = await collection.findOne(
        {
          email: email.toLowerCase(),
          purpose,
          verified: false,
          expiresAt: { $gt: new Date() }
        },
        { sort: { createdAt: -1 } }
      ) as OTPDocument | null;

      if (!otpDoc) {
        return {
          valid: false,
          message: 'OTP not found or expired. Please request a new one.'
        };
      }

      // Check if max attempts exceeded
      if (otpDoc.attempts >= this.MAX_ATTEMPTS) {
        await this.invalidateOTP(otpDoc._id);
        return {
          valid: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        };
      }

      // Increment attempt counter
      await collection.updateOne(
        { _id: otpDoc._id },
        { $inc: { attempts: 1 } }
      );

      // Verify the OTP
      const isValid = await this.compareOTP(otp, otpDoc.hashedOTP);
      
      if (isValid) {
        // Mark as verified and invalidate
        await collection.updateOne(
          { _id: otpDoc._id },
          { 
            $set: { 
              verified: true,
              verifiedAt: new Date()
            } 
          }
        );

        console.log(`OTP verified successfully for ${email} (${purpose})`);
        return {
          valid: true,
          message: 'OTP verified successfully'
        };
      } else {
        const remainingAttempts = this.MAX_ATTEMPTS - otpDoc.attempts;
        return {
          valid: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
        };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        valid: false,
        message: 'OTP verification failed. Please try again.'
      };
    }
  }

  /**
   * Check if an email has a valid, unverified OTP
   */
  async hasValidOTP(
    email: string, 
    purpose: 'email_verification' | 'password_reset' | 'login' = 'email_verification'
  ): Promise<boolean> {
    try {
      const collection = this.mongodb.getCollection('otps');
      
      const otpDoc = await collection.findOne({
        email: email.toLowerCase(),
        purpose,
        verified: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: this.MAX_ATTEMPTS }
      });

      return !!otpDoc;
    } catch (error) {
      console.error('Error checking valid OTP:', error);
      return false;
    }
  }

  /**
   * Get OTP expiry time for rate limiting
   */
  async getOTPExpiryTime(
    email: string, 
    purpose: 'email_verification' | 'password_reset' | 'login' = 'email_verification'
  ): Promise<Date | null> {
    try {
      const collection = this.mongodb.getCollection('otps');
      
      const otpDoc = await collection.findOne(
        {
          email: email.toLowerCase(),
          purpose,
          verified: false,
          expiresAt: { $gt: new Date() }
        },
        { sort: { createdAt: -1 } }
      ) as OTPDocument | null;

      return otpDoc ? otpDoc.expiresAt : null;
    } catch (error) {
      console.error('Error getting OTP expiry time:', error);
      return null;
    }
  }

  /**
   * Clean up expired OTPs (run periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const collection = this.mongodb.getCollection('otps');
      
      const result = await collection.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
      }

      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }

  /**
   * Generate a random numeric OTP
   */
  private generateRandomOTP(length: number): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  }

  /**
   * Hash an OTP using Web Crypto API
   */
  private async hashOTP(otp: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + Deno.env.get('OTP_SALT') || 'dhaniverse_otp_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Compare plain OTP with hashed OTP
   */
  private async compareOTP(plainOTP: string, hashedOTP: string): Promise<boolean> {
    const hashedInput = await this.hashOTP(plainOTP);
    return hashedInput === hashedOTP;
  }

  /**
   * Invalidate existing OTPs for email and purpose
   */
  private async invalidateExistingOTPs(
    email: string, 
    purpose: 'email_verification' | 'password_reset' | 'login'
  ): Promise<void> {
    try {
      const collection = this.mongodb.getCollection('otps');
      
      await collection.updateMany(
        {
          email: email.toLowerCase(),
          purpose,
          verified: false
        },
        {
          $set: { 
            verified: true, // Mark as verified to invalidate
            invalidatedAt: new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error invalidating existing OTPs:', error);
    }
  }

  /**
   * Invalidate a specific OTP by ID
   */
  private async invalidateOTP(otpId: any): Promise<void> {
    try {
      const collection = this.mongodb.getCollection('otps');
      
      await collection.updateOne(
        { _id: otpId },
        {
          $set: { 
            verified: true,
            invalidatedAt: new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error invalidating OTP:', error);
    }
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOTPStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    totalVerified: number;
    byPurpose: Record<string, number>;
  }> {
    try {
      const collection = this.mongodb.getCollection('otps');
      const now = new Date();

      const [totalActive, totalExpired, totalVerified, byPurpose] = await Promise.all([
        collection.countDocuments({
          verified: false,
          expiresAt: { $gt: now }
        }),
        collection.countDocuments({
          expiresAt: { $lt: now }
        }),
        collection.countDocuments({
          verified: true
        }),
        collection.aggregate([
          {
            $group: {
              _id: '$purpose',
              count: { $sum: 1 }
            }
          }
        ]).toArray()
      ]);

      const purposeStats: Record<string, number> = {};
      byPurpose.forEach((item: any) => {
        purposeStats[item._id] = item.count;
      });

      return {
        totalActive,
        totalExpired,
        totalVerified,
        byPurpose: purposeStats
      };
    } catch (error) {
      console.error('Error getting OTP stats:', error);
      return {
        totalActive: 0,
        totalExpired: 0,
        totalVerified: 0,
        byPurpose: {}
      };
    }
  }
}