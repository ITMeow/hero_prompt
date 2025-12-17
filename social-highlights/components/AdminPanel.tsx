import React, { useState } from 'react';
import { ArrowLeft, Loader2, Save, X } from 'lucide-react';
import { SocialPost } from '../types';
import { extractPostInfo } from '../services/geminiService';
import { savePost } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface AdminPanelProps {
  onBack: () => void;
  onPostSaved: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onPostSaved }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<SocialPost> | null>(null);

  const handleExtract = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const info = await extractPostInfo(url);
      setExtractedData(info);
    } catch (e) {
      alert("Failed to extract info. Please check the API Key or try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    
    const newPost: SocialPost = {
      id: uuidv4(),
      title: extractedData.title || '',
      description: extractedData.description || '',
      imageUrl: extractedData.imageUrl || 'https://picsum.photos/600/400',
      sourceUrl: extractedData.sourceUrl || url,
      platform: extractedData.platform || 'other',
      stats: {
        views: extractedData.stats?.views || '0',
        likes: extractedData.stats?.likes || '0',
        timeAgo: extractedData.stats?.timeAgo || 'Now'
      },
      createdAt: Date.now()
    };

    await savePost(newPost);
    onPostSaved();
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={20} className="mr-2" /> Back to Home
      </button>

      <div className="bg-white rounded-3xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Add New Highlight</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Social Media Link (X or Xiaohongshu)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/servasyy_ai/status/..."
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#FFEA00] transition-colors"
            />
            <button 
              onClick={handleExtract}
              disabled={loading || !url}
              className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : 'Analyze'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Uses Gemini 2.5 Flash with Grounding to attempt extraction.
          </p>
        </div>

        {extractedData && (
          <div className="border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-bold mb-4">Preview & Edit</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Title</label>
                <input 
                  value={extractedData.title} 
                  onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-[#FFEA00] font-bold text-gray-900" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Views</label>
                 <input 
                  value={extractedData.stats?.views} 
                  onChange={(e) => setExtractedData({...extractedData, stats: {...extractedData.stats!, views: e.target.value}})}
                  className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-[#FFEA00] text-gray-900" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</label>
                <textarea 
                  value={extractedData.description}
                  onChange={(e) => setExtractedData({...extractedData, description: e.target.value})}
                  rows={2}
                  className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-[#FFEA00] text-gray-900 resize-none"
                />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Image URL (Auto-generated placeholder if extraction fails)</label>
                 <input 
                  value={extractedData.imageUrl}
                  onChange={(e) => setExtractedData({...extractedData, imageUrl: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-[#FFEA00] text-gray-500 text-sm"
                />
              </div>
            </div>

            {/* Visual Preview */}
            <div className="bg-gray-50 p-4 rounded-2xl mb-6 flex justify-center">
                <div className="w-64 bg-white rounded-2xl shadow-lg overflow-hidden pointer-events-none transform scale-90">
                    <img src={extractedData.imageUrl} className="w-full h-32 object-cover" alt="Preview"/>
                    <div className="p-4">
                        <h4 className="font-bold text-sm mb-1">{extractedData.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2">{extractedData.description}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setExtractedData(null)} className="px-6 py-3 rounded-xl font-medium text-gray-500 hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-[#FFEA00] text-slate-900 px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#FFEA00]/30 hover:shadow-[#FFEA00]/50 transform active:scale-95 transition-all flex items-center gap-2">
                <Save size={18} />
                Save to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};