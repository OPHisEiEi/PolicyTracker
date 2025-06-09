import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/app/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; 
  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  for (const ext of ['jpg', 'png'] as const) {
    try {
      const url = await getDownloadURL(ref(storage, `policy/banner/${id}.${ext}`));
      return new NextResponse(url, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (err) {
    
    }
  }

  return new NextResponse('Banner not found', { status: 404 });
}
