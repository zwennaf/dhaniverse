import { create, verify, Payload } from "djwt";
import { config } from "../config/config.ts";

// Helper function to create JWT token
export async function createToken(
  userId: string,
  username?: string
): Promise<string> {
  const payload = {
    userId,
    username,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  };
  
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config.jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

// Helper function to verify JWT token
export async function verifyToken(token: string): Promise<Payload | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    return await verify(token, key);
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

// Decode JWT without verification (for debugging)
export function decodeToken(token: string): Payload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("JWT decoding error:", error);
    return null;
  }
}
