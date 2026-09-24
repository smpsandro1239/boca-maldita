import { useState } from 'react';
import { ScreenType } from '../types';
import { Phone, Calendar, Menu, X, Sparkles } from 'lucide-react';
import AssetImage from './AssetImage';
import { useSite, telHref } from '../context/SiteContext';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  logoUrl: string;
}

export default function Header({ currentScreen, onNavigate, logoUrl }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { siteContent } = useSite();
  const phone = siteContent.phone;

  const navItems: { id: ScreenType; label: string }[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'o-restaurante', label: 'O Restaurante' },
    { id: 'menu-carnes', label: 'Menu & Carnes' },
    { id: 'experiencia', label: 'Experiência' },
    { id: 'contactos', label: 'Contactos' }
  ];

  const handleNavClick = (screen: ScreenType) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#0C0D0E]/90 backdrop-blur-md border-b border-[#282A30]">
      <div className="h-20 max-w-7xl mx-auto px-5 lg:px-12 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <button
          onClick={() => handleNavClick('inicio')}
          className="flex items-center gap-3.5 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 bg-[#141518] border border-[#282A30] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#D4A373] transition-colors">
            {logoUrl ? (
              <AssetImage
                src={logoUrl}
                alt="Boca Maldita Logo"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  // Fallback monogram if URL fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl sm:text-2xl text-[#F7F5F0] tracking-tight leading-tight group-hover:text-[#D4A373] transition-colors">
              Boca Maldita
            </span>
            <span className="font-sans text-[10px] sm:text-xs text-[#D4A373] uppercase tracking-[0.2em] font-medium">
              Fine Dining &amp; Grill
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-8">
          {navItems.map(item => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-xs uppercase tracking-[0.2em] font-sans font-medium transition-colors py-2 relative ${
                  isActive ? 'text-[#D4A373]' : 'text-[#A6A8AD] hover:text-[#F7F5F0]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#D4A373]"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          {/* Telephone Contact (Hidden on very small screens) */}
          <a
            href={telHref(phone)}
            className="hidden lg:flex items-center gap-2 text-xs text-[#A6A8AD] hover:text-[#D4A373] transition-colors font-mono"
          >
            <Phone className="w-3.5 h-3.5 text-[#D4A373]" />
            <span>{phone}</span>
          </a>

          {/* Reservar Mesa Button */}
          <button
            onClick={() => handleNavClick('reservas')}
            className={`font-sans text-xs uppercase font-semibold px-4 sm:px-5 py-2.5 transition-all duration-300 tracking-[0.15em] ${
              currentScreen === 'reservas'
                ? 'bg-[#F7F5F0] text-[#0C0D0E]'
                : 'bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] shadow-[0_1px_8px_rgba(0,0,0,0.04)]'
            }`}
          >
            Reservar Mesa
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-[#F7F5F0] hover:text-[#D4A373] focus:outline-none"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#141518] border-b border-[#282A30] px-6 py-6 space-y-4">
          <div className="flex flex-col space-y-3">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-left text-sm uppercase tracking-[0.18em] py-2 transition-colors flex items-center justify-between ${
                  currentScreen === item.id
                    ? 'text-[#D4A373] font-semibold pl-2 border-l-2 border-[#D4A373]'
                    : 'text-[#A6A8AD] hover:text-[#F7F5F0]'
                }`}
              >
                <span>{item.label}</span>
                {currentScreen === item.id && <span className="text-xs text-[#D4A373]">•</span>}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#282A30] space-y-3">
            <a
              href={telHref(phone)}
              className="flex items-center justify-center gap-2 text-xs text-[#A6A8AD] py-2 border border-[#282A30]"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>{phone}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
