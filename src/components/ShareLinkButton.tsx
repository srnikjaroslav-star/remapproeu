'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareLinkButtonProps {
  slug: string;
  compact?: boolean;
}

export default function ShareLinkButton({ slug, compact = false }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${baseUrl}/portal/${slug}`;
    
    try {
      // Try using the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link bol skopírovaný do schránky');
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        toast.success('Link bol skopírovaný do schránky');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Nepodarilo sa skopírovať link');
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        className="p-1.5 hover:bg-[#00d2ff]/20 rounded text-[#00d2ff] transition-colors"
        aria-label="Zdieľať link"
        title="Zdieľať link"
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-3 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow"
    >
      {copied ? (
        <>
          <Check size={18} />
          <span>Skopírované!</span>
        </>
      ) : (
        <>
          <Share2 size={18} />
          <span>Zdieľať link</span>
        </>
      )}
    </button>
  );
}
