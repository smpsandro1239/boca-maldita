import { useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Flame, Clock } from 'lucide-react';
import AssetImage from './AssetImage';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  posterUrl: string;
  videoUrl?: string;
}

export default function VideoModal({ isOpen, onClose, posterUrl, videoUrl }: VideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(28);

  if (!isOpen) return null;

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
                <Clock className="w-3.5 h-3.5" />
                <span>Documentário Gastronómico • 01:45</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A6A8AD] hover:text-[#F7F5F0] p-1.5 hover:bg-[#282A30] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Video Player */}
        {videoUrl ? (
          <div className="aspect-video w-full bg-[#0C0D0E]">
            <video
              className="w-full h-full object-contain"
              src={videoUrl}
              poster={posterUrl || undefined}
              controls
              playsInline
            />
          </div>
        ) : (
        <div className="relative aspect-video w-full bg-[#0C0D0E] overflow-hidden group">
          {posterUrl ? (
            <AssetImage
              src={posterUrl}
              alt="Vídeo Boca Maldita"
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                isPlaying ? 'opacity-85 scale-105' : 'opacity-60 scale-100'
              }`}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>

          {/* Central Play/Pause Overlay Animation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {!isPlaying && (
              <div className="w-20 h-20 rounded-full bg-[#D4A373]/90 text-[#0C0D0E] flex items-center justify-center shadow-2xl animate-pulse">
                <Play className="w-8 h-8 translate-x-1 fill-current" />
              </div>
            )}
          </div>

          {/* Ambient Quote Overlay */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
            <span className="bg-[#0C0D0E]/80 backdrop-blur-md px-3 py-1 text-xs text-[#D4A373] uppercase tracking-widest font-mono border border-[#D4A373]/30">
              Vila de Prado • Cávado
            </span>
            <span className="bg-red-600/90 text-white text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider">
              4K CINEMA
            </span>
          </div>

          <div className="absolute bottom-16 left-6 right-6 pointer-events-none">
            <p className="font-serif text-lg sm:text-2xl text-[#F7F5F0] italic max-w-xl drop-shadow-md">
              "O fogo não tem pressa. Revela o caráter da carne e o silêncio da maturação."
            </p>
            <span className="text-xs text-[#D4A373] tracking-widest uppercase mt-1 block">
              Chef Executivo • Boca Maldita
            </span>
          </div>

          {/* Player Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#141518]/95 border-t border-[#282A30] flex flex-col gap-2">
            {/* Scrubber */}
            <div
              className="w-full bg-[#282A30] h-1.5 cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = ((e.clientX - rect.left) / rect.width) * 100;
                setProgress(Math.min(100, Math.max(0, pos)));
              }}
            >
              <div
                className="bg-[#D4A373] h-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"></div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between text-xs text-[#A6A8AD]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-[#F7F5F0] hover:text-[#D4A373] p-1"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-[#F7F5F0] p-1"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-[11px] text-[#F7F5F0]">
                  00:29 / 01:45
                </span>
              </div>

              <div className="flex items-center gap-3">
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
        </div>
        )}
      </div>
    </div>
  );
}
