import { useState, useEffect } from 'react';
import { ScreenType, MenuItem, ImageAsset } from './types';
import { DEFAULT_IMAGE_ASSETS } from './data/assets';
import Header from './components/Header';
import Footer from './components/Footer';
import ImageLinkModal from './components/ImageLinkModal';
import VideoModal from './components/VideoModal';
import DishDetailModal from './components/DishDetailModal';
import HomeScreen from './screens/HomeScreen';
import RestaurantScreen from './screens/RestaurantScreen';
import MenuScreen from './screens/MenuScreen';
import ExperienceScreen from './screens/ExperienceScreen';
import ReservationScreen from './screens/ReservationScreen';
import ContactScreen from './screens/ContactScreen';
import { Link as LinkIcon, Check } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('inicio');
  const [assets, setAssets] = useState<ImageAsset[]>(DEFAULT_IMAGE_ASSETS);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to get asset URL from dynamic state with fallback and alias resolution
  const getUrl = (id: string): string => {
    const aliasMap: Record<string, string> = {
      'hero-chef-plating': 'hero-chef',
      'reviewer-avatar': 'reviewer-goncalo',
      'restaurant-ambience': 'dining-room',
      'meat-aging-locker': 'dry-aging-locker',
      'map-vila-de-prado': 'map-location',
    };
    const targetId = aliasMap[id] || id;
    const found = assets.find(a => a.id === targetId || a.id === id);
    if (found?.url) return found.url;
    const defaultFound = DEFAULT_IMAGE_ASSETS.find(a => a.id === targetId || a.id === id);
    return defaultFound?.url || DEFAULT_IMAGE_ASSETS[0]?.url || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop';
  };

  const handleUpdateAssetUrl = (id: string, newUrl: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, url: newUrl } : a));
    showToast('Link direto da imagem atualizado com sucesso');
  };

  const handleResetAssets = () => {
    setAssets(DEFAULT_IMAGE_ASSETS);
    showToast('Imagens restauradas para as originais');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
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
    <div className="min-h-screen bg-[#0C0D0E] text-[#F7F5F0] font-sans antialiased flex flex-col selection:bg-[#D4A373] selection:text-[#0C0D0E]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-[150] bg-[#D4A373] text-[#0C0D0E] px-4 py-2.5 shadow-2xl border border-white/20 font-sans text-xs uppercase tracking-wider font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Persistent Navigation Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        logoUrl={getUrl('logo-brand')}
        onOpenImageModal={() => setIsImageModalOpen(true)}
      />

      {/* Main Screen Content with Padding for fixed header */}
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

        {currentScreen === 'reservas' && (
          <ReservationScreen />
        )}

        {currentScreen === 'contactos' && (
          <ContactScreen
            mapUrl={getUrl('map-location')}
            onCopyImageUrl={handleCopyImageUrl}
          />
        )}
      </main>

      {/* Floating Direct Image Links Trigger */}
      <aside aria-label="Acesso rápido aos links de imagem">
        <button
          type="button"
          onClick={() => setIsImageModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#141518] hover:bg-[#D4A373] text-[#D4A373] hover:text-[#0C0D0E] border border-[#282A30] hover:border-[#D4A373] p-3 shadow-2xl flex items-center gap-2 transition-all duration-300 group focus:outline-none"
          title="Ver e Copiar Links Diretos para as Imagens do HTML"
        >
          <LinkIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-xs uppercase font-semibold tracking-wider hidden sm:inline">
            Links das Imagens
          </span>
        </button>
      </aside>

      {/* Persistent Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenImageModal={() => setIsImageModalOpen(true)}
      />

      {/* Direct Image Links Modal */}
      <ImageLinkModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        assets={assets}
        onUpdateAssetUrl={handleUpdateAssetUrl}
        onResetAssets={handleResetAssets}
      />

      {/* Video Documentary Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        posterUrl={getUrl('hero-chef')}
      />

      {/* Dish Tasting & Maturation Detail Modal */}
      <DishDetailModal
        item={selectedDish}
        onClose={() => setSelectedDish(null)}
        onBookTable={() => {
          setSelectedDish(null);
          handleNavigate('reservas');
        }}
      />

    </div>
  );
}
