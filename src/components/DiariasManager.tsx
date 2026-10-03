import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarX, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Save, Soup, Trash2 } from 'lucide-react';
import type { DiariaRepeat, DiariaSchedule, MenuItem } from '../types';
import {
  createAdminDiaria,
  deleteAdminDiaria,
  getAdminDiarias,
  updateAdminDiaria,
} from '../lib/api';
import { MENU_ITEMS } from '../data/menuData';
import { buildDiariaOptionsWithCurrent } from '../lib/diariaOptions';

const DIARIA_REPEAT_LABELS: Record<DiariaRepeat, string> = {
  none: 'Só este dia',
  weekly: 'Todas as semanas',
  biweekly: 'De 15 em 15 dias',
  monthly: 'Todos os meses (mesmo dia)',
};

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function dateKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return dateKeyFromDate(date);
}

function todayKey(): string {
  return dateKeyFromDate(new Date());
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function appliesOn(schedule: DiariaSchedule, date: string): boolean {
  if (date < schedule.anchorDate) return false;
  if (date < schedule.activeFrom) return false;
  if (schedule.activeTo && date > schedule.activeTo) return false;
  if (schedule.repeat === 'none') return date === schedule.anchorDate;
  if (schedule.repeat === 'weekly') {
    const diff = Math.round((parseKey(date).getTime() - parseKey(schedule.anchorDate).getTime()) / 86400000);
    return diff >= 0 && diff % 7 === 0;
  }
  if (schedule.repeat === 'biweekly') {
    const diff = Math.round((parseKey(date).getTime() - parseKey(schedule.anchorDate).getTime()) / 86400000);
    return diff >= 0 && diff % 14 === 0;
  }
  return parseKey(date).getDate() === parseKey(schedule.anchorDate).getDate();
}

function formatShortDate(key: string): string {
  return parseKey(key).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

function mealsSummary(schedule: DiariaSchedule): string {
  if (schedule.lunch && schedule.dinner) return 'Almoço + Jantar';
  if (schedule.lunch) return 'Só almoço';
  return 'Só jantar';
}

interface DiariasManagerProps {
  busy: string | null;
  run: (action: string, fn: () => Promise<void>, successMessage: string) => Promise<void>;
  menus: MenuItem[];
  showToast?: (message: string) => void;
}

export default function DiariasManager({ busy, run, menus, showToast }: DiariasManagerProps) {
  const allItems = useMemo(() => {
    const byId = new Map<string, MenuItem>();
    for (const item of [...menus, ...MENU_ITEMS]) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return byId;
  }, [menus]);

  const optionItems = useMemo(() => [...allItems.values()], [allItems]);

  const [schedules, setSchedules] = useState<DiariaSchedule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const [repeat, setRepeat] = useState<DiariaRepeat>('none');
  const [activeFrom, setActiveFrom] = useState(todayKey());
  const [activeTo, setActiveTo] = useState('');
  const [lunch, setLunch] = useState(true);
  const [dinner, setDinner] = useState(false);
  const [slotItems, setSlotItems] = useState<string[]>(['', '', '', '']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modelId, setModelId] = useState('');
  const [copyTarget, setCopyTarget] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const currentSlotIds = useMemo(() => slotItems.filter(Boolean), [slotItems]);
  const meatOptions = useMemo(
    () => buildDiariaOptionsWithCurrent(optionItems, 'meat', currentSlotIds),
    [optionItems, currentSlotIds],
  );
  const fishOptions = useMemo(
    () => buildDiariaOptionsWithCurrent(optionItems, 'fish', currentSlotIds),
    [optionItems, currentSlotIds],
  );

  const reload = async () => {
    try {
      const data = await getAdminDiarias();
      setSchedules(data.schedules);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar os agendamentos.');
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetEditor = (date: string) => {
    setAnchorDate(date);
    setActiveFrom(date);
    setActiveTo('');
    setRepeat('none');
    setLunch(true);
    setDinner(false);
    setSlotItems(['', '', '', '']);
    setEditingId(null);
    setModelId('');
    setFormError(null);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    resetEditor(date);
  };

  const applyModel = () => {
    setFormError(null);
    const model = schedules.find((s) => s.id === modelId);
    if (!model) return;
    setRepeat(model.repeat);
    setActiveFrom(anchorDate);
    setActiveTo('');
    setLunch(model.lunch);
    setDinner(model.dinner);
    setSlotItems([...model.itemIds, ...Array(4 - model.itemIds.length).fill('')].slice(0, 4));
    showToast?.('Modelo copiado. Pode ajustar a data e guardar.');
  };

  const daysVisible = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<string | null> = [];
    for (let i = 0; i < firstOffset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  const selectedItems = slotItems.map((id) => allItems.get(id) ?? null);

  const slotNames = (slots: string[]): string => {
    const names = slots
      .map((id) => allItems.get(id)?.name ?? null)
      .filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(' · ') : 'Sem pratos';
  };

  const handleSave = () => {
    setFormError(null);
    if (!anchorDate) {
      setFormError('Escolha a data de início.');
      return;
    }
    if (!lunch && !dinner) {
      setFormError('Selecione pelo menos o almoço ou o jantar.');
      return;
    }
    const itemIds = slotItems.filter(Boolean).slice(0, 4);
    if (itemIds.length === 0) {
      setFormError('Escolha pelo menos um prato (idealmente 2 carnes e 2 peixes).');
      return;
    }
    if (activeTo && activeTo < activeFrom) {
      setFormError('A data final tem de ser igual ou posterior à data inicial.');
      return;
    }
    const payload = {
      anchorDate,
      repeat,
      activeFrom,
      activeTo: activeTo || null,
      lunch,
      dinner,
      itemIds,
    };
    if (editingId) {
      void run(
        'diarias',
        async () => {
          await updateAdminDiaria(editingId, payload);
          await reload();
          resetEditor(selectedDate);
        },
        'Agendamento atualizado.',
      );
    } else {
      void run(
        'diarias',
        async () => {
          const created = await createAdminDiaria(payload);
          handleSelectDate(created.schedule.anchorDate);
          await reload();
          resetEditor(created.schedule.anchorDate);
        },
        'Agendamento criado. Já fica visível no Menu Executivo.',
      );
    }
  };

  const handleEdit = (schedule: DiariaSchedule) => {
    setSelectedDate(schedule.anchorDate);
    setAnchorDate(schedule.anchorDate);
    setRepeat(schedule.repeat);
    setActiveFrom(schedule.activeFrom);
    setActiveTo(schedule.activeTo ?? '');
    setLunch(schedule.lunch);
    setDinner(schedule.dinner);
    setSlotItems([...schedule.itemIds.slice(0, 4), ...Array(Math.max(0, 4 - schedule.itemIds.length)).fill('')]);
    setEditingId(schedule.id);
    setModelId('');
    setFormError(null);
  };

  const handleDelete = (id: string) => {
    void run(
      'diarias',
      async () => {
        await deleteAdminDiaria(id);
        await reload();
        if (editingId === id) resetEditor(selectedDate);
      },
      'Agendamento removido.',
    );
  };

  const handleCopyTo = (id: string) => {
    const target = copyTarget[id];
    if (!target) return;
    const source = schedules.find((s) => s.id === id);
    if (!source) return;
    void run(
      'diarias',
      async () => {
        await createAdminDiaria({
          anchorDate: target,
          repeat: source.repeat,
          activeFrom: target,
          activeTo: null,
          lunch: source.lunch,
          dinner: source.dinner,
          itemIds: source.itemIds,
        });
        setCopyTarget((c) => ({ ...c, [id]: '' }));
        await reload();
      },
      'Programação copiada para a nova data.',
    );
  };

  const orderedSchedules = [...schedules].sort((a, b) =>
    a.anchorDate < b.anchorDate ? -1 : a.anchorDate > b.anchorDate ? 1 : a.id.localeCompare(b.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-lg text-[#F7F5F0] mb-1">Menu Executivo</h3>
        <p className="text-xs text-[#F7F5F0]/60 leading-relaxed">
          Programe o Menu Executivo num calendário: 2 carnes e 2 peixes, com almoço e/ou jantar. Pode repetir todas as semanas, de 15 em 15 dias, todos os meses ou só num dia; validar ao longo de um período ou sem limite até alterar; e copiar a programação de um dia para outro. Sem programação, o site mostra os pratos do Menu Executivo.
        </p>
      </div>

      {loadError && (
        <div className="border border-red-500/50 bg-red-950/40 p-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-[#141518] border border-[#282A30] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-2 text-[#F7F5F0]/60 hover:text-[#D4A373] hover:bg-[#282A30] transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-serif text-[#F7F5F0] capitalize">{monthLabel}</span>
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-2 text-[#F7F5F0]/60 hover:text-[#D4A373] hover:bg-[#282A30] transition-colors"
            aria-label="Mês seguinte"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEK_LABELS.map((label) => (
            <div key={label} className="text-center text-[9px] uppercase tracking-widest text-[#F7F5F0]/40 font-mono py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysVisible.map((key, index) => {
            if (!key) return <div key={`empty-${index}`} className="min-h-[46px] bg-transparent" />;
            const daySchedules = schedules.filter((s) => appliesOn(s, key));
            const hasLunch = daySchedules.some((s) => s.lunch);
            const hasDinner = daySchedules.some((s) => s.dinner);
            const isSelected = key === selectedDate;
            const isToday = key === todayKey();
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectDate(key)}
                className={`min-h-[46px] px-1 py-1 border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#D4A373]/15 border-[#D4A373]'
                    : 'bg-[#0C0D0E] border-[#282A30] hover:border-[#D4A373]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-mono ${isToday ? 'text-[#D4A373] font-bold' : 'text-[#F7F5F0]/80'}`}>
                    {Number(key.slice(8, 10))}
                  </span>
                  {daySchedules.length > 0 && (
                    <span className="text-[9px] text-[#D4A373] font-mono">
                      {hasLunch ? 'A' : ''}
                      {hasLunch && hasDinner ? '·' : ''}
                      {hasDinner ? 'J' : ''}
                    </span>
                  )}
                </div>
                {daySchedules.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    <span className="flex-1 h-1 bg-[#D4A373]/70" />
                    <span className="flex-1 h-1 bg-[#D4A373]/30" />
                    {daySchedules.length > 1 && <span className="flex-1 h-1 bg-[#D4A373]/30" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-[#F7F5F0]/50 font-mono uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 bg-[#D4A373]/70" /> Almoço</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 bg-[#D4A373]/30" /> Jantar</span>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-[#141518] border border-[#282A30] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono flex items-center gap-2">
            <Soup className="w-3.5 h-3.5" />
            {editingId ? `Editar agendamento de ${formatShortDate(anchorDate)}` : `Agendamento para ${formatShortDate(selectedDate)}`}
          </p>
          {editingId && (
            <button
              type="button"
              onClick={() => resetEditor(selectedDate)}
              className="text-[10px] uppercase tracking-wider text-[#F7F5F0]/50 hover:text-[#D4A373]"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Data</label>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Repetição</label>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as DiariaRepeat)}
              className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            >
              {(['none', 'weekly', 'biweekly', 'monthly'] as const).map((value) => (
                <option key={value} value={value}>
                  {DIARIA_REPEAT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Válido desde</label>
            <input
              type="date"
              value={activeFrom}
              onChange={(e) => setActiveFrom(e.target.value)}
              className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">
              Até <span className="normal-case text-[#F7F5F0]/40">(vazio = sem limite)</span>
            </label>
            <input
              type="date"
              value={activeTo}
              onChange={(e) => setActiveTo(e.target.value)}
              className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
            />
          </div>
        </div>

        <p className="text-[11px] text-[#F7F5F0]/50">
          {repeat === 'none' && 'Aplica-se apenas nesta data.'}
          {repeat === 'weekly' && 'Repete-se no mesmo dia da semana todas as semanas.'}
          {repeat === 'biweekly' && 'Repete-se de 15 em 15 dias.'}
          {repeat === 'monthly' && 'Repete-se todos os meses no mesmo dia do mês.'}
        </p>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#A6A8AD] mb-1">Servir em</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLunch((v) => !v)}
              className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold border transition-colors ${
                lunch ? 'bg-[#D4A373] text-[#0C0D0E] border-[#D4A373]' : 'bg-[#0C0D0E] text-[#F7F5F0]/70 border-[#282A30] hover:border-[#D4A373]/50'
              }`}
            >
              {lunch ? '✓ ' : ''}Almoço
            </button>
            <button
              type="button"
              onClick={() => setDinner((v) => !v)}
              className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold border transition-colors ${
                dinner ? 'bg-[#D4A373] text-[#0C0D0E] border-[#D4A373]' : 'bg-[#0C0D0E] text-[#F7F5F0]/70 border-[#282A30] hover:border-[#D4A373]/50'
              }`}
            >
              {dinner ? '✓ ' : ''}Jantar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">2 Carnes</p>
            {[0, 1].map((slot) => (
              <select
                key={slot}
                value={slotItems[slot]}
                onChange={(e) => {
                  const next = [...slotItems];
                  next[slot] = e.target.value;
                  setSlotItems(next);
                }}
                className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              >
                <option value="">— sem prato —</option>
                {meatOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.price.toFixed(2)} {item.currency}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">2 Peixes</p>
            {[2, 3].map((slot) => (
              <select
                key={slot}
                value={slotItems[slot]}
                onChange={(e) => {
                  const next = [...slotItems];
                  next[slot] = e.target.value;
                  setSlotItems(next);
                }}
                className="w-full bg-[#1C1E22] border border-[#282A30] px-3 py-2.5 text-sm text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
              >
                <option value="">— sem prato —</option>
                {fishOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.price.toFixed(2)} {item.currency}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy === 'diarias'}
            className="flex items-center gap-2 bg-[#D4A373] hover:bg-[#e0b585] text-[#0C0D0E] px-4 py-2.5 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {editingId ? 'Atualizar agendamento' : 'Guardar agendamento'}
          </button>
          {editingId && (
            <button
              type="button"
              disabled={busy === 'diarias'}
              onClick={() => handleDelete(editingId)}
              className="flex items-center gap-2 bg-[#0C0D0E] border border-[#282A30] hover:border-red-500/60 text-red-300 px-4 py-2.5 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          )}
        </div>
        {formError && <p className="text-xs text-red-300 bg-red-950/60 border border-red-500/40 px-3 py-2">{formError}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#282A30]/60">
          <label className="text-[10px] uppercase tracking-wider text-[#A6A8AD]">Copiar modelo</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="flex-1 min-w-[160px] bg-[#1C1E22] border border-[#282A30] px-3 py-2 text-xs text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
          >
            <option value="">— escolha um dia já programado —</option>
            {orderedSchedules.map((s) => (
              <option key={s.id} value={s.id}>
                {formatShortDate(s.anchorDate)} · {DIARIA_REPEAT_LABELS[s.repeat]} · {mealsSummary(s)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyModel}
            disabled={!modelId}
            className="flex items-center gap-2 bg-[#141518] border border-[#282A30] hover:border-[#D4A373]/60 text-[#F7F5F0]/80 px-3 py-2 text-xs uppercase tracking-wider font-semibold disabled:opacity-40"
          >
            <Copy className="w-3.5 h-3.5" />
            Aplicar
          </button>
        </div>
      </div>

      {/* Current selection summary */}
      <div className="bg-[#0C0D0E] border border-[#282A30] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#A6A8AD]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#F7F5F0]/50">
          {formatShortDate(selectedDate)} · {DIARIA_REPEAT_LABELS[repeat]}
        </span>
        <span className="text-[#D4A373]">{mealsSummary({ anchorDate, repeat, activeFrom, activeTo: activeTo || null, lunch, dinner, itemIds: slotItems.filter(Boolean), id: 'preview' } as DiariaSchedule)}</span>
        <span className="truncate">{slotNames(slotItems)}</span>
      </div>

      {/* Schedule list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarX className="w-4 h-4 text-[#D4A373]" />
          <span className="text-[10px] uppercase tracking-widest text-[#D4A373] font-mono">
            Programação registada ({orderedSchedules.length})
          </span>
        </div>
        {orderedSchedules.length === 0 ? (
          <div className="bg-[#141518] border border-[#282A30] p-5 text-sm text-[#F7F5F0]/60">
            Sem agendamentos. Enquanto não programar nada, o site mostra os pratos do Menu Executivo.
          </div>
        ) : (
          orderedSchedules.map((schedule) => (
            <div key={schedule.id} className="bg-[#141518] border border-[#282A30] p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-[#F7F5F0]">{formatShortDate(schedule.anchorDate)}</span>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 border text-[#D4A373] border-[#D4A373]/40 bg-[#D4A373]/10">
                    {DIARIA_REPEAT_LABELS[schedule.repeat]}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 border text-emerald-300 border-emerald-500/40 bg-emerald-950/40">
                    {mealsSummary(schedule)}
                  </span>
                  {schedule.activeTo && (
                    <span className="text-[10px] text-[#F7F5F0]/50 font-mono">até {formatShortDate(schedule.activeTo)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-[#F7F5F0]/70 hover:text-[#D4A373] hover:bg-[#282A30]"
                    aria-label={`Editar ${schedule.anchorDate}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy === 'diarias'}
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2 text-[#F7F5F0]/70 hover:text-red-400 hover:bg-[#282A30] disabled:opacity-40"
                    aria-label={`Remover ${schedule.anchorDate}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-[#F7F5F0]/85">{slotNames(schedule.itemIds)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Plus className="w-3 h-3 text-[#F7F5F0]/40" />
                <input
                  type="date"
                  value={copyTarget[schedule.id] ?? ''}
                  onChange={(e) => setCopyTarget((c) => ({ ...c, [schedule.id]: e.target.value }))}
                  className="bg-[#1C1E22] border border-[#282A30] px-2 py-1.5 text-xs text-[#F7F5F0] focus:outline-none focus:border-[#D4A373]"
                  aria-label={`Copiar programação para`}
                />
                <button
                  type="button"
                  disabled={busy === 'diarias' || !copyTarget[schedule.id]}
                  onClick={() => handleCopyTo(schedule.id)}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#F7F5F0]/60 hover:text-[#D4A373] disabled:opacity-40"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar para esta data
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}