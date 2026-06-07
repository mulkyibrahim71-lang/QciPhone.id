import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import QCCheckerForm from "./components/QCCheckerForm";
import SalesHistoryLedger from "./components/SalesHistoryLedger";
import StatisticsOverview from "./components/StatisticsOverview";
import SettingsConfig from "./components/SettingsConfig";
import { Transaction, QCPart } from "./types";
import { 
  DEFAULT_PARTS, 
  SAMPLE_TRANSACTIONS, 
  STORAGE_KEY_TRANSACTIONS, 
  STORAGE_KEY_PARTS 
} from "./data";

// Firebase integrations
import { 
  auth, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  googleProvider,
  getFirebaseTransactions,
  saveFirebaseTransaction,
  deleteFirebaseTransaction,
  getFirebaseSettings,
  saveFirebaseSettings
} from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";

// Lucide icon
import { Chrome, ShieldAlert, Monitor, Keyboard, HelpCircle, X } from "lucide-react";

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState("checker");

  // Mobile sidebar menu drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global search input query string
  const [searchQuery, setSearchQuery] = useState("");

  // Ledger state containing all transaction records
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Default price multipliers override state
  const [partsConfig, setPartsConfig] = useState<QCPart[]>([]);

  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Keyboard shortcut modal visibility
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // QRIS Donation banner overlays
  const [showQrisDonationModal, setShowQrisDonationModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const isMuted = localStorage.getItem("auraphone_qris_dont_show_again") === "true";
    const isShownThisSession = sessionStorage.getItem("auraphone_qris_shown_this_session") === "true";
    if (!isMuted && !isShownThisSession) {
      const timer = setTimeout(() => {
        setShowQrisDonationModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseQris = () => {
    sessionStorage.setItem("auraphone_qris_shown_this_session", "true");
    if (dontShowAgain) {
      localStorage.setItem("auraphone_qris_dont_show_again", "true");
    }
    setShowQrisDonationModal(false);
  };

  // Theme states
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("auraphone_dark_mode");
    return saved !== "false"; // default to true
  });

  // Dynamic theme syncing
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
    }
    localStorage.setItem("auraphone_dark_mode", String(darkMode));
  }, [darkMode]);

  // Auth session listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch remote user-isolated Firestore logs
        const fetched = await getFirebaseTransactions(currentUser.uid);
        if (fetched.length > 0) {
          setTransactions(fetched);
          localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + currentUser.uid, JSON.stringify(fetched));
        } else {
          // Fallback initialization with default sample transactions if first-time sign-in
          setTransactions(SAMPLE_TRANSACTIONS);
        }

        // Fetch remote user custom settings if any
        const remoteSettings = await getFirebaseSettings(currentUser.uid);
        if (remoteSettings) {
          localStorage.setItem("iphone_elite_shop_settings", JSON.stringify(remoteSettings));
        } else {
          // Initialize default shop settings for auraphone.id and owner
          const defaultSettings = {
            shopName: "auraphone.id",
            ownerName: "Rd. Mulky Ibrahim",
            whatsapp: "088971544885",
            address: "Bandung, Jawa Barat"
          };
          localStorage.setItem("iphone_elite_shop_settings", JSON.stringify(defaultSettings));
          await saveFirebaseSettings(currentUser.uid, defaultSettings);
        }
      } else {
        setTransactions([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Global Keyboard Shortcuts Event Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bypass if typing in text elements
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        setActiveTab("checker");
      } else if (key === "h") {
        e.preventDefault();
        setActiveTab("history");
      } else if (key === "e") {
        e.preventDefault();
        // Dispatch local event for compiler and UI to resolve active document PDF generator on current page
        window.dispatchEvent(new CustomEvent("trigger-active-pdf"));
      } else if (key === "?") {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Initial local loading configs
  useEffect(() => {
    const storedPartsStr = localStorage.getItem(STORAGE_KEY_PARTS);
    if (storedPartsStr) {
      try {
        setPartsConfig(JSON.parse(storedPartsStr));
      } catch (err) {
        setPartsConfig(DEFAULT_PARTS);
      }
    } else {
      localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(DEFAULT_PARTS));
      setPartsConfig(DEFAULT_PARTS);
    }
  }, []);

  // Sync Google Sign In trigger popup
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Sign-in operation failed:", e);
      setAuthLoading(false);
    }
  };

  const handleAppLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Save transaction handler callback
  const handleSaveTransaction = async (newTransaction: Transaction) => {
    // 1. Sync local memory
    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      if (user) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid, JSON.stringify(updated));
      }
      return updated;
    });

    // 2. Transmit block to remote Firestore isolated transactions list
    if (user) {
      try {
        await saveFirebaseTransaction(user.uid, newTransaction);
      } catch (err) {
        console.error("Remote firestore synchronization failed:", err);
      }
    }
  };

  // Update transaction handler callback (e.g. for change status option)
  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
      if (user) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid, JSON.stringify(updated));
      }
      return updated;
    });

    if (user) {
      try {
        await saveFirebaseTransaction(user.uid, updatedTx);
      } catch (err) {
        console.error("Remote firestore synchronization failed on update:", err);
      }
    }
  };

  // Delete transaction handler callback
  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (user) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid, JSON.stringify(filtered));
      }
      return filtered;
    });

    if (user) {
      try {
        await deleteFirebaseTransaction(user.uid, id);
      } catch (err) {
        console.error("Remote deletion failed:", err);
      }
    }
  };

  // Restore dynamic database logic
  const handleRestoreTransactions = async (imported: Transaction[]) => {
    setTransactions(imported);
    if (user) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid, JSON.stringify(imported));
      for (const tx of imported) {
        await saveFirebaseTransaction(user.uid, tx);
      }
    }
  };

  // Reset database ledger entirely
  const handleResetLedger = async () => {
    setTransactions(SAMPLE_TRANSACTIONS);
    if (user) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid, JSON.stringify(SAMPLE_TRANSACTIONS));
      for (const tx of SAMPLE_TRANSACTIONS) {
        await saveFirebaseTransaction(user.uid, tx);
      }
    }
  };

  const handleResetAllData = () => {
    if (user) {
      localStorage.removeItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid);
    }
    localStorage.removeItem("iphone_elite_shop_settings");
    setTransactions([]);
  };

  const handleRestoreAllData = async (backup: any) => {
    if (backup.transactions) {
      setTransactions(backup.transactions);
      if (user) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS + "_" + user.uid, JSON.stringify(backup.transactions));
        for (const tx of backup.transactions) {
          await saveFirebaseTransaction(user.uid, tx);
        }
      }
    }
    if (backup.shopSettings && user) {
      localStorage.setItem("iphone_elite_shop_settings", JSON.stringify(backup.shopSettings));
      await saveFirebaseSettings(user.uid, backup.shopSettings);
    }
    window.dispatchEvent(new Event("storage"));
  };

  // Save price matrix overrides callback
  const handleSavePartsConfig = (updated: QCPart[]) => {
    setPartsConfig(updated);
    localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(updated));
  };

  // Factory overrides callback
  const handleResetFactoryPartsConfig = () => {
    setPartsConfig(DEFAULT_PARTS);
    localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(DEFAULT_PARTS));
  };

  // Map Tab Names cleanly for the Header View title
  const getHeaderTitle = () => {
    switch (activeTab) {
      case "checker":
        return "Form QC iPhone";
      case "history":
        return "Riwayat Penjualan";
      case "statistics":
        return "Statistik";
      case "settings":
        return "Pengaturan";
      default:
        return "Konsol QC";
    }
  };

  // Session loader spinner view
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans">
        <div className="space-y-4 text-center">
          <div className="h-4.5 w-4.5 animate-spin border-2 border-white border-t-transparent mx-auto"></div>
          <p className="text-[10px] tracking-[0.25em] uppercase font-bold text-white/45">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // 1. Beautiful Minimalist Google Login Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative font-sans select-none overflow-hidden">
        {/* Ambient backlighting visual cues */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-white/[0.012] blur-[140px] -top-1/4 -left-1/4 pointer-events-none" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-white/[0.008] blur-[160px] -bottom-1/3 -right-1/3 pointer-events-none" />

        <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 p-8 sm:p-12 space-y-10 text-center relative z-10 hover:shadow-[0_0_50px_rgba(255,255,255,0.02)] transition-all duration-500">
          <div className="space-y-4">
            <div className="h-10 w-10 bg-white text-black flex items-center justify-center mx-auto rounded-sm shadow-xl">
              <span className="font-serif italic font-extrabold text-[15px]">a.</span>
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-base font-bold text-white tracking-[0.25em] uppercase">
                auraphone.id
              </h1>
              <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/35">
                Tools QC iPhone
              </p>
            </div>
          </div>

          <div className="w-[1px] h-12 bg-white/10 mx-auto" />

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-1 bg-white/5 text-[9px] font-mono uppercase text-white/50 tracking-widest leading-none">
                <ShieldAlert className="w-3 h-3 text-white/40" />
                AKSES AMAN
              </span>
              <p className="text-[11px] text-white/40 font-medium tracking-wide uppercase max-w-xs mx-auto leading-relaxed">
                Masuk dengan akun Google kamu untuk mengakses tools QC iPhone auraphone.id
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-black hover:bg-neutral-200 active:scale-98 font-bold text-[11px] tracking-[0.2em] uppercase py-3.5 px-4 rounded-none flex items-center justify-center gap-3 transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Chrome className="w-4 h-4 shrink-0" />
              <span>Masuk dengan Google</span>
            </button>
          </div>

          <div className="text-[9px] font-mono text-white/20 tracking-wider">
            Data kamu aman & terpisah per akun
          </div>
        </div>
      </div>
    );
  }

  // 2. Fully Authenticated Workspace Layout
  return (
    <div className="min-h-screen flex bg-dark-base relative overflow-x-clip">
      {/* Mobile backdrop blur overlay is z-45 */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="no-print fixed inset-0 bg-black/70 backdrop-blur-sm z-45 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Embedded Left Floating Core Navigation Rail */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        user={user}
        onLogout={handleAppLogout}
      />

      {/* Main dashboard content wrapper with desktop adaptive margin */}
      <div className="flex-1 lg:ml-[260px] ml-0 min-h-screen flex flex-col transition-all duration-300">
        
        {/* Header Top Navigation Menu */}
        <Topbar 
          title={getHeaderTitle()} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          user={user}
          onLogout={handleAppLogout}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(prev => !prev)}
          onSearchFocus={() => {
            if (activeTab !== "history" && activeTab !== "statistics") {
              setActiveTab("history");
            }
          }}
        />

        {/* Dynamic Panel Injection */}
        <main className="mt-20 p-4 sm:p-8 flex-1 max-w-[1600px] w-full mx-auto overflow-x-visible">
          {activeTab === "checker" && (
            <QCCheckerForm 
              onSaveTransaction={handleSaveTransaction} 
              partsConfig={partsConfig}
            />
          )}

          {activeTab === "history" && (
            <SalesHistoryLedger 
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              onRestoreTransactions={handleRestoreTransactions}
              onResetLedger={handleResetLedger}
              onUpdateTransaction={handleUpdateTransaction}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === "statistics" && (
            <StatisticsOverview transactions={transactions} />
          )}

          {activeTab === "settings" && (
            <SettingsConfig 
              user={user}
              onUpdateUser={(updatedUser) => setUser(updatedUser)}
              onResetAllData={handleResetAllData}
              onRestoreAllData={handleRestoreAllData}
              transactionsCount={transactions.length}
            />
          )}
        </main>
      </div>

      {/* Floating Keyboard Shortcuts Trigger Button */}
      <button
        onClick={() => setShowShortcutsModal(true)}
        className="no-print fixed bottom-6 right-6 h-10 w-10 bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer z-50 rounded-none"
        title="Daftar Shortcut Keyboard (?)"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      {/* Keyboard Shortcuts Modal Dialog */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[250] p-4 no-print font-sans select-none animate-fade-in">
          <div className="premium-card w-full max-w-sm border-white/20 p-6 flex flex-col relative">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white border border-white/15 p-1 cursor-pointer hover:bg-white/5 rounded-none"
              title="Close modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h3 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-white/50" />
              Keyboard Shortcuts
            </h3>

            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                Tekan tombol berikut di luar form input untuk jalan pintas:
              </p>
              <div className="divide-y divide-white/10">
                <div className="flex justify-between py-2.5 text-xs text-white">
                  <span className="font-bold tracking-wide uppercase">Mulai QC Baru</span>
                  <kbd className="px-2 py-0.5 bg-white/10 font-mono font-bold text-[10px] uppercase rounded-none tracking-widest border border-white/10">N</kbd>
                </div>
                <div className="flex justify-between py-2.5 text-xs text-white">
                  <span className="font-bold tracking-wide uppercase">Buka Riwayat</span>
                  <kbd className="px-2 py-0.5 bg-white/10 font-mono font-bold text-[10px] uppercase rounded-none tracking-widest border border-white/10">H</kbd>
                </div>
                <div className="flex justify-between py-2.5 text-xs text-white">
                  <span className="font-bold tracking-wide uppercase">Export PDF Aktif</span>
                  <kbd className="px-2 py-0.5 bg-white/10 font-mono font-bold text-[10px] uppercase rounded-none tracking-widest border border-white/10">E</kbd>
                </div>
                <div className="flex justify-between py-2.5 text-xs text-white">
                  <span className="font-bold tracking-wide uppercase">Daftar Shortcut</span>
                  <kbd className="px-2 py-0.5 bg-white/10 font-mono font-bold text-[10px] uppercase rounded-none tracking-widest border border-white/10">?</kbd>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full bg-white text-black font-extrabold text-[10px] tracking-widest uppercase mt-6 py-2 rounded-none cursor-pointer text-center"
            >
              Tutup Bantuan
            </button>
          </div>
        </div>
      )}

      {/* QRIS Donation Pop-up */}
      {showQrisDonationModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4 no-print select-none animate-fade-in font-sans">
          <div className="premium-card w-full max-w-sm border-white/20 p-6 flex flex-col items-center relative text-center">
            
            <h3 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              SUPPORT THE DEVELOPER
            </h3>

            <p className="text-[10px] text-white/60 tracking-normal leading-relaxed uppercase max-w-xs mb-5 font-sans">
              Aplikasi ini sepenuhnya gratis dan dikembangkan mandiri oleh <span className="text-white font-bold">Rd. Mulky Ibrahim</span>. Jika terbantu, Anda bisa dukung kelangsungan server & update data dengan donasi sukarela.
            </p>

            {/* QRIS image layout centering */}
            <div className="w-[180px] h-[180px] bg-white p-1.5 flex items-center justify-center mb-5 border border-white/10 select-none">
              <img 
                src="/assets/qris.png" 
                alt="QRIS Donasi auraphone.id" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase mb-5 animate-pulse">
              Scan QRIS di atas untuk donasi • Bebas Nominal
            </p>

            <div className="w-full flex flex-col gap-3">
              <label className="flex items-center justify-center gap-2 text-[10px] text-white/40 uppercase cursor-pointer hover:text-white/60 transition-all font-sans">
                <input 
                  type="checkbox" 
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded-none border-white/20 accent-white h-3.5 w-3.5 cursor-pointer bg-transparent outline-none focus:ring-0 text-black font-bold"
                />
                <span>Jangan Tampilkan Lagi</span>
              </label>

              <button
                onClick={handleCloseQris}
                className="w-full bg-white text-black font-extrabold text-[10px] tracking-widest uppercase py-3.5 rounded-none cursor-pointer text-center hover:bg-neutral-200 transition-all"
              >
                Tutup / Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

