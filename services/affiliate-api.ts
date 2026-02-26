/**
 * Affiliate API Service
 * Handles affiliate link generation and tracking for Dutch e-commerce platforms
 * 
 * Supported affiliate programs:
 * - Coolblue (Coolblue Partners)
 * - Bol.com (Bol.com Partner Program)
 * - MediaMarkt (MediaMarkt Affiliate)
 * - BCC (BCC Affiliate)
 * - Amazon.nl (Amazon Associates)
 * - Alternate (Alternate Partner Program)
 */

// Product and Shop types (mirrored from mock-data for type safety)
interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number;
  lowestPrice: number;
  rating: number;
  reviewCount: number;
  priceHistory: { date: string; price: number }[];
  shops: Shop[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
}

interface Shop {
  name: string;
  price: number;
  url: string;
  logo: string;
}

// Affiliate network configurations
interface AffiliateConfig {
  network: string;
  apiKey?: string;
  trackingId?: string;
  commission: number; // percentage
}

const AFFILIATE_CONFIGS: Record<string, AffiliateConfig> = {
  coolblue: {
    network: 'Coolblue Partners',
    commission: 2.5,
  },
  bol: {
    network: 'Bol.com Partner Program',
    commission: 3.0,
  },
  mediamarkt: {
    network: 'MediaMarkt Affiliate',
    commission: 2.0,
  },
  bcc: {
    network: 'BCC Affiliate',
    commission: 2.5,
  },
  amazon: {
    network: 'Amazon Associates NL',
    commission: 4.0,
  },
  alternate: {
    network: 'Alternate Partner Program',
    commission: 3.5,
  },
};

// Shop name to affiliate config mapping
const SHOP_AFFILIATE_MAP: Record<string, string> = {
  'Coolblue': 'coolblue',
  'Bol.com': 'bol',
  'MediaMarkt': 'mediamarkt',
  'BCC': 'bcc',
  'Amazon.nl': 'amazon',
  'Alternate': 'alternate',
};

// Generate affiliate link with tracking
export function generateAffiliateLink(
  shopName: string,
  productUrl: string,
  productId: string,
  subId?: string
): string {
  const affiliateKey = SHOP_AFFILIATE_MAP[shopName];
  const config = AFFILIATE_CONFIGS[affiliateKey];
  
  if (!config) {
    console.warn(`No affiliate config found for shop: ${shopName}`);
    return productUrl;
  }

  // Build affiliate URL with tracking parameters
  const url = new URL(productUrl);
  
  // Add affiliate tracking parameters
  url.searchParams.set('ref', config.trackingId || 'tweakly');
  url.searchParams.set('tweakly_id', productId);
  
  if (subId) {
    url.searchParams.set('sub_id', subId);
  }

  return url.toString();
}

// Get all affiliate links for a product
export function getAffiliateLinks(product: Product): Array<{
  shopName: string;
  price: number;
  affiliateUrl: string;
  commission: number;
}> {
  return product.shops.map(shop => {
    const affiliateKey = SHOP_AFFILIATE_MAP[shop.name];
    const config = AFFILIATE_CONFIGS[affiliateKey];
    
    return {
      shopName: shop.name,
      price: shop.price,
      affiliateUrl: generateAffiliateLink(shop.name, shop.url, product.id),
      commission: config?.commission || 0,
    };
  });
}

// Track affiliate click
export function trackAffiliateClick(
  shopName: string,
  productId: string,
  userId?: string
): void {
  const affiliateKey = SHOP_AFFILIATE_MAP[shopName];
  
  // In a real implementation, this would send data to analytics
  console.log(`📊 Affiliate click tracked:`, {
    shop: shopName,
    productId,
    userId,
    affiliateNetwork: AFFILIATE_CONFIGS[affiliateKey]?.network,
    timestamp: new Date().toISOString(),
  });
}

// Calculate potential earnings
export function calculateEarnings(
  product: Product,
  shopName: string
): { commission: number; earnings: number } | null {
  const affiliateKey = SHOP_AFFILIATE_MAP[shopName];
  const config = AFFILIATE_CONFIGS[affiliateKey];
  
  if (!config) return null;
  
  const shop = product.shops.find(s => s.name === shopName);
  if (!shop) return null;
  
  const commission = (shop.price * config.commission) / 100;
  
  return {
    commission: config.commission,
    earnings: Math.round(commission * 100) / 100,
  };
}

// Get total potential earnings for all shops
export function getTotalPotentialEarnings(product: Product): number {
  let total = 0;
  
  for (const shop of product.shops) {
    const earnings = calculateEarnings(product, shop.name);
    if (earnings) {
      total += earnings.earnings;
    }
  }
  
  return Math.round(total * 100) / 100;
}

// API response types
export interface AffiliateStats {
  productId: string;
  productName: string;
  totalClicks: number;
  conversions: number;
  revenue: number;
  earnings: number;
}

export interface AffiliateReport {
  period: string;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalEarnings: number;
  topProducts: AffiliateStats[];
  shopBreakdown: Record<string, {
    clicks: number;
    conversions: number;
    earnings: number;
  }>;
}

// Mock affiliate stats API
export async function getAffiliateStats(
  startDate: Date,
  endDate: Date
): Promise<AffiliateReport> {
  // In production, this would fetch from a real analytics API
  
  return {
    period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    totalClicks: 1250,
    totalConversions: 45,
    totalRevenue: 15750,
    totalEarnings: 425.50,
    topProducts: [
      {
        productId: '1',
        productName: 'Samsung Galaxy S25 Ultra',
        totalClicks: 320,
        conversions: 12,
        revenue: 14388,
        earnings: 359.70,
      },
      {
        productId: '2',
        productName: 'Apple MacBook Pro 14" M4',
        totalClicks: 280,
        conversions: 8,
        revenue: 15992,
        earnings: 479.76,
      },
    ],
    shopBreakdown: {
      'Coolblue': {
        clicks: 450,
        conversions: 18,
        earnings: 180.50,
      },
      'Bol.com': {
        clicks: 380,
        conversions: 14,
        earnings: 133.00,
      },
      'MediaMarkt': {
        clicks: 280,
        conversions: 8,
        earnings: 72.00,
      },
      'BCC': {
        clicks: 140,
        conversions: 5,
        earnings: 40.00,
      },
    },
  };
}

// Webhook handler for affiliate network conversions
export interface AffiliateConversion {
  orderId: string;
  shopName: string;
  productId: string;
  amount: number;
  commission: number;
  currency: string;
  timestamp: string;
}

export async function handleAffiliateConversion(
  conversion: AffiliateConversion
): Promise<{ success: boolean; message: string }> {
  // In production, this would validate and process the conversion
  // through the respective affiliate network's API
  
  console.log('🔄 Processing affiliate conversion:', conversion);
  
  // Validate conversion data
  if (!conversion.orderId || !conversion.shopName || !conversion.amount) {
    return {
      success: false,
      message: 'Invalid conversion data',
    };
  }
  
  const affiliateKey = SHOP_AFFILIATE_MAP[conversion.shopName];
  if (!affiliateKey) {
    return {
      success: false,
      message: `Unknown shop: ${conversion.shopName}`,
    };
  }
  
  // Process the conversion
  // In real implementation: POST to affiliate network API
  
  return {
    success: true,
    message: `Conversion processed for ${conversion.shopName}`,
  };
}
