import { describe, expect, it } from 'vitest';
import { readBrand } from './brand';

describe('readBrand', () => {
  it('is empty without configuration', () => {
    expect(readBrand({})).toEqual({
      customerName: undefined,
      customerLogoUrl: undefined,
      color: undefined,
    });
  });

  it('accepts valid values', () => {
    expect(
      readBrand({
        NEXT_PUBLIC_CUSTOMER_NAME: ' Acme ',
        NEXT_PUBLIC_CUSTOMER_LOGO_URL: 'https://example.com/logo.svg',
        NEXT_PUBLIC_BRAND_COLOR: '#0a7c6f',
      }),
    ).toEqual({
      customerName: 'Acme',
      customerLogoUrl: 'https://example.com/logo.svg',
      color: '#0a7c6f',
    });
  });

  it('rejects values that could break out of the style tag or load insecure content', () => {
    const brand = readBrand({
      NEXT_PUBLIC_CUSTOMER_LOGO_URL: 'http://example.com/logo.png',
      NEXT_PUBLIC_BRAND_COLOR: 'red;}</style><script>',
    });
    expect(brand.customerLogoUrl).toBeUndefined();
    expect(brand.color).toBeUndefined();
  });
});
