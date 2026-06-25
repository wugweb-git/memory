"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_BRAND, APP_NAV_ITEMS } from '@/config/ui-content';

const NavBar: React.FC = () => {
  const pathname = usePathname();
  const LogoIcon = APP_NAV_ITEMS[0].icon;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[60] h-14 bg-bg-elevated/90 backdrop-blur-xl border-b border-border-secondary flex items-center justify-between px-4 md:px-8 shadow-sm"
      aria-label="Primary"
    >
      <Link href="/" className="flex items-center gap-3 group shrink-0">
        <div className="w-9 h-9 rounded-xl bg-text-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <LogoIcon size={18} className="text-bg-primary" />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-text-primary  hidden sm:block">
          {APP_BRAND.name}
        </span>
      </Link>

      <div className="flex items-center gap-0.5 overflow-x-auto max-w-[min(100vw-8rem,52rem)] scrollbar-hide">
        {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-2xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-text-primary text-bg-primary shadow-md'
                  : 'text-text-tertiary hover:bg-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={14} aria-hidden />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border-secondary shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden />
        <span className="text-2xs font-black uppercase tracking-widest text-text-tertiary hidden sm:block">
          {APP_BRAND.statusLabel}
        </span>
      </div>
    </nav>
  );
};

export default NavBar;
