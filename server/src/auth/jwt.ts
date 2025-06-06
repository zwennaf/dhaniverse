import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { config } from "../config/config.ts";

// Helper function to create JWT token
export async function createToken(userId: string): Promise<string> {
  const payload = {
    userId,
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
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const payload = await verify(token, key);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}
