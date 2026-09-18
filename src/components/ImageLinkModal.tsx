import { useState } from 'react';
import { ImageAsset } from '../types';
import { ExternalLink, Copy, Check, Sparkles, X, Image as ImageIcon, Link as LinkIcon, RefreshCw, ShieldCheck, Lock, Mail } from 'lucide-react';

interface ImageLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: ImageAsset[];
  onUpdateAssetUrl: (id: string, newUrl: string) => void;
  onResetAssets: () => void;
  adminEnabled: boolean;
  adminToken: string;
  onAdminTokenChange: (token: string) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage: string | null;
  onSaveToServer: () => void;
  contactEmail: string;
  onContactEmailChange: (email: string) => void;
  siteStatus: 'idle' | 'saving' | 'saved' | 'error';
  siteMessage: string | null;
  onSaveSite: () => void;
}

export default function ImageLinkModal({
  isOpen,
  onClose,
  assets,
  onUpdateAssetUrl,
  onResetAssets,
  adminEnabled,
  adminToken,
  onAdminTokenChange,
  saveStatus,
  saveMessage,
  onSaveToServer,
  contactEmail,
  onContactEmailChange,
  siteStatus,
  siteMessage,
  onSaveSite
}: ImageLinkModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customInputUrl, setCustomInputUrl] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'todas', label: 'Todas as Imagens' },
    { id: 'logo', label: 'Logotipo' },
    { id: 'hero', label: 'Hero & Chef' },
    { id: 'carnes', label: 'Carnes Nobres' },
    { id: 'mar', label: 'Mar & Entradas' },
    { id: 'ambiente', label: 'Restaurante & Maturação' },
    { id: 'mapa', label: 'Localização & Mapa' }
  ];

  const filteredAssets = assets.filter(item => {
    const matchesCategory = selectedCategory === 'todas' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const startEdit = (asset: ImageAsset) => {
    setEditingId(asset.id);
    setCustomInputUrl(asset.url);
  };

  const saveEdit = (id: string) => {
    if (customInputUrl.trim()) {
      onUpdateAssetUrl(id, customInputUrl.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#141518] border border-[#282A30] shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#282A30] flex items-start justify-between bg-[#1C1E22]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#D4A373]"></span>
              <span className="font-mono text-xs uppercase text-[#D4A373] tracking-[0.2em]">Painel de Administração</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#F7F5F0]">
              Gerir Imagens do Site
            </h2>
            <p className="text-sm text-[#A6A8AD] max-w-2xl">
              Substitua qualquer imagem do site por um link direto novo. As alterações aplicam-se em tempo real; para as publicar para todos os visitantes, guarde-as no servidor com o token de administrador.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#A6A8AD] hover:text-[#F7F5F0] p-2 hover:bg-[#282A30] transition-colors"
            title="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Admin Save Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#282A30] bg-[#0C0D0E] flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-3">
            {adminEnabled
              ? <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              : <Lock className="w-5 h-5 text-amber-400 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F7F5F0]">Publicação no servidor</p>
              <p className="text-xs text-[#A6A8AD]">
                {adminEnabled
                  ? 'Guardar aplica as imagens substituídas para todos os visitantes.'
                  : 'O servidor não tem ADMIN_TOKEN definido — a gravação permanente está desativada (as alterações ficam apenas locais e temporárias).'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              type="password"
              value={adminToken}
              onChange={(e) => onAdminTokenChange(e.target.value)}
              placeholder="Token de administrador"
              className="bg-[#1C1E22] border border-[#282A30] text-sm text-[#F7F5F0] px-3 py-2 focus:border-[#D4A373] focus:outline-none sm:w-56"
            />
            <button
              onClick={onSaveToServer}
              disabled={saveStatus === 'saving'}
              className="bg-[#D4A373] hover:bg-[#C59D5F] text-[#0C0D0E] text-xs font-semibold uppercase tracking-wider px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saveStatus === 'saving' ? 'A guardar...' : 'Guardar no servidor'}
            </button>
          </div>
        </div>

        {saveStatus !== 'idle' && (
          <div className={`px-4 sm:px-5 py-2 border-b border-[#282A30] ${saveStatus === 'error' ? 'bg-red-950/40 text-red-300' : 'bg-emerald-950/40 text-emerald-300'}`}>
            <p className="text-xs">
              {saveStatus === 'saving'
                ? 'A publicar as imagens no servidor...'
                : saveMessage ?? (saveStatus === 'saved' ? 'Imagens publicadas com sucesso.' : '')}
            </p>
          </div>
        )}

        {/* Site Settings Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#282A30] bg-[#1C1E22] flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#D4A373] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F7F5F0]">Email de contacto do site</p>
              <p className="text-xs text-[#A6A8AD]">
                Aplicado em todo o site (rodapé, contactos e secções). Guarde para substituir globalmente.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => onContactEmailChange(e.target.value)}
              placeholder="geral@bocamaldita.pt"
              className="bg-[#0C0D0E] border border-[#282A30] text-sm text-[#F7F5F0] px-3 py-2 focus:border-[#D4A373] focus:outline-none sm:w-64"
            />
            <button
              onClick={onSaveSite}
              disabled={siteStatus === 'saving'}
              className="bg-[#282A30] hover:bg-[#343536] text-[#F7F5F0] text-xs font-semibold uppercase tracking-wider px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {siteStatus === 'saving' ? 'A guardar...' : 'Guardar email'}
            </button>
          </div>
        </div>

        {(siteStatus === 'saved' || siteStatus === 'error') && (
          <div className={`px-4 sm:px-5 py-2 border-b border-[#282A30] ${siteStatus === 'error' ? 'bg-red-950/40 text-red-300' : 'bg-emerald-950/40 text-emerald-300'}`}>
            <p className="text-xs">{siteMessage}</p>
          </div>
        )}

        {/* Action Controls & Filters */}
        <div className="p-4 sm:p-6 border-b border-[#282A30] bg-[#141518] flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs uppercase px-3 py-1.5 font-sans tracking-wider transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4A373] text-[#0C0D0E] font-semibold'
                    : 'bg-[#1C1E22] text-[#A6A8AD] hover:text-[#F7F5F0] border border-[#282A30]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Reset */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Filtrar por nome ou URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1C1E22] border border-[#282A30] text-sm text-[#F7F5F0] px-3 py-1.5 focus:border-[#D4A373] focus:outline-none w-full sm:w-60"
            />
            <button
              onClick={onResetAssets}
              title="Restaurar URLs Originais"
              className="flex items-center gap-1 text-xs text-[#A6A8AD] hover:text-[#D4A373] bg-[#1C1E22] border border-[#282A30] px-3 py-2 whitespace-nowrap transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </button>
          </div>
        </div>

        {/* Assets Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-[#A6A8AD]">
              Nenhuma imagem encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssets.map(asset => {
                const isCopied = copiedId === asset.id;
                const isEditing = editingId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="bg-[#1C1E22] border border-[#282A30] p-4 flex flex-col justify-between gap-3 group hover:border-[#D4A373]/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Image Thumbnail */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#0C0D0E] border border-[#282A30] shrink-0 overflow-hidden relative">
                        <img
                          src={asset.url || 'https://placehold.co/400x300/121314/d4a373?text=Imagem+Indisponivel'}
                          alt={asset.alt}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            // Fallback if URL is invalid
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/121314/d4a373?text=Imagem+Indisponivel';
                          }}
                        />
                        <span className="absolute bottom-0 right-0 bg-[#0C0D0E]/80 text-[10px] text-[#D4A373] px-1.5 py-0.5 uppercase tracking-wider font-mono">
                          {asset.category}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-serif text-base text-[#F7F5F0] truncate font-medium">
                          {asset.name}
                        </h4>
                        <p className="text-xs text-[#A6A8AD] line-clamp-2">
                          {asset.description}
                        </p>

                        {/* Direct URL text box */}
                        {isEditing ? (
                          <div className="mt-2 space-y-1.5">
                            <input
                              type="url"
                              value={customInputUrl}
                              onChange={(e) => setCustomInputUrl(e.target.value)}
                              placeholder="Cole o link direto da imagem (https://...)"
                              className="w-full text-xs font-mono bg-[#0C0D0E] text-[#D4A373] p-1.5 border border-[#D4A373] focus:outline-none"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(asset.id)}
                                className="bg-[#D4A373] text-[#0C0D0E] text-xs font-semibold px-2.5 py-1 uppercase tracking-wider hover:bg-[#C59D5F]"
                              >
                                Salvar Link
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-[#A6A8AD] hover:text-[#F7F5F0] px-2 py-1"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 bg-[#0C0D0E] p-1.5 border border-[#282A30] overflow-hidden">
                            <LinkIcon className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                            <span className="font-mono text-[11px] text-[#A6A8AD] truncate select-all">
                              {asset.url}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    {!isEditing && (
                      <div className="pt-2 border-t border-[#282A30] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(asset.url, asset.id)}
                            className={`flex items-center gap-1.5 text-xs font-sans uppercase tracking-wider px-3 py-1.5 transition-colors font-semibold ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F]'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Link Direto</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => startEdit(asset)}
                            className="text-xs text-[#A6A8AD] hover:text-[#D4A373] hover:underline px-2 py-1"
                          >
                            Alterar URL
                          </button>
                        </div>

                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#A6A8AD] hover:text-[#F7F5F0] transition-colors"
                        >
                          <span>Abrir Imagem</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#282A30] bg-[#1C1E22] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A6A8AD]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4A373]" />
            <span>Todos os links de imagem utilizam URLs públicas diretas sem restrições de referenciamento.</span>
          </div>
          <button
            onClick={onClose}
            className="bg-[#282A30] hover:bg-[#343536] text-[#F7F5F0] px-5 py-2 uppercase font-sans tracking-widest text-xs transition-colors"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
}
