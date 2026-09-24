import { X, Flame, ExternalLink } from 'lucide-react';
import AssetImage from './AssetImage';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  posterUrl: string;
  videoUrl?: string;
}

function isFacebookUrl(url: string): boolean {
  return /facebook\.com/i.test(url);
}

function isNativeVideoUrl(url: string): boolean {
  return /\.(mp4|webm|m3u8)(\?|#|$)/i.test(url);
}

function embedUrlFor(url: string): string {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
}

export default function VideoModal({ isOpen, onClose, posterUrl, videoUrl }: VideoModalProps) {
  if (!isOpen) return null;

  const url = (videoUrl ?? '').trim();

  const body = (() => {
    if (url && isNativeVideoUrl(url)) {
      return (
        <div className="aspect-video w-full bg-[#0C0D0E]">
          <video className="w-full h-full object-contain" src={url} poster={posterUrl || undefined} controls playsInline />
        </div>
      );
    }
    if (url && isFacebookUrl(url)) {
      return (
        <div className="aspect-video w-full bg-[#0C0D0E]">
          <iframe
            className="w-full h-full"
            src={embedUrlFor(url)}
            title="Documentário Boca Maldita"
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="relative aspect-video w-full bg-[#0C0D0E] overflow-hidden">
        {posterUrl ? <AssetImage src={posterUrl} alt="Vídeo Boca Maldita" className="w-full h-full object-cover opacity-85" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        {url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] px-6 py-3.5 text-xs uppercase font-semibold tracking-wider transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir vídeo</span>
            </a>
          </div>
        ) : null}
      </div>
    );
  })();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 sm:p-6">
      <div className="relative w-full max-w-4xl bg-[#141518] border border-[#282A30] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#282A30] bg-[#1C1E22]">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#D4A373]" />
            <div>
              <h3 className="font-serif text-lg text-[#F7F5F0]">A Arte da Brasa no Boca Maldita</h3>
              <div className="flex items-center gap-2 text-xs text-[#A6A8AD]">
                <span>Documentário Gastronómico</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A6A8AD] hover:text-[#F7F5F0] p-1.5 hover:bg-[#282A30] transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {body}

        {/* Footer */}
        <div className="p-3 bg-[#141518]/95 border-t border-[#282A30] flex items-center justify-between text-xs text-[#A6A8AD]">
          <span className="text-[11px] uppercase tracking-wider text-[#D4A373]">Carvão de Azinho Alentejano</span>
          <button
            onClick={onClose}
            className="text-xs bg-[#282A30] hover:bg-[#343536] text-[#F7F5F0] px-3 py-1 uppercase tracking-wider"
          >
            Fechar Vídeo
          </button>
        </div>
      </div>
    </div>
  );
}