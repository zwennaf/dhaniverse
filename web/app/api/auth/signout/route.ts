import { NextRequest, NextResponse } from 'next/server';

/**
 * Sign out and clear session cookie
 * This route proxies to the centralized auth API
 */
export async function POST(request: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.dhaniverse.in';
  
  try {
    // Forward the request to the centralized auth API with cookies
    const response = await fetch(`${apiBase}/auth/signout`, {
      method: 'POST',
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

    // Clear the auth cookie for .dhaniverse.in domain
    nextResponse.cookies.set('dhaniverse_auth', '', {
      domain: '.dhaniverse.in',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Delete the cookie
      path: '/',
    });

    // Forward any additional set-cookie headers from the auth API
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('Signout failed:', error);
    
    // Even if the API call fails, clear the local cookie
    const nextResponse = NextResponse.json(
      { success: true, message: 'Signed out locally' },
      { status: 200 }
    );

    nextResponse.cookies.set('dhaniverse_auth', '', {
      domain: '.dhaniverse.in',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return nextResponse;
  }
}