// @vitest-environment jsdom
//
// Guarda contra "site em branco": um erro lancerado durante o render limpa a
// pagina inteira, e o smoke test de API nao apanha nada disso. O /api/diarias
// devolvia so {id, visible} e o cliente tratava-os como MenuItem completos,
// rebentando em price.toFixed(2).
//
// Aqui montamos a app com o formato REAL de resposta do servidor e falhamos se
// o render lancar ou se o #root ficar vazio.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App from './App';
import LegalScreen from './screens/LegalScreen';
import { MENU_ITEMS } from './data/menuData';
import { DEFAULT_SITE_CONTENT, SiteProvider } from './context/SiteContext';
import type { LegalDoc } from './types';

const DAILY = MENU_ITEMS.filter((i) => i.category === 'diarias');

/** Exatamente o que o servidor devolve: so id e visible, sem preco. */
const serverDailyResponse = {
  date: '2026-10-05',
  currentMeal: 'lunch',
  lunch: DAILY.map((i) => ({ id: i.id, visible: true })),
  dinner: [],
  hasSchedule: true,
  servedMeals: { lunch: true, dinner: false },
  closedTitle: null,
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/diarias')) return jsonResponse(serverDailyResponse);
    if (url.includes('/api/menus')) return jsonResponse({ items: MENU_ITEMS });
    if (url.includes('/api/site-content')) return jsonResponse(DEFAULT_SITE_CONTENT);
    if (url.includes('/api/reservations-config')) return jsonResponse({ paused: false, pausedTitle: '', dailyCapacity: 40, maxPerClient: 2, minAdvanceDays: 0, maxAdvanceDays: 60, requireCheck: false, checkQuestion: { question: '', answer: '' } });
    if (url.includes('/api/reviews')) return jsonResponse({ items: [] });
    if (url.includes('/api/admin/assets')) return jsonResponse({ enabled: false, overrides: {} });
    return jsonResponse({});
  }));

  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

/** Deixa os efeitos e os fetches resolverem. */
async function settle(ms = 250) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('app renderiza com o formato real do servidor', () => {
  it('nao lanca durante o render e deixa o #root com conteudo', async () => {
    await act(async () => {
      root.render(<App />);
    });
    await settle();

    // O teste que faltava: se o render rebentou, o React desmontou a arvore.
    expect(container.children.length).toBeGreaterThan(0);
    expect(container.innerHTML.length).toBeGreaterThan(500);
    expect((container.textContent ?? '').length).toBeGreaterThan(200);
  });

  it('mostra o preco dos pratos do dia resolvidos a partir da carta', async () => {
    await act(async () => {
      root.render(<App />);
    });
    await settle();

    // Os ids do /api/diarias so fazem sentido renderizados como prato completo.
    const text = container.textContent ?? '';
    for (const item of DAILY) {
      expect(text).toContain(item.name);
    }
    expect(text).toContain('14.90');
  });

  it('rebenta se o cliente voltar a tratar as referencias como MenuItem', async () => {
    // Se alguem reintroduzir price.toFixed nas refs, este teste tem de falhar.
    const badRefs = serverDailyResponse.lunch.map((r) => ({ ...r, price: undefined }));
    expect(() => badRefs.map((r) => (r as { price: number }).price.toFixed(2))).toThrow();
  });
});

// A LegalScreen recebia a prop `doc` e nao a usava: fazia buildContent(phone),
// que devolve as TRES paginas num Record, e lia data.sections.map sobre
// undefined. Privacidade, Termos e Livro de Reclamações davam pagina em
// branco — e nenhum teste de API apanha isso. O typecheck nao apanhou porque
// faltavam os @types/react, logo o hook vinha de JS inferido e `data` era any.
describe('paginas legais', () => {
  const EXPECTED: Record<LegalDoc, string> = {
    privacidade: 'Política de Privacidade',
    termos: 'Termos de Reserva',
    livro: 'Livro de Reclamações',
  };

  // Cada documento tem a concordancia certa ("Atualizada" / "Atualizados" /
  // "Atualizado"), por isso isto distingue o documento escolhido.
  const UPDATED: Record<LegalDoc, string> = {
    privacidade: 'Atualizada em outubro de 2026',
    termos: 'Atualizados em outubro de 2026',
    livro: 'Atualizado em outubro de 2026',
  };

  function renderLegal(doc: LegalDoc) {
    return (
      <SiteProvider
        siteContent={DEFAULT_SITE_CONTENT}
        assets={[]}
        menuItems={MENU_ITEMS}
        adminEnabled={false}
        onRefreshAssets={() => {}}
        onRefreshMenus={() => {}}
        onRefreshSiteContent={() => {}}
      >
        <LegalScreen doc={doc} onBack={() => {}} />
      </SiteProvider>
    );
  }

  for (const doc of ['privacidade', 'termos', 'livro'] as LegalDoc[]) {
    it(`a pagina "${doc}" mostra o titulo certo e nao lanca`, async () => {
      await act(async () => {
        root.render(renderLegal(doc));
      });

      // Se o render lancou, o React desmontou a arvore e o container fica vazio.
      expect(container.children.length).toBeGreaterThan(0);
      const text = container.textContent ?? '';
      expect(text).toContain(EXPECTED[doc]);
      // A data de actualizacao so bate certo se o documento certo foi escolhido.
      expect(text).toContain(UPDATED[doc]);
    });
  }

  it('nao mostra o titulo de outro documento', async () => {
    await act(async () => {
      root.render(renderLegal('privacidade'));
    });
    const text = container.textContent ?? '';
    expect(text).not.toContain(EXPECTED.termos);
    expect(text).not.toContain(EXPECTED.livro);
  });
});