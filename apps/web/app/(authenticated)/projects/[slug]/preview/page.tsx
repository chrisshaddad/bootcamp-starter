import { redirect } from 'next/navigation';

export default async function LegacyProjectPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: projectId } = await params;
  redirect(`/projects/preview/${projectId}`);
}
