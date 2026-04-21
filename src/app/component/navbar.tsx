"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Command, Database, Archive, Layers, Settings, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Neural OS', icon: Command },
  { href: '/ask', label: 'Ask', icon: Brain },
  { href: '/memory', label: 'Memory', icon: Database },
  { href: '/buffer', label: 'Buffer', icon: Archive },
  { href: '/cognitive', label: 'Cognitive', icon: Layers },
];

const NavBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] h-16 bg-white/80 backdrop-blur-3xl border-b border-[#E0E0DE] flex items-center justify-between px-8 shadow-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Command size={18} className="text-white" />
        </div>
        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] italic hidden sm:block">
          Identity Prism
        </span>
      </Link>

      {/* Nav Links */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive
                  ? 'bg-[#1A1A1A] text-white shadow-lg'
                  : 'text-[#888886] hover:bg-[#F5F5F3] hover:text-[#1A1A1A]'
              }`}
            >
              <Icon size={14} />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F3] border border-[#E0E0DE]">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#888886] hidden sm:block">Active</span>
      </div>
    </nav>
  );
};

export default NavBar;
