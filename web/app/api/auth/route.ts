import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy authentication requests to centralized auth API
 * Handles Google, Magic Link, and Internet Identity sign-in
 */
export async function POST(request: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.dhaniverse.in';
  
  try {
    const body = await request.json();
    const { provider, ...authData } = body;

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }

    // Map provider to correct endpoint
    const endpointMap: Record<string, string> = {
      google: '/auth/google',
      'magic-link-send': '/auth/magic-link/send',
      'magic-link-verify': '/auth/magic-link/verify',
      'internet-identity': '/auth/internet-identity',
    };

    const endpoint = endpointMap[provider];
    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Forward the request to the centralized auth API
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(authData),
    });

    const data = await response.json();
    
    // Create response with the same status
    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    // If authentication was successful and we got a Set-Cookie header,
    // forward it to set the cross-domain cookie
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader && data.success) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('Auth proxy failed:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}