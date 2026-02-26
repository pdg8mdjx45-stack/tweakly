/**
 * useProductImage
 * Returns the best available product image.
 * Priority:
 * 1. If a valid external URL is provided (Tweakers/Icecat), use it directly
 * 2. Otherwise, keep the placeholder — Wikipedia returns wrong images for tech products
 */

import { useEffect, useState } from 'react';

// Check if URL is a valid external image (not a placeholder)
function isValidExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  // Reject placeholder URLs
  if (url.includes('placehold.co') ||
      url.includes('via.placeholder') ||
      url.includes('dummyimage') ||
      url.includes('placeholder')) {
    return false;
  }

  // Accept external URLs (http/https)
  return url.startsWith('http://') || url.startsWith('https://');
}

export function useProductImage(_productName: string, placeholderUrl: string): string {
  const [imageUrl, setImageUrl] = useState<string>(placeholderUrl);

  useEffect(() => {
    setImageUrl(placeholderUrl);
  }, [placeholderUrl]);

  // If we have a valid external URL (Tweakers/Icecat), use it directly
  // Otherwise keep the placeholder — Wikipedia is unreliable for product photos
  return isValidExternalUrl(imageUrl) ? imageUrl : placeholderUrl;
}
