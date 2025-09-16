import { create, verify, Payload } from "djwt";
import { Context } from "oak";
import { config } from "../config/config.ts";

export interface AuthTokenPayload extends Payload {
  userId: string;
  email: string;
  gameUsername?: string;
  provider: string;
  sessionId: string;
}

// Helper function to create JWT token with cross-domain compatibility
export async function createToken(
  userId: string,
  email: string,
  gameUsername?: string,
  provider: string = 'magic-link',
  sessionId?: string
): Promise<string> {
  const payload: AuthTokenPayload = {
    userId,
    email,
    gameUsername,
    provider,
    sessionId: sessionId || crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
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
export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const payload = await verify(token, key) as AuthTokenPayload;
    return payload;
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

// Cross-domain cookie utilities
export function setCrossDomainAuthCookie(ctx: Context, token: string, maxAge: number = 24 * 60 * 60) {
  const domain = config.isDev ? 'localhost' : '.dhaniverse.in';
  const secure = config.isDev ? '' : '; Secure';
  const sameSite = config.isDev ? '; SameSite=Lax' : '; SameSite=Lax';
  
  const cookie = `dhaniverse_auth=${token}; Domain=${domain}; Path=/; HttpOnly; Max-Age=${maxAge}${secure}${sameSite}`;
  ctx.response.headers.append("Set-Cookie", cookie);
}

export function clearCrossDomainAuthCookie(ctx: Context) {
  const domain = config.isDev ? 'localhost' : '.dhaniverse.in';
  const secure = config.isDev ? '' : '; Secure';
  const sameSite = config.isDev ? '; SameSite=Lax' : '; SameSite=Lax';
  
  const cookie = `dhaniverse_auth=; Domain=${domain}; Path=/; HttpOnly; Max-Age=0${secure}${sameSite}`;
  ctx.response.headers.append("Set-Cookie", cookie);
}

export function getCrossDomainAuthToken(ctx: Context): string | null {
  // First check for dhaniverse_auth cookie
  const cookieHeader = ctx.request.headers.get("cookie") || "";
  let match = cookieHeader.match(/dhaniverse_auth=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  
  // Fallback to legacy session cookie
  match = cookieHeader.match(/session=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  
  // Check Authorization header as final fallback
  const authHeader = ctx.request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  return null;
}
