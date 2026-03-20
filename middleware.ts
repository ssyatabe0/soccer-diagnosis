import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // /admin 配下のみ認証必須
  const basicAuth = request.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    const validUser = process.env.ADMIN_USER || 'admin';
    const validPass = process.env.ADMIN_PASSWORD || 'admin';

    if (user === validUser && pwd === validPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin"',
    },
  });
}

// /admin 配下のみに適用
export const config = {
  matcher: ['/admin/:path*'],
};
