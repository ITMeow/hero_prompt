import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret');
    
    // Validate the secret to ensure the request is from our Supabase Webhook
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    const payload = await req.json();
    console.log('Revalidate payload:', payload);

    // Supabase Webhook payload structure:
    // { type: 'INSERT' | 'UPDATE', table: 'tableName', record: { ... }, schema: 'public', ... }
    
    if (payload.table === 'landing_post') {
      const postId = payload.record?.id;
      
      // 1. Revalidate the specific post page
      if (postId) {
        console.log(`Revalidating post: ${postId}`);
        revalidatePath(`/posts/${postId}`);
        revalidatePath(`/[locale]/posts/${postId}`, 'page'); // Handle i18n paths
      }

      // 2. Revalidate the posts list (cache tag 'posts')
      console.log('Revalidating posts tag');
      revalidateTag('posts', 'max');
      
      // 3. Revalidate the home page
      revalidatePath('/');
      revalidatePath('/[locale]', 'page');

      return NextResponse.json({ revalidated: true, postId });
    }

    return NextResponse.json({ message: 'No action taken' });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
