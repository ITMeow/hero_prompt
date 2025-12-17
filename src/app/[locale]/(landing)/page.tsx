import { setRequestLocale } from 'next-intl/server';
import LandingClient from './_social-highlights/LandingClient';

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandingClient />;
}