import { useState, useEffect } from 'react';

const svgCache = new Map<string, HTMLImageElement>();

export function useSvgImage(url: string): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() => svgCache.get(url));

  useEffect(() => {
    if (!url) return;
    if (svgCache.has(url)) {
      setImage(svgCache.get(url));
      return;
    }
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      svgCache.set(url, img);
      setImage(img);
    };
  }, [url]);

  return image;
}
