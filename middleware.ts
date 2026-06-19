import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // /admin 配下のみ認証必須
  const basicAuth = request.headers.get('authorization');
  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return new NextResponse('管理画面の認証情報が未設定です', {
      status: 503,
    });
  }

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

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
