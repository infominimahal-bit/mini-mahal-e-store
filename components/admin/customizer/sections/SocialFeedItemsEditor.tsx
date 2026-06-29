'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, Loader2, Play } from '@/components/common/Icons';
import { toast } from 'sonner';

interface SocialFeedItemsEditorProps {
  items: any[];
  onChangeItems: (newItems: any[]) => void;
  onSelectMedia: (onSelect: (url: string) => void) => void;
}

export default function SocialFeedItemsEditor({
  items = [],
  onChangeItems,
  onSelectMedia
}: SocialFeedItemsEditorProps) {
  // Temporary states for new feed item
  const [tempFeedUsername, setTempFeedUsername] = useState('');
  const [tempFeedLink, setTempFeedLink] = useState('');
  const [tempFeedImageUrl, setTempFeedImageUrl] = useState('');
  const [tempFeedCaption, setTempFeedCaption] = useState('');
  const [tempFeedVideoUrl, setTempFeedVideoUrl] = useState('');
  const [tempFeedPlatform, setTempFeedPlatform] = useState('auto'); // 'auto', 'youtube', 'tiktok', 'instagram', 'facebook', 'vimeo', 'direct'
  const [fetchingThumbnail, setFetchingThumbnail] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const getDetectedPlatform = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.toLowerCase();
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'YouTube';
    if (cleanUrl.includes('instagram.com')) return 'Instagram';
    if (cleanUrl.includes('tiktok.com')) return 'TikTok';
    if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) return 'Facebook';
    if (cleanUrl.includes('vimeo.com')) return 'Vimeo';
    if (cleanUrl.match(/\.(mp4|webm|ogg|mov)(?:\?|$)/i)) return 'Direct Video';
    return 'Video Link';
  };

  // Debounced API call for thumbnail fetching
  React.useEffect(() => {
    if (!isUserTyping || !tempFeedVideoUrl.trim()) return;

    const timer = setTimeout(async () => {
      const cleanUrl = tempFeedVideoUrl.toLowerCase();
      const isAutoFetch = cleanUrl.includes('youtube.com') || 
                           cleanUrl.includes('youtu.be') || 
                           cleanUrl.includes('tiktok.com') || 
                           cleanUrl.includes('vimeo.com');

      if (!isAutoFetch) {
        if (cleanUrl.includes('instagram.com') || cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
          toast.info('Instagram/Facebook links require manual thumbnail selection.');
        }
        return;
      }

      setFetchingThumbnail(true);
      try {
        const response = await fetch('/api/cache-thumbnail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoUrl: tempFeedVideoUrl }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setTempFeedImageUrl(data.url);
            toast.success('Video thumbnail auto-fetched!');
          } else {
            toast.error('Failed to resolve thumbnail from video link.');
          }
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.error || 'Failed to fetch video thumbnail.');
        }
      } catch (err) {
        console.error('Failed to auto-fetch video thumbnail:', err);
        toast.error('Network error fetching thumbnail.');
      } finally {
        setFetchingThumbnail(false);
      }
    }, 800); // 800ms debounce delay

    return () => clearTimeout(timer);
  }, [tempFeedVideoUrl, isUserTyping]);

  const handleVideoUrlChange = (url: string) => {
    setIsUserTyping(true);
    setTempFeedVideoUrl(url);
  };

  const resetForm = () => {
    setEditingItemId(null);
    setTempFeedImageUrl('');
    setTempFeedUsername('');
    setTempFeedLink('');
    setTempFeedCaption('');
    setTempFeedVideoUrl('');
    setTempFeedPlatform('auto');
    setIsUserTyping(false);
  };

  const handleEditItemSelect = (item: any) => {
    setEditingItemId(item.id || item.imageUrl);
    setTempFeedUsername(item.username);
    setTempFeedLink(item.link);
    setTempFeedImageUrl(item.imageUrl);
    setTempFeedCaption(item.caption || '');
    setTempFeedVideoUrl(item.videoUrl || '');
    setTempFeedPlatform(item.platform || 'auto');
    setIsUserTyping(false);
  };

  const handleSaveEditedItem = () => {
    if (!tempFeedImageUrl) return toast.error('Image is required');
    if (!tempFeedUsername.trim()) return toast.error('Username is required');
    if (!tempFeedLink.trim()) return toast.error('Link is required');

    const updatedItems = items.map((item) => {
      const matchId = item.id || item.imageUrl;
      if (matchId === editingItemId) {
        return {
          ...item,
          imageUrl: tempFeedImageUrl,
          username: tempFeedUsername.trim(),
          link: tempFeedLink.trim(),
          caption: tempFeedCaption.trim(),
          videoUrl: tempFeedVideoUrl.trim() || undefined,
          videoAutoplay: true, // Default to true always
          platform: tempFeedPlatform !== 'auto' ? tempFeedPlatform : undefined
        };
      }
      return item;
    });

    onChangeItems(updatedItems);
    resetForm();
    toast.success('Social post item updated!');
  };

  const handleAddSocialFeedItem = () => {
    if (!tempFeedImageUrl) return toast.error('Image is required');
    if (!tempFeedUsername.trim()) return toast.error('Username is required');
    if (!tempFeedLink.trim()) return toast.error('Link is required');

    const newItem = {
      id: Date.now().toString(),
      imageUrl: tempFeedImageUrl,
      username: tempFeedUsername.trim(),
      link: tempFeedLink.trim(),
      caption: tempFeedCaption.trim(),
      videoUrl: tempFeedVideoUrl.trim() || undefined,
      videoAutoplay: true, // Default to true always
      platform: tempFeedPlatform !== 'auto' ? tempFeedPlatform : undefined
    };

    onChangeItems([...items, newItem]);
    resetForm();
    toast.success('Social post item added!');
  };

  const handleDeleteSocialFeedItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeItems(items.filter((item: any) => (item.id || item.imageUrl) !== id));
    if (editingItemId === id) {
      resetForm();
    }
    toast.success('Social post item removed!');
  };

  const detectedPlatform = getDetectedPlatform(tempFeedVideoUrl);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-[#0f0f1b] space-y-4">
      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Configure Post Items</h4>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Step 1: Image Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Step 1: Post Image / Thumbnail</label>
          <div className="flex items-center gap-3">
            {tempFeedImageUrl ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-750 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tempFeedImageUrl} alt="Post preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setTempFeedImageUrl('')}
                  className="absolute inset-0 bg-black/55 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectMedia((url) => setTempFeedImageUrl(url))}
                className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#e94560] cursor-pointer transition-colors bg-white dark:bg-[#16162a] flex-shrink-0"
              >
                {fetchingThumbnail ? (
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                )}
              </button>
            )}
            <div className="text-[10px] text-gray-400 flex flex-col justify-center leading-normal">
              {fetchingThumbnail ? (
                <span className="text-[#e94560] font-bold">Fetching video thumbnail...</span>
              ) : (
                <>
                  <span>Select an image from Media Library, or paste a direct image URL below.</span>
                  <span>Thumbnails from YouTube/TikTok/Vimeo fetch automatically when you paste the video link.</span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Or paste direct image URL (e.g. copied image address from Instagram/Facebook)"
              value={tempFeedImageUrl}
              onChange={(e) => setTempFeedImageUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Username / Account Name</label>
            <input
              type="text"
              placeholder="e.g. OurStore"
              value={tempFeedUsername}
              onChange={(e) => setTempFeedUsername(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Redirect Link Target</label>
            <input
              type="text"
              placeholder="e.g. https://instagram.com/p/..."
              value={tempFeedLink}
              onChange={(e) => setTempFeedLink(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Caption (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Elegant eastern style wear"
              value={tempFeedCaption}
              onChange={(e) => setTempFeedCaption(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Video Platform</label>
              <select
                value={tempFeedPlatform}
                onChange={(e) => setTempFeedPlatform(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
              >
                <option value="auto">Auto-Detect</option>
                <option value="youtube">YouTube / Shorts</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="vimeo">Vimeo</option>
                <option value="direct">Direct Video (.mp4, etc.)</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Video Link (Optional)</label>
                {tempFeedPlatform === 'auto' && detectedPlatform && (
                  <span className="text-[9px] bg-[#e94560]/10 text-[#e94560] px-1.5 py-0.5 rounded font-black uppercase">
                    {detectedPlatform}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={
                  tempFeedPlatform === 'youtube' ? "Paste YouTube Link" :
                  tempFeedPlatform === 'tiktok' ? "Paste TikTok Link" :
                  tempFeedPlatform === 'instagram' ? "Paste Instagram Link" :
                  tempFeedPlatform === 'facebook' ? "Paste Facebook Link" :
                  tempFeedPlatform === 'vimeo' ? "Paste Vimeo Link" :
                  tempFeedPlatform === 'direct' ? "Paste Direct Video Link (.mp4)" :
                  "Paste YouTube, TikTok, Facebook, or mp4 URL"
                }
                value={tempFeedVideoUrl}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
              />
            </div>
          </div>



          {editingItemId ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEditedItem}
                className="flex items-center justify-center gap-1.5 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center justify-center gap-1.5 bg-gray-250 dark:bg-white/10 hover:bg-gray-300 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddSocialFeedItem}
              className="flex items-center justify-center gap-1.5 w-full bg-[#1a1a2e] dark:bg-[#e94560] hover:bg-[#e94560] text-white py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add Post Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Feed items preview row */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block mb-2">Feed Preview ({items.length} items)</label>
        <div className="grid grid-cols-4 gap-2">
          {items.map((item, idx) => {
            const itemId = item.id || item.imageUrl;
            const isEditing = editingItemId === itemId;
            return (
              <div 
                key={itemId || idx} 
                onClick={() => handleEditItemSelect(item)}
                className={`relative group aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                  isEditing 
                    ? 'border-[#e94560] ring-2 ring-[#e94560]/20 scale-[0.98]' 
                    : 'border-gray-250 dark:border-gray-800 hover:scale-[1.02]'
                }`}
              >
                {item.videoUrl && (
                  <div className="absolute top-1.5 left-1.5 bg-[#e94560] text-white p-1 rounded-full shadow z-10">
                    <Play className="w-2.5 h-2.5 fill-current translate-x-[0.5px]" />
                  </div>
                )}
                {isEditing && (
                  <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                    EDITING
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt="Social post" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/75 flex flex-col justify-between p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSocialFeedItem(itemId, e)}
                    className="self-end text-red-500 hover:text-red-400 p-1 bg-white/10 rounded-md cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-white truncate">@{item.username}</p>
                    {item.caption && <p className="text-[7px] text-gray-300 truncate">{item.caption}</p>}
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full text-center py-4 text-[10px] text-gray-400">
              No feed posts added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
