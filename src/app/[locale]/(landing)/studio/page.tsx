'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminPanel } from '../_social-highlights/components/AdminPanel';

export default function StudioPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  const handleSaved = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pt-24">
      <AdminPanel onBack={handleBack} onPostSaved={handleSaved} />
    </div>
  );
}
