import { brand } from '@/lib/brand';
import { cn } from '@/lib/utils';

/** The customer's logo (or name) for co-branded screens; renders nothing when not configured. */
export function CustomerBrand({ className }: { className?: string }) {
  if (brand.customerLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external logo URL from configuration
      <img
        src={brand.customerLogoUrl}
        alt={brand.customerName ?? ''}
        className={cn('h-7 w-auto max-w-40 object-contain', className)}
      />
    );
  }
  if (brand.customerName) {
    return (
      <span className={cn('text-[1.05rem] font-semibold tracking-tight', className)}>
        {brand.customerName}
      </span>
    );
  }
  return null;
}
