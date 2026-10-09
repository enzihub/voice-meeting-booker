'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Meeting Booker', on: 'from-indigo-900 to-purple-800 ring-2 ring-purple-500/30', off: 'from-indigo-950 to-purple-900 hover:from-indigo-900 hover:to-purple-800', text: 'text-indigo-100' },
  { href: '/sdr', label: 'SDR Version', on: 'from-slate-800 to-cyan-900 ring-2 ring-cyan-500/30', off: 'from-slate-900 to-cyan-950 hover:from-slate-800 hover:to-cyan-900', text: 'text-cyan-100' },
  { href: '/reminder', label: 'Payment Reminder', on: 'from-violet-900 to-fuchsia-800 ring-2 ring-fuchsia-500/30', off: 'from-violet-950 to-fuchsia-900 hover:from-violet-900 hover:to-fuchsia-800', text: 'text-fuchsia-100' },
];

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto flex gap-1.5 p-1.5 bg-black/80 backdrop-blur-md rounded-full border border-purple-900/40 shadow-xl max-w-full overflow-x-auto no-scrollbar">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`bg-gradient-to-br ${isActive(l.href) ? l.on : l.off} ${l.text} text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-full shadow-lg transition-all hover:-translate-y-0.5 whitespace-nowrap`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
