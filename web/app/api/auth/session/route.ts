import { NextRequest, NextResponse } from 'next/server';

/**
 * Get current session from HTTP-only cookie
 * This route proxies to the centralized auth API
 */
export async function GET(request: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.dhaniverse.in';
  
  try {
    // Forward the request to the centralized auth API with cookies
    const response = await fetch(`${apiBase}/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Create response with the same status
    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    // Forward any set-cookie headers from the auth API
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('Session check failed:', error);
    return NextResponse.json(
      { success: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}