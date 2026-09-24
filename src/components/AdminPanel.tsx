import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent, WheelEvent } from 'react';
import {
  X,
  LayoutDashboard,
  Image as ImageIcon,
  UtensilsCrossed,
  CalendarDays,
  Mail,
  Rss,
  Settings,
  Save,
  RotateCcw,
  Trash2,
  Pencil,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  List,
  Star,
  KeyRound,
  ShieldAlert,
  CalendarX,
} from 'lucide-react';
import type { AssetOverride, ClosedPeriod, ContactAdminRow, ImageAsset, MenuItem, NewsletterAdminRow, ReservationAdminRow, ReservationEditorData, ReservationProtectionConfig, ReviewAdminRow, ReviewStatus, SiteContent } from '../types';
import {
  createAdminClosedDay,
  createAdminReservation,
  deleteAdminClosedDay,
  deleteAdminContact,
  deleteAdminNewsletter,
  deleteAdminReservation,
  deleteAdminReview,
  getAdminClosedDays,
  getAdminContacts,
  getAdminNewsletter,
  getAdminReservationProtection,
  getAdminReservations,
  getAdminReviews,
  resetAdminAssets,
  resetAdminMenus,
  saveAdminAssets,
  saveAdminMenus,
  saveAdminReservationProtection,
  saveSiteContent,
  setAdminReviewStatus,
  updateAdminReservation,
  updateAdminToken,
} from '../lib/api';
import { DEFAULT_IMAGE_ASSETS } from '../data/assets';
import { MENU_CATEGORY_LABELS } from '../data/menuCategories';
import { MENU_ITEMS } from '../data/menuData';
import { writeSession } from '../lib/storage';

const ADMIN_TOKEN_STORAGE_KEY = 'boca-maldita:admin-token';

type Tab = 'geral' | 'imagens' | 'menu' | 'reservas' | 'dias' | 'contactos' | 'newsletter' | 'conteudo' | 'protecao' | 'seguranca' | 'avaliacoes';

const CATEGORY_LABELS: Record<string, string> = {
  logo: 'Logótipo',
  hero: 'Herói',
  ambiente: 'Ambiente / Restaurante',
  carnes: 'Carnes',
  mar: 'Mar',
  entradas: 'Entradas',
  mapa: 'Mapa',
  pessoas: 'Pessoas',
};

const EMPTY_MENU_ITEM: MenuItem = {
  id: '',
  name: '',
  price: 0,
  currency: '€',
  category: 'carnes',
  badge: '',
  tagline: '',
  description: '',
  imageUrl: '',
  dryAgedDays: 0,
  servesCount: '',
  origin: '',
  pairingWine: '',
  producer: '',
  vintage: '',
  isChefSpecial: false,
  visible: true,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayKey(): string {
  return dateToKey(new Date());
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const DEFAULT_PROTECTION: ReservationProtectionConfig = {
  enabled: true,
  pauseForm: false,
  dailyCapacity: 40,
  maxPerClient: 2,
  rateLimit: true,
  requireCheck: true,
};

export interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  adminEnabled: boolean;
  adminToken: string;
  onAdminTokenChange: (token: string) => void;
  assets: ImageAsset[];
  onAssetsChange: (assets: ImageAsset[]) => void;
  menus: MenuItem[];
  onMenusChange: (items: MenuItem[]) => void;
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
  showToast: (message: string) => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  adminEnabled,
  adminToken,
  onAdminTokenChange,
  assets,
  onAssetsChange,
  menus,
  onMenusChange,
  content,
  onContentChange,
  showToast,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('geral');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [imageDrafts, setImageDrafts] = useState<ImageAsset[]>(assets);

  const [menuDrafts, setMenuDrafts] = useState<MenuItem[]>(menus);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);

  const [contentDraft, setContentDraft] = useState<SiteContent>(content);

  const [reservations, setReservations] = useState<ReservationAdminRow[]>([]);
  const [contacts, setContacts] = useState<ContactAdminRow[]>([]);
  const [newsletter, setNewsletter] = useState<NewsletterAdminRow[]>([]);
  const [reviews, setReviews] = useState<ReviewAdminRow[]>([]);
  const [protection, setProtection] = useState<ReservationProtectionConfig>(DEFAULT_PROTECTION);
  const [reservationEditor, setReservationEditor] = useState<{
    id: number | null;
    reference?: string;
    mode: 'create' | 'edit' | 'duplicate';
    draft: ReservationEditorData;
  } | null>(null);
  const [reservationsView, setReservationsView] = useState<'calendario' | 'lista'>('calendario');
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey());

  useEffect(() => {
    if (isOpen) setImageDrafts(assets);
  }, [assets, isOpen]);

  useEffect(() => {
    if (isOpen) setMenuDrafts(menus);
  }, [menus, isOpen]);

  useEffect(() => {
    if (isOpen) setContentDraft(content);
  }, [content, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    const token = adminToken.trim();
    if (!token) return;

    Promise.all([
      getAdminReservations(token).catch(() => null),
      getAdminContacts(token).catch(() => null),
      getAdminNewsletter(token).catch(() => null),
      getAdminReservationProtection(token).catch(() => null),
      getAdminReviews(token).catch(() => null),
    ]).then(([r, c, n, p, rv]) => {
      if (r) setReservations(r.items);
      if (c) setContacts(c.items);
      if (n) setNewsletter(n.items);
      if (p) setProtection(p);
      if (rv) setReviews(rv.items);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, adminToken]);

  if (!isOpen) return null;

  const token = adminToken.trim();

  async function run(action: string, fn: () => Promise<void>, successMessage: string) {
    if (!token) {
      setError('Introduza o token de administrador para poder guardar.');
      return;
    }
    setBusy(action);
    setError(null);
    try {
      await fn();
      writeSession(ADMIN_TOKEN_STORAGE_KEY, token);
      showToast(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setBusy(null);
    }
  }

  const handlePublishImages = () => {
    void run(
      'imagens',
      async () => {
        const overrides: AssetOverride[] = imageDrafts
          .filter((asset) => {
            const def = DEFAULT_IMAGE_ASSETS.find((d) => d.id === asset.id);
            const isDefaultVisual = (asset.scale ?? 1) === 1 && (asset.px ?? 50) === 50 && (asset.py ?? 50) === 50;
            return !def || asset.url !== def.url || !isDefaultVisual;
          })
          .map((asset) => ({
            id: asset.id,
            url: asset.url,
            scale: asset.scale && asset.scale !== 1 ? asset.scale : undefined,
            px: asset.px && asset.px !== 50 ? asset.px : undefined,
            py: asset.py && asset.py !== 50 ? asset.py : undefined,
          }));
        await saveAdminAssets(overrides, token);
        onAssetsChange(imageDrafts);
      },
      'Imagens (e logótipo) publicadas para todos os visitantes.',
    );
  };

  const handleResetImages = () => {
    void run(
      'imagens',
      async () => {
        await resetAdminAssets(token);
        setImageDrafts(DEFAULT_IMAGE_ASSETS);
        onAssetsChange(DEFAULT_IMAGE_ASSETS);
      },
      'Imagens restauradas para as originais em todo o site.',
    );
  };

  const handlePublishMenus = () => {
    void run(
      'menu',
      async () => {
        await saveAdminMenus(menuDrafts, token);
        onMenusChange(menuDrafts);
      },
      'Menu publicado para todos os visitantes.',
    );
  };

  const handleResetMenus = () => {
    void run(
      'menu',
      async () => {
        await resetAdminMenus(token);
        setMenuDrafts(MENU_ITEMS);
        onMenusChange(MENU_ITEMS);
      },
      'Menu restaurado para a carta original.',
    );
  };

  const handlePublishContent = () => {
    void run(
      'conteudo',
      async () => {
        await saveSiteContent(contentDraft, token);
        onContentChange(contentDraft);
      },
      'Conteúdo do site publicado.',
    );
  };

  const handlePublishProtection = () => {
    void run(
      'protecao',
      async () => {
        await saveAdminReservationProtection(
          {
            ...protection,
            dailyCapacity: Number(protection.dailyCapacity) || DEFAULT_PROTECTION.dailyCapacity,
            maxPerClient: Number(protection.maxPerClient) || DEFAULT_PROTECTION.maxPerClient,
          },
          token,
        );
      },
      protection.enabled ? 'Proteção de reservas ligada.' : 'Proteção de reservas desligada.',
    );
  };

  const setProtectionField = <K extends keyof ReservationProtectionConfig>(key: K, value: ReservationProtectionConfig[K]) => {
    setProtection((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteReservation = (id: number) => {
    void run(
      'reservas',
      async () => {
        await deleteAdminReservation(id, token);
        setReservations((prev) => prev.filter((r) => r.id !== id));
      },
      'Reserva removida.',
    );
  };

  const draftFromRow = (r: ReservationAdminRow): ReservationEditorData => ({
    name: r.name,
    email: r.email,
    phone: r.phone,
    date: String(r.date).split('T')[0],
    time: r.time,
    guests: r.guests,
    area: r.area,
    occasion: r.occasion,
    notes: r.notes ?? '',
  });

  const openNewReservation = (date?: string) => {
    setReservationEditor({
      id: null,
      mode: 'create',
      draft: {
        name: '',
        email: '',
        phone: '',
        date: date ?? new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '20:00',
        guests: 2,
        area: 'Salão Nobre da Brasa',
        occasion: 'Jantar Gastronómico',
        notes: '',
      },
    });
  };

  const openEditReservation = (r: ReservationAdminRow) => {
    setReservationEditor({ id: r.id, reference: r.reference, mode: 'edit', draft: draftFromRow(r) });
  };

  const openDuplicateReservation = (r: ReservationAdminRow) => {
    setReservationEditor({ id: null, reference: r.reference, mode: 'duplicate', draft: draftFromRow(r) });
  };

  const handleSaveReservation = (draft: ReservationEditorData) => {
    const mode = reservationEditor?.mode ?? 'create';
    const id = reservationEditor?.id ?? null;
    void run(
      'reservas',
      async () => {
        if (mode === 'edit' && id !== null) {
          await updateAdminReservation(id, draft, token);
        } else {
          await createAdminReservation(draft, token);
        }
        const rows = await getAdminReservations(token);
        setReservations(rows.items);
      },
      mode === 'edit' ? 'Reserva atualizada.' : 'Reserva criada.',
    );
    setReservationEditor(null);
  };

  const handleDeleteContact = (id: number) => {
    void run(
      'contactos',
      async () => {
        await deleteAdminContact(id, token);
        setContacts((prev) => prev.filter((c) => c.id !== id));
      },
      'Contacto removido.',
    );
  };

  const handleDeleteNewsletter = (id: number) => {
    void run(
      'newsletter',
      async () => {
        await deleteAdminNewsletter(id, token);
        setNewsletter((prev) => prev.filter((n) => n.id !== id));
      },
      'Subscrição removida.',
    );
  };

  const updateDraftAsset = (id: string, patch: Partial<ImageAsset>) => {
    setImageDrafts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const handleAssetDrag = (e: MouseEvent, asset: ImageAsset, container: HTMLDivElement) => {
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPx = asset.px ?? 50;
    const startPy = asset.py ?? 50;

    const onMove = (ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const nextPx = clamp(startPx + (dx / rect.width) * 100, 0, 100);
      const nextPy = clamp(startPy + (dy / rect.height) * 100, 0, 100);
      updateDraftAsset(asset.id, { px: nextPx, py: nextPy });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleAssetZoom = (e: WheelEvent, asset: ImageAsset) => {
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const nextScale = clamp((asset.scale ?? 1) + delta, 1, 2.5);
    updateDraftAsset(asset.id, { scale: nextScale });
  };

  const copySlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'prato';

  const openNewItem = () => {
    const draft: MenuItem = { ...EMPTY_MENU_ITEM };
    draft.name = '';
    draft.visible = true;
    setEditingItem(draft);
    setIsItemEditorOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem({ ...item });
    setIsItemEditorOpen(true);
  };

  const saveEditingItem = () => {
    if (!editingItem) return;
    if (!editingItem.name.trim() || !editingItem.description.trim()) {
      setError('Preencha pelo menos o nome e a descrição do prato.');
      return;
    }
    const id = editingItem.id || `${copySlug(editingItem.name)}-${Date.now().toString(36)}`;
    const exists = menuDrafts.some((m) => m.id === id);
    const next = {
      ...editingItem,
      id,
      price: Number(editingItem.price) || 0,
      dryAgedDays: editingItem.dryAgedDays ? Number(editingItem.dryAgedDays) : undefined,
    };
    setMenuDrafts((prev) =>
      exists ? prev.map((m) => (m.id === id ? next : m)) : [...prev, next],
    );
    setIsItemEditorOpen(false);
    setEditingItem(null);
    setError(null);
    showToast(exists ? 'Prato atualizado na lista de rascunho.' : 'Prato adicionado à lista de rascunho.');
  };

  const removeMenuItem = (id: string) => {
    setMenuDrafts((prev) => prev.filter((m) => m.id !== id));
    setError(null);
  };

  const moveMenuItem = (index: number, direction: -1 | 1) => {
    setMenuDrafts((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setContentField = (key: keyof SiteContent, value: string) => {
    setContentDraft((prev) => ({ ...prev, [key]: value }));
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'geral', label: 'Estado', icon: LayoutDashboard },
    { id: 'imagens', label: 'Imagens & Logótipo', icon: ImageIcon },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'reservas', label: 'Reservas', icon: CalendarDays },
    { id: 'dias', label: 'Datas Fechadas', icon: CalendarX },
    { id: 'avaliacoes', label: 'Avaliações', icon: Star },
    { id: 'contactos', label: 'Contactos', icon: Mail },
    { id: 'newsletter', label: 'Newsletter', icon: Rss },
    { id: 'conteudo', label: 'Conteúdo', icon: Settings },
    { id: 'protecao', label: 'Proteção', icon: ShieldCheck },
    { id: 'seguranca', label: 'Segurança', icon: KeyRound },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-[#0C0D0E] border-l border-[#282A30] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#282A30] bg-[#141518]">
          <div>
            <h2 className="font-serif text-2xl text-[#F7F5F0] leading-tight">Painel de Administração</h2>
            <p className="text-xs text-[#F7F5F0]/60 mt-0.5 font-mono">Boca Maldita — gerir todo o site</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#F7F5F0]/70 hover:text-[#F7F5F0] hover:bg-[#282A30] transition-colors"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token bar */}
        <div className="px-6 py-3 border-b border-[#282A30] bg-[#0C0D0E] flex flex-wrap items-center gap-3">
          <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono shrink-0">
            Token de administrador
          </label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => onAdminTokenChange(e.target.value)}
            placeholder="Introduza o token para publicar alterações"
            className="flex-1 min-w-[220px] bg-[#141518] border border-[#282A30] px-3 py-2 text-sm text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373]"
          />
          {!adminEnabled && (
            <span className="text-[11px] text-amber-400/90 flex items-center gap-1.5 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              Admin desativado no servidor
            </span>
          )}
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-950/40 border-b border-red-900/50 text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button type="button" className="ml-auto text-red-300 hover:text-white" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 flex flex-wrap gap-2 border-b border-[#282A30]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider font-semibold transition-colors border ${
                  isActive
                    ? 'bg-[#D4A373] text-[#0C0D0E] border-[#D4A373]'
                    : 'bg-[#141518] text-[#F7F5F0]/70 border-[#282A30] hover:border-[#D4A373]/50 hover:text-[#D4A373]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {activeTab === 'geral' && (
            <>
              <div>
                <h3 className="font-serif text-lg text-[#F7F5F0] mb-3">Visão geral</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setReservationsView('calendario');
                      setSelectedDate(todayKey());
                      setActiveTab('reservas');
                    }}
                    className="bg-[#141518] border border-[#D4A373]/40 p-4 text-left transition-colors hover:border-[#D4A373] hover:bg-[#1C1E22]"
                    title="Abrir calendário de reservas de hoje"
                  >
                    <p className="text-3xl font-serif text-[#D4A373]">
                      {reservations.filter((r) => r.date === todayKey()).length}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 mt-1 font-mono">Reservas hoje · Calendário ›</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReservationsView('calendario');
                      setSelectedDate(todayKey());
                      setActiveTab('reservas');
                    }}
                    className="bg-[#141518] border border-[#282A30] p-4 text-left transition-colors hover:border-[#D4A373]/60 hover:bg-[#1C1E22]"
                    title="Abrir calendário de reservas"
                  >
                    <p className="text-3xl font-serif text-[#F7F5F0]">
                      {
                        reservations.filter((r) => {
                          const raw = r.created_at ?? '';
                          const iso = raw.includes(' ') ? `${raw.replace(' ', 'T')}Z` : raw;
                          const ms = Date.parse(iso);
                          return !Number.isNaN(ms) && Date.now() - ms <= 24 * 60 * 60 * 1000;
                        }).length
                      }
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 mt-1 font-mono">Novas reservas · últimas 24h ›</p>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('reservas')}
                    className="bg-[#141518] border border-[#282A30] p-4 text-left transition-colors hover:border-[#D4A373]/60 hover:bg-[#1C1E22]"
                    title="Abrir Reservas"
                  >
                    <p className="text-2xl font-serif text-[#D4A373]">{reservations.length}</p>
                    <p className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 mt-1 font-mono">Reservas ›</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contactos')}
                    className="bg-[#141518] border border-[#282A30] p-4 text-left transition-colors hover:border-[#D4A373]/60 hover:bg-[#1C1E22]"
                    title="Abrir Contactos"
                  >
                    <p className="text-2xl font-serif text-[#D4A373]">{contacts.length}</p>
                    <p className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 mt-1 font-mono">Contactos ›</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('newsletter')}
                    className="bg-[#141518] border border-[#282A30] p-4 text-left transition-colors hover:border-[#D4A373]/60 hover:bg-[#1C1E22]"
                    title="Abrir Newsletter"
                  >
                    <p className="text-2xl font-serif text-[#D4A373]">{newsletter.length}</p>
                    <p className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 mt-1 font-mono">Newsletter ›</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('menu')}
                    className="bg-[#141518] border border-[#282A30] p-4 text-left transition-colors hover:border-[#D4A373]/60 hover:bg-[#1C1E22]"
                    title="Abrir Menu"
                  >
                    <p className="text-2xl font-serif text-[#D4A373]">{menus.length}</p>
                    <p className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 mt-1 font-mono">Pratos ›</p>
                  </button>
                </div>
              </div>
              <div className="bg-[#141518] border border-[#282A30] p-5 text-sm text-[#F7F5F0]/70 space-y-2">
                <p className="text-[#D4A373] font-serif text-base">Como funciona</p>
                <ul className="space-y-1.5 list-disc pl-5">
                  <li>No separador <strong className="text-[#F7F5F0]">Imagens &amp; Logótipo</strong> pode mudar o logótipo e todas as imagens, com zoom e posição (arrastar) para o enquadramento perfeito.</li>
                  <li>No <strong className="text-[#F7F5F0]">Menu</strong> edita pratos, preços, categorias e fotos; o site realça sempre a carta mais recente.</li>
                  <li>As alterações só ficam visíveis para os visitantes depois de clicar em <strong className="text-[#F7F5F0]">Publicar</strong>.</li>
                  <li>Reservas, contactos e subscrições ficam registadas aqui. No separador <strong className="text-[#F7F5F0]">Conteúdo</strong> edita o email de contacto, horários e textos.</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'imagens' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#F7F5F0]/60">
                  Arraste sobre a miniatura para posicionar e use a roda do rato para fazer zoom. O logótipo é a primeira imagem.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePublishImages}
                    disabled={busy === 'imagens'}
                    className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                  >
                    {busy === 'imagens' ? 'A publicar…' : <Save className="w-4 h-4" />}
                    <span>Publicar imagens</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetImages}
                    disabled={busy === 'imagens'}
                    className="flex items-center gap-2 bg-[#141518] border border-[#282A30] hover:border-[#D4A373]/60 text-[#F7F5F0]/80 px-4 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repor originais
                  </button>
                </div>
              </div>

              {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                const group = imageDrafts.filter((a) => a.category === category);
                if (group.length === 0) return null;
                return (
                  <div key={category}>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#D4A373] font-mono mb-3">
                      {category === 'logo' ? '⭐ ' : ''}
                      {label}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.map((asset) => (
                        <ImageEditorCard
                          key={asset.id}
                          asset={asset}
                          onChange={updateDraftAsset}
                          onDrag={handleAssetDrag}
                          onZoom={handleAssetZoom}
                          onReset={() => {
                            const def = DEFAULT_IMAGE_ASSETS.find((d) => d.id === asset.id);
                            updateDraftAsset(asset.id, {
                              url: def?.url ?? asset.url,
                              scale: 1,
                              px: 50,
                              py: 50,
                            });
                          }}
                          onCopy={() => {
                            navigator.clipboard.writeText(asset.url);
                            showToast('Link copiado para a área de transferência.');
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={openNewItem}
                  className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2 text-xs uppercase tracking-wider font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Novo prato
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePublishMenus}
                    disabled={busy === 'menu'}
                    className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                  >
                    {busy === 'menu' ? 'A publicar…' : <Save className="w-4 h-4" />}
                    <span>Publicar menu</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetMenus}
                    disabled={busy === 'menu'}
                    className="flex items-center gap-2 bg-[#141518] border border-[#282A30] hover:border-[#D4A373]/60 text-[#F7F5F0]/80 px-4 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repor carta original
                  </button>
                </div>
              </div>

              {menuDrafts.length === 0 ? (
                <p className="text-sm text-[#F7F5F0]/50">Sem pratos ainda. Use "Novo prato" para começar.</p>
              ) : (
                <div className="space-y-2">
                  {menuDrafts.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center gap-3 bg-[#141518] border border-[#282A30] px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="text-[#F7F5F0]/60 hover:text-[#D4A373] disabled:opacity-20"
                          onClick={() => moveMenuItem(index, -1)}
                          disabled={index === 0}
                          aria-label="Subir"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="text-[#F7F5F0]/60 hover:text-[#D4A373] disabled:opacity-20"
                          onClick={() => moveMenuItem(index, 1)}
                          disabled={index === menuDrafts.length - 1}
                          aria-label="Descer"
                        >
                          ▼
                        </button>
                      </div>
                      <div
                        className="w-14 h-14 bg-[#0C0D0E] overflow-hidden shrink-0 border border-[#282A30]"
                        style={{ aspectRatio: '1 / 1' }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: '50% 50%' }}
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-base text-[#F7F5F0] truncate">{item.name}</span>
                          <span className="text-xs text-[#D4A373] font-mono">
                            {item.price.toFixed(2)} {item.currency}
                          </span>
                          {item.isChefSpecial && (
                            <span className="text-[9px] uppercase tracking-widest text-amber-400 font-mono">Chef</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#F7F5F0]/50 font-mono uppercase tracking-wider mt-0.5">
                          {MENU_CATEGORY_LABELS[item.category] ?? item.category}
                          {item.visible === false ? ' · oculto' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditItem(item)}
                          className="p-2 text-[#F7F5F0]/70 hover:text-[#D4A373] hover:bg-[#282A30]"
                          aria-label={`Editar ${item.name}`}
                          title={item.imageUrl}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMenuItem(item.id)}
                          className="p-2 text-[#F7F5F0]/70 hover:text-red-400 hover:bg-[#282A30]"
                          aria-label={`Remover ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reservas' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#F7F5F0]/60">
                  Reservas registadas no site. Podes criar, duplicar, editar, remover e ver em calendário.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex border border-[#282A30]">
                    <button
                      type="button"
                      onClick={() => setReservationsView('calendario')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-wider font-semibold ${
                        reservationsView === 'calendario'
                          ? 'bg-[#D4A373] text-[#0C0D0E]'
                          : 'text-[#F7F5F0]/60 hover:text-[#F7F5F0]'
                      }`}
                      title="Ver reservas por dia num calendário"
                    >
                      <CalendarDays className="w-3.5 h-3.5" /> Calendário
                    </button>
                    <button
                      type="button"
                      onClick={() => setReservationsView('lista')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-wider font-semibold ${
                        reservationsView === 'lista'
                          ? 'bg-[#D4A373] text-[#0C0D0E]'
                          : 'text-[#F7F5F0]/60 hover:text-[#F7F5F0]'
                      }`}
                      title="Ver reservas agrupadas por data numa lista"
                    >
                      <List className="w-3.5 h-3.5" /> Lista
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewReservation()}
                    className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2 text-xs uppercase tracking-wider font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Nova reserva
                  </button>
                </div>
              </div>
              {reservations.length === 0 ? (
                <p className="text-sm text-[#F7F5F0]/50">Ainda não há reservas.</p>
              ) : reservationsView === 'calendario' ? (
                <ReservationsCalendar
                  reservations={reservations}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  capacity={protection.enabled ? protection.dailyCapacity : undefined}
                  busy={busy}
                  onEdit={openEditReservation}
                  onDuplicate={openDuplicateReservation}
                  onDelete={(r) => handleDeleteReservation(r.id)}
                  onBookOnDay={(d) => openNewReservation(d)}
                />
              ) : (
                <ReservationsList
                  reservations={reservations}
                  busy={busy}
                  onEdit={openEditReservation}
                  onDuplicate={openDuplicateReservation}
                  onDelete={(r) => handleDeleteReservation(r.id)}
                />
              )}
            </div>
          )}

          {activeTab === 'contactos' && (
            <div className="space-y-3">
              <p className="text-xs text-[#F7F5F0]/60">Mensagens enviadas através do formulário de contactos.</p>
              {contacts.length === 0 ? (
                <p className="text-sm text-[#F7F5F0]/50">Ainda não há mensagens.</p>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} className="bg-[#141518] border border-[#282A30] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-base text-[#F7F5F0]">
                          {c.name} <span className="text-[#D4A373]">· {c.subject}</span>
                        </p>
                        <p className="text-[11px] text-[#F7F5F0]/60 mt-0.5 font-mono">{c.email}</p>
                        <p className="text-sm text-[#F7F5F0]/70 mt-2 whitespace-pre-wrap">{c.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(c.id)}
                        disabled={busy === 'contactos'}
                        className="flex items-center gap-2 px-3 py-2 border border-red-900/60 text-red-300 hover:bg-red-950/50 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'newsletter' && (
            <div className="space-y-3">
              <p className="text-xs text-[#F7F5F0]/60">Subscrições do boletim de novidades.</p>
              {newsletter.length === 0 ? (
                <p className="text-sm text-[#F7F5F0]/50">Ainda não há subscrições.</p>
              ) : (
                newsletter.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-3 bg-[#141518] border border-[#282A30] p-4">
                    <p className="font-mono text-sm text-[#F7F5F0]">{n.email}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteNewsletter(n.id)}
                      disabled={busy === 'newsletter'}
                      className="flex items-center gap-2 px-3 py-2 border border-red-900/60 text-red-300 hover:bg-red-950/50 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'conteudo' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#F7F5F0]/60">
                  Textos e contactos do site. Deixe o campo vazio para usar os textos originais.
                </p>
                <button
                  type="button"
                  onClick={handlePublishContent}
                  disabled={busy === 'conteudo'}
                  className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                >
                  {busy === 'conteudo' ? 'A publicar…' : <Save className="w-4 h-4" />}
                  <span>Publicar conteúdo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ContentField label="Email de contacto" value={contentDraft.contactEmail} onChange={(v) => setContentField('contactEmail', v)} />
                <ContentField label="Telefone" value={contentDraft.phone} onChange={(v) => setContentField('phone', v)} />
                <ContentField label="WhatsApp (número)" value={contentDraft.whatsapp} onChange={(v) => setContentField('whatsapp', v)} helper="Só dígitos com indicativo (ex.: 351253031890). Vazio usa o telefone. Aplica-se em todo o site." />
                <ContentField label="Morada" value={contentDraft.address} onChange={(v) => setContentField('address', v)} />
                <ContentField label="Horário" value={contentDraft.hours} onChange={(v) => setContentField('hours', v)} />
                <ContentField label="Título principal (hero)" value={contentDraft.headline} onChange={(v) => setContentField('headline', v)} />
                <ContentField label="Subtítulo (hero)" value={contentDraft.heroSubtitle} onChange={(v) => setContentField('heroSubtitle', v)} />
                <ContentField label="Título da secção sobre o restaurante" value={contentDraft.aboutTitle} onChange={(v) => setContentField('aboutTitle', v)} />
                <ContentField label="Instagram" value={contentDraft.instagram} onChange={(v) => setContentField('instagram', v)} />
                <ContentField label="Facebook" value={contentDraft.facebook} onChange={(v) => setContentField('facebook', v)} />
                <ContentField label="Link do vídeo (Facebook, mp4, webm)" value={contentDraft.videoUrl} onChange={(v) => setContentField('videoUrl', v)} helper="Aceita link do Facebook (reproduz em embed), ficheiro .mp4/.webm/.m3u8 ou outro URL a abrir em nova aba." />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Texto sobre o restaurante</label>
                <textarea
                  value={contentDraft.aboutText}
                  onChange={(e) => setContentField('aboutText', e.target.value)}
                  rows={6}
                  className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373] resize-y"
                />
              </div>
            </div>
          )}

          {activeTab === 'dias' && (
            <ClosedDaysManager adminToken={token} busy={busy} run={run} />
          )}

          {activeTab === 'avaliacoes' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#F7F5F0]/60">
                  Avaliações deixadas pelos clientes no site. Só aparecem publicamente depois de <strong className="text-[#F7F5F0]">Apresentar</strong>.
                  {reviews.filter((r) => r.status === 'pending').length > 0 && (
                    <span className="ml-1 text-amber-400">
                      {reviews.filter((r) => r.status === 'pending').length} por aprovar.
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setReviews([...reviews])}
                  className="flex items-center gap-2 bg-[#141518] border border-[#282A30] hover:border-[#D4A373]/60 text-[#F7F5F0]/80 px-4 py-2 text-xs uppercase tracking-wider font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  Recarregar
                </button>
              </div>

              {reviews.length === 0 ? (
                <div className="bg-[#141518] border border-[#282A30] p-5 text-sm text-[#F7F5F0]/60">
                  Ainda não há avaliações. Quando um cliente submeter uma avaliação no site, ela aparece aqui para aprovação.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-[#141518] border border-[#282A30] p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-serif text-[#F7F5F0]">{review.name}</span>
                          <span
                            className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 border ${
                              review.status === 'approved'
                                ? 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40'
                                : review.status === 'rejected'
                                  ? 'text-red-300 border-red-500/40 bg-red-950/40'
                                  : 'text-amber-300 border-amber-500/40 bg-amber-950/40'
                            }`}
                          >
                            {review.status === 'approved' ? 'Apresentada' : review.status === 'rejected' ? 'Rejeitada' : 'Por aprovar'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#F7F5F0]/40">
                          {new Date(review.created_at.includes(' ') ? `${review.created_at.replace(' ', 'T')}Z` : review.created_at).toLocaleString('pt-PT')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[11px] text-[#A6A8AD]">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#D4A373]" /> Serviço: {review.service_rating}/5
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#D4A373]" /> Comida: {review.food_rating}/5
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#D4A373]" /> Ambiente: {review.ambience_rating}/5
                        </span>
                      </div>
                      <p className="text-sm text-[#F7F5F0]/85 leading-relaxed">{review.comment}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={busy === 'avaliacoes'}
                            onClick={() =>
                              void run(
                                'avaliacoes',
                                async () => {
                                  await setAdminReviewStatus(review.id, 'approved', token);
                                  setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status: 'approved' } : r)));
                                },
                                'Avaliação apresentada publicamente.',
                              )
                            }
                            className="flex items-center gap-1.5 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Apresentar
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busy === 'avaliacoes'}
                            onClick={() =>
                              void run(
                                'avaliacoes',
                                async () => {
                                  await setAdminReviewStatus(review.id, 'rejected', token);
                                  setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status: 'rejected' } : r)));
                                },
                                'Avaliação rejeitada.',
                              )
                            }
                            className="flex items-center gap-1.5 bg-[#141518] border border-[#282A30] hover:border-red-500/60 text-[#F7F5F0]/80 px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Rejeitar
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === 'avaliacoes'}
                          onClick={() =>
                            void run(
                              'avaliacoes',
                              async () => {
                                await deleteAdminReview(review.id, token);
                                setReviews((prev) => prev.filter((r) => r.id !== review.id));
                              },
                              'Avaliação eliminada.',
                            )
                          }
                          className="flex items-center gap-1.5 bg-[#141518] border border-[#282A30] hover:border-red-500/60 text-red-300 px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'seguranca' && (
            <SecurityTabContent
              adminToken={adminToken}
              busy={busy}
              run={run}
              onAdminTokenChange={onAdminTokenChange}
              onClose={onClose}
            />
          )}

          {activeTab === 'protecao' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#F7F5F0]/60">
                  Protege contra reservas fraudulentas (robôs / alguém a reservar todas as mesas). És tu quem decide: desligado não muda nada no site; ligado aplica as regras que escolheres.
                </p>
                <button
                  type="button"
                  onClick={handlePublishProtection}
                  disabled={busy === 'protecao'}
                  className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                >
                  {busy === 'protecao' ? 'A guardar…' : <Save className="w-4 h-4" />}
                  <span>Guardar proteção</span>
                </button>
              </div>

              <ProtectionSwitch
                checked={protection.enabled}
                onChange={(v) => setProtectionField('enabled', v)}
                label="Proteção ligada (interruptor geral)"
                hint={protection.enabled ? 'ATIVO — as regras abaixo são aplicadas a novas reservas.' : 'DESLIGADO — comportamento atual, sem regras.'}
                important={protection.enabled}
              />

              <div className={`space-y-3 opacity-100 transition-opacity ${protection.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A373] font-mono">Regras ativas quando ligado</p>

                <ProtectionSwitch
                  checked={protection.pauseForm}
                  onChange={(v) => setProtectionField('pauseForm', v)}
                  label="Pausar reservas online"
                  hint="Desliga o formulário e mostra aos visitantes um aviso com o telefone de contacto."
                />
                <ProtectionSwitch
                  checked={protection.requireCheck}
                  onChange={(v) => setProtectionField('requireCheck', v)}
                  label="Pergunta anti-robô no formulário"
                  hint="Mostra uma pergunta de aritmética aleatória (ex.: «quanto é 7 mais 5?») + campo escondido (honeypot) para travar bots."
                />
                <ProtectionSwitch
                  checked={protection.rateLimit}
                  onChange={(v) => setProtectionField('rateLimit', v)}
                  label="Limite de ritmo por IP"
                  hint="Máximo de 5 pedidos de reserva por 15 minutos e por visitante (aproximado em serverless)."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">
                      Capacidade máxima por dia
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={protection.dailyCapacity}
                      onChange={(e) => setProtectionField('dailyCapacity', Number(e.target.value))}
                      className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
                    />
                    <p className="text-[10px] text-[#F7F5F0]/40 mt-1">Acima deste número, o site devolve «Lotação esgotada para esta data».</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">
                      Máximo por cliente (por dia)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={protection.maxPerClient}
                      onChange={(e) => setProtectionField('maxPerClient', Number(e.target.value))}
                      className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
                    />
                    <p className="text-[10px] text-[#F7F5F0]/40 mt-1">Limita reservas repetidas na mesma data com o mesmo email/telefone.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isItemEditorOpen && editingItem && (
        <MenuItemEditor
          item={editingItem}
          onChange={setEditingItem}
          onCancel={() => {
            setIsItemEditorOpen(false);
            setEditingItem(null);
          }}
          onSave={saveEditingItem}
        />
      )}

      {reservationEditor && (
        <ReservationEditor
          draft={reservationEditor.draft}
          mode={reservationEditor.mode}
          reference={reservationEditor.reference}
          onCancel={() => setReservationEditor(null)}
          onSave={handleSaveReservation}
        />
      )}
    </div>
  );
}

interface ImageEditorCardProps {
  key?: string;
  asset: ImageAsset;
  onChange: (id: string, patch: Partial<ImageAsset>) => void;
  onDrag: (e: MouseEvent, asset: ImageAsset, container: HTMLDivElement) => void;
  onZoom: (e: WheelEvent, asset: ImageAsset) => void;
  onReset: () => void;
  onCopy: () => void;
}

function ImageEditorCard({ asset, onChange, onDrag, onZoom, onReset, onCopy }: ImageEditorCardProps) {
  const [copied, setCopied] = useState(false);
  const scale = asset.scale ?? 1;
  const px = asset.px ?? 50;
  const py = asset.py ?? 50;

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-[#141518] border border-[#282A30] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-serif text-sm text-[#F7F5F0] truncate">{asset.name}</p>
          <p className="text-[10px] text-[#F7F5F0]/40 font-mono truncate">{asset.id}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 p-1.5 text-[#F7F5F0]/50 hover:text-[#D4A373] hover:bg-[#282A30]"
          title="Repor imagem original (sem zoom/posição)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div
        className="w-full h-40 bg-[#0C0D0E] border border-[#282A30] overflow-hidden relative cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={(e) => onDrag(e, asset, e.currentTarget)}
        onWheel={(e) => onZoom(e, asset)}
        title="Arraste para posicionar · roda do rato para zoom"
      >
        <img
          src={asset.url}
          alt={asset.name}
          className="w-full h-full pointer-events-none select-none"
          style={{
            objectFit: 'cover',
            objectPosition: `${px}% ${py}%`,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
          }}
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 bg-[#0C0D0E]/80 border border-[#282A30] text-[9px] font-mono text-[#F7F5F0]/70 px-2 py-1 pointer-events-none">
          zoom {scale.toFixed(2)}× · {Math.round(px)}% / {Math.round(py)}%
        </div>
      </div>

      <label className="flex items-center gap-2">
        <LinkIcon className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
        <input
          type="text"
          value={asset.url}
          onChange={(e) => onChange(asset.id, { url: e.target.value })}
          className="flex-1 min-w-0 bg-[#0C0D0E] border border-[#282A30] px-2.5 py-2 text-xs text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373] font-mono"
          placeholder="https://…"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 p-2 text-[#F7F5F0]/60 hover:text-[#D4A373] hover:bg-[#282A30]"
          title="Copiar link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </label>

      <div className="grid grid-cols-1 gap-2">
        <Slider label={`Zoom ${scale.toFixed(2)}×`} min={1} max={2.5} step={0.01} value={scale} onChange={(v) => onChange(asset.id, { scale: v })} />
        <Slider label={`Esquerda / Direita · ${Math.round(px)}%`} min={0} max={100} step={1} value={px} onChange={(v) => onChange(asset.id, { px: v })} />
        <Slider label={`Cima / Baixo · ${Math.round(py)}%`} min={0} max={100} step={1} value={py} onChange={(v) => onChange(asset.id, { py: v })} />
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-[#F7F5F0]/60 font-mono">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1.5 accent-[#D4A373]"
      />
    </label>
  );
}

interface ProtectionSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
  important?: boolean;
}

function ProtectionSwitch({ checked, onChange, label, hint, important }: ProtectionSwitchProps) {
  return (
    <label
      className={`flex items-start justify-between gap-4 bg-[#141518] border p-4 cursor-pointer ${
        checked && important ? 'border-[#D4A373] bg-[#D4A373]/5' : 'border-[#282A30] hover:border-[#686B73]'
      }`}
    >
      <div>
        <p className="text-sm text-[#F7F5F0] font-semibold">{label}</p>
        <p className="text-[11px] text-[#F7F5F0]/50 mt-0.5 leading-snug">{hint}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 shrink-0 accent-[#D4A373] mt-0.5 cursor-pointer"
      />
    </label>
  );
}

interface ContentFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}

function ContentField({ label, value, onChange, helper }: ContentFieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373]"
      />
      {helper ? <p className="text-[10px] text-[#F7F5F0]/40 mt-1">{helper}</p> : null}
    </div>
  );
}

interface ReservationCardProps {
  r: ReservationAdminRow;
  busy?: string | null;
  onEdit: (r: ReservationAdminRow) => void;
  onDuplicate: (r: ReservationAdminRow) => void;
  onDelete: (r: ReservationAdminRow) => void;
}

function ReservationCard({ r, busy, onEdit, onDuplicate, onDelete }: ReservationCardProps) {
  return (
    <div className="bg-[#141518] border border-[#282A30] p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-serif text-base text-[#F7F5F0]">
            {r.name} <span className="text-[#D4A373]">· {r.reference}</span>
            {r.status && r.status !== 'confirmed' && (
              <span
                className={`ml-2 text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 border ${
                  r.status === 'pending'
                    ? 'text-amber-400 border-amber-500/40'
                    : 'text-red-400 border-red-500/40'
                }`}
              >
                {r.status === 'pending' ? 'Pendente' : r.status}
              </span>
            )}
          </p>
          <p className="text-xs text-[#F7F5F0]/60 mt-1">
            {r.date.split('T')[0]} às {r.time} · {r.guests} convidados · {r.area} · {r.occasion}
          </p>
          <p className="text-xs text-[#F7F5F0]/60">
            {r.email} · {r.phone}
          </p>
          {r.notes ? <p className="text-xs text-[#F7F5F0]/40 mt-1 italic">"{r.notes}"</p> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(r)}
            className="p-2 text-[#F7F5F0]/70 hover:text-[#D4A373] hover:bg-[#282A30]"
            aria-label={`Editar ${r.reference}`}
            title="Editar reserva"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(r)}
            className="p-2 text-[#F7F5F0]/70 hover:text-[#D4A373] hover:bg-[#282A30]"
            aria-label={`Duplicar ${r.reference}`}
            title="Duplicar reserva"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(r)}
            disabled={busy === 'reservas'}
            className="flex items-center gap-2 px-3 py-2 border border-red-900/60 text-red-300 hover:bg-red-950/50 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationsCalendar({
  reservations,
  selectedDate,
  onSelectDate,
  capacity,
  busy,
  onEdit,
  onDuplicate,
  onDelete,
  onBookOnDay,
}: {
  reservations: ReservationAdminRow[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  capacity?: number;
  busy?: string | null;
  onEdit: (r: ReservationAdminRow) => void;
  onDuplicate: (r: ReservationAdminRow) => void;
  onDelete: (r: ReservationAdminRow) => void;
  onBookOnDay: (date: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && (y !== cursor.year || m - 1 !== cursor.month)) {
      setCursor({ year: y, month: m - 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, ReservationAdminRow[]>();
    for (const r of reservations) {
      const key = String(r.date).split('T')[0];
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [reservations]);

  const today = todayKey();
  const first = new Date(cursor.year, cursor.month, 1);
  const offset = (first.getDay() + 6) % 7;
  const cells: Date[] = [];
  const start = new Date(cursor.year, cursor.month, 1 - offset);
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }

  const prevMonth = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const nextMonth = () =>
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  const goToday = () => {
    const t = new Date();
    setCursor({ year: t.getFullYear(), month: t.getMonth() });
    onSelectDate(todayKey());
  };

  const dayReservations = (byDate.get(selectedDate) ?? [])
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
  const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);

  return (
    <div className="space-y-3">
      <div className="bg-[#141518] border border-[#282A30] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 text-[#F7F5F0]/60 hover:text-[#D4A373]"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg text-[#F7F5F0] capitalize">
              {first.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={goToday}
              className="text-[10px] uppercase tracking-widest text-[#D4A373] border border-[#D4A373]/40 px-2 py-1 hover:bg-[#D4A373]/10"
            >
              Hoje
            </button>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 text-[#F7F5F0]/60 hover:text-[#D4A373]"
            aria-label="Mês seguinte"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-widest text-[#F7F5F0]/40 font-mono mb-1">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="py-1">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const key = dateToKey(d);
            const inMonth = d.getMonth() === cursor.month;
            const isToday = key === today;
            const isSelected = key === selectedDate;
            const count = (byDate.get(key) ?? []).length;
            const full = capacity != null && capacity > 0 && count >= capacity;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(key)}
                className={`relative flex flex-col items-center justify-center gap-0.5 aspect-square border text-[11px] transition-colors ${
                  inMonth ? 'text-[#F7F5F0]' : 'text-[#F7F5F0]/25'
                } ${isSelected ? 'border-[#D4A373] bg-[#D4A373]/15' : 'border-[#282A30] hover:border-[#D4A373]/60'} ${
                  inMonth && count > 0 ? 'bg-[#1C1E22]' : 'bg-transparent'
                }`}
                aria-label={`${d.getDate()}/${cursor.month + 1}/${cursor.year}${count > 0 ? ` — ${count} reservas` : ''}`}
              >
                <span className={`font-mono ${isToday ? 'text-[#D4A373] font-bold' : ''}`}>{d.getDate()}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-mono leading-none ${full ? 'text-red-400' : 'text-[#D4A373]'}`}>
                    {capacity != null ? `${count}/${capacity}` : `${count}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[#F7F5F0]/40 mt-2 font-mono">
          {dayReservations.length} {dayReservations.length === 1 ? 'reserva' : 'reservas'} a{' '}
          {String(selDay).padStart(2, '0')}/{String(selMonth + 1).padStart(2, '0')}/{selYear}
          {capacity != null ? ` · capacidade ${capacity} por dia` : ''}
        </p>
      </div>

      {dayReservations.length === 0 ? (
        <div className="bg-[#141518] border border-[#282A30] p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[#F7F5F0]/50">Sem reservas nesta data.</p>
          <button
            type="button"
            onClick={() => onBookOnDay(selectedDate)}
            className="flex items-center gap-2 border border-[#D4A373]/50 text-[#D4A373] hover:bg-[#D4A373]/10 px-3 py-2 text-[11px] uppercase tracking-wider font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Reservar aqui
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayReservations.map((r) => (
            <div key={r.id}>
              <ReservationCard r={r} busy={busy} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationsList({
  reservations,
  busy,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  reservations: ReservationAdminRow[];
  busy?: string | null;
  onEdit: (r: ReservationAdminRow) => void;
  onDuplicate: (r: ReservationAdminRow) => void;
  onDelete: (r: ReservationAdminRow) => void;
}) {
  const today = todayKey();
  const sorted = [...reservations].sort(
    (a, b) => String(a.date).localeCompare(String(b.date)) || a.time.localeCompare(b.time),
  );
  const byDate = new Map<string, ReservationAdminRow[]>();
  for (const r of sorted) {
    const key = String(r.date).split('T')[0];
    const arr = byDate.get(key) ?? [];
    arr.push(r);
    byDate.set(key, arr);
  }
  const upcomingDates = [...byDate.keys()].filter((d) => d >= today).sort();
  const pastDates = [...byDate.keys()].filter((d) => d < today).sort().reverse();

  const renderGroup = (date: string, dimmed: boolean) => (
    <div key={date} className={`space-y-2 ${dimmed ? 'opacity-55' : ''}`}>
      <div className="flex items-center gap-2">
        <h4 className="text-xs uppercase tracking-widest text-[#D4A373] font-mono capitalize">
          {formatDateLabel(date)}
        </h4>
        {date === today && (
          <span className="text-[9px] uppercase tracking-widest text-[#0C0D0E] bg-[#D4A373] px-1.5 py-0.5 font-mono">
            Hoje
          </span>
        )}
        <span className="h-px flex-1 bg-[#282A30]" />
        <span className="text-[10px] font-mono text-[#F7F5F0]/40">
          {byDate.get(date)!.length} {byDate.get(date)!.length === 1 ? 'reserva' : 'reservas'}
        </span>
      </div>
      {byDate.get(date)!.map((r) => (
        <div key={r.id}>
          <ReservationCard r={r} busy={busy} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {upcomingDates.map((date) => renderGroup(date, false))}
        {upcomingDates.length === 0 && (
          <p className="text-sm text-[#F7F5F0]/50">Sem reservas futuras.</p>
        )}
      </div>
      {pastDates.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-widest text-[#F7F5F0]/40 font-mono">Passadas</h4>
          {pastDates.map((date) => renderGroup(date, true))}
        </div>
      )}
    </div>
  );
}

interface ReservationEditorProps {
  draft: ReservationEditorData;
  mode: 'create' | 'edit' | 'duplicate';
  reference?: string;
  onCancel: () => void;
  onSave: (draft: ReservationEditorData) => void;
}

const RESERVATION_TIMES = ['12:30', '13:00', '13:30', '14:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
const RESERVATION_GUESTS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16];

function ReservationEditor({ draft, mode, reference, onCancel, onSave }: ReservationEditorProps) {
  const [data, setData] = useState<ReservationEditorData>(draft);
  const title = mode === 'edit' ? `Editar reserva ${reference ?? ''}`.trim() : mode === 'duplicate' ? 'Duplicar reserva' : 'Nova reserva';
  const set = (key: keyof ReservationEditorData, value: string | number) => setData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg bg-[#0C0D0E] border border-[#282A30] max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#282A30] bg-[#141518]">
          <h3 className="font-serif text-lg text-[#F7F5F0]">{title}</h3>
          <button type="button" onClick={onCancel} className="p-1.5 text-[#F7F5F0]/70 hover:text-[#F7F5F0]" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Nome completo *</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => set('name', e.target.value)}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Telemóvel *</label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Email *</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => set('email', e.target.value)}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Data *</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => set('date', e.target.value)}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Hora *</label>
              <select
                value={data.time}
                onChange={(e) => set('time', e.target.value)}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              >
                {RESERVATION_TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Convidados *</label>
              <select
                value={data.guests}
                onChange={(e) => set('guests', Number(e.target.value))}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              >
                {RESERVATION_GUESTS.map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'pessoa' : 'pessoas'}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Área *</label>
            <input
              type="text"
              value={data.area}
              onChange={(e) => set('area', e.target.value)}
              className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Ocasião *</label>
            <input
              type="text"
              value={data.occasion}
              onChange={(e) => set('occasion', e.target.value)}
              className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Notas</label>
            <textarea
              value={data.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373] resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#282A30] bg-[#141518]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#0C0D0E] border border-[#282A30] text-[#F7F5F0]/70 text-xs uppercase tracking-wider font-semibold hover:border-[#D4A373]/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(data)}
            className="px-4 py-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] text-xs uppercase tracking-wider font-semibold"
          >
            {mode === 'edit' ? 'Guardar alterações' : mode === 'duplicate' ? 'Criar duplicada' : 'Criar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MenuItemEditorProps {
  item: MenuItem;
  onChange: (item: MenuItem) => void;
  onCancel: () => void;
  onSave: () => void;
}

const ITEM_FIELDS: { key: keyof MenuItem; label: string; type: string; desc?: string }[] = [
  { key: 'name', label: 'Nome do prato', type: 'text' },
  { key: 'price', label: 'Preço', type: 'number' },
  { key: 'badge', label: 'Distintivo (ex.: "Recomendado")', type: 'text' },
  { key: 'tagline', label: 'Frase curta', type: 'text' },
  { key: 'imageUrl', label: 'Imagem (link)', type: 'text' },
  { key: 'servesCount', label: 'Serve (ex.: "2 pessoas")', type: 'text' },
  { key: 'dryAgedDays', label: 'Dias de maturação (opcional)', type: 'number' },
  { key: 'origin', label: 'Origem / produtor', type: 'text' },
  { key: 'pairingWine', label: 'Sugestão de vinho', type: 'text' },
];

function itemFieldsFor(category: MenuItem['category']): { key: keyof MenuItem; label: string; type: string; desc?: string }[] {
  if (category !== 'vinhos') return ITEM_FIELDS;
  const wineFields: { key: keyof MenuItem; label: string; type: string }[] = [
    { key: 'producer', label: 'Produtor', type: 'text' },
    { key: 'vintage', label: 'Ano / Colheita', type: 'text' },
  ];
  return ITEM_FIELDS
    .filter((field) => !['servesCount', 'dryAgedDays', 'pairingWine'].includes(field.key))
    .flatMap((field) => (field.key === 'origin' ? [field, ...wineFields] : [field]))
    .map((field) => (field.key === 'origin' ? { ...field, label: 'Região' } : field));
}

function MenuItemEditor({ item, onChange, onCancel, onSave }: MenuItemEditorProps) {
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg bg-[#0C0D0E] border border-[#282A30] max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#282A30] bg-[#141518]">
          <h3 className="font-serif text-lg text-[#F7F5F0]">{item.id ? 'Editar prato' : 'Novo prato'}</h3>
          <button type="button" onClick={onCancel} className="p-1.5 text-[#F7F5F0]/70 hover:text-[#F7F5F0]" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {itemFieldsFor(item.category).map((field) => (
            <div key={field.key as string}>
              <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">{field.label}</label>
              <input
                type={field.type}
                value={String(item[field.key] ?? '')}
                onChange={(e) => {
                  const value = field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                  onChange({ ...item, [field.key]: value as never });
                }}
                className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              />
            </div>
          ))}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Categoria</label>
            <select
              value={item.category}
              onChange={(e) => onChange({ ...item, category: e.target.value as MenuItem['category'] })}
              className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            >
              {Object.entries(MENU_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Descrição</label>
            <textarea
              value={item.description}
              onChange={(e) => onChange({ ...item, description: e.target.value })}
              rows={4}
              className="mt-2 w-full bg-[#141518] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs text-[#F7F5F0]/80">
              <input
                type="checkbox"
                checked={item.isChefSpecial === true}
                onChange={(e) => onChange({ ...item, isChefSpecial: e.target.checked })}
                className="accent-[#D4A373]"
              />
              Especial do chef
            </label>
            <label className="flex items-center gap-2 text-xs text-[#F7F5F0]/80">
              <input
                type="checkbox"
                checked={item.visible !== false}
                onChange={(e) => onChange({ ...item, visible: e.target.checked })}
                className="accent-[#D4A373]"
              />
              Visível no menu
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#282A30] bg-[#141518]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#0C0D0E] border border-[#282A30] text-[#F7F5F0]/70 text-xs uppercase tracking-wider font-semibold hover:border-[#D4A373]/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] text-xs uppercase tracking-wider font-semibold"
          >
            {item.id ? 'Guardar alterações' : 'Adicionar prato'}
          </button>
        </div>
      </div>
    </div>
  );
}

type RunFn = (action: string, fn: () => Promise<void>, successMessage: string) => Promise<void>;

function generateStrongToken(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*_-+=';
  const all = upper + lower + digits + special;
  const random = () => window.crypto.getRandomValues(new Uint32Array(1))[0];
  const pick = (s: string) => s[random() % s.length];
  const parts = [pick(upper), pick(lower), pick(digits), pick(special)];
  for (let i = 0; i < 20; i += 1) parts.push(all[random() % all.length]);
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const j = random() % (i + 1);
    const tmp = parts[i];
    parts[i] = parts[j];
    parts[j] = tmp;
  }
  return parts.join('');
}

function SecurityTabContent({
  adminToken,
  busy,
  run,
  onAdminTokenChange,
  onClose,
}: {
  adminToken: string;
  busy: string | null;
  run: RunFn;
  onAdminTokenChange: (token: string) => void;
  onClose: () => void;
}) {
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-lg text-[#F7F5F0] mb-2">Alterar token de administrador</h3>
        <p className="text-xs text-[#F7F5F0]/60">
          O token protege todo o painel. Para ser aceite tem de cumprir: pelo menos <strong className="text-[#F7F5F0]">16 caracteres</strong>, uma letra <strong className="text-[#F7F5F0]">maiúscula</strong>, uma <strong className="text-[#F7F5F0]">minúscula</strong>, um <strong className="text-[#F7F5F0]">número</strong> e um <strong className="text-[#F7F5F0]">carácter especial</strong>. Depois de alterar, a sessão atual termina e terá de iniciar sessão com o novo token.
        </p>
      </div>

      <div className="bg-[#141518] border border-[#282A30] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">
            Novo token
          </label>
          <button
            type="button"
            onClick={() => setNewToken(generateStrongToken())}
            className="text-[11px] text-[#D4A373] hover:text-[#e0b585] underline uppercase tracking-wider"
          >
            Gerar token forte
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type={showToken ? 'text' : 'password'}
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder="Cole o novo token aqui"
            className="flex-1 bg-[#1C1E22] border border-[#282A30] px-3.5 py-2.5 text-xs font-mono text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373]"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="px-3 py-2 bg-[#0C0D0E] border border-[#282A30] text-[#F7F5F0]/70 text-xs uppercase tracking-wider hover:border-[#D4A373]/60"
          >
            {showToken ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {newToken && !/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{16,}$/.test(newToken.trim()) && (
          <p className="text-[11px] text-amber-400">
            Este token ainda não cumpre todos os requisitos de segurança.
          </p>
        )}
        <button
          type="button"
          disabled={busy === 'seguranca' || !adminToken.trim()}
          onClick={() =>
            void run(
              'seguranca',
              async () => {
                await updateAdminToken(newToken.trim(), adminToken.trim());
                setNewToken('');
                setShowToken(false);
                onAdminTokenChange('');
                onClose();
              },
              'Token alterado com sucesso. Inicie sessão com o novo token.',
            )
          }
          className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2.5 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
        >
          <KeyRound className="w-4 h-4" />
          Alterar token
        </button>
      </div>
    </div>
  );
}

const REPEAT_LABELS: Record<string, string> = {
  none: 'Sem repetição',
  weekly: 'Todas as semanas',
  yearly: 'Todos os anos',
};

function dateKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ClosedDaysManager({
  adminToken,
  busy,
  run,
}: {
  adminToken: string;
  busy: string | null;
  run: RunFn;
}) {
  const [items, setItems] = useState<ClosedPeriod[]>([]);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => dateKeyFromDate(new Date(Date.now() + 86400000)));
  const [endDate, setEndDate] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'weekly' | 'yearly'>('none');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const { items: list } = await getAdminClosedDays(adminToken);
      setItems(list);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao carregar datas fechadas.');
    }
  };

  useEffect(() => {
    if (!adminToken.trim()) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const handleAdd = () => {
    setFormError(null);
    if (title.trim().length < 2) {
      setFormError('Indique um motivo (mínimo de 2 caracteres).');
      return;
    }
    if (!startDate) {
      setFormError('Escolha a data de início.');
      return;
    }
    if (endDate && endDate < startDate) {
      setFormError('A data final tem de ser igual ou posterior à data inicial.');
      return;
    }
    void run(
      'dias',
      async () => {
        await createAdminClosedDay({ title: title.trim(), startDate, endDate: endDate || undefined, repeat, note: note.trim() }, adminToken);
        setTitle('');
        setEndDate('');
        setNote('');
        await reload();
      },
      'Período registado. As reservas online nesse(s) dia(s) ficarão bloqueadas.',
    );
  };

  const handleDelete = (id: number) => {
    void run(
      'dias',
      async () => {
        await deleteAdminClosedDay(id, adminToken);
        await reload();
      },
      'Período removido.',
    );
  };

  const formatDate = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-lg text-[#F7F5F0] mb-1">Datas Fechadas</h3>
        <p className="text-xs text-[#F7F5F0]/60">
          Defina dias em que não há reservas online (ex.: feriados, férias, eventos privados). Pode usar um só dia, um intervalo, ou repetir a regra todas as semanas ou todos os anos. As reservas online nesses dias são bloqueadas; pelo painel continua a poder registar reservas manualmente.
        </p>
      </div>

      <div className="bg-[#141518] border border-[#282A30] p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">Novo período fechado</p>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Motivo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Férias de verão · Feriado nacional · Evento privado"
            className="w-full bg-[#1C1E22] border border-[#282A30] px-3.5 py-2.5 text-sm text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Data de início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">
              Data final <span className="normal-case text-[#F7F5F0]/40">(opcional — só para intervalo)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Repetição</label>
          <div className="flex flex-wrap gap-2">
            {(['none', 'weekly', 'yearly'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRepeat(value)}
                className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold border transition-colors ${
                  repeat === value
                    ? 'bg-[#D4A373] text-[#0C0D0E] border-[#D4A373]'
                    : 'bg-[#0C0D0E] text-[#F7F5F0]/70 border-[#282A30] hover:border-[#D4A373]/50'
                }`}
              >
                {REPEAT_LABELS[value]}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#F7F5F0]/50 mt-2">
            {repeat === 'weekly'
              ? 'Bloqueia o(s) mesmo(s) dia(s) da semana todas as semanas (ex.: encerrado aos sábados e domingos).'
              : repeat === 'yearly'
                ? 'Bloqueia as mesmas datas todos os anos (ex.: 24 e 25 de dezembro).'
                : 'Bloqueia apenas a(s) data(s) indicada(s), sem repetição.'}
          </p>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">
            Nota interna <span className="normal-case text-[#F7F5F0]/40">(opcional, não é mostrada no site)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: equipa de férias"
            className="w-full bg-[#1C1E22] border border-[#282A30] px-3.5 py-2.5 text-sm text-[#F7F5F0] placeholder:text-[#F7F5F0]/30 focus:outline-none focus:border-[#D4A373]"
          />
        </div>
        {formError && <p className="text-xs text-red-300 bg-red-950/60 border border-red-500/40 px-3 py-2">{formError}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy === 'dias' || !adminToken.trim()}
          className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2.5 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar período fechado
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-[#141518] border border-[#282A30] p-5 text-sm text-[#F7F5F0]/60">
            Sem períodos fechados. Enquanto não adicionar nada, todas as datas estão disponíveis para reserva online.
          </div>
        ) : (
          items.map((item) => {
            const end = item.end_date && item.end_date !== item.start_date ? item.end_date : null;
            return (
              <div key={item.id} className="bg-[#141518] border border-[#282A30] p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarX className="w-4 h-4 text-amber-400" />
                    <span className="font-serif text-[#F7F5F0]">{item.title}</span>
                    <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 border text-amber-300 border-amber-500/40 bg-amber-950/40">
                      {REPEAT_LABELS[item.repeat] ?? item.repeat}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy === 'dias'}
                    onClick={() => handleDelete(item.id)}
                    className="flex items-center gap-1.5 bg-[#0C0D0E] border border-[#282A30] hover:border-red-500/60 text-red-300 px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
                <p className="text-[13px] text-[#F7F5F0]/85">
                  {formatDate(item.start_date)}
                  {end ? ` → ${formatDate(end)}` : ''}
                </p>
                {item.note && <p className="text-[11px] text-[#A6A8AD]">Nota: {item.note}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}