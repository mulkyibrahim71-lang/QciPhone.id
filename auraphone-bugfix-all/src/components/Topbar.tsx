import { Search, Bell, Menu, Sun, Moon, LogOut } from "lucide-react";

interface TopbarProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchFocus?: () => void;
  onToggleSidebar?: () => void;
  user?: any;
  onLogout?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Topbar({ 
  title, 
  searchQuery, 
  setSearchQuery, 
  onSearchFocus, 
  onToggleSidebar,
  user,
  onLogout,
  darkMode,
  onToggleDarkMode
}: TopbarProps) {
  return (
    <header className="no-print fixed top-0 right-0 lg:left-[260px] left-0 h-20 bg-[#050505]/85 backdrop-blur-[24px] border-b border-white/10 z-40 flex justify-between items-center px-4 sm:px-8 lg:px-10">
      <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
        {/* Burger menu button on mobile */}
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer rounded-[2px]"
          title="Open Menu"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div className="w-[1px] h-5 bg-white/30 lg:hidden"></div>
        <h2 className="font-display text-[11px] sm:text-xs tracking-[0.18em] sm:tracking-[0.25em] uppercase font-bold text-white/90 truncate max-w-[130px] sm:max-w-none">
          {title}
        </h2>

        {/* Brand System Tags Info */}
        <span className="hidden md:inline-block text-[9px] font-mono text-white/40 tracking-wider">
          auraphone.id | v2.1.0 | Last updated: Juni 2025
        </span>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5 group-focus-within:text-white transition-colors duration-200" />
          <input
            type="text"
            placeholder="CARI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={onSearchFocus}
            className="w-24 sm:w-44 md:w-60 bg-white/5 text-white placeholder-white/35 text-[9px] sm:text-[10px] tracking-[0.1em] uppercase py-2 pl-10 pr-3 sm:pr-6 border border-white/10 focus:border-white focus:ring-0 outline-none transition-all duration-300 rounded-none font-medium"
          />
        </div>

        {/* Light/Dark Mode Switch */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer rounded-none border border-white/10"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-3 sm:gap-4 border-l border-white/10 pl-3 sm:pl-6">
          {user ? (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-white tracking-wide uppercase truncate max-w-[110px]">{user.displayName || "Inspector"}</p>
                <p className="text-[8px] font-mono text-white/40">{user.email || ""}</p>
              </div>
              <div className="h-9 w-9 rounded-none bg-white/10 flex items-center justify-center text-white font-bold overflow-hidden border border-white/10" title={user.displayName}>
                {user.photoURL ? (
                  <img
                    className="w-full h-full object-cover filter contrast-110 hover:contrast-125 transition-all duration-300"
                    src={user.photoURL}
                    alt={user.displayName || "User Avatar"}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs uppercase">{(user.displayName || "U").charAt(0)}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-none bg-white/10 flex items-center justify-center text-white/40 border border-white/10">
              <span className="text-xs">?</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

