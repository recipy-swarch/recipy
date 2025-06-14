// src/app/api/image/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';

interface Props {
  params: {
    path: string[]
  }
}

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  const backendBaseUrl = process.env.API_GATEWAY_URL;
  if (!backendBaseUrl) return NextResponse.error();

  // params.path ya es string[]
  const imagePath = params.path.join('/');

  // Construye la URL al Gateway
  const url = `${backendBaseUrl}/${imagePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  // Devuelve el buffer con headers
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
