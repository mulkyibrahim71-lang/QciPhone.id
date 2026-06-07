import React, { useState, useEffect } from "react";
import { 
  FileJson, 
  Plus, 
  Trash2, 
  Eye, 
  Printer, 
  History, 
  TrendingUp, 
  Coins, 
  DollarSign, 
  Layers, 
  Sparkles, 
  Search, 
  Upload, 
  RefreshCw,
  FolderSync,
  FileText,
  Tag,
  Share2
} from "lucide-react";
import { Transaction } from "../types";
import { formatIDR } from "../utils";
import { IPHONE_MODELS, DEFAULT_PARTS } from "../data";
import { generatePDF } from "../utils/exportUtils";

interface SalesHistoryLedgerProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onRestoreTransactions: (imported: Transaction[]) => void;
  onResetLedger: () => void;
  onUpdateTransaction: (tx: Transaction) => void;
  searchQuery: string;
}

export default function SalesHistoryLedger({ 
  transactions, 
  onDeleteTransaction, 
  onRestoreTransactions,
  onResetLedger,
  onUpdateTransaction,
  searchQuery
}: SalesHistoryLedgerProps) {
  
  // Filtering states
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Status Edit Modal State
  const [statusEditTx, setStatusEditTx] = useState<Transaction | null>(null);
  const [editStatus, setEditStatus] = useState<"Belum Terjual" | "DP" | "Terjual">("Belum Terjual");
  const [editDpRaw, setEditDpRaw] = useState("");
  const [editSellRaw, setEditSellRaw] = useState("");
  const [editBuyer, setEditBuyer] = useState("");

  // Detailed Modal overlay View State
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Reset ledger confirm prompt boolean
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Shop Settings configuration for PDF Exports
  const [shopSettings, setShopSettings] = useState({
    shopName: "auraphone.id",
    ownerName: "Rd. Mulky Ibrahim",
    whatsapp: "088971544885",
    address: "Bandung, Jawa Barat"
  });

  useEffect(() => {
    const saved = localStorage.getItem("iphone_elite_shop_settings");
    if (saved) {
      try {
        setShopSettings(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const generateWhatsAppMessage = (t: Transaction) => {
    const isPass = t.eligibility === "LAYAK BELI" || t.eligibility === "PERTIMBANGKAN";
    const statusIcon = isPass ? "✅" : "❌";
    
    // Status text translation
    const currentStatus = t.status || "Belum Terjual";
    let statusEmoji = "🔴";
    if (currentStatus === "DP") statusEmoji = "🟠";
    if (currentStatus === "Terjual") statusEmoji = "🟢";

    let message = "";
    message += `*LAPORAN QC & TRANSAKSI - ${shopSettings.shopName.toUpperCase()}*\n`;
    message += `===============================\n\n`;
    message += `📱 *UNIT:* iPhone ${t.deviceModel} - ${t.deviceStorage} (${t.deviceColor || "—"})\n`;
    message += `📋 *STATUS UNIT:* ${statusEmoji} [ ${currentStatus.toUpperCase()} ]\n`;
    if (t.buyerName) {
      message += `👤 *PELANGGAN:* ${t.buyerName}\n`;
    }
    message += `📅 *TANGGAL QC:* ${t.date}\n`;
    message += `⚖️ *REKOMENDASI:* ${t.eligibility}\n\n`;
    
    message += `💰 *FINANSIAL ESTIMASI*:\n`;
    message += `• Harga Beli: Rp ${(t.buyPrice || 0).toLocaleString("id-ID")}\n`;
    if (currentStatus === "DP") {
      message += `• Pembayaran DP: Rp ${(t.dpAmount || 0).toLocaleString("id-ID")}\n`;
    } else if (currentStatus === "Terjual") {
      message += `• Harga Jual Net: Rp ${(t.sellPrice || 0).toLocaleString("id-ID")}\n`;
      message += `• Keuntungan Bersih: Rp ${(t.netProfit || 0).toLocaleString("id-ID")}\n`;
    }
    message += `• Estimasi Servis/Perbaikan: Rp ${(t.totalRepairCost || 0).toLocaleString("id-ID")}\n\n`;

    message += `🛠️ *STATUS CHECKPOINT HARDWARE*:\n`;
    // Render status of partsState
    if (t.partsState) {
      Object.entries(t.partsState).forEach(([pName, state]: any) => {
        let condIcon = "✅";
        if (state.repairCost > 0) condIcon = "⚠️";
        message += `${condIcon} *${pName}*: ${state.conditionIdx === 0 ? "Normal" : state.conditionIdx === 1 ? "Kerusakan Ringan" : state.conditionIdx === 2 ? "Kerusakan Berat" : "Komponen Pihak Ke-3"}`;
        if (state.bhVal) message += ` (BH: ${state.bhVal}%)`;
        if (state.repairCost > 0) message += ` [Est: Rp ${state.repairCost.toLocaleString("id-ID")}]`;
        message += `\n`;
      });
    }

    if (t.notes) {
      message += `\n📝 *CATATAN ESTIMASI & DIAGNOSIS*:\n`;
      message += `_"${t.notes}"_\n\n`;
    }

    message += `===============================\n`;
    message += `_Dibuat otomatis oleh auraphone.id_`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // Filter calculations
  const filteredTransactions = transactions.filter(t => {
    const term = searchQuery.toLowerCase();
    const nameMatch = t.customerName.toLowerCase().includes(term);
    const modelMatchStr = t.deviceModel.toLowerCase().includes(term);
    const idMatch = t.id.toLowerCase().includes(term);
    const matchesSearch = nameMatch || modelMatchStr || idMatch;

    const matchesModel = modelFilter === "all" || t.deviceModel === modelFilter;
    
    let matchesStatus = true;
    if (statusFilter === "BELUM_TERJUAL") {
      matchesStatus = t.status === "Belum Terjual" || !t.status;
    } else if (statusFilter === "DP") {
      matchesStatus = t.status === "DP";
    } else if (statusFilter === "TERJUAL") {
      matchesStatus = t.status === "Terjual";
    } else if (statusFilter === "PASS") {
      matchesStatus = t.eligibility === "LAYAK BELI" || t.eligibility === "PERTIMBANGKAN";
    } else if (statusFilter === "FAIL") {
      matchesStatus = t.eligibility === "BERESIKO TINGGI";
    }

    return matchesSearch && matchesModel && matchesStatus;
  });

  // KPI Metrics sum calculation
  const totalCount = filteredTransactions.length;
  const totalRevenue = filteredTransactions.reduce((acc, curr) => acc + (curr.status === "Terjual" ? curr.sellPrice : 0), 0);
  const totalCapital = filteredTransactions.reduce((acc, curr) => acc + (curr.buyPrice + curr.totalRepairCost), 0);
  const totalProfit = filteredTransactions.reduce((acc, curr) => acc + (curr.status === "Terjual" ? curr.netProfit : 0), 0);
  const avgProfit = totalCount > 0 ? totalProfit / totalCount : 0;

  // Render Stats Cards
  const stats = [
    {
      title: "TOTAL TRANSAKSI",
      value: totalCount.toLocaleString(),
      subtext: "Semua Sesi QC",
      icon: History,
      highlight: false
    },
    {
      title: "TOTAL OMSET (TERJUAL)",
      value: formatIDR(totalRevenue),
      subtext: "Sesi Selesai",
      icon: DollarSign,
      highlight: false
    },
    {
      title: "TOTAL MODAL TERKUNCI",
      value: formatIDR(totalCapital),
      subtext: "Belanja & Servis QC",
      icon: Coins,
      highlight: false
    },
    {
      title: "TOTAL MARGIN KEUNTUNGAN",
      value: formatIDR(totalProfit),
      subtext: `Margin Efektif: ${totalCapital > 0 ? Math.round((totalProfit / totalCapital) * 100) : 0}%`,
      icon: TrendingUp,
      highlight: true
    },
    {
      title: "AVG UNTUNG / UNIT",
      value: formatIDR(Math.round(avgProfit)),
      subtext: "Efisiensi Diagnostik",
      icon: Layers,
      highlight: false
    }
  ];

  // Export JSON Database Backup
  const handleBackup = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `iPhone_Elite_QC_Ledger_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Restore Database via User JSON Input
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          onRestoreTransactions(imported);
          alert("Database Ledger berhasil dipulihkan!");
        } else {
          alert("Format file cadangan tidak valid!");
        }
      } catch (err) {
        alert("Gagal membaca file cadangan!");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Select Transaction for Detail Panel
  const activeDetailObj = transactions.find(t => t.id === activeDetailsId);

  return (
    <div className="space-y-8">
      
      {/* 5-Column Statistics Cards */}
      <section className="no-print grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title}
              className={`premium-card p-6 rounded-none space-y-2 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.04)] ${
                stat.highlight ? "border-white/40" : ""
              }`}
            >
              <p className="text-white/40 font-bold text-[9px] tracking-[0.2em] uppercase">
                {stat.title}
              </p>
              <h3 className={`font-mono text-xl font-bold tracking-tight ${stat.highlight ? "text-white" : "text-white/90"}`}>
                {stat.value}
              </h3>
              <div className="text-white/60 font-semibold text-[10px] tracking-wider uppercase flex items-center gap-1">
                <span>{stat.subtext}</span>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-8 transition-all duration-300 text-white">
                <Icon className="w-20 h-20" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Filters & Actions Panel */}
      <section className="no-print flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="premium-card flex items-center px-4 py-2 rounded-none gap-3">
            <select 
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent border-none text-[11px] tracking-wider uppercase text-white focus:ring-0 cursor-pointer outline-none font-medium pr-8"
            >
              <option value="all" className="bg-[#121212] text-white">SEMUA MODEL</option>
              {IPHONE_MODELS.map(model => (
                <option key={model} value={model} className="bg-[#121212] text-white">{model.toUpperCase()}</option>
              ))}
            </select>
            <div className="w-[1px] h-4 bg-white/10" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-[11px] tracking-wider uppercase text-white focus:ring-0 cursor-pointer outline-none font-medium pr-8"
            >
              <option value="all" className="bg-[#121212] text-white">SEMUA STATUS QC</option>
              <option value="BELUM_TERJUAL" className="bg-[#121212] text-white">🔴 BELUM TERJUAL</option>
              <option value="DP" className="bg-[#121212] text-white">🟠 DP / INDENT</option>
              <option value="TERJUAL" className="bg-[#121212] text-white">🟢 TERJUAL</option>
              <option value="PASS" className="bg-[#121212] text-white">INVESTASI PASS (LAYAK)</option>
              <option value="FAIL" className="bg-[#121212] text-white">RESIKO TINGGI</option>
            </select>
          </div>
        </div>


      </section>

      {/* Main Transactions Ledger Layout */}
      <section className="premium-card rounded-none">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.01]">
          <h4 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em]">Buku Kas & Riwayat Transaksi</h4>
          <span className="text-white/40 font-medium text-[10px] uppercase tracking-wider">
            Menampilkan {filteredTransactions.length} dari {transactions.length} entri
          </span>
        </div>

        <div 
          className="w-full relative overflow-x-auto min-h-[350px] touch-pan-x"
          style={{ 
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "-ms-autohiding-scrollbar"
          }}
        >
          {/* Shadow right indicator for mobile scrolling indicator */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/50 to-transparent z-10 block lg:hidden" />

          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <History className="w-12 h-12 mb-4 opacity-15" />
              <p className="text-[11px] tracking-[0.2em] uppercase font-semibold opacity-50">Tidak ada riwayat transaksi</p>
              <p className="text-[10px] tracking-wider opacity-30 uppercase mt-1">Mulai diagnosa QC baru untuk menghasilkan rekaman transaksi.</p>
            </div>
          ) : (
            <table className="min-w-[1100px] text-left border-collapse table-auto" style={{ minWidth: "1100px" }}>
              <thead>
                <tr className="bg-white/5 text-white/40 font-bold text-[9px] tracking-[0.18em] uppercase border-b border-white/10">
                  <th className="px-6 py-4">ID/TX</th>
                  <th className="px-6 py-4">TANGGAL</th>
                  <th className="px-6 py-4">PELANGGAN</th>
                  <th className="px-6 py-4">TIPE IPHONE</th>
                  <th className="px-6 py-4">STORAGE</th>
                  <th className="px-6 py-4">HARGA BELI</th>
                  <th className="px-6 py-4">STATUS UNIT</th>
                  <th className="px-6 py-4">HARGA JUAL</th>
                  <th className="px-6 py-4">MARGIN (PROFIT)</th>
                  <th className="px-6 py-4 text-center">VERDIKT QC</th>
                  <th className="px-6 py-4 text-right no-print">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((t) => {
                  const isPass = t.eligibility === "LAYAK BELI" || t.eligibility === "PERTIMBANGKAN";
                  const statusClass = isPass
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20";
                  
                  // Sales unit status mapping
                  const saleStatus = t.status || "Belum Terjual";
                  let saleStatusBadge = "";
                  if (saleStatus === "Belum Terjual") {
                    saleStatusBadge = "bg-neutral-800 text-zinc-400 border-neutral-700";
                  } else if (saleStatus === "DP") {
                    saleStatusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  } else if (saleStatus === "Terjual") {
                    saleStatusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  }

                  // Sell price column value mapping
                  let sellPriceText = "—";
                  if (saleStatus === "Terjual") {
                    sellPriceText = formatIDR(t.sellPrice);
                  } else if (saleStatus === "DP") {
                    sellPriceText = `DP: ${formatIDR(t.dpAmount || 0)}`;
                  }

                  // Spread margin column value mapping only on Sold status
                  const isSold = saleStatus === "Terjual";
                  const profitColor = t.netProfit >= 0 ? "text-emerald-400" : "text-amber-500";
                  const marginTextStr = isSold 
                    ? `${t.netProfit >= 0 ? "+" : ""}${formatIDR(t.netProfit)}` 
                    : "—";

                  return (
                    <tr 
                      key={t.id} 
                      className="hover:bg-white/[0.03] transition-colors duration-200 group"
                    >
                      <td className="px-6 py-4.5 font-mono text-white/50 text-xs">{t.id}</td>
                      <td className="px-6 py-4.5 text-white/50 text-xs font-mono">{t.date}</td>
                      <td className="px-6 py-4.5 text-white font-semibold text-[13px] tracking-wide uppercase">
                        {t.customerName}
                        {t.buyerName && t.buyerName !== t.customerName && (
                          <span className="block text-[9px] text-white/30 font-medium tracking-normal mt-0.5">
                            Pembeli: {t.buyerName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-white font-medium text-[13px] tracking-wide uppercase">{t.deviceModel}</td>
                      <td className="px-6 py-4.5 font-mono text-white/50 text-xs">{t.deviceStorage}</td>
                      <td className="px-6 py-4.5 font-mono text-white/50 text-xs">{formatIDR(t.buyPrice)}</td>
                      <td className="px-6 py-4.5">
                        <span className={`border text-[9px] font-extrabold px-2.5 py-1 rounded-none uppercase tracking-widest ${saleStatusBadge}`}>
                          {saleStatus === "Belum Terjual" && "🔴 "}{saleStatus === "DP" && "🟠 "}{saleStatus === "Terjual" && "🟢 "}{saleStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-mono text-white/50 text-xs">{sellPriceText}</td>
                      <td className={`px-6 py-4.5 font-mono text-xs font-semibold ${isSold ? profitColor : "text-white/30"}`}>
                        {marginTextStr}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={`border text-[9px] font-bold px-2.5 py-1 rounded-none uppercase tracking-widest ${statusClass}`}>
                          {isPass ? "PASS" : "FAIL"}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right no-print">
                        <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {/* 1. Details Eye Icon button */}
                          <button 
                            onClick={() => setActiveDetailsId(t.id)}
                            className="p-1.5 hover:bg-white/10 rounded-none text-white cursor-pointer" 
                            title="Detail Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Change Status Tag Icon button */}
                          <button 
                            onClick={() => {
                              setStatusEditTx(t);
                              setEditStatus((t.status as any) || "Belum Terjual");
                              setEditDpRaw(t.dpAmount ? t.dpAmount.toLocaleString("id-ID") : "");
                              setEditSellRaw(t.sellPrice ? t.sellPrice.toLocaleString("id-ID") : "");
                              setEditBuyer(t.buyerName || "");
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-none text-amber-400 cursor-pointer" 
                            title="Ubah Status Unit"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. WhatsApp Share template trigger button */}
                          <a 
                            href={generateWhatsAppMessage(t)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-white/10 rounded-none text-emerald-400 cursor-pointer flex items-center justify-center" 
                            title="Kirim via WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </a>

                          {/* 4. Export PDF certificate button */}
                          <button 
                            onClick={() => generatePDF(t, DEFAULT_PARTS, shopSettings)}
                            className="p-1.5 hover:bg-white/10 rounded-none text-indigo-400 cursor-pointer" 
                            title="Unduh PDF Sertifikat"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. Delete transaction entry */}
                          <button 
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-none text-red-500 cursor-pointer" 
                            title="Hapus Rekaman Ledger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Database Backup & Cleaning tools */}
      <section className="no-print premium-card p-8 rounded-none border-l border-white/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em]">Pemeliharaan & Pencadangan Basis Data</h4>
            <p className="text-white/40 font-medium text-[11px] uppercase tracking-wide mt-1">
              Simpan atau pulihkan rekaman riwayat transaksi secara aman.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => document.getElementById("restoreDatabaseFile")?.click()}
              className="bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/[0.03] active:scale-98 text-white font-medium px-5 py-2.5 rounded-none flex items-center gap-2 transition-all cursor-pointer text-[10px] tracking-[0.15em] uppercase"
            >
              <Upload className="w-3.5 h-3.5 opacity-75" />
              <span>Impor Catatan</span>
            </button>
            <input 
              type="file" 
              id="restoreDatabaseFile" 
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden" 
            />

            <button 
              onClick={handleBackup}
              className="bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/[0.03] active:scale-98 text-white font-medium px-5 py-2.5 rounded-none flex items-center gap-2 transition-all cursor-pointer text-[10px] tracking-[0.15em] uppercase"
            >
              <FolderSync className="w-3.5 h-3.5 opacity-75" />
              <span>Ekspor Cadangan</span>
            </button>

            <button 
              onClick={() => setShowResetConfirm(true)}
              className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-98 text-red-400 font-semibold px-5 py-2.5 rounded-none flex items-center gap-2 transition-all cursor-pointer text-[10px] tracking-[0.15em] uppercase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-400" />
              <span>Reset Ledger</span>
            </button>
          </div>
        </div>
      </section>

      {/* Transactions details modal card overlay */}
      {activeDetailObj && (
        <div className="fixed inset-0 bg-black/85 z-150 flex items-center justify-center p-4">
          <div className="premium-card w-full max-w-2xl rounded-none overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-display font-bold text-white text-xs uppercase tracking-[0.2em]">
                ARSIP DIAGNOSIS | ID: {activeDetailObj.id}
              </h3>
              <button 
                onClick={() => setActiveDetailsId(null)}
                className="text-white/40 hover:text-white font-bold px-3.5 py-1.5 border border-white/15 bg-transparent rounded-none text-[9px] tracking-wider uppercase cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Spec and stats row */}
              <div className="grid grid-cols-2 gap-6 bg-white/[0.01] rounded-none p-4 border border-white/10">
                <div>
                  <h5 className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Profil Pelanggan</h5>
                  <p className="text-white font-semibold text-[13px] tracking-wide uppercase">{activeDetailObj.customerName}</p>
                  <p className="text-white/60 text-xs font-mono mt-1">{activeDetailObj.customerWa || "-"}</p>
                </div>
                <div>
                  <h5 className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Spesifikasi Unit</h5>
                  <p className="text-white font-semibold text-[13px] tracking-wide uppercase">{activeDetailObj.deviceModel} ({activeDetailObj.deviceStorage})</p>
                  <p className="text-white/60 text-xs mt-1 uppercase tracking-wide">{activeDetailObj.deviceColor || "-"}</p>
                </div>
              </div>

              {/* Financial checklist row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.01] border border-white/10 p-4 rounded-none">
                  <p className="text-white/40 text-[9px] font-bold tracking-[0.2em] mb-1 uppercase">Harga Beli</p>
                  <p className="text-base font-mono font-bold text-white">{formatIDR(activeDetailObj.buyPrice)}</p>
                </div>
                <div className="bg-white/[0.01] border border-white/10 p-4 rounded-none">
                  <p className="text-white/40 text-[9px] font-bold tracking-[0.2em] mb-1 uppercase">Biaya Diagnosa / QC</p>
                  <p className="text-base font-mono font-bold text-amber-500">{formatIDR(activeDetailObj.totalRepairCost)}</p>
                </div>
                <div className="bg-white/[0.01] border border-white/10 p-4 rounded-none">
                  <p className="text-white/40 text-[9px] font-bold tracking-[0.2em] mb-1 uppercase">Keuntungan Bersih</p>
                  <p className={`text-base font-mono font-bold ${activeDetailObj.status === "Terjual" ? (activeDetailObj.netProfit >= 0 ? "text-emerald-400" : "text-amber-500") : "text-white/30"}`}>
                    {activeDetailObj.status === "Terjual" ? formatIDR(activeDetailObj.netProfit) : "Belum Terjual"}
                  </p>
                </div>
              </div>

              {/* Hardware status rows */}
              <div>
                <h5 className="text-white/60 text-[9px] font-bold uppercase tracking-[0.2em] mb-3">Checkpoint yang Diperiksa</h5>
                <div className="border border-white/10 rounded-none overflow-hidden divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {Object.entries(activeDetailObj.partsState).map(([partName, state]) => (
                    <div key={partName} className="flex justify-between items-center px-4 py-3 bg-[#0c0c0c] text-xs">
                      <div>
                        <span className="text-white tracking-wide font-medium">{partName}</span>
                        {state.bhVal ? <span className="ml-2 text-[10px] text-white/40 font-mono">BH: {state.bhVal}%</span> : ""}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                          {state.conditionIdx === 0 ? "Normal" : state.conditionIdx === 1 ? "Kerusakan Ringan" : state.conditionIdx === 2 ? "Kerusakan Berat" : "Komponen Pihak Ke-3"}
                        </span>
                        <span className="font-mono text-xs text-white font-medium">Rp {state.repairCost.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(activeDetailObj.partsState).length === 0 && (
                    <div className="p-4 text-center text-xs text-white/30 italic">Selesai diperiksa tanpa ada modifikasi kondisi hardware.</div>
                  )}
                </div>
              </div>

              {activeDetailObj.notes && (
                <div>
                  <h5 className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Catatan Pemeriksa</h5>
                  <p className="text-xs text-white/70 italic bg-white/[0.01] border border-white/10 rounded-none p-4 leading-relaxed font-sans">
                    "{activeDetailObj.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
               <button 
                 onClick={() => {
                   generatePDF(activeDetailObj, DEFAULT_PARTS, shopSettings);
                 }}
                 className="px-5 py-2 hover:bg-white/10 border border-white/10 text-white font-semibold text-[10px] tracking-wider uppercase rounded-none cursor-pointer flex items-center gap-1.5 transition-colors"
               >
                 <FileText className="w-3.5 h-3.5 text-indigo-400" />
                 <span>Ekspor PDF</span>
               </button>
              <button 
                onClick={() => setActiveDetailsId(null)}
                className="px-5 py-2 bg-white hover:bg-white/80 text-black font-extrabold text-[10px] tracking-wider uppercase rounded-none cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal card */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/85 z-150 flex items-center justify-center p-4">
          <div className="premium-card w-full max-w-sm rounded-[2px] p-6 text-center border-white/20">
            <div className="h-12 w-12 bg-white/5 text-white rounded-none flex items-center justify-center mx-auto mb-4 border border-white/15">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            
            <h5 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90 mb-2 font-display">Konfirmasi Hapus</h5>
            <p className="text-[11px] uppercase tracking-wide text-white/50 leading-relaxed mb-6">
              Hapus rekaman transaksi <span className="font-mono text-white font-bold">{deleteConfirmId}</span>? Tindakan ini bersifat permanen.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-[10px] tracking-wider uppercase rounded-none cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  onDeleteTransaction(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="py-2.5 bg-red-600 text-white hover:bg-red-700 font-bold text-[10px] tracking-wider uppercase rounded-none cursor-pointer transition-colors"
              >
                Hapus Rekaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="premium-card w-full max-w-md rounded-none p-8 text-center border-red-500/30">
            <h5 className="text-xs font-bold text-red-400 mb-2 font-display uppercase tracking-[0.25em]">AKSI KRITIS: Reset Ledger?</h5>
            <p className="text-xs text-white/50 leading-relaxed mb-6 uppercase tracking-wider text-center">
              TINDAKAN INI AKAN MENGHAPUS SELURUH RIWAYAT TRANSAKSI. REKAMAN TIDAK DAPAT DIKEMBALIKAN.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 bg-white/5 text-white hover:bg-white/10 border border-white/10 font-bold text-[10px] tracking-widest uppercase rounded-none cursor-pointer transition-all"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  onResetLedger();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-extrabold text-[10px] tracking-widest uppercase rounded-none hover:bg-red-700 cursor-pointer transition-all"
              >
                Setel Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ubah Status Unit Modal */}
      {statusEditTx && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="premium-card w-full max-w-md rounded-none p-8 bg-zinc-950 border-white/20 text-left">
            <h5 className="text-xs font-bold text-white mb-2 font-display uppercase tracking-[0.25em] text-center">
              UBAH STATUS UNIT: {statusEditTx.deviceModel}
            </h5>
            <p className="text-[10px] text-white/40 font-medium tracking-wide leading-relaxed text-center mb-6 uppercase">
              Ubah status penjualan untuk transaksi ID <span className="font-mono text-white">{statusEditTx.id}</span>.
            </p>

            {/* Custom state choices */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setEditStatus("Belum Terjual")}
                className={`py-3 text-[9px] tracking-widest uppercase font-extrabold border transition-all cursor-pointer ${
                  editStatus === "Belum Terjual"
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                🔴 Belum Terjual
              </button>
              <button
                type="button"
                onClick={() => setEditStatus("DP")}
                className={`py-3 text-[9px] tracking-widest uppercase font-extrabold border transition-all cursor-pointer ${
                  editStatus === "DP"
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                🟠 DP / Indent
              </button>
              <button
                type="button"
                onClick={() => setEditStatus("Terjual")}
                className={`py-3 text-[9px] tracking-widest uppercase font-extrabold border transition-all cursor-pointer ${
                  editStatus === "Terjual"
                    ? "bg-emerald-500 text-black border-emerald-500"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                🟢 Terjual
              </button>
            </div>

            {/* Conditional Sub-forms */}
            {editStatus === "Belum Terjual" && (
              <div className="p-4 bg-white/5 border border-white/10 mb-6 text-center text-white/50 text-[10px] uppercase tracking-wider">
                Status akan disetel sebagai "Belum Terjual". Margin profit tidak akan dikalkulasi.
              </div>
            )}

            {editStatus === "DP" && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    NOMINAL DP / INDENT (RP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[11px] font-semibold text-white/30 font-mono">IDR.</span>
                    <input
                      type="text"
                      value={editDpRaw}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        setEditDpRaw(digits ? parseInt(digits, 10).toLocaleString("id-ID") : "");
                      }}
                      placeholder="Masukkan nominal DP"
                      className="w-full bg-white/[0.03] border border-white/10 focus:border-white rounded-none pl-12 pr-4 py-3 font-mono text-sm text-white font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    NAMA PEMESAN / PEMBELI
                  </label>
                  <input
                    type="text"
                    value={editBuyer}
                    onChange={(e) => setEditBuyer(e.target.value)}
                    placeholder="Nama pelanggan pemesan DP"
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-white rounded-none px-4 py-3 text-xs text-white outline-none transition-all uppercase tracking-wide"
                  />
                </div>
              </div>
            )}

            {editStatus === "Terjual" && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    HARGA JUAL NET (RP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[11px] font-semibold text-white/30 font-mono">IDR.</span>
                    <input
                      type="text"
                      value={editSellRaw}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        setEditSellRaw(digits ? parseInt(digits, 10).toLocaleString("id-ID") : "");
                      }}
                      placeholder="Masukkan harga jual net akhir"
                      className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white rounded-none pl-12 pr-4 py-3 font-mono text-sm text-white font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    NAMA PEMBELI (OPSIONAL)
                  </label>
                  <input
                    type="text"
                    value={editBuyer}
                    onChange={(e) => setEditBuyer(e.target.value)}
                    placeholder="Nama pembeli lunas"
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-white rounded-none px-4 py-3 text-xs text-white outline-none transition-all uppercase tracking-wide"
                  />
                </div>
              </div>
            )}

            {/* Action controls */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setStatusEditTx(null)}
                className="py-3 bg-white/5 text-white hover:bg-white/10 border border-white/10 font-bold text-[10px] tracking-widest uppercase rounded-none cursor-pointer text-center"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  const parseRaw = (val: string) => {
                    const digits = val.replace(/[^0-9]/g, "");
                    return digits ? parseInt(digits, 10) : 0;
                  };

                  const dpVal = parseRaw(editDpRaw);
                  const sellVal = parseRaw(editSellRaw);

                  if (editStatus === "DP") {
                    if (dpVal <= 0) {
                      alert("Nominal DP wajib diisi untuk status DP!");
                      return;
                    }
                    if (!editBuyer.trim()) {
                      alert("Nama pemesan wajib diisi untuk status DP!");
                      return;
                    }
                  } else if (editStatus === "Terjual" && sellVal <= 0) {
                    alert("Harga jual net wajib diisi untuk status Terjual!");
                    return;
                  }

                  // Compute profit
                  const profit = sellVal - (statusEditTx.buyPrice + statusEditTx.totalRepairCost);

                  const updated: Transaction = {
                    ...statusEditTx,
                    status: editStatus,
                    dpAmount: editStatus === "DP" ? dpVal : 0,
                    sellPrice: editStatus === "Terjual" ? sellVal : 0,
                    netProfit: editStatus === "Terjual" ? profit : 0,
                    buyerName: editStatus !== "Belum Terjual" ? editBuyer : ""
                  };

                  onUpdateTransaction(updated);
                  setStatusEditTx(null);
                }}
                className="py-3 bg-white text-black hover:bg-neutral-200 font-extrabold text-[10px] tracking-widest uppercase rounded-none cursor-pointer text-center"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
