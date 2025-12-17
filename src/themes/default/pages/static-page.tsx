import { Post as PostType } from '@/shared/types/blocks/blog';
import { PageDetail } from '@/themes/default/blocks';

export default async function StaticPage({
  locale,
  post,
}: {
  locale?: string;
  post: PostType;
}) {
  return <PageDetail post={post} />;
}
