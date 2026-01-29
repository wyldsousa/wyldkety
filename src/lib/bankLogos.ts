// Bank logo URLs and configurations
export const BANK_LOGOS: Record<string, { logo: string; color: string }> = {
  'nubank': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-0.png',
    color: '#820AD1',
  },
  'inter': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/09/banco-inter-logo-1.png',
    color: '#FF7A00',
  },
  'picpay': {
    logo: 'https://logodownload.org/wp-content/uploads/2018/05/picpay-logo-1.png',
    color: '#21C25E',
  },
  'caixa': {
    logo: 'https://logodownload.org/wp-content/uploads/2014/05/caixa-economica-federal-logo-1.png',
    color: '#005CA9',
  },
  'itau': {
    logo: 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-0.png',
    color: '#003399',
  },
  'bradesco': {
    logo: 'https://logodownload.org/wp-content/uploads/2014/05/bradesco-logo-0.png',
    color: '#CC092F',
  },
  'santander': {
    logo: 'https://logodownload.org/wp-content/uploads/2014/05/santander-logo-0.png',
    color: '#EC0000',
  },
  'banco do brasil': {
    logo: 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-1.png',
    color: '#FFED00',
  },
  'bb': {
    logo: 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-1.png',
    color: '#FFED00',
  },
  'c6': {
    logo: 'https://logodownload.org/wp-content/uploads/2020/02/c6-bank-logo-0.png',
    color: '#242424',
  },
  'c6 bank': {
    logo: 'https://logodownload.org/wp-content/uploads/2020/02/c6-bank-logo-0.png',
    color: '#242424',
  },
  'neon': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/08/neon-logo-1.png',
    color: '#00E5FF',
  },
  'next': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/09/next-logo-0.png',
    color: '#00DC5A',
  },
  'original': {
    logo: 'https://logodownload.org/wp-content/uploads/2017/04/banco-original-logo-0.png',
    color: '#00A651',
  },
  'mercado pago': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png',
    color: '#00B1EA',
  },
  'pagseguro': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/09/pagseguro-logo-0.png',
    color: '#00B1EA',
  },
  'will': {
    logo: 'https://will.com.br/assets/will-logo.png',
    color: '#6B5AED',
  },
  'stone': {
    logo: 'https://logodownload.org/wp-content/uploads/2019/10/stone-pagamentos-logo-0.png',
    color: '#00A868',
  },
  'default': {
    logo: '',
    color: '#6B7280',
  }
};

export function getBankInfo(bankName: string): { logo: string; color: string } {
  const normalizedName = bankName.toLowerCase().trim();
  
  // Check for exact match first
  if (BANK_LOGOS[normalizedName]) {
    return BANK_LOGOS[normalizedName];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(BANK_LOGOS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  return BANK_LOGOS['default'];
}
