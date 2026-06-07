import { useState, useEffect, useRef } from "react";
import { 
  User, 
  Smartphone, 
  Coins, 
  ClipboardCheck, 
  Activity, 
  Save, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  XSquare,
  XCircle, 
  Calendar,
  Check,
  FileText
} from "lucide-react";
import { QCPart, PartState, Transaction } from "../types";
import { DEFAULT_PARTS, IPHONE_MODELS, IPHONE_STORAGES, SPAREPART_ESTIMATES } from "../data";
import { formatNumberIDR, parseIDR, formatIDR } from "../utils";
import { generatePDF } from "../utils/exportUtils";

interface BatteryHealthInputProps {
  value: number;
  onChange: (val: number) => void;
}

function BatteryHealthInput({ value, onChange }: BatteryHealthInputProps) {
  const [localVal, setLocalVal] = useState(value);
  const incrementTimer = useRef<NodeJS.Timeout | null>(null);
  const decrementTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (incrementTimer.current) {
        clearTimeout(incrementTimer.current);
        clearInterval(incrementTimer.current as any);
      }
      if (decrementTimer.current) {
        clearTimeout(decrementTimer.current);
        clearInterval(decrementTimer.current as any);
      }
    };
  }, []);

  const updateValue = (newVal: number) => {
    let clamped = newVal;
    if (isNaN(clamped)) clamped = 100;
    if (clamped < 0) clamped = 0;
    if (clamped > 100) clamped = 100;
    setLocalVal(clamped);
    onChange(clamped);
  };

  const handleManualInput = (valStr: string) => {
    const rawDigits = valStr.replace(/[^0-9]/g, "");
    if (!rawDigits) {
      updateValue(0);
      return;
    }
    updateValue(parseInt(rawDigits, 10));
  };

  const stepUp = () => {
    updateValue(Math.min(100, localVal + 1));
  };

  const stepDown = () => {
    updateValue(Math.max(0, localVal - 1));
  };

  const startIncrement = () => {
    const next = Math.min(100, localVal + 1);
    updateValue(next);

    incrementTimer.current = setTimeout(() => {
      let current = next;
      const intervalId = setInterval(() => {
        if (current >= 100) {
          clearInterval(intervalId);
          return;
        }
        current = current + 1;
        updateValue(current);
      }, 60);
      incrementTimer.current = intervalId;
    }, 400);
  };

  const stopIncrement = () => {
    if (incrementTimer.current) {
      clearTimeout(incrementTimer.current);
      clearInterval(incrementTimer.current as any);
      incrementTimer.current = null;
    }
  };

  const startDecrement = () => {
    const next = Math.max(0, localVal - 1);
    updateValue(next);

    decrementTimer.current = setTimeout(() => {
      let current = next;
      const intervalId = setInterval(() => {
        if (current <= 0) {
          clearInterval(intervalId);
          return;
        }
        current = current - 1;
        updateValue(current);
      }, 60);
      decrementTimer.current = intervalId;
    }, 400);
  };

  const stopDecrement = () => {
    if (decrementTimer.current) {
      clearTimeout(decrementTimer.current);
      clearInterval(decrementTimer.current as any);
      decrementTimer.current = null;
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0 self-center">
      <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider hidden sm:inline">BH:</span>
      <div className="flex items-center bg-[#050505] border border-white/15 h-8">
        <button
          type="button"
          onMouseDown={startDecrement}
          onMouseUp={stopDecrement}
          onMouseLeave={stopDecrement}
          onTouchStart={(e) => {
            e.preventDefault();
            startDecrement();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDecrement();
          }}
          className="h-full px-2 text-[13px] text-white/50 hover:text-white hover:bg-white/5 select-none font-bold outline-none flex items-center justify-center transition-all border-r border-white/10 active:scale-95 active:bg-white/10 cursor-pointer"
        >
          -
        </button>

        <div className="relative w-11 h-full">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localVal}
            onChange={(e) => handleManualInput(e.target.value)}
            onBlur={() => {
              if (localVal < 0 || isNaN(localVal)) updateValue(0);
              if (localVal > 100) updateValue(100);
            }}
            className="w-full h-full bg-transparent text-[11px] text-white font-mono outline-none text-center pr-2"
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-white/30 font-mono pointer-events-none">%</span>
        </div>

        <button
          type="button"
          onMouseDown={startIncrement}
          onMouseUp={stopIncrement}
          onMouseLeave={stopIncrement}
          onTouchStart={(e) => {
            e.preventDefault();
            startIncrement();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopIncrement();
          }}
          className="h-full px-2 text-[13px] text-white/50 hover:text-white hover:bg-white/5 select-none font-bold outline-none flex items-center justify-center transition-all border-l border-white/10 active:scale-95 active:bg-white/10 cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}

const SPAREPART_KEYS = [
  { key: "lcd", label: "LAYAR / LCD" },
  { key: "baterai", label: "BATERAI" },
  { key: "kamera_belakang", label: "KAMERA BELAKANG" },
  { key: "kamera_depan", label: "KAMERA DEPAN" },
  { key: "kaca_kamera", label: "KACA KAMERA" },
  { key: "jamur_kamera", label: "JAMUR KAMERA" },
  { key: "speaker_bawah", label: "SPEAKER BAWAH" },
  { key: "speaker_atas", label: "SPEAKER ATAS" },
  { key: "backglass", label: "BACKGLASS" },
  { key: "housing", label: "HOUSING / BODY" },
  { key: "flexible_charger", label: "FLEXIBLE CHARGER" },
  { key: "flexible_onoff", label: "FLEXIBLE ON/OFF" },
  { key: "flexible_volume", label: "FLEXIBLE VOLUME" },
  { key: "flexible_vibrate", label: "FLEXIBLE VIBRATE" },
  { key: "flexible_nfc", label: "FLEXIBLE NFC" },
  { key: "home_button", label: "HOME BUTTON" },
  { key: "face_id", label: "FACE ID" }
];

interface QCCheckerFormProps {
  onSaveTransaction: (transaction: Transaction) => void;
  partsConfig?: QCPart[];
}

export default function QCCheckerForm({ onSaveTransaction, partsConfig }: QCCheckerFormProps) {
  // Customer Info
  const [custName, setCustName] = useState("");
  const [custWa, setCustWa] = useState("");

  // Device Info
  const [deviceModel, setDeviceModel] = useState("iPhone 15 Pro Max");
  const [deviceStorage, setDeviceStorage] = useState("256GB");
  const [deviceColor, setDeviceColor] = useState("Natural Titanium");
  const [imei, setImei] = useState("");
  const [qcDate, setQcDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Pricing Info
  const [buyPriceRaw, setBuyPriceRaw] = useState("");
  const [sellPriceRaw, setSellPriceRaw] = useState("");

  // Hardware Status
  const [partsState, setPartsState] = useState<Record<string, PartState>>({});

  // Verified/inspected parts indicators
  const [checkedParts, setCheckedParts] = useState<Record<string, boolean>>({});

  // Additional Diagnostic notes
  const [notes, setNotes] = useState("");

  // Banners and dialog overlays
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showQrisPopup, setShowQrisPopup] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [sellingStatus, setSellingStatus] = useState<"Belum Terjual" | "DP" | "Terjual">("Belum Terjual");
  const [dpAmountRaw, setDpAmountRaw] = useState("");
  const [buyerName, setBuyerName] = useState("");

  // Shop Settings configuration
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
        const parsed = JSON.parse(saved);
        setShopSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);

  // Initialize part states
  useEffect(() => {
    const initialState: Record<string, PartState> = {};
    const partsToUse = partsConfig && partsConfig.length > 0 ? partsConfig : DEFAULT_PARTS;
    partsToUse.forEach((part) => {
      initialState[part.name] = {
        conditionIdx: 0,
        repairCost: 0,
        ...(part.hasHealth ? { bhVal: 100 } : {})
      };
    });
    setPartsState(initialState);
    setCheckedParts({});
  }, [partsConfig]);

  // Check for saved drafts on mount
  useEffect(() => {
    const saved = localStorage.getItem("auraphone_qc_draft");
    if (saved) {
      setShowDraftBanner(true);
    }
  }, []);

  // Set up auto-saving interval every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (custName || buyPriceRaw || sellPriceRaw || Object.keys(checkedParts).length > 0) {
        const draft = {
          custName,
          custWa,
          deviceModel,
          imei,
          deviceStorage,
          deviceColor,
          buyPriceRaw,
          sellPriceRaw,
          partsState,
          checkedParts,
          notes
        };
        localStorage.setItem("auraphone_qc_draft", JSON.stringify(draft));
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [custName, custWa, deviceModel, imei, deviceStorage, deviceColor, buyPriceRaw, sellPriceRaw, partsState, checkedParts, notes]);

  const handleApplyDraft = () => {
    const saved = localStorage.getItem("auraphone_qc_draft");
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.custName !== undefined) setCustName(d.custName);
        if (d.custWa !== undefined) setCustWa(d.custWa);
        if (d.deviceModel !== undefined) setDeviceModel(d.deviceModel);
        if (d.imei !== undefined) setImei(d.imei);
        if (d.deviceStorage !== undefined) setDeviceStorage(d.deviceStorage);
        if (d.deviceColor !== undefined) setDeviceColor(d.deviceColor);
        if (d.buyPriceRaw !== undefined) setBuyPriceRaw(d.buyPriceRaw);
        if (d.sellPriceRaw !== undefined) setSellPriceRaw(d.sellPriceRaw);
        if (d.partsState !== undefined) setPartsState(d.partsState);
        if (d.checkedParts !== undefined) setCheckedParts(d.checkedParts);
        if (d.notes !== undefined) setNotes(d.notes);
        
        setToastMessage("Draf berhasil dimuat!");
        setTimeout(() => setToastMessage(null), 3000);
      } catch (e) {
        console.error("Draft parsing failed:", e);
      }
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("auraphone_qc_draft");
    setShowDraftBanner(false);
    setToastMessage("Draf dibuang.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update cost when status changes with model estimation lookup
  const handleStatusChange = (partName: string, condIdx: number) => {
    const part = (partsConfig && partsConfig.length > 0 ? partsConfig : DEFAULT_PARTS).find(p => p.name === partName);
    if (!part) return;

    const condition = part.conditions[condIdx];
    let calculatedCost = 0;
    if (condition && !part.isInfoPart) {
      calculatedCost = condition.cost;

      // Model-Specific Estimate lookup
      const estimates = SPAREPART_ESTIMATES[deviceModel];
      if (estimates) {
        if (partName === "Layar") {
          if (condIdx === 0) calculatedCost = 0;
          else if (condIdx === 7) calculatedCost = estimates.Layar; // Full LCD Replacement
          else if (condIdx === 3 || condIdx === 4) calculatedCost = Math.round(estimates.Layar * 0.85 / 10000) * 10000; // Screen Burn/Dead Pixels
          else calculatedCost = Math.round(estimates.Layar * 0.65 / 10000) * 10000; // Minor line/shadow
        } else if (partName === "Baterai") {
          if (condIdx === 0) calculatedCost = 0;
          else calculatedCost = estimates.Baterai; // Battery upgrade cost
        } else if (partName === "Body / Casing Luar") {
          if (condIdx === 0) calculatedCost = 0;
          else if (condIdx === 2) calculatedCost = estimates.Body; // Major housing replacement
          else calculatedCost = Math.round(estimates.Body * 0.5 / 10000) * 10000; // Dents
        }
      }
    }

    setPartsState(prev => ({
      ...prev,
      [partName]: {
        ...prev[partName],
        conditionIdx: condIdx,
        repairCost: calculatedCost
      }
    }));

    // Autocomplete verified badge
    setCheckedParts(prev => ({
      ...prev,
      [partName]: true
    }));
  };

  // Update repair cost field manually
  const handleCostChange = (partName: string, rawVal: string) => {
    const part = (partsConfig && partsConfig.length > 0 ? partsConfig : DEFAULT_PARTS).find(p => p.name === partName);
    if (part && part.isInfoPart) return; // Prevent cost modification on info-only segments like iCloud

    const numericCost = parseIDR(rawVal);
    setPartsState(prev => ({
      ...prev,
      [partName]: {
        ...prev[partName],
        repairCost: numericCost
      }
    }));

    // Autocomplete verified badge
    setCheckedParts(prev => ({
      ...prev,
      [partName]: true
    }));
  };

  // Update Battery Health
  const handleBHChange = (partName: string, bh: string) => {
    const numericBH = parseInt(bh, 10) || 100;
    setPartsState(prev => ({
      ...prev,
      [partName]: {
        ...prev[partName],
        bhVal: Math.max(0, Math.min(100, numericBH))
      }
    }));

    // Autocomplete verified badge
    setCheckedParts(prev => ({
      ...prev,
      [partName]: true
    }));
  };

  // Calculations
  const buyPrice = parseIDR(buyPriceRaw);
  const sellPrice = parseIDR(sellPriceRaw);

  const totalRepairCost = (Object.values(partsState) as any[]).reduce((acc, curr) => acc + (curr?.repairCost || 0), 0);
  const netProfit = sellPrice > 0 || buyPrice > 0 ? sellPrice - buyPrice - totalRepairCost : 0;

  // Determine eligibility
  let eligibility: "LAYAK BELI" | "PERTIMBANGKAN" | "BERESIKO TINGGI" | "AWAITING DATA" = "AWAITING DATA";
  let eligibilityBadgeClass = "border-white/20 text-on-surface-variant bg-white/5";
  let eligibilityContainerClass = "border shadow-none";
  let eligibilityDesc = "Masukkan harga beli dan status hardware untuk penilaian.";

  if (buyPrice > 0) {
    const estimatedMargin = sellPrice > 0 ? sellPrice - buyPrice - totalRepairCost : null;
    const marginNegatif = estimatedMargin !== null && estimatedMargin < 0;
    const marginTipis = estimatedMargin !== null && estimatedMargin < 500000;

    if (marginNegatif || totalRepairCost > 1500000) {
      eligibility = "BERESIKO TINGGI";
      eligibilityBadgeClass = "border-red-500/55 text-red-500 bg-red-500/10";
      eligibilityContainerClass = "border-red-500/20 red-border-glow";
      eligibilityDesc = marginNegatif
        ? "Estimasi margin minus. Berisiko rugi jika dijual."
        : "Biaya perbaikan terlalu tinggi. Potensi rugi besar.";
    } else if (totalRepairCost > 500000 || marginTipis) {
      eligibility = "PERTIMBANGKAN";
      eligibilityBadgeClass = "border-amber-500/55 text-amber-400 bg-amber-500/10";
      eligibilityContainerClass = "border-amber-500/20 amber-border-glow";
      eligibilityDesc = marginTipis
        ? "Margin tipis. Pertimbangkan ulang harga jual."
        : "Biaya perbaikan cukup tinggi. Perhatikan margin keuntungan.";
    } else {
      eligibility = "LAYAK BELI";
      eligibilityBadgeClass = "border-emerald-500/55 text-emerald-400 bg-emerald-500/10";
      eligibilityContainerClass = "border-emerald-500/20 emerald-border-glow";
      eligibilityDesc = "Kondisi baik. Estimasi biaya perbaikan rendah dan margin sehat.";
    }
  }

  // Active Parts Configuration to parse
  const partsToRender = partsConfig && partsConfig.length > 0 ? partsConfig : DEFAULT_PARTS;

  // Global Key Shortcut 'E' handler synchronization inside Checker Form
  useEffect(() => {
    const handleActivePdfTrigger = () => {
      const currentTx: Transaction = {
        id: `DRAFT-QC-${Math.floor(1000 + Math.random() * 9000)}`,
        date: qcDate,
        customerName: custName || "CUSTOMER",
        customerWa: custWa || "-",
        deviceModel,
        imei,
        deviceStorage,
        deviceColor,
        buyPrice,
        sellPrice,
        totalRepairCost,
        netProfit,
        eligibility,
        notes,
        partsState
      };
      generatePDF(currentTx, partsToRender, shopSettings);
    };

    window.addEventListener("trigger-active-pdf", handleActivePdfTrigger);
    return () => window.removeEventListener("trigger-active-pdf", handleActivePdfTrigger);
  }, [qcDate, custName, custWa, deviceModel, imei, deviceStorage, deviceColor, buyPrice, sellPrice, totalRepairCost, netProfit, eligibility, notes, partsState, partsToRender, shopSettings]);

  // Execute actual database save with specific status and related inputs
  const executeSave = (status: "Belum Terjual" | "DP" | "Terjual", dpVal: number, sellVal: number, buyer: string) => {
    const transactionID = `TRX-QC-${Math.floor(9000 + Math.random() * 1000)}`;

    const newTransaction: Transaction = {
      id: transactionID,
      date: qcDate,
      customerName: custName,
      customerWa: custWa,
      deviceModel,
      imei,
      deviceStorage,
      deviceColor,
      buyPrice,
      sellPrice: status === "Terjual" ? sellVal : 0,
      totalRepairCost,
      netProfit: status === "Terjual" ? (sellVal - buyPrice - totalRepairCost) : 0,
      eligibility,
      notes,
      partsState,
      status,
      dpAmount: status === "DP" ? dpVal : 0,
      buyerName: (status === "DP" || status === "Terjual") ? buyer : undefined
    };

    onSaveTransaction(newTransaction);
    
    // Clear Local Storage draft since it is successfully archived
    localStorage.removeItem("auraphone_qc_draft");
    
    // Clear Form inputs
    setCustName("");
    setCustWa("");
    setImei("");
    setBuyPriceRaw("");
    setSellPriceRaw("");
    setNotes("");
    setDpAmountRaw("");
    setBuyerName("");
    setSellingStatus("Belum Terjual");
    setShowStatusModal(false);
    
    // Reset Checklist
    const resetState: Record<string, PartState> = {};
    const partsToUse = partsConfig && partsConfig.length > 0 ? partsConfig : DEFAULT_PARTS;
    partsToUse.forEach((part) => {
      resetState[part.name] = {
        conditionIdx: 0,
        repairCost: 0,
        ...(part.hasHealth ? { bhVal: 100 } : {})
      };
    });
    setPartsState(resetState);
    setCheckedParts({});

    // Trigger Toast banner
    setToastMessage(`Data QC berhasil disimpan dengan status ${status === "DP" ? "DP / INDENT" : status.toUpperCase()}!`);
    setTimeout(() => setToastMessage(null), 4000);

    // Show QRIS Donasi Pop-up once per session after successful save
    const blockQris = localStorage.getItem("auraphone_qris_dont_show_again") === "true";
    const shownThisSession = sessionStorage.getItem("auraphone_qris_shown_this_session") === "true";
    if (!blockQris && !shownThisSession) {
      setTimeout(() => {
        setShowQrisPopup(true);
        sessionStorage.setItem("auraphone_qris_shown_this_session", "true");
      }, 800);
    }
  };

  // Handle Save (Validation check & open Modal)
  const handleSave = () => {
    if (!custName.trim()) {
      alert("Masukkan Nama Pelanggan terlebih dahulu!");
      return;
    }

    if (!imei.trim()) {
      alert("Masukkan IMEI terlebih dahulu! IMEI wajib diisi (Maksimal 15 digit).");
      return;
    }

    setShowStatusModal(true);
  };

  // Export Active form state to pdf
  const handleExportPDF = () => {
    const currentTx: Transaction = {
      id: `TRX-QC-${Math.floor(1000 + Math.random() * 9000)}`,
      date: qcDate,
      customerName: custName || "CUSTOMER",
      customerWa: custWa || "-",
      deviceModel,
      deviceStorage,
      deviceColor,
      buyPrice,
      sellPrice: parseIDR(sellPriceRaw),
      totalRepairCost,
      netProfit: parseIDR(sellPriceRaw) > 0 ? (parseIDR(sellPriceRaw) - buyPrice - totalRepairCost) : 0,
      eligibility,
      notes,
      partsState,
      status: "Belum Terjual"
    };
    generatePDF(currentTx, partsToRender, shopSettings);
  };

  // Generate formatted text for share
  const generateWhatsAppMessage = (tx: Transaction) => {
    let statusMessage = "Belum Terjual";
    if (tx.status === "DP") {
      statusMessage = `DP / INDENT (Rp ${(tx.dpAmount || 0).toLocaleString("id-ID")} oleh ${tx.buyerName || "—"})`;
    } else if (tx.status === "Terjual") {
      statusMessage = `TERJUAL (Harga Jual: Rp ${(tx.sellPrice || 0).toLocaleString("id-ID")}${tx.buyerName ? ` oleh ${tx.buyerName}` : ""})`;
    } else {
      statusMessage = "BELUM TERJUAL";
    }

    const partsToUse = partsConfig && partsConfig.length > 0 ? partsConfig : DEFAULT_PARTS;
    const qcLines = partsToUse.map((part) => {
      const state = tx.partsState[part.name] || { conditionIdx: 0, repairCost: 0 };
      const cond = part.conditions[state.conditionIdx];
      const icon = state.conditionIdx === 0 ? "✅" : "⚠️";
      const bhStr = state.bhVal ? ` (BH: ${state.bhVal}%)` : "";
      const costStr = state.repairCost > 0 ? ` (Est. Perbaikan: Rp ${state.repairCost.toLocaleString("id-ID")})` : "";
      return `${icon} *${part.name.toUpperCase()}*: ${cond?.label || "Normal"}${bhStr}${costStr}`;
    }).join("\n");

    const message = `📱 *LAPORAN DIAGNOSIS UNIT - ${shopSettings.shopName.toUpperCase()}*
Tanggal: ${tx.date}

*INFORMASI UNIT:*
- Model: ${tx.deviceModel}
- Storage: ${tx.deviceStorage}
- Warna: ${tx.deviceColor || "—"}
- IMEI: ${tx.imei || "—"}
- Pelanggan: ${tx.customerName}

*STATUS UNIT:*
*${statusMessage.toUpperCase()}*

*ESTIMASI KEUANGAN:*
- Harga Beli: Rp ${tx.buyPrice.toLocaleString("id-ID")}
- Biaya Servis / QC: Rp ${tx.totalRepairCost.toLocaleString("id-ID")}
${tx.status === "Terjual" ? `- Harga Jual: Rp ${tx.sellPrice.toLocaleString("id-ID")}\n- Margin Keuntungan: Rp ${tx.netProfit.toLocaleString("id-ID")}` : ""}

*HASIL INSPEKSI HARDWARE:*
${qcLines}

*CATATAN FISIK & KEPEMILIKAN:*
"${tx.notes || "Tidak ada catatan khusus."}"

---
Dibuat dengan auraphone.id | wa.me/6288971544885`;

    return message;
  };

  const handleShareWhatsAppActive = () => {
    const currentTx: Transaction = {
      id: `TRX-QC-${Math.floor(1000 + Math.random() * 9000)}`,
      date: qcDate,
      customerName: custName || "CUSTOMER",
      customerWa: custWa || "-",
      deviceModel,
      deviceStorage,
      deviceColor,
      buyPrice,
      sellPrice: parseIDR(sellPriceRaw),
      totalRepairCost,
      netProfit: parseIDR(sellPriceRaw) > 0 ? (parseIDR(sellPriceRaw) - buyPrice - totalRepairCost) : 0,
      eligibility,
      notes,
      partsState,
      status: "Belum Terjual"
    };
    const text = generateWhatsAppMessage(currentTx);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const checkedCount = Object.values(checkedParts).filter(Boolean).length;
  const totalCount = partsToRender.length;
  const completionPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black border border-white px-6 py-4 rounded-none text-white font-medium text-[11px] tracking-[0.15em] uppercase flex items-center gap-3 z-[100] shadow-2xl">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Draft banner trigger */}
      {showDraftBanner && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in rounded-none">
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest leading-none">AUTO-DRAFT RECOVERY DETECTED</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider mt-1.5">Lanjutkan pengisian form QC dari sesi sebelumnya?</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handleApplyDraft}
              className="px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 font-extrabold text-[10px] tracking-widest uppercase cursor-pointer transition-colors rounded-none"
            >
              Lanjutkan
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-4 py-2 bg-transparent border border-white/10 text-white/60 hover:text-white font-bold text-[10px] tracking-widest uppercase cursor-pointer transition-colors rounded-none"
            >
              Buang
            </button>
          </div>
        </div>
      )}

      {/* Sales Status Pop-up Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[250] p-4 no-print select-none animate-fade-in font-sans">
          <div className="premium-card w-full max-w-md border-white/20 p-8 flex flex-col bg-zinc-950 text-left">
            <h3 className="font-display text-xs font-bold text-white uppercase tracking-[0.25em] mb-2 text-center">
              PILIH STATUS UNIT TERBARU
            </h3>
            <p className="text-[10px] text-white/40 font-medium tracking-wide uppercase leading-relaxed text-center mb-6">
              Status ini menentukan apakah unit tercatat sebagai belum terjual, dalam proses DP/Indent, atau sudah terjual ke pembeli.
            </p>

            {/* Status Option Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setSellingStatus("Belum Terjual");
                }}
                className={`py-3 text-[10px] tracking-widest uppercase font-extrabold transition-all border cursor-pointer ${
                  sellingStatus === "Belum Terjual"
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                🔴 Belum Terjual
              </button>

              <button
                type="button"
                onClick={() => {
                  setSellingStatus("DP");
                }}
                className={`py-3 text-[10px] tracking-widest uppercase font-extrabold transition-all border cursor-pointer ${
                  sellingStatus === "DP"
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                🟠 DP / Indent
              </button>

              <button
                type="button"
                onClick={() => {
                  setSellingStatus("Terjual");
                }}
                className={`py-3 text-[10px] tracking-widest uppercase font-extrabold transition-all border cursor-pointer ${
                  sellingStatus === "Terjual"
                    ? "bg-emerald-500 text-black border-emerald-500"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                🟢 Terjual
              </button>
            </div>

            {/* Conditional Sub-forms */}
            {sellingStatus === "Belum Terjual" && (
              <div className="p-4 bg-white/5 border border-white/10 mb-6 text-center text-white/50 text-[10px] uppercase tracking-wider">
                Unit akan diarsipkan di riwayat ledger dengan status "BELUM TERJUAL".
              </div>
            )}

            {sellingStatus === "DP" && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    NOMINAL DP / INDENT (RP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[11px] font-semibold text-white/30 font-mono">IDR.</span>
                    <input
                      type="text"
                      value={dpAmountRaw}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        setDpAmountRaw(digits ? parseInt(digits, 10).toLocaleString("id-ID") : "");
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
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Nama lengkap pemesan"
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-white rounded-none px-4 py-3 text-xs text-white outline-none transition-all uppercase tracking-wide"
                  />
                </div>
              </div>
            )}

            {sellingStatus === "Terjual" && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    HARGA JUAL NET (RP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[11px] font-semibold text-white/30 font-mono">IDR.</span>
                    <input
                      type="text"
                      value={sellPriceRaw}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        setSellPriceRaw(digits ? parseInt(digits, 10).toLocaleString("id-ID") : "");
                      }}
                      placeholder="Masukkan harga jual akhir"
                      className="w-full bg-white/[0.03] border border-white/10 focus:border-white rounded-none pl-12 pr-4 py-3 font-mono text-sm text-white font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    NAMA PEMBELI (OPSIONAL)
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Nama lengkap pembeli"
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-white rounded-none px-4 py-3 text-xs text-white outline-none transition-all uppercase tracking-wide"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowStatusModal(false);
                }}
                className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-[10px] tracking-wider uppercase rounded-none cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const dpAmountVal = parseIDR(dpAmountRaw);
                  const sellPriceVal = parseIDR(sellPriceRaw);

                  if (sellingStatus === "DP") {
                    if (dpAmountVal <= 0) {
                      alert("Nominal DP wajib diisi untuk status DP / Indent!");
                      return;
                    }
                    if (!buyerName.trim()) {
                      alert("Nama pemesan wajib diisi untuk status DP / Indent!");
                      return;
                    }
                  } else if (sellingStatus === "Terjual") {
                    if (sellPriceVal <= 0) {
                      alert("Harga jual wajib diisi untuk status Terjual!");
                      return;
                    }
                  }

                  executeSave(sellingStatus, dpAmountVal, sellPriceVal, buyerName);
                }}
                className="py-3 bg-white hover:bg-[#e6e6e6] text-black font-extrabold text-[10px] tracking-wider uppercase rounded-none cursor-pointer text-center"
              >
                Konfirmasi & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Donation Pop-up */}
      {showQrisPopup && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] p-4 no-print select-none animate-fade-in font-sans">
          <div className="premium-card w-full max-w-sm border-white/20 p-8 flex flex-col relative text-center bg-zinc-950">
            {/* Close Button */}
            <button
              onClick={() => setShowQrisPopup(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white border border-white/15 p-1 hover:bg-white/5 cursor-pointer rounded-none transition-all"
              title="Close modal"
            >
              <XSquare className="w-5 h-5" />
            </button>

            <div className="space-y-2 mb-6">
              <span className="inline-flex items-center gap-1 border border-white/10 px-2.5 py-0.5 bg-white/5 text-[8px] font-mono uppercase text-white/40 tracking-widest">
                Support Development
              </span>
              <h3 className="font-display text-xs font-bold text-white uppercase tracking-[0.25em]">
                QRIS Donasi Sukarela
              </h3>
              <p className="text-[10px] text-white/40 font-medium tracking-wide uppercase leading-relaxed max-w-xs mx-auto">
                Kalau tools ini membantu operasional harianmu di <span className="text-white font-bold">auraphone.id</span>, boleh support developer seikhlasnya 🙏
              </p>
            </div>

            {/* Aesthetic QRIS container */}
            <div className="bg-white p-4 mx-auto mb-6 border border-white/10 shadow-2xl relative w-56 h-56 flex flex-col justify-between items-center">
              <div className="flex justify-between items-center w-full shrink-0">
                <span className="text-[10px] text-blue-900 font-extrabold font-mono tracking-tighter leading-none">QRIS</span>
                <span className="text-[6px] text-gray-400 font-mono tracking-tight leading-none">GPN • INDONESIA</span>
              </div>
              
              <svg className="w-36 h-36 text-black fill-current" viewBox="0 0 100 100">
                <rect x="0" y="0" width="22" height="22" />
                <rect x="2" y="2" width="18" height="18" fill="white" />
                <rect x="6" y="6" width="10" height="10" />

                <rect x="78" y="0" width="22" height="22" />
                <rect x="80" y="2" width="18" height="18" fill="white" />
                <rect x="84" y="6" width="10" height="10" />

                <rect x="0" y="78" width="22" height="22" />
                <rect x="2" y="80" width="18" height="18" fill="white" />
                <rect x="6" y="84" width="10" height="10" />

                <rect x="30" y="5" width="4" height="8" />
                <rect x="40" y="0" width="8" height="4" />
                <rect x="52" y="5" width="4" height="12" />
                <rect x="35" y="20" width="15" height="4" />
                <rect x="5" y="32" width="4" height="14" />
                <rect x="15" y="40" width="12" height="4" />
                <rect x="30" y="32" width="4" height="20" />
                <rect x="40" y="40" width="16" height="4" />
                <rect x="62" y="30" width="8" height="8" />
                <rect x="70" y="45" width="4" height="14" />
                <rect x="85" y="35" width="10" height="4" />
                <rect x="45" y="60" width="15" height="4" />
                <rect x="35" y="70" width="4" height="12" />
                <rect x="50" y="80" width="10" height="12" />
                <rect x="68" y="75" width="4" height="15" />
                <rect x="75" y="65" width="15" height="4" />
                
                <rect x="42" y="42" width="16" height="16" fill="white" />
                <rect x="45" y="45" width="10" height="10" />
              </svg>

              <div className="text-[6px] text-gray-500 font-mono tracking-[0.1em] uppercase shrink-0">auraphone.id • IDR DONATION</div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowQrisPopup(false)}
                className="w-full bg-white text-black font-extrabold text-[10px] tracking-widest uppercase py-3 border border-transparent hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Sudah Donasi / Tutup
              </button>
              
              <button
                onClick={() => {
                  localStorage.setItem("auraphone_qris_dont_show_again", "true");
                  setShowQrisPopup(false);
                }}
                className="w-full bg-transparent hover:bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors cursor-pointer py-2.5 font-bold text-[9px] tracking-widest uppercase"
              >
                Jangan Tampilkan Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Action Row */}
      <section className="mb-8 no-print">
        <div className="premium-card p-6 sm:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <h2 className="font-display text-[15px] sm:text-[16px] tracking-[0.2em] font-bold text-white uppercase">
              MESIN DIAGNOSIS & EVALUASI
            </h2>
            <p className="text-white/40 font-medium text-[11px] tracking-[0.05em] uppercase mt-1">
              Daftar periksa modul perangkat keras otomatis dan kalkulator margin.
            </p>
          </div>
          <div className="flex flex-wrap gap-3.5 w-full xl:w-auto">
            <button 
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none px-5 py-3.5 rounded-none border border-white/10 bg-white/5 hover:bg-white/15 active:scale-98 text-white font-medium text-[10px] sm:text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all cursor-pointer uppercase"
              title="Ekspor sertifikat PDF"
            >
              <FileText className="w-4 h-4 text-white/50" />
              <span>Ekspor PDF (E)</span>
            </button>
            
            <button 
              onClick={handleShareWhatsAppActive}
              className="flex-1 sm:flex-none px-5 py-3.5 rounded-none border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 active:scale-98 text-green-400 font-medium text-[10px] sm:text-[11px] tracking-[0.15em] flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase font-mono"
              title="Kirim via WhatsApp"
            >
              <span>📲 Kirim via WhatsApp</span>
            </button>

            <button 
              onClick={handleSave}
              className="w-full sm:w-auto px-7 py-3.5 rounded-none bg-white text-black hover:bg-neutral-200 active:scale-98 font-bold text-[10px] sm:text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all cursor-pointer uppercase shadow-2xl"
            >
              <Save className="w-4 h-4 text-black" />
              <span>Simpan Sesi</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Form Fields Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Aspect: Identity and Spec Parameters (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-8 no-print">
          
          {/* Customer Metadata Card */}
          <div className="premium-card p-6">
            <h3 className="font-display text-xs font-bold text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-2.5 pb-3 border-b border-white/10">
              <User className="w-4 h-4 text-white/40" />
              CUSTOMER PROFILE
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                  CUSTOMER NAME
                </label>
                <input 
                  type="text" 
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Alexander Vance"
                  className="w-full bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-[13px] focus:border-white focus:bg-white/[0.05] outline-none transition-all placeholder-white/20 uppercase tracking-wide"
                />
              </div>
              
              <div>
                <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                  WHATSAPP CONTACT
                </label>
                <input 
                  type="tel" 
                  value={custWa}
                  onChange={(e) => setCustWa(e.target.value)}
                  placeholder="08xxxxxxxx"
                  className="w-full bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-2.5 text-white font-mono text-[13px] focus:border-white focus:bg-white/[0.05] outline-none transition-all placeholder-white/20"
                />
              </div>
            </div>
          </div>

          {/* Model Specification Specifications */}
          <div className="premium-card p-6">
            <h3 className="font-display text-xs font-bold text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-2.5 pb-3 border-b border-white/10">
              <Smartphone className="w-4 h-4 text-white/40" />
              DEVICE MATRIX
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                  IPHONE MODEL
                </label>
                <select 
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 hover:border-white/20 rounded-none p-3.5 text-white focus:border-white outline-none select-none transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  {IPHONE_MODELS.map(model => (
                    <option key={model} value={model} className="bg-[#121212] text-white py-2">{model}</option>
                  ))}
                </select>

                {/* On-demand reference database values layout */}
                {SPAREPART_ESTIMATES[deviceModel] && (
                  <>
                    <div className="mt-3 p-3.5 bg-white/[0.02] border border-white/5 font-mono text-[10px] text-white/50 space-y-2 animate-fade-in">
                      <div className="font-bold tracking-[0.1em] uppercase text-[8px] text-white/35 pb-1.5 border-b border-white/5">Estimasi Part {deviceModel}:</div>
                      <div className="flex justify-between">
                        <span>LAYAR / LCD:</span>
                        <span className="text-white font-semibold">Rp {formatNumberIDR(SPAREPART_ESTIMATES[deviceModel].Layar)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>BATERAI:</span>
                        <span className="text-white font-semibold">Rp {formatNumberIDR(SPAREPART_ESTIMATES[deviceModel].Baterai)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HOUSING / BODY:</span>
                        <span className="text-white font-semibold">Rp {formatNumberIDR(SPAREPART_ESTIMATES[deviceModel].Body)}</span>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 font-mono text-[10px] text-white/50 space-y-3 animate-fade-in">
                      <div className="font-bold tracking-[0.10em] uppercase text-[8px] text-white/35 pb-1.5 border-b border-white/5">
                        DETAIL HARGA ESTIMASI SPAREPART (17 ITEM)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                        {SPAREPART_KEYS.map(({ key, label }) => {
                          const val = SPAREPART_ESTIMATES[deviceModel][key as keyof typeof SPAREPART_ESTIMATES[string]];
                          return (
                            <div key={key} className="flex justify-between py-1 border-b border-white/[0.03] hover:bg-white/[0.01]">
                              <span className="text-white/40">{label}:</span>
                              <span className="text-white font-medium">
                                {val !== null && val !== undefined ? `Rp ${formatNumberIDR(val as number)}` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pt-2 text-[8px] text-white/35 italic leading-relaxed border-t border-white/5 font-sans">
                        Harga yang tercantum di atas adalah estimasi pasaran sparepart dan biaya servis umum di Bandung, Jawa Barat. Harga riil di auraphone.id dapat bervariasi sesuai grade kualitas sparepart yang dipilih pelangan (Original, OEM, High Copy).
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                  IMEI <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  maxLength={15}
                  required
                  value={imei}
                  onChange={(e) => setImei(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Ketik *#06# untuk cek IMEI"
                  className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white rounded-none p-3.5 text-white outline-none transition-all text-xs tracking-wider font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    STORAGE
                  </label>
                  <select 
                    value={deviceStorage}
                    onChange={(e) => setDeviceStorage(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 hover:border-white/20 rounded-none p-3.5 text-white focus:border-white outline-none transition-all cursor-pointer text-xs uppercase tracking-wider"
                  >
                    {IPHONE_STORAGES.map(storage => (
                      <option key={storage} value={storage} className="bg-[#121212] text-white">{storage}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                    COLOR
                  </label>
                  <input 
                    type="text"
                    value={deviceColor}
                    onChange={(e) => setDeviceColor(e.target.value)}
                    placeholder="Titanium"
                    className="w-full bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-white rounded-none p-3 text-white outline-none transition-all text-xs uppercase tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                  QC DATE
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    value={qcDate}
                    onChange={(e) => setQcDate(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-none p-3.5 text-white focus:border-white outline-none transition-all cursor-pointer text-xs uppercase tracking-wider font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buying Price Estimation Valuation */}
          <div className="premium-card p-6">
            <h3 className="font-display text-xs font-bold text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-2.5 pb-3 border-b border-white/10">
              <Coins className="w-4 h-4 text-white/40" />
              VALUASI PEMBELIAN
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-[9px] text-white/40 mb-2 font-bold uppercase tracking-[0.2em]">
                  HARGA BELI UNIT (RP)
                </label>
                <div className="relative">
                  <span className="absolute left-0 bottom-2 text-base font-semibold text-white/30 font-mono">IDR.</span>
                  <input 
                    type="text" 
                    value={buyPriceRaw}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "");
                      setBuyPriceRaw(digits ? parseInt(digits, 10).toLocaleString("id-ID") : "");
                    }}
                    placeholder="0"
                    className="w-full bg-transparent border-b border-white/20 pl-10 py-2 font-mono text-xl text-white font-medium focus:border-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Aspect: Core Checklist & Bento Scoring (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-8 no-print">
          
          {/* Hardware status list matrix */}
          <div className="premium-card overflow-hidden">
            <div className="bg-white/[0.02] px-6 py-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-white/50" />
                Hardware Health Metrics
              </h3>
              <span className="text-[9px] uppercase tracking-[0.25em] bg-white/5 text-white px-3 py-1.5 rounded-none border border-white/15 font-bold">
                15 CHECKPOINTS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0e0e0e] text-white/40 text-[9px] tracking-[0.2em] uppercase font-bold border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-bold">HARDWARE COMPONENT</th>
                    <th className="px-6 py-4 font-bold">INSCRIPTION / STATUS</th>
                    <th className="px-6 py-4 text-right font-bold w-48">EST. OVERHEAD (RP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {partsToRender.map((part) => {
                    const status = partsState[part.name] || { conditionIdx: 0, repairCost: 0 };
                    const isChecked = !!checkedParts[part.name];
                    return (
                      <tr 
                        key={part.name} 
                        className={`hover:bg-white/[0.03] transition-colors duration-200 ${isChecked ? 'bg-white/[0.015]' : ''}`}
                      >
                        {/* Part label column */}
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCheckedParts(prev => ({
                                  ...prev,
                                  [part.name]: !prev[part.name]
                                }));
                              }}
                              className={`w-4.5 h-4.5 flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                                isChecked 
                                  ? "border-white bg-white text-black" 
                                  : "border-white/10 hover:border-white/30 text-transparent bg-transparent"
                              }`}
                              title={isChecked ? "Mark as Unverified" : "Mark as Verified"}
                            >
                              <Check className="w-3.5 h-3.5 font-bold" />
                            </button>
                            <div className="min-w-0">
                              <div className={`font-semibold text-[13px] tracking-wide transition-colors ${isChecked ? 'text-white font-medium' : 'text-white/60'}`}>
                                {part.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Dropdown status selector */}
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-[340px]">
                            <select 
                              value={status.conditionIdx}
                              onChange={(e) => handleStatusChange(part.name, parseInt(e.target.value, 10))}
                              className={`bg-[#121212] border hover:border-white/30 rounded-none p-2 py-1.5 text-[11px] tracking-wider text-white focus:border-white outline-none transition-all cursor-pointer flex-1 uppercase font-light ${
                                isChecked ? "border-white/20" : "border-white/10"
                              }`}
                            >
                              {part.conditions.map((opt, i) => (
                                <option key={opt.label} value={i} className="bg-[#121212] text-white uppercase">{opt.label}</option>
                              ))}
                            </select>

                            {part.hasHealth && (
                              <BatteryHealthInput 
                                value={status.bhVal ?? 100}
                                onChange={(newVal) => handleBHChange(part.name, String(newVal))}
                              />
                            )}

                            {/* Done checkmark icon */}
                            {isChecked && (
                              <span className="inline-flex items-center justify-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-1 rounded-none text-[8px] font-bold tracking-widest uppercase">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Interactive Repair cost field */}
                        <td className="px-6 py-4.5 text-right font-mono">
                          {part.isInfoPart ? (
                            <span className="inline-block text-[9px] font-extrabold tracking-widest text-[#c8a47e] bg-[#c8a47e]/10 border border-[#c8a47e]/20 px-2.5 py-1 text-right">
                              INFO
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] text-white/30 uppercase">RP.</span>
                              <input 
                                type="text" 
                                value={status.repairCost === 0 ? "0" : formatNumberIDR(status.repairCost)}
                                onChange={(e) => handleCostChange(part.name, e.target.value)}
                                disabled={part.isInfoPart}
                                className="bg-transparent border-b border-white/10 text-right font-mono text-white text-[13px] w-30 focus:border-white outline-none py-0.5 transition-all"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Verification Stats Progress Bar block */}
            <div className="bg-[#0b0b0b]/60 border-t border-white/10 p-5 px-6 space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[9px] text-white/40 font-extrabold uppercase tracking-[0.2em] block leading-none">
                    INSPECTION VERIFICATION METRICS
                  </span>
                  <p className="text-[10px] text-white/60 tracking-wider uppercase font-medium">
                    {checkedCount} OUT OF {totalCount} HARDWARE CHECKPOINTS INSPECTED
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest block leading-none mb-1">COMPLETION STATUS</span>
                  <div className="font-mono text-xl font-bold text-white tracking-wider leading-none">
                    {completionPercent}%
                  </div>
                </div>
              </div>
              
              {/* Premium Progress Bar Track */}
              <div className="relative w-full h-1 bg-white/5 overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-white transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Summary Bento Cells */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Net calculations box */}
            <div className="premium-card p-6 border-l border-white flex flex-col justify-between min-h-[180px]">
              <div className="space-y-1">
                <span className="text-[9px] text-white/40 font-bold tracking-[0.2em] uppercase">
                  TOTAL ESTIMASI BIAYA QC / SERVIS
                </span>
                <div className="font-mono text-2xl font-semibold text-white mt-1">
                  {formatIDR(totalRepairCost)}
                </div>
              </div>
              
              <div className="pt-5 border-t border-white/10 space-y-1">
                <span className="text-[9px] text-white/40 font-bold tracking-[0.2em] uppercase">
                  TOTAL ESTIMASI MODAL (BELI + QC)
                </span>
                <div className="font-mono text-xl font-bold mt-1 text-white">
                  {formatIDR(buyPrice + totalRepairCost)}
                </div>
              </div>
            </div>

            {/* Decision Analysis Box */}
            <div className={`premium-card p-6 flex flex-col items-center justify-center text-center transition-all duration-700 min-h-[180px] ${eligibilityContainerClass}`}>
              <span className="text-[9px] text-white/40 font-bold tracking-[0.2em] uppercase mb-4">
                INVESTMENT VERDICT
              </span>
              <div className={`px-7 py-3 rounded-none font-bold text-[11px] tracking-[0.2em] uppercase border mb-4 shadow-sm flex items-center gap-2 ${eligibilityBadgeClass}`}>
                {eligibility === "LAYAK BELI" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {eligibility === "PERTIMBANGKAN" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {eligibility === "BERESIKO TINGGI" && <XCircle className="w-4 h-4 text-red-400" />}
                <span>{eligibility}</span>
              </div>
              <p className="text-[10px] text-white/50 tracking-wider uppercase font-medium">
                {eligibilityDesc}
              </p>
            </div>
          </div>

          {/* Notes module */}
          <div className="premium-card p-6">
            <label className="block text-[9px] text-white/40 mb-4 font-bold uppercase tracking-[0.2em]">
              PHYSICAL APPRAISAL & COMPLIANCE NOTES
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Input physical screen details, cosmetic grades (A/B/C), chassis micro-scratches, or custom remarks..." 
              rows={4}
              className="w-full bg-[#0e0e0e] border border-white/10 focus:border-white p-4 text-[13px] text-white outline-none transition-all resize-none font-sans leading-relaxed rounded-none"
            />
          </div>
        </div>
      </div>

      {/* Hidden Print Document Layout - Optimized cleanly for standard A4 Printing */}
      <div className="hidden print:block absolute inset-0 bg-white text-black p-12 font-sans z-[1000] h-full" id="print-area">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-[0.15em] text-black uppercase font-display">{shopSettings.shopName || "VANTAGE LUXE"}</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-1">Official Certified Diagnostic Certificate</p>
            {shopSettings.address && (
              <p className="text-[9px] text-neutral-500 mt-1.5 uppercase max-w-sm tracking-normal leading-normal">{shopSettings.address}</p>
            )}
            {shopSettings.whatsapp && (
              <p className="text-[9px] text-neutral-500 font-mono tracking-normal leading-normal uppercase">WA: {shopSettings.whatsapp}</p>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] font-semibold text-neutral-500">SESSION ID: TRX-QC-{Math.floor(10000 + Math.random() * 89999)}</div>
            <div className="text-xs font-bold text-neutral-800 mt-1">INSPECTION DATE: {qcDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 border border-neutral-200 p-5">
          <div className="space-y-1 text-xs">
            <h3 className="font-bold border-b border-neutral-100 pb-1 mb-2 uppercase text-[9px] text-neutral-400 tracking-wider">Client Portfolio</h3>
            <p className="text-black">Client Name: <span className="font-bold">{custName || "Private Collector"}</span></p>
            <p className="text-neutral-600">WhatsApp: <span className="font-mono">{custWa || "-"}</span></p>
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="font-bold border-b border-neutral-100 pb-1 mb-2 uppercase text-[9px] text-neutral-400 tracking-wider">Spec Specifications</h3>
            <p className="text-black">Model Variant: <span className="font-bold">{deviceModel}</span></p>
            <p className="text-neutral-600">Build Signature: <span className="font-semibold">{deviceStorage} ({deviceColor || "Silver Slate"})</span></p>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-neutral-200 text-xs mb-8">
          <thead>
            <tr className="bg-neutral-50 text-[9px] font-bold text-neutral-500 border-b border-neutral-200 uppercase tracking-wider">
              <th className="p-3 border">Diagnostic Checkpoint</th>
              <th className="p-3 border">Appraisal State</th>
              <th className="p-3 text-right border">Overhead Cost</th>
            </tr>
          </thead>
          <tbody>
            {partsToRender.map((part) => {
              const status = partsState[part.name] || { conditionIdx: 0, repairCost: 0 };
              const currentCondition = part.conditions[status.conditionIdx];
              return (
                <tr key={part.name} className="border-b text-neutral-800 animate-none">
                  <td className="p-3 border font-semibold">{part.name}</td>
                  <td className="p-3 border text-neutral-600">
                    {currentCondition?.label || "NORMAL / MULUS"} 
                    {status.bhVal ? ` (BH: ${status.bhVal}%)` : ""}
                  </td>
                  <td className="p-3 text-right font-mono border">
                    {part.isInfoPart ? "INFO" : `Rp ${formatNumberIDR(status.repairCost)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {notes && (
          <div className="mb-8 border border-neutral-200 p-4">
            <h4 className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Remarks & Compliance Notes</h4>
            <p className="text-xs text-neutral-800 italic leading-relaxed">"{notes}"</p>
          </div>
        )}

        <div className="flex justify-end pt-5">
          <div className="w-1/2 space-y-3 px-5 py-4 border border-black">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500 uppercase tracking-wider text-[9px]">Purchase Price:</span>
              <span className="font-mono font-bold text-black">Rp {formatNumberIDR(buyPrice)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500 uppercase tracking-wider text-[9px]">Overhead Costs:</span>
              <span className="font-mono font-bold text-neutral-700">Rp {formatNumberIDR(totalRepairCost)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-bold border-t border-black pt-2 text-black uppercase">
              <span>Capital Sum:</span>
              <span className="font-mono">Rp {formatNumberIDR(buyPrice + totalRepairCost)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-bold text-black uppercase">
              <span>Spread Margin:</span>
              <span className={`font-mono ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Rp {formatNumberIDR(netProfit)}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-dashed border-neutral-300 text-center">
              <span className="border border-black px-4 py-2 font-bold uppercase text-[9px] tracking-widest inline-block text-black">
                DECISION SUMMARY: {eligibility}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-dashed border-neutral-200 pt-4 text-[9px] text-neutral-400 text-center tracking-wider uppercase">
          Authorized Appraisal Certificate • Vantage Luxe Laboratories. 
        </div>
      </div>
    </>
  );
}
