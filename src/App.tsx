import { useCallback, useEffect, useState } from 'react';
import { ScreenType, ImageAsset, MenuItem, SiteContent } from './types';
import { DEFAULT_IMAGE_ASSETS, DOCUMENTARY_VIDEO_URL } from './data/assets';
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
import * as api from './lib/api';
import { SiteProvider, DEFAULT_SITE_CONTENT, computeAssets } from './context/SiteContext';
import AdminPanel from './components/AdminPanel';
import { Link as LinkIcon, Check } from 'lucide-react';

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
  const [assets, setAssets] = useState<ImageAsset[]>(DEFAULT_IMAGE_ASSETS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string>(() => sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '');

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
        </main>

        <aside aria-label="Acesso rápido ao painel de administração">
          <button
            type="button"
            onClick={() => setIsAdminPanelOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-[#141518] hover:bg-[#D4A373] text-[#D4A373] hover:text-[#0C0D0E] border border-[#282A30] hover:border-[#D4A373] p-3 shadow-2xl flex items-center gap-2 transition-all duration-300 group focus:outline-none"
            title="Painel de Administração"
          >
            <LinkIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs uppercase font-semibold tracking-wider hidden sm:inline">Administração</span>
          </button>
        </aside>

        <Footer
          onNavigate={handleNavigate}
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

        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          posterUrl={getUrl('hero-chef')}
          videoUrl={siteContent.videoUrl || DOCUMENTARY_VIDEO_URL}
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