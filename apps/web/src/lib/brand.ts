/**
 * White-label settings for a customer demo, set as environment variables on the hosting
 * platform (never committed: the repository stays free of customer branding).
 *
 * NEXT_PUBLIC_CUSTOMER_NAME      e.g. the recruiting company shown to candidates and in the panel
 * NEXT_PUBLIC_CUSTOMER_LOGO_URL  https URL of the customer's logo (shown instead of the name)
 * NEXT_PUBLIC_BRAND_COLOR        accent colour as #rgb / #rrggbb or oklch(...)
 */
export interface Brand {
  customerName?: string;
  customerLogoUrl?: string;
  color?: string;
}

const COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*\))$/i;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function readBrand(env: Record<string, string | undefined>): Brand {
  const logo = clean(env.NEXT_PUBLIC_CUSTOMER_LOGO_URL);
  const color = clean(env.NEXT_PUBLIC_BRAND_COLOR);
  return {
    customerName: clean(env.NEXT_PUBLIC_CUSTOMER_NAME)?.slice(0, 60),
    // Only absolute https URLs (and site-relative paths) are accepted.
    customerLogoUrl: logo && /^(https:\/\/|\/)[^\s"'<>]+$/.test(logo) ? logo : undefined,
    // Validated, because it is written into a <style> tag.
    color: color && COLOR.test(color) ? color : undefined,
  };
}

// NEXT_PUBLIC_* values must be read literally to be inlined into the browser bundle.
export const brand: Brand = readBrand({
  NEXT_PUBLIC_CUSTOMER_NAME: process.env.NEXT_PUBLIC_CUSTOMER_NAME,
  NEXT_PUBLIC_CUSTOMER_LOGO_URL: process.env.NEXT_PUBLIC_CUSTOMER_LOGO_URL,
  NEXT_PUBLIC_BRAND_COLOR: process.env.NEXT_PUBLIC_BRAND_COLOR,
});
