import { setRequestLocale } from 'next-intl/server';
import { getMetadata } from '@/shared/lib/seo';
import { PostPageClient } from './PostPageClient';

// Revalidate in seconds (1 hour)
export const revalidate = 3600;

// Generate dynamic metadata for each post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const metadataGenerator = getMetadata({
    title: `Prompt #${id} - Hero Prompt`,
    description: `View and customize AI prompt #${id} on Hero Prompt`,
    canonicalUrl: `/posts/${id}`,
  });
  return metadataGenerator({ params: Promise.resolve({ locale }) });
}

// Server Component Wrapper
async function PostPageContent({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PostPageClient params={params} />;
}

// Export the server component as default
export default PostPageContent;
