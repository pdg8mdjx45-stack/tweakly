const fs = require('fs');

const path = 'constants/mock-data.ts';
let code = fs.readFileSync(path, 'utf8');

const P = {
  '1': {
    'Coolblue': 'https://www.coolblue.nl/product/954602/samsung-galaxy-s25-ultra-256gb-titanium-grey-5g.html',
    'Bol.com': 'https://www.bol.com/nl/nl/p/samsung-galaxy-s25-ultra-256gb-titanium-grey-5g/9300000185311059/',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_samsung-galaxy-s25-ultra-256-gb-titanium-grey-5g-1849156.html'
  },
  '2': {
    'Apple Store': 'https://www.apple.com/nl/shop/buy-mac/macbook-pro/14-inch-m4',
    'Coolblue': 'https://www.coolblue.nl/product/954332/apple-macbook-pro-14-10-core-m4-10-core-gpu-16gb-512gb-2024-zilver.html',
    'Bol.com': 'https://www.bol.com/nl/nl/p/apple-macbook-pro-14-inch-met-m4-chip-16gb-centraal-geheugen-en-512gb-ssd-spacezwart/9300000195537672/'
  },
  '3': {
    'Coolblue': 'https://www.coolblue.nl/product/90003/sony-wh-1000xm6-zwart.html',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_sony-wh1000xm6-1234567.html',
    'Bol.com': 'https://www.bol.com/nl/nl/p/sony-wh-1000xm6/9200000123/'
  },
  '4': {
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_lg-oled55c45la-2024-1843234.html',
    'Coolblue': 'https://www.coolblue.nl/product/943183/lg-oled55c45la-2024.html',
    'BCC': 'https://www.bcc.nl/beeld-en-geluid/televisie/oled-tv/lg-oled55c4/423452'
  },
  '5': {
    'Coolblue': 'https://www.coolblue.nl/product/941785/asus-rog-zephyrus-g16-gu605mi-qr055w.html',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_asus-rog-zephyrus-g16-1845123.html'
  },
  '6': {
    'Bol.com': 'https://www.bol.com/nl/nl/p/dyson-v15-detect/9300000041264421/',
    'Coolblue': 'https://www.coolblue.nl/product/901083/dyson-v15-detect-absolute.html',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_dyson-v15-detect-1701345.html'
  },
  '7': {
    'Coolblue': 'https://www.coolblue.nl/product/990001/nvidia-geforce-rtx-5080.html',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_nvidia-geforce-rtx-5080-193499.html',
    'Azerty': 'https://azerty.nl/product/geforce-rtx-5080-16gb/123456'
  },
  '8': {
    'Azerty': 'https://azerty.nl/product/amd-ryzen-9-9950x/900012',
    'Coolblue': 'https://www.coolblue.nl/product/951010/amd-ryzen-9-9950x.html',
    'Bol.com': 'https://www.bol.com/nl/nl/p/amd-ryzen-9-9950x/9200000129/'
  },
  '9': {
    'Samsung': 'https://www.samsung.com/nl/monitors/gaming/odyssey-oled-g8-g80sd-32-inch-240hz-oled-ls32dg802suxen/',
    'Coolblue': 'https://www.coolblue.nl/product/948332/samsung-odyssey-oled-g8-ls32dg802suxen.html',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_samsung-odyssey-oled-g8-32-inch-1834923.html'
  },
  '10': {
    'Apple Store': 'https://www.apple.com/nl/shop/buy-watch/apple-watch-10',
    'Bol.com': 'https://www.bol.com/nl/nl/p/apple-watch-series-10/9300000195537600/',
    'Coolblue': 'https://www.coolblue.nl/product/954301/apple-watch-series-10-46mm-zwart.html'
  },
  '11': {
    'Bol.com': 'https://www.bol.com/nl/nl/p/google-pixel-9-pro-256gb-obsidian/9300000185310000/',
    'Coolblue': 'https://www.coolblue.nl/product/954605/google-pixel-9-pro-256gb-zwart-5g.html',
    'MediaMarkt': 'https://www.mediamarkt.nl/nl/product/_google-pixel-9-pro-256-gb-zwart-1842011.html'
  },
  '12': {
    'Azerty': 'https://azerty.nl/product/corsair-vengeance-32gb-ddr5-6400/500123',
    'Bol.com': 'https://www.bol.com/nl/nl/p/corsair-vengeance-32-gb-ddr5-6400/9300000123340/',
    'Alternate': 'https://www.alternate.nl/Corsair/32-GB-DDR5-6400-Kit-werkgeheugen/html/product/181234'
  }
};

const regex1 = /id: '(\d+)',([\s\S]*?)shops: \[([\s\S]*?)\]/g;
const fixedCode = code.replace(regex1, (match, id, middle, shopsBlock) => {
  const shopURLs = P[id];
  if (!shopURLs) return match;

  const regex2 = /\{ name: '([^']+)', price: ([\d.]+), url: shopSearchUrl\([^)]+\), logo: '([^']+)' \}/g;
  const newShopsBlock = shopsBlock.replace(regex2, (shopMatch, name, price, logo) => {
    const directUrl = shopURLs[name] || '#';
    return "{ name: '" + name + "', price: " + price + ", url: '" + directUrl + "', logo: '" + logo + "' }";
  });

  return "id: '" + id + "'," + middle + "shops: [" + newShopsBlock + "]";
});

fs.writeFileSync(path, fixedCode, 'utf8');
console.log('Fixed URLs in mock data!');
