'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PostCard } from './components/PostCard';
import { getAllPosts, savePost } from './lib/db';
import { SocialPost } from './lib/types';
import { v4 as uuidv4 } from 'uuid';

// Seed data for initial look
const SEED_POSTS: SocialPost[] = [
  {
    id: uuidv4(),
    title: "Kobe's Explosive Breakthrough",
    description: "A holographic collectible card design featuring Kobe Bryant in a Lakers jersey performing a slam dunk.",
    prompt: "Generate for player: [Kobe Bryant]\n\nYou are an AI image generation agent and elite NBA collectible card visual designer.\n\nCORE INSTRUCTION (VERY IMPORTANT):\nWhen the user inputs an NBA player's name, you MUST:\n- Internally construct a complete, professional image-generation prompt\n- IMMEDIATELY generate the image\n- Return a high quality holographic card design",
    imageUrl: "https://picsum.photos/seed/kobe/600/800",
    sourceUrl: "#",
    platform: 'x',
    author: "@MANISH1027512",
    stats: { views: "125k", likes: "256", timeAgo: "2h ago" },
    tags: ["Cinematic", "Dynamic", "Digital Art", "Realistic", "Dramatic", "Explosive", "Holographic"],
    model: "Nano Banana Pro",
    aspectRatio: "3:4",
    createdAt: Date.now()
  },
  {
    id: uuidv4(),
    title: "Fluid Art Exhibition",
    description: "Immersive digital art experience 'Dreamscape' opens invites in the West West Museum.",
    prompt: "A mesmerizing fluid art abstract composition, swirling colors of neon blue, magenta, and gold, high gloss finish, 8k resolution, macro photography style.",
    imageUrl: "https://picsum.photos/seed/art/600/400",
    sourceUrl: "#",
    platform: 'other',
    stats: { views: "8.2k", likes: "120", timeAgo: "4h ago" },
    tags: ["Abstract", "Fluid", "Neon", "Art"],
    createdAt: Date.now() - 10000
  },
  {
    id: uuidv4(),
    title: "Perfect Soufflé Pancake",
    description: "Fluffy like clouds! The secret lies in the meringue temperature.",
    prompt: "Close up food photography of fluffy soufflé pancakes with syrup dripping down, powdered sugar, fresh strawberries, soft natural lighting, cafe atmosphere.",
    imageUrl: "https://picsum.photos/seed/food/600/600",
    sourceUrl: "#",
    platform: 'xiaohongshu',
    stats: { views: "156k", likes: "921", timeAgo: "1d ago" },
    tags: ["Food", "Photography", "Dessert"],
    aspectRatio: "1:1",
    createdAt: Date.now() - 20000
  },
  {
    id: uuidv4(),
    title: "Winter Alpine Portrait",
    description: "Hyper-realistic, ultra-detailed DSLR cinematic portrait of a young man.",
    prompt: "Hyper-realistic, ultra-detailed DSLR cinematic portrait of a young man with a slight beard in a winter alpine setting, snow falling gently, warm coat, golden hour lighting.",
    imageUrl: "https://picsum.photos/seed/winter/600/700",
    sourceUrl: "#",
    platform: 'x',
    stats: { views: "1.2M", likes: "45k", timeAgo: "11m ago" },
    tags: ["Portrait", "Winter", "Realistic", "Cinematic"],
    createdAt: Date.now() - 5000
  },
  {
    id: uuidv4(),
    title: "Hidden Beach Escape",
    description: "Escape the cold! The untamed practices offer crystal clear waters.",
    prompt: "Aerial view of a secluded tropical beach with crystal clear turquoise water, white sand, palm trees, no people, paradise, high saturation.",
    imageUrl: "https://picsum.photos/seed/beach/600/400",
    sourceUrl: "#",
    platform: 'other',
    stats: { views: "46k", likes: "1.2k", timeAgo: "4m ago" },
    tags: ["Travel", "Nature", "Beach"],
    aspectRatio: "16:9",
    createdAt: Date.now() - 30000
  },
  {
    id: uuidv4(),
    title: "Minimalist Workspace",
    description: "A clean and productive workspace setup with white desk and plants.",
    prompt: "Minimalist workspace setup, white desk, macbook pro, potted plant, soft daylight, clean composition, architectural digest style.",
    imageUrl: "https://picsum.photos/seed/desk/600/900",
    sourceUrl: "#",
    platform: 'x',
    stats: { views: "500k", likes: "2.2k", timeAgo: "38m ago" },
    tags: ["Interior", "Minimalist", "Tech"],
    createdAt: Date.now() - 40000
  }
];

export default function LandingClient() {
  const [posts, setPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      let storedPosts = await getAllPosts();
      if (storedPosts.length === 0) {
        // Initialize with seed data if DB is empty
        for (const post of SEED_POSTS) {
          await savePost(post);
        }
        storedPosts = await getAllPosts();
      }
      setPosts(storedPosts);
    } catch (error) {
      console.error("Failed to load posts:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <main className="px-4 md:px-8 max-w-7xl mx-auto pb-12 pt-28">
        {/* Masonry Layout using CSS Columns */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {posts.map((post) => (
            <Link 
              key={post.id} 
              href={`/posts/${post.id}`}
              className="break-inside-avoid block mb-6 group"
            >
              <div className="bg-white rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100/50">
                <PostCard post={post} />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

