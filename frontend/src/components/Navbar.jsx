import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const links = [
  { to: '/', label: 'Campaigns' },
  { to: '/new', label: 'Compose' },
  { to: '/settings', label: 'Settings' },
];

export default function Navbar() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-surface min-h-screen flex flex-col justify-between px-4 py-6">
      <div>
        <div className="font-display text-lg font-semibold tracking-tight mb-8 px-2">
          Dispatch
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:text-paper hover:bg-white/5'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <button
        onClick={handleSignOut}
        className="px-3 py-2 rounded-md text-sm font-medium text-muted hover:text-failed hover:bg-failed/10 text-left transition-colors"
      >
        Sign out
      </button>
    </aside>
  );
}
