import { NextResponse } from 'next/server';

import { env } from '~/env';

const CKB_EXPLORER_API_PREFIX = env.CKB_EXPLORER_API_PREFIX;

export async function GET(req: Request) {
  const pathname = new URL(req.url).pathname.replace('/api/legacy', '');
  const url = CKB_EXPLORER_API_PREFIX + pathname;

  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json' },
  });

  return NextResponse.json(await res.json());
}

export async function POST(req: Request) {
  const pathname = new URL(req.url).pathname.replace('/api/legacy', '');
  const url = CKB_EXPLORER_API_PREFIX + pathname;

  const res = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: await req.text(),
  });

  return NextResponse.json(await res.json());
}

export async function PUT(req: Request) {
  const pathname = new URL(req.url).pathname.replace('/api/legacy', '');
  const url = CKB_EXPLORER_API_PREFIX + pathname;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json' },
    body: await req.text(),
  });

  return NextResponse.json(await res.json());
}
