import { createContext, useContext, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ImageAsset, MenuItem, SiteContent } from '../types';
import { DEFAULT_IMAGE_ASSETS } from '../data/assets';

const DEFAULT_SITE_CONTENT: SiteContent = {
  contactEmail: 'smpsandro1239@gmail.com',
  phone: '+351 253 031 890',
  address: '',
  hours: '',
  headline: '',
  heroSubtitle: '',
  aboutTitle: '',
  aboutText: '',
  instagram: '',
  facebook: '',
  videoUrl: '',
};

export { DEFAULT_SITE_CONTENT };

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

interface AssetMatch {
  id: string;
  url: string;
  style: CSSProperties | undefined;
}

interface SiteContextValue {
  siteContent: SiteContent;
  assets: ImageAsset[];
  menuItems: MenuItem[];
  adminEnabled: boolean;
  assetUrl(id: string): string | undefined;
  assetMatch(input: string | undefined): AssetMatch | null;
  refreshAssets(): void;
  refreshMenus(): void;
  refreshSiteContent(): void;
}

export const SiteContext = createContext<SiteContextValue>({
  siteContent: DEFAULT_SITE_CONTENT,
  assets: DEFAULT_IMAGE_ASSETS,
  menuItems: [],
  adminEnabled: false,
  assetUrl: () => undefined,
  assetMatch: () => null,
  refreshAssets: () => {},
  refreshMenus: () => {},
  refreshSiteContent: () => {},
});

export function useSite(): SiteContextValue {
  return useContext(SiteContext);
}

function buildAssetStyle(asset: ImageAsset): CSSProperties | undefined {
  const scale = asset.scale ?? 1;
  const px = asset.px ?? 50;
  const py = asset.py ?? 50;
  const isDefault = scale === 1 && px === 50 && py === 50;
  if (isDefault) return undefined;
  const style: CSSProperties = { objectFit: 'cover' };
  if (px !== 50 || py !== 50) style.objectPosition = `${px}% ${py}%`;
  if (scale !== 1) style.transform = `scale(${scale})`;
  return style;
}

export function computeAssets(
  overrides: Record<string, { url: string; scale?: number; px?: number; py?: number }>,
): ImageAsset[] {
  return DEFAULT_IMAGE_ASSETS.map((def) => {
    const override = overrides[def.id];
    if (!override) return def;
    return {
      ...def,
      url: override.url || def.url,
      scale: override.scale,
      px: override.px,
      py: override.py,
    };
  });
}

interface SiteProviderProps {
  children: ReactNode;
  siteContent: SiteContent;
  assets: ImageAsset[];
  menuItems: MenuItem[];
  adminEnabled: boolean;
  onRefreshAssets: () => void;
  onRefreshMenus: () => void;
  onRefreshSiteContent: () => void;
}

export function SiteProvider({
  children,
  siteContent,
  assets,
  menuItems,
  adminEnabled,
  onRefreshAssets,
  onRefreshMenus,
  onRefreshSiteContent,
}: SiteProviderProps) {
  const effectiveSiteContent = useMemo<SiteContent>(
    () => ({ ...siteContent, phone: siteContent.phone.trim() || DEFAULT_SITE_CONTENT.phone }),
    [siteContent],
  );

  const byId = useMemo(() => {
    const map = new Map<string, ImageAsset>();
    for (const asset of assets) map.set(asset.id, asset);
    return map;
  }, [assets]);

  const byUrl = useMemo(() => {
    const map = new Map<string, ImageAsset>();
    for (const asset of assets) map.set(asset.url, asset);
    return map;
  }, [assets]);

  const byDefaultUrl = useMemo(() => {
    const map = new Map<string, ImageAsset>();
    for (const def of DEFAULT_IMAGE_ASSETS) map.set(def.url, def);
    return map;
  }, []);

  const contextValue = useMemo<SiteContextValue>(
    () => ({
      siteContent: effectiveSiteContent,
      assets,
      menuItems,
      adminEnabled,
      assetUrl(id) {
        return byId.get(id)?.url;
      },
      assetMatch(input) {
        if (!input) return null;
        const asset = byId.get(input) ?? byUrl.get(input) ?? byDefaultUrl.get(input) ?? null;
        if (!asset) return null;
        return { id: asset.id, url: asset.url, style: buildAssetStyle(asset) };
      },
      refreshAssets: onRefreshAssets,
      refreshMenus: onRefreshMenus,
      refreshSiteContent: onRefreshSiteContent,
    }),
    [effectiveSiteContent, assets, menuItems, adminEnabled, byId, byUrl, byDefaultUrl, onRefreshAssets, onRefreshMenus, onRefreshSiteContent],
  );

  return <SiteContext.Provider value={contextValue}>{children}</SiteContext.Provider>;
}