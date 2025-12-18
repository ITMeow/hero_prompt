'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import moment from 'moment';
import { PostCard } from './components/PostCard';
import { Header } from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { SocialPost } from './lib/types';
import { mapDbPostToSocialPost } from './lib/utils';

enum AppView {
  HOME = 'HOME',
  ADMIN = 'ADMIN',
  DETAIL = 'DETAIL'
}

export default function LandingClient() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'));

  useEffect(() => {
    fetchPosts(selectedDate);
  }, [selectedDate]);

  const fetchPosts = async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.map(mapDbPostToSocialPost));
      } else {
        console.error('Failed to fetch posts');
        // Fallback to seed posts if API fails (optional, or just show empty)
        // setPosts(SEED_POSTS); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePost = async (newPost: SocialPost) => {
    // Optimistic update or wait for API?
    // Let's call API.
    try {
      // Convert SocialPost back to DB shape (excluding ID as API generates it, but we might want to pass other fields)
      // Actually AdminPanel passes a SocialPost object with a generated ID.
      // We can send the relevant fields.
      const payload = {
        title: newPost.title,
        description: newPost.description,
        imageUrl: newPost.imageUrl,
        sourceUrl: newPost.sourceUrl,
        platform: newPost.platform,
        prompt: newPost.prompt,
        referenceImageUrl: newPost.referenceImageUrl,
        author: newPost.author,
        tags: newPost.tags ? newPost.tags.join(',') : '', // Convert array to string
        model: newPost.model,
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedPost = await res.json();
        setPosts((prev) => [mapDbPostToSocialPost(savedPost), ...prev]);
        setView(AppView.HOME);
      } else {
        alert('Failed to save post');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving post');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-[family-name:var(--font-manrope)] pt-20">
      {view === AppView.HOME && (
        <>
          <Header 
            onAdminClick={() => setView(AppView.ADMIN)} 
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
          
          <main className="px-4 md:px-8 max-w-7xl mx-auto pb-12">
            {loading ? (
               <div className="flex justify-center py-20">Loading...</div>
            ) : (
              /* Masonry Layout using CSS Columns */
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {posts.map((post) => (
                  <Link 
                    key={post.id} 
                    href={`/posts/${post.id}`}
                    className="break-inside-avoid block group"
                  >
                    <PostCard post={post} />
                  </Link>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {view === AppView.ADMIN && (
        <AdminPanel 
          onBack={() => setView(AppView.HOME)} 
          onSave={handleSavePost}
        />
      )}
    </div>
  );
}

