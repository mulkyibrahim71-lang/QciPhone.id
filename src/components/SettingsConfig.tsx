import React, { useState, useEffect, useRef } from "react";
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Store, 
  Phone, 
  MapPin, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { formatNumberIDR } from "../utils";
import { User, updateProfile } from "firebase/auth";
import { uploadUserProfileImage } from "../firebase";

interface SettingsConfigProps {
  user?: User | null;
  onUpdateUser?: (updatedUser: User) => void;
  onResetAllData: () => void;
  onRestoreAllData: (backup: any) => void;
  transactionsCount: number;
}

export default function SettingsConfig({ 
  user,
  onUpdateUser,
  onResetAllData, 
  onRestoreAllData,
  transactionsCount
}: SettingsConfigProps) {
  
  // Shop Settings States
  const [shopName, setShopName] = useState("VANTAGE LUXE");
  const [whatsapp, setWhatsapp] = useState("081234567890");
  const [address, setAddress] = useState("ITC Kuningan Lantai 3 Blok A, Jakarta Selatan");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Avatar / Profile Pic States
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError("");
    setAvatarSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check format
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Format file harus JPG, PNG, atau WEBP.");
      return;
    }

    // Check size: 2MB max
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Ukuran file maksimal adalah 2MB.");
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveAvatar = async () => {
    if (!user || !avatarFile) {
      setAvatarError("Pilih file foto terlebih dahulu.");
      return;
    }

    try {
      setUploadingAvatar(true);
      setAvatarError("");
      setAvatarSuccess(false);

      // 1. Upload to storage
      const downloadUrl = await uploadUserProfileImage(user.uid, avatarFile);

      // 2. Update user's profile photoURL
      await updateProfile(user, { photoURL: downloadUrl });

      // 3. Update the global state so other components update without refreshing
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          photoURL: downloadUrl
        } as User);
      }

      setAvatarSuccess(true);
      setAvatarFile(null);
    } catch (err: any) {
      console.error("Gagal mengunggah foto profil:", err);
      setAvatarError("Terjadi kesalahan saat mengunggah foto profil: " + (err.message || err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load shop settings on mount
  useEffect(() => {
    const saved = localStorage.getItem("iphone_elite_shop_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.shopName) setShopName(parsed.shopName);
        if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
        if (parsed.address) setAddress(parsed.address);
      } catch (e) {}
    }
  }, []);

  // Save Shop Settings to LocalStorage
  const handleSaveSettings = () => {
    const payload = { shopName, whatsapp, address };
    localStorage.setItem("iphone_elite_shop_settings", JSON.stringify(payload));
    setSaveSuccess(true);
    
    // Dispatch an event so components like Sidebar can update immediately
    window.dispatchEvent(new Event("storage"));
    
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // backup handler (download JSON file)
  const handleBackupData = () => {
    const transactions = localStorage.getItem("qc_transactions");
    const activeShopSettings = { shopName, whatsapp, address };
    
    const backupPayload = {
      transactions: transactions ? JSON.parse(transactions) : [],
      shopSettings: activeShopSettings,
      backupDate: new Date().toISOString(),
      appToken: "iphone-elite-qc-system"
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `QC_SYSTEM_BACKUP_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Restore handler (upload JSON file)
  const handleLoadFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.appToken && parsed.appToken === "iphone-elite-qc-system") {
          onRestoreAllData(parsed);
          
          // Re-load settings states
          if (parsed.shopSettings) {
            if (parsed.shopSettings.shopName) setShopName(parsed.shopSettings.shopName);
            if (parsed.shopSettings.whatsapp) setWhatsapp(parsed.shopSettings.whatsapp);
            if (parsed.shopSettings.address) setAddress(parsed.shopSettings.address);
          }
          alert("RESTORE SUCCESS: Semua riwayat transaksi dan data pengaturan berhasil dikembalikan!");
        } else {
          alert("ERROR: Format file cadangan tidak valid atau tidak didukung!");
        }
      } catch (err) {
        alert("ERROR: Gagal membaca file cadangan. Pastikan format file adalah JSON valid.");
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be uploaded again
    e.target.value = "";
  };

  const handleResetData = () => {
    if (window.confirm("PERINGATAN KRITIKAL: Tindakan ini akan menghapus semua riwayat transaksi tersimpan dan mengembalikan pengaturan ke setelan awal. Apakah Anda yakin?")) {
      onResetAllData();
      setShopName("VANTAGE LUXE");
      setWhatsapp("081234567890");
      setAddress("ITC Kuningan Lantai 3 Blok A, Jakarta Selatan");
      alert("database lokal berhasil di-reset sepenuhnya!");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-[1200px] mx-auto pb-10">
      
      {/* Settings Header bar Section */}
      <section className="premium-card p-8 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h3 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-white/50 animate-spin-slow" />
            Pengaturan & Brand Profil
          </h3>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">
            Sesuaikan identitas toko fisik, rincian kontak, dan kelola integritas database QC.
          </p>
        </div>
      </section>

      {/* Grid Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Store Profile Customizer (8 columns) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Avatar Profile Card */}
          <div className="premium-card rounded-none border border-white/10 overflow-hidden">
            <div className="bg-white/[0.02] p-5 px-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4 text-white/75" />
                <h4 className="font-display font-bold text-white text-[11px] uppercase tracking-[0.2em]">
                  Foto Profil Pengguna
                </h4>
              </div>
              {avatarSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold tracking-wider uppercase animate-bounce">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Foto Berhasil Diperbarui</span>
                </div>
              )}
            </div>

            <div className="p-6 px-7 flex flex-col sm:flex-row items-center gap-8">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview Avatar" className="w-full h-full object-cover" />
                  ) : user?.photoURL ? (
                    <img src={user.photoURL} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl font-bold uppercase text-white/50">{(user?.displayName || "U").charAt(0)}</span>
                  )}
                </div>
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-1">
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest block">Unggah Foto Profil Baru</span>
                  <p className="text-[10px] text-white/50 leading-relaxed uppercase tracking-wider">
                    Format: JPG, PNG, WEBP. Maksimal 2MB. Foto baru akan langsung sinkron di header papan kontrol Anda.
                  </p>
                </div>

                {avatarError && (
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> {avatarError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload-input"
                    disabled={uploadingAvatar}
                  />
                  <label
                    htmlFor="avatar-upload-input"
                    className="px-5 py-3 border border-white/20 bg-white/5 hover:bg-white/[0.08] text-white text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Camera className="w-3.5 h-3.5 text-white/50" />
                    <span>Pilih Foto</span>
                  </label>

                  {avatarFile && (
                    <button
                      type="button"
                      onClick={handleSaveAvatar}
                      disabled={uploadingAvatar}
                      className="px-5 py-3 bg-white text-black font-extrabold text-[10px] tracking-[0.18em] uppercase hover:bg-white/95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Foto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card rounded-none border border-white/10 overflow-hidden">
            <div className="bg-white/[0.02] p-5 px-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-white/75" />
                <h4 className="font-display font-bold text-white text-[11px] uppercase tracking-[0.2em]">
                  Brand Identitas & Header Dokumen
                </h4>
              </div>
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold tracking-wider uppercase animate-bounce">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Disimpan</span>
                </div>
              )}
            </div>

            <div className="p-6 px-7 space-y-6">
              
              {/* input shop name */}
              <div className="space-y-2">
                <label className="block text-[9px] text-white/40 font-extrabold uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Store className="w-3 h-3" /> NAMA TOKO / BRAND
                </label>
                <input 
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. IPHONE ELITE JAKARTA"
                  className="w-full bg-[#080808] border border-white/10 rounded-none px-4 py-3 text-white text-[13px] font-medium tracking-wide focus:border-white focus:bg-white/[0.03] outline-none transition-all placeholder-white/15 uppercase"
                />
                <p className="text-[9px] text-white/30 italic uppercase tracking-wider">
                  Nama ini akan tampil di header layout website dan di setiap PDF hasil cetak QC.
                </p>
              </div>

              {/* whatsapp and address row */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                
                {/* whatsapp */}
                <div className="space-y-2">
                  <label className="block text-[9px] text-white/40 font-extrabold uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> NOMOR WHATSAPP TOKO
                  </label>
                  <input 
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. 08123456789"
                    className="w-full bg-[#080808] border border-white/10 rounded-none px-4 py-3 text-white font-mono text-[13px] tracking-wide focus:border-white focus:bg-white/[0.03] outline-none transition-all placeholder-white/15"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="block text-[9px] text-white/40 font-extrabold uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> ALAMAT TOKO FISIK
                  </label>
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Tuliskan nomor toko atau alamat detail..."
                    rows={3}
                    className="w-full bg-[#080808] border border-white/10 rounded-none px-4 py-3 text-white text-[13px] tracking-wide focus:border-white focus:bg-white/[0.03] outline-none transition-all placeholder-white/15 resize-none"
                  />
                </div>

              </div>

              <div className="border-t border-white/5 pt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-6 py-3.5 bg-white text-black font-extrabold text-[10px] tracking-[0.25em] uppercase hover:bg-white/95 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Identitas Toko</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Database Utility Tooling (4 columns) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* File Storage Utilities */}
          <div className="premium-card rounded-none border border-white/10 overflow-hidden">
            <div className="bg-white/[0.02] p-5 px-6 border-b border-white/10 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-white/75" />
              <h4 className="font-display font-medium text-white text-[11px] uppercase tracking-[0.2em]">
                Database Ledger Utility
              </h4>
            </div>

            <div className="p-6 space-y-5">
              
              <div className="bg-[#0b0b0b] border border-white/5 p-4 py-4.5 space-y-2 text-center">
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest block">Ledger Status</span>
                <span className="text-2xl font-mono font-bold text-white block leading-none">{transactionsCount}</span>
                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider block">Transaksi Tersimpan</span>
              </div>

              {/* Action Operations */}
              <div className="space-y-3 pt-2">
                
                {/* Backup Button */}
                <button
                  type="button"
                  onClick={handleBackupData}
                  className="w-full px-4 py-3.5 border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/30 text-white font-semibold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-white/50" />
                  <span>Backup Data (JSON)</span>
                </button>

                {/* Restore Input & Button */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleRestoreFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={handleLoadFileClick}
                  className="w-full px-4 py-3.5 border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/30 text-white font-semibold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-white/50" />
                  <span>Restore Data (JSON)</span>
                </button>

                <div className="py-2">
                  <div className="h-[1px] bg-white/10 w-full" />
                </div>

                {/* Reset Database */}
                <button
                  type="button"
                  onClick={handleResetData}
                  className="w-full px-4 py-3.5 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset Semua Data</span>
                </button>

              </div>

            </div>
          </div>

          {/* Guidelines info card for QC Standard */}
          <div className="premium-card p-6.5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-white/70">
              <HelpCircle className="w-4 h-4" />
              <h5 className="font-display font-extrabold text-[9px] uppercase tracking-[0.2em] leading-none text-white">Standard Mutu</h5>
            </div>
            <p className="text-[10px] text-white/50 leading-relaxed uppercase tracking-wider">
              Gunakan fitur backup setiap malam untuk mengamankan data audit riwayat QC dari potensi hilangnya data peramban lokal (browser cache clear).
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
