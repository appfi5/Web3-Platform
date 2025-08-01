import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

import { env } from '~/env';

interface RequestBody {
  email: string;
  plan: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { email, plan } = body;

    if (!email) {
      return NextResponse.json({ message: 'email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(`Email is invalid: ${email}`, { status: 400 });
    }

    if (!plan) {
      return NextResponse.json({ message: 'plan is required' }, { status: 400 });
    }

    const payload: { email: string; plan: string } = {
      email,
      plan,
    };

    const secretKey: string = env?.TOKEN_SECRET_KEY || '';
    const accessToken = jwt.sign(payload, secretKey, { expiresIn: '1h' });

    return NextResponse.json({ email, accessToken }, { status: 200 });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
