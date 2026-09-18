import { useState } from 'react';
import { MenuItem } from '../types';
import { X, Wine, Flame, Clock, Award, Copy, Check, ExternalLink } from 'lucide-react';

interface DishDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onBookTable: () => void;
}

export default function DishDetailModal({ item, onClose, onBookTable }: DishDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#141518] border border-[#282A30] shadow-2xl overflow-hidden my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-[#0C0D0E]/80 text-[#F7F5F0] hover:text-[#D4A373] p-2 hover:bg-[#282A30] transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Dish Image */}
          <div className="relative h-64 md:h-full min-h-[300px] bg-[#0C0D0E] overflow-hidden">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : null}
            {item.badge && (
              <div className="absolute top-4 left-4 bg-[#0C0D0E]/90 text-[#D4A373] font-mono text-xs px-3 py-1 uppercase tracking-widest border border-[#D4A373]/40">
                {item.badge}
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 bg-[#141518]/90 backdrop-blur-sm p-2.5 border border-[#282A30] flex items-center justify-between text-xs">
              <span className="text-[#A6A8AD] truncate max-w-[180px] font-mono">{item.imageUrl}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[#D4A373] hover:text-[#F7F5F0] font-sans uppercase tracking-wider text-[11px] font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Link Direto'}</span>
              </button>
            </div>
          </div>

          {/* Dish Details */}
          <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase font-mono tracking-[0.2em] text-[#D4A373]">
                  {item.category.toUpperCase()} • BOCA MALDITA
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#F7F5F0] mt-1">
                  {item.name}
                </h3>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="font-serif text-2xl text-[#D4A373] font-semibold">
                    {item.currency}{item.price.toFixed(2)}
                  </span>
                  {item.tagline && (
                    <span className="text-xs text-[#A6A8AD] uppercase tracking-wider">
                      • {item.tagline}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-[#A6A8AD] leading-relaxed">
                {item.description}
              </p>

              {/* Badges / Specifications */}
              <div className="space-y-2 pt-2 border-t border-[#282A30]">
                {item.origin && (
                  <div className="flex items-center gap-2 text-xs text-[#F7F5F0]">
                    <Award className="w-4 h-4 text-[#D4A373] shrink-0" />
                    <span className="text-[#A6A8AD]">Origem:</span>
                    <span className="font-medium">{item.origin}</span>
                  </div>
                )}
                {item.dryAgedDays && (
                  <div className="flex items-center gap-2 text-xs text-[#F7F5F0]">
                    <Clock className="w-4 h-4 text-[#D4A373] shrink-0" />
                    <span className="text-[#A6A8AD]">Maturação:</span>
                    <span className="font-medium">{item.dryAgedDays} dias em câmara de sal</span>
                  </div>
                )}
                {item.pairingWine && (
                  <div className="flex items-start gap-2 text-xs text-[#F7F5F0] bg-[#1C1E22] p-2.5 border border-[#282A30]">
                    <Wine className="w-4 h-4 text-[#D4A373] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#D4A373] uppercase tracking-wider block font-semibold text-[10px]">
                        Harmonização Sommelier Sugerida
                      </span>
                      <span className="text-[#F7F5F0]">{item.pairingWine}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#282A30]">
              <button
                onClick={() => {
                  onClose();
                  onBookTable();
                }}
                className="flex-1 bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] font-sans font-semibold uppercase text-xs tracking-[0.18em] py-3 transition-colors text-center"
              >
                Reservar Mesa para Provar
              </button>
              <a
                href={item.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 border border-[#282A30] hover:border-[#D4A373] text-xs text-[#A6A8AD] hover:text-[#F7F5F0] px-4 py-3 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver Imagem HD</span>
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
