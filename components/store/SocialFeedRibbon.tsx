'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { StoreSettings } from '@/lib/types';
import { Play, YoutubeIcon, InstagramIcon, FacebookIcon, TiktokIcon, VimeoIcon } from '@/components/common/Icons';

interface SocialFeedRibbonProps {
  settings: StoreSettings;
  title?: string;
  subtitle?: string;
  desc?: string;
  limit?: number;
  isHomepage?: boolean;
  items?: any[];
}

interface ParsedSocialVideo {
  type: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'vimeo' | 'direct' | null;
  embedUrl?: string;
  isVertical?: boolean;
}

// Parses and extracts video embed URLs for various platforms
function parseSocialVideoUrl(url: string | undefined, autoplay: boolean, platform?: string): ParsedSocialVideo {
  if (!url) return { type: null, isVertical: false };
  const cleanUrl = url.trim();
  const lowerUrl = cleanUrl.toLowerCase();

  // Determine platform type
  let detectedType: ParsedSocialVideo['type'] = null;
  if (platform && platform !== 'auto') {
    detectedType = platform as ParsedSocialVideo['type'];
  } else {
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) detectedType = 'youtube';
    else if (lowerUrl.includes('instagram.com')) detectedType = 'instagram';
    else if (lowerUrl.includes('tiktok.com')) detectedType = 'tiktok';
    else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) detectedType = 'facebook';
    else if (lowerUrl.includes('vimeo.com')) detectedType = 'vimeo';
    else if (lowerUrl.match(/\.(mp4|webm|ogg|mov)(?:\?|$)/i)) detectedType = 'direct';
  }

  if (detectedType === 'youtube') {
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/;
    const ytMatch = cleanUrl.match(ytRegex);
    const videoId = ytMatch ? ytMatch[1] : null;
    if (videoId) {
      const params = new URLSearchParams();
      params.set('autoplay', autoplay ? '1' : '0');
      params.set('mute', autoplay ? '1' : '0');
      params.set('controls', '1');
      params.set('rel', '0');
      params.set('playsinline', '1');
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`,
        isVertical: cleanUrl.includes('/shorts/')
      };
    }
  }

  if (detectedType === 'instagram') {
    const igRegex = /(?:instagram\.com\/(?:[a-zA-Z0-9_\.]+\/)?(?:p|reel)\/)([^"&?\/ ]+)/;
    const igMatch = cleanUrl.match(igRegex);
    const code = igMatch ? igMatch[1] : null;
    if (code) {
      return {
        type: 'instagram',
        embedUrl: `https://www.instagram.com/p/${code}/embed/`,
        isVertical: true
      };
    }
  }

  if (detectedType === 'tiktok') {
    const ttRegex = /(?:tiktok\.com\/.*video\/)([^"&?\/ ]+)/;
    const ttMatch = cleanUrl.match(ttRegex);
    const videoId = ttMatch ? ttMatch[1] : null;
    if (videoId) {
      return {
        type: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        isVertical: true
      };
    }
    // Mobile short link fallback
    if (cleanUrl.includes('tiktok.com')) {
      return {
        type: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/`,
        isVertical: true
      };
    }
  }

  if (detectedType === 'facebook') {
    const params = new URLSearchParams();
    params.set('href', cleanUrl);
    params.set('show_text', '0');
    params.set('autoplay', autoplay ? 'true' : 'false');
    params.set('muted', autoplay ? 'true' : 'false');
    return {
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?${params.toString()}`,
      isVertical: false
    };
  }

  if (detectedType === 'vimeo') {
    const vmRegex = /(?:vimeo\.com\/(?:video\/)?)([^"&?\/ ]+)/;
    const vmMatch = cleanUrl.match(vmRegex);
    const videoId = vmMatch ? vmMatch[1] : null;
    if (videoId) {
      const params = new URLSearchParams();
      params.set('autoplay', autoplay ? '1' : '0');
      params.set('muted', autoplay ? '1' : '0');
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}?${params.toString()}`,
        isVertical: false
      };
    }
  }

  if (detectedType === 'direct') {
    return {
      type: 'direct',
      embedUrl: cleanUrl,
      isVertical: true
    };
  }

  // Fallback regex matching
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/);
  if (ytMatch) {
    const params = new URLSearchParams();
    params.set('autoplay', autoplay ? '1' : '0');
    params.set('mute', autoplay ? '1' : '0');
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?${params.toString()}`,
      isVertical: cleanUrl.includes('/shorts/')
    };
  }

  const igMatch = cleanUrl.match(/(?:instagram\.com\/(?:[a-zA-Z0-9_\.]+\/)?(?:p|reel)\/)([^"&?\/ ]+)/);
  if (igMatch) {
    return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed/`,
      isVertical: true
    };
  }

  return { type: null, isVertical: false };
}

export default function SocialFeedRibbon({
  settings,
  title,
  subtitle,
  desc,
  limit,
  isHomepage = false,
  items
}: SocialFeedRibbonProps) {
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use Intersection Observer to load feed items only when approaching viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const parsedFeeds = useMemo(() => {
    if (items && items.length > 0) return items;
    const fallbackItems = settings.social_feeds_items;
    if (!fallbackItems) return [];
    try {
      const arr = typeof fallbackItems === 'string' ? JSON.parse(fallbackItems) : fallbackItems;
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, [items, settings.social_feeds_items]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!activeVideo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideo]);

  if (settings.social_feeds_enabled === false) return null;
  
  if (isHomepage) {
    if (settings.social_feeds_homepage_enabled === false) return null;
  } else {
    if (settings.social_feeds_product_enabled === false) return null;
  }

  if (!shouldRender) {
    // Render a lightweight spacer to maintain structure, completely deferring image / script requests
    return (
      <div 
        ref={containerRef}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 pt-10 h-[120px] flex items-center justify-center opacity-40"
      >
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold animate-pulse">Loading Feed...</span>
      </div>
    );
  }

  const maxItems = limit || 8;
  const feedsToDisplay = parsedFeeds.length > 0 ? parsedFeeds : [
    { id: 'v1', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=70', link: '#', username: 'buyer1', caption: 'Stunning piece!' },
    { id: 'v2', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=70', link: '#', username: 'buyer2', caption: 'Obsessed with the quality.' },
    { id: 'v3', imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=70', link: '#', username: 'buyer3', caption: 'Super fast shipping!' },
    { id: 'v4', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=70', link: '#', username: 'buyer4', caption: 'Highly recommended.' }
  ];

  return (
    <div 
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 pt-10 animate-fade-in"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 600px' } as React.CSSProperties}
    >
      <div className="text-center space-y-2 mb-8">
        <span className="inline-block px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-500 text-xs font-bold rounded-full uppercase tracking-wider">
          {subtitle || settings.social_feeds_subtitle || '#OURSTORE'}
        </span>
        <h3 className="text-xl font-black uppercase tracking-wider text-gray-900 dark:text-white">
          {title || settings.social_feeds_title || 'Follow Us On Social Media'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-semibold">
          {desc || settings.social_feeds_desc || 'Tag us in your post to get featured on our page'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {feedsToDisplay.slice(0, maxItems).map((feed, idx) => {
          const hasVideo = !!feed.videoUrl;
          const videoInfo = hasVideo ? parseSocialVideoUrl(feed.videoUrl, false, feed.platform) : { type: null };

          const getPlatformIcon = (type: string | null, className: string) => {
            switch (type) {
              case 'youtube':
                return <YoutubeIcon className={`${className} text-red-600`} />;
              case 'instagram':
                return <InstagramIcon className={`${className} text-pink-600`} />;
              case 'facebook':
                return <FacebookIcon className={`${className} text-[#1877F2]`} />;
              case 'tiktok':
                return <TiktokIcon className={`${className} text-black`} />;
              case 'vimeo':
                return <VimeoIcon className={`${className} text-[#1AB7EA]`} />;
              default:
                return <Play className={`${className} text-gray-800 fill-current translate-x-[0.5px]`} />;
            }
          };

          return (
            <a
              key={feed.id || idx}
              href={feed.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (hasVideo) {
                  e.preventDefault();
                  setActiveVideo(feed);
                }
              }}
              className="relative aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden group border border-gray-100 dark:border-gray-800 block cursor-pointer"
            >
              <Image
                src={feed.imageUrl}
                alt={feed.caption || `Social post by @${feed.username}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
                loading="lazy"
              />
              
              {/* Permanent Play/Platform Indicator for Videos */}
              {hasVideo && (
                <div className="absolute top-3 right-3 z-10 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                  {getPlatformIcon(videoInfo.type, "w-3.5 h-3.5")}
                </div>
              )}

              {/* Play overlay — desktop hover only, GPU-friendly opacity */}
              <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-3 opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                {/* Centered Modern Play/Brand Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
                  {getPlatformIcon(videoInfo.type, "w-6 h-6")}
                </div>
                <div>
                  <p className="text-[10px] font-black text-white">@{feed.username}</p>
                  {feed.caption && <p className="text-[9px] text-gray-300 line-clamp-2 mt-0.5 leading-tight">{feed.caption}</p>}
                </div>
              </div>
              
              {/* Default username tag */}
              <div className="absolute bottom-3 left-3 bg-black/80 text-white text-[9px] font-bold px-2.5 py-1 rounded-full max-w-[85%] truncate whitespace-nowrap">
                @{feed.username}
              </div>
            </a>
          );
        })}
      </div>

      {/* Video Modal Overlay */}
      {activeVideo && (() => {
        const videoInfo = parseSocialVideoUrl(activeVideo.videoUrl, activeVideo.videoAutoplay ?? true, activeVideo.platform);
        
        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 overscroll-contain animate-fade-in p-4"
            style={{ willChange: 'opacity' }}
            onClick={() => setActiveVideo(null)}
          >
            {/* Floating Top-Right Screen Close Button */}
            <button 
              onClick={() => setActiveVideo(null)}
              className="fixed top-4 right-4 md:top-6 md:right-6 z-[110] flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 shadow-2xl transition-all active:scale-95 cursor-pointer text-xs font-bold uppercase tracking-wider select-none"
              title="Close Video"
            >
              <span>✕ Close</span>
            </button>

            <div 
              className="relative w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col justify-center transition-all"
              style={{ 
                maxHeight: '82vh', 
                willChange: 'transform',
                maxWidth: videoInfo.type === 'instagram' ? '450px' : 
                          videoInfo.type === 'tiktok' || (videoInfo.type === 'youtube' && videoInfo.isVertical) ? '360px' : '768px',
                aspectRatio: videoInfo.type === 'instagram' ? '3/4' : 
                             videoInfo.type === 'tiktok' || (videoInfo.type === 'youtube' && videoInfo.isVertical) ? '9/16' : 
                             videoInfo.type === 'direct' ? 'auto' : '16/9',
                height: videoInfo.type === 'direct' ? 'auto' : undefined
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Video Player */}
              {videoInfo.type === 'direct' ? (
                <video
                  src={videoInfo.embedUrl}
                  className="w-full h-auto max-h-[82vh] object-contain rounded-3xl"
                  controls
                  autoPlay={activeVideo.videoAutoplay ?? true}
                  muted={activeVideo.videoAutoplay ?? true}
                  loop={activeVideo.videoAutoplay ?? true}
                  playsInline
                />
              ) : videoInfo.type ? (
                <iframe
                  src={videoInfo.embedUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; unload"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <div className="text-center p-8 text-gray-400 text-sm">
                  Invalid video link or unsupported platform.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
