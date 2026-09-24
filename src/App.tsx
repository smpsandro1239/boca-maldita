import { useCallback, useEffect, useState } from 'react';
import { LegalDoc, ScreenType, ImageAsset, MenuItem, SiteContent } from './types';
import { DEFAULT_IMAGE_ASSETS } from './data/assets';
import { MENU_ITEMS } from './data/menuData';
import Header from './components/Header';
import Footer from './components/Footer';
import VideoModal from './components/VideoModal';
import DishDetailModal from './components/DishDetailModal';
import HomeScreen from './screens/HomeScreen';
import RestaurantScreen from './screens/RestaurantScreen';
import MenuScreen from './screens/MenuScreen';
import ExperienceScreen from './screens/ExperienceScreen';
import ReservationScreen from './screens/ReservationScreen';
import ContactScreen from './screens/ContactScreen';
import LegalScreen from './screens/LegalScreen';
import * as api from './lib/api';
import { SiteProvider, DEFAULT_SITE_CONTENT, computeAssets } from './context/SiteContext';
import AdminPanel from './components/AdminPanel';
import { Check, X } from 'lucide-react';

const ADMIN_TOKEN_STORAGE_KEY = 'boca-maldita:admin-token';

const ALIAS_MAP: Record<string, string> = {
  'hero-chef-plating': 'hero-chef',
  'reviewer-avatar': 'reviewer-goncalo',
  'restaurant-ambience': 'dining-room',
  'meat-aging-locker': 'dry-aging-locker',
  'map-vila-de-prado': 'map-location',
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('inicio');
  const [legalDoc, setLegalDoc] = useState<LegalDoc>('privacidade');
  const [assets, setAssets] = useState<ImageAsset[]>(DEFAULT_IMAGE_ASSETS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [isAdminVerifying, setIsAdminVerifying] = useState(true);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string>(() => sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '');
  const hasVideo = !!siteContent.videoUrl.trim();

  useEffect(() => {
    const token = adminToken.trim();
    if (!token) {
      setIsAdminAuthorized(false);
      setIsAdminVerifying(false);
      return;
    }
    setIsAdminVerifying(true);
    let cancelled = false;
    api
      .verifyAdminToken(token)
      .then(() => {
        if (!cancelled) setIsAdminAuthorized(true);
      })
      .catch(() => {
        if (!cancelled) setIsAdminAuthorized(false);
      })
      .finally(() => {
        if (!cancelled) setIsAdminVerifying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken]);

  useEffect(() => {
    const isAdminPath = window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/admin';
    if (!isAdminPath) return;
    if (isAdminVerifying) return;
    if (isAdminAuthorized) {
      setIsAdminLoginOpen(false);
      setIsAdminPanelOpen(true);
    } else {
      setIsAdminPanelOpen(false);
      setIsAdminLoginOpen(true);
    }
  }, [isAdminAuthorized, isAdminVerifying]);

  const refreshAssets = useCallback(async () => {
    try {
      const { enabled, overrides } = await api.getAdminAssets();
      setAdminEnabled(enabled);
      setAssets(computeAssets(overrides));
    } catch {
      setAssets(DEFAULT_IMAGE_ASSETS);
      setAdminEnabled(false);
    }
  }, []);

  const refreshMenus = useCallback(async () => {
    try {
      const data = await api.getMenus();
      setMenuItems(data.items && data.items.length > 0 ? data.items : MENU_ITEMS);
    } catch {
      setMenuItems(MENU_ITEMS);
    }
  }, []);

  const refreshSiteContent = useCallback(async () => {
    try {
      const data = await api.getSiteContent();
      setSiteContent(data);
    } catch {
      setSiteContent(DEFAULT_SITE_CONTENT);
    }
  }, []);

  useEffect(() => {
    refreshAssets();
    refreshMenus();
    refreshSiteContent();
  }, [refreshAssets, refreshMenus, refreshSiteContent]);

  const getUrl = (id: string): string => {
    const targetId = ALIAS_MAP[id] || id;
    const found = assets.find((a) => a.id === targetId || a.id === id);
    if (found?.url) return found.url;
    const defaultFound = DEFAULT_IMAGE_ASSETS.find((a) => a.id === targetId || a.id === id);
    return defaultFound?.url || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop';
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleCopyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link direto copiado para a área de transferência!');
  };

  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLegal = (doc: LegalDoc) => {
    setLegalDoc(doc);
    setCurrentScreen('legal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SiteProvider
      siteContent={siteContent}
      assets={assets}
      menuItems={menuItems}
      adminEnabled={adminEnabled}
      onRefreshAssets={refreshAssets}
      onRefreshMenus={refreshMenus}
      onRefreshSiteContent={refreshSiteContent}
    >
      <div className="min-h-screen bg-[#0C0D0E] text-[#F7F5F0] font-sans antialiased flex flex-col selection:bg-[#D4A373] selection:text-[#0C0D0E]">
        {toastMessage && (
          <div className="fixed top-24 right-5 z-[150] bg-[#D4A373] text-[#0C0D0E] px-4 py-2.5 shadow-2xl border border-white/20 font-sans text-xs uppercase tracking-wider font-semibold flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          logoUrl={getUrl('logo-brand')}
        />

        <main className="flex-1 pt-20">
          {currentScreen === 'inicio' && (
            <HomeScreen
              onNavigate={handleNavigate}
              onOpenVideo={() => setIsVideoModalOpen(true)}
              videoAvailable={hasVideo}
              onSelectDish={(dish) => setSelectedDish(dish)}
              heroChefUrl={getUrl('hero-chef')}
              reviewerUrl={getUrl('reviewer-goncalo')}
              diningRoomUrl={getUrl('dining-room')}
              dryAgingUrl={getUrl('dry-aging-locker')}
              mapUrl={getUrl('map-location')}
              contactEmail={siteContent.contactEmail}
              onCopyImageUrl={handleCopyImageUrl}
            />
          )}

          {currentScreen === 'o-restaurante' && (
            <RestaurantScreen
              onNavigate={handleNavigate}
              diningRoomUrl={getUrl('dining-room')}
              dryAgingUrl={getUrl('dry-aging-locker')}
              heroChefUrl={getUrl('hero-chef')}
              onCopyImageUrl={handleCopyImageUrl}
            />
          )}

          {currentScreen === 'menu-carnes' && (
            <MenuScreen
              onSelectDish={(dish) => setSelectedDish(dish)}
              onBookTable={() => handleNavigate('reservas')}
              onCopyImageUrl={handleCopyImageUrl}
            />
          )}

          {currentScreen === 'experiencia' && (
            <ExperienceScreen
              onNavigate={handleNavigate}
              onOpenVideo={() => setIsVideoModalOpen(true)}
              videoAvailable={hasVideo}
              heroChefUrl={getUrl('hero-chef')}
              diningRoomUrl={getUrl('dining-room')}
            />
          )}

          {currentScreen === 'reservas' && <ReservationScreen />}

          {currentScreen === 'contactos' && (
            <ContactScreen
              mapUrl={getUrl('map-location')}
              contactEmail={siteContent.contactEmail}
              onCopyImageUrl={handleCopyImageUrl}
            />
          )}

          {currentScreen === 'legal' && (
            <LegalScreen doc={legalDoc} onBack={() => handleNavigate('inicio')} />
          )}
        </main>

        <Footer
          onNavigate={handleNavigate}
          onOpenLegal={handleOpenLegal}
          contactEmail={siteContent.contactEmail}
        />

        <AdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          adminEnabled={adminEnabled}
          adminToken={adminToken}
          onAdminTokenChange={(token) => setAdminToken(token)}
          assets={assets}
          onAssetsChange={setAssets}
          menus={menuItems}
          onMenusChange={setMenuItems}
          content={siteContent}
          onContentChange={setSiteContent}
          showToast={showToast}
        />

        {isAdminLoginOpen && (
          <AdminLoginModal
            token={adminToken}
            onTokenChange={setAdminToken}
            onClose={() => setIsAdminLoginOpen(false)}
            onSuccess={() => {
              setIsAdminLoginOpen(false);
              setIsAdminAuthorized(true);
              setIsAdminPanelOpen(true);
            }}
          />
        )}

        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          posterUrl={getUrl('hero-chef')}
          videoUrl={siteContent.videoUrl}
        />

        <DishDetailModal
          item={selectedDish}
          onClose={() => setSelectedDish(null)}
          onBookTable={() => {
            setSelectedDish(null);
            handleNavigate('reservas');
          }}
        />
      </div>
    </SiteProvider>
  );
}

function AdminLoginModal({
  token,
  onTokenChange,
  onClose,
  onSuccess,
}: {
  token: string;
  onTokenChange: (token: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const value = token.trim();
    if (!value) {
      setError('Introduza o token de administrador.');
      return;
    }
    setBusy(true);
    try {
      await api.verifyAdminToken(value);
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
      onTokenChange(value);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token de administrador inválido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0C0D0E] border border-[#282A30] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg text-[#F7F5F0]">Acesso de Administração</h2>
          <button type="button" onClick={onClose} className="p-1 text-[#F7F5F0]/60 hover:text-[#F7F5F0]" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#F7F5F0]/50 mb-4">
          Introduza o token de administrador para aceder ao painel de gestão do Boca Maldita.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder="Token de administrador"
          autoFocus
          className="w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373] font-mono"
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0C0D0E] border border-[#282A30] text-[#F7F5F0]/70 text-xs uppercase tracking-wider font-semibold hover:border-[#D4A373]/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="px-4 py-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
          >
            {busy ? 'A verificar…' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}