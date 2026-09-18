import type { CSSProperties } from 'react';
import { useSite } from '../context/SiteContext';

export interface AssetImageProps {
  src: string;
  assetId?: string;
  wrapperClass?: string;
  wrapperStyle?: CSSProperties;
  style?: CSSProperties;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  onError?: (event: { target: HTMLElement; currentTarget: HTMLElement }) => void;
}

export default function AssetImage({
  src,
  assetId,
  wrapperClass,
  wrapperStyle,
  style,
  alt,
  className,
  loading,
  onError,
}: AssetImageProps) {
  const { assetMatch } = useSite();
  const match = assetMatch(assetId ?? src);

  const img = (
    <img
      src={match?.url ?? src}
      alt={alt ?? ''}
      className={wrapperClass ? undefined : className}
      style={{ ...(match?.style ?? {}), ...style }}
      loading={loading}
      onError={onError}
    />
  );

  if (!wrapperClass) return img;

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {img}
    </div>
  );
}