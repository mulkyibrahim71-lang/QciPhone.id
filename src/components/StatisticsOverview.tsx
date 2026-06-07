import { useMemo } from "react";
import { BarChart3, TrendingUp, Sparkles, PieChart, Activity, DollarSign } from "lucide-react";
import { Transaction } from "../types";
import { formatIDR } from "../utils";

interface StatisticsOverviewProps {
  transactions: Transaction[];
}

export default function StatisticsOverview({ transactions }: StatisticsOverviewProps) {
  
  // Calculate stats parameters
  const stats = useMemo(() => {
    const totalTrx = transactions.length;
    const totalProfit = transactions.reduce((acc, curr) => acc + curr.netProfit, 0);
    const passCount = transactions.filter(t => t.eligibility === "LAYAK BELI" || t.eligibility === "PERTIMBANGKAN").length;
    const failCount = totalTrx - passCount;
    const yieldRate = totalTrx > 0 ? Math.round((passCount / totalTrx) * 100) : 0;
    
    // Model frequencies
    const modelFreqs: Record<string, number> = {};
    const modelProfits: Record<string, number> = {};
    transactions.forEach(t => {
      modelFreqs[t.deviceModel] = (modelFreqs[t.deviceModel] || 0) + 1;
      modelProfits[t.deviceModel] = (modelProfits[t.deviceModel] || 0) + t.netProfit;
    });

    const modelFreqsArr = Object.entries(modelFreqs)
      .map(([name, count]) => ({ name, count, profit: modelProfits[name] || 0 }))
      .sort((a, b) => b.count - a.count);

    return {
      totalTrx,
      totalProfit,
      yieldRate,
      passCount,
      failCount,
      modelFreqsArr
    };
  }, [transactions]);

  // Clean animated SVG calculations for Profit over time (Line chart)
  const lineChartData = useMemo(() => {
    if (transactions.length === 0) return [];
    // Sort transactions chronologically (reverse index or date-wise)
    const sorted = [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Map to cumulative profit or direct profits
    let cumulative = 0;
    return sorted.map((t, idx) => {
      cumulative += t.netProfit;
      return {
        label: t.id.replace("TRX-QC-", "#"),
        netProfit: t.netProfit,
        cumProfit: cumulative,
        x: idx
      };
    });
  }, [transactions]);

  // Define SVG grid coordinates for the line chart
  const lineSVGPath = useMemo(() => {
    if (lineChartData.length < 2) return { path: "", area: "", points: [] };
    const width = 500;
    const height = 150;
    const padding = 20;

    const maxCum = Math.max(...lineChartData.map(d => d.cumProfit), 1000000);
    const minCum = Math.min(...lineChartData.map(d => d.cumProfit), 0);
    const range = maxCum - minCum || 1;

    const points = lineChartData.map((d, index) => {
      const x = padding + (index / (lineChartData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.cumProfit - minCum) / range) * (height - padding * 2);
      return { x, y, label: d.label, val: d.cumProfit };
    });

    const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    
    // Area close helper
    const area = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { path, area, points };
  }, [lineChartData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Dynamic Summary Bento Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        
        {/* Yield Rate Box */}
        <div className="premium-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">
              Tingkat Lolos QC
            </span>
            <div className="font-mono text-3xl font-bold text-white mt-1">
              {stats.yieldRate}%
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wide">
              {stats.passCount} lolos vs {stats.failCount} gagal pemeriksaan
            </p>
          </div>
          <div className="h-10 w-10 bg-white/5 text-white rounded-none flex items-center justify-center border border-white/10">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Global profit box */}
        <div className="premium-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">
              Total Keuntungan Bersih
            </span>
            <div className={`font-mono text-3.5xl font-extrabold mt-1 text-white`}>
              {formatIDR(stats.totalProfit)}
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wide">
              Akumulasi dari seluruh transaksi riwayat
            </p>
          </div>
          <div className="h-10 w-10 bg-white/5 text-white rounded-none flex items-center justify-center border border-white/10">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Unique Models box */}
        <div className="premium-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">
              Model Unik Diperiksa
            </span>
            <div className="font-mono text-3xl font-bold text-white mt-1">
              {stats.modelFreqsArr.length}
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wide">
              Dari katalog penilaian aktif
            </p>
          </div>
          <div className="h-10 w-10 bg-white/5 text-white rounded-none flex items-center justify-center border border-white/10">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Grid: Line Chart Performance Curve (left) + Model Breakdown (right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cumulative Profit Line Chart */}
        <div className="col-span-12 lg:col-span-7 premium-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/50" />
              Kurva Keuntungan Finansial Kumulatif
            </h4>
            <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">
              Pertumbuhan kumulatif riwayat penjualan dari sesi sebelumnya.
            </p>
          </div>

          <div className="py-8 flex justify-center">
            {lineChartData.length < 2 ? (
              <div className="h-44 flex flex-col items-center justify-center text-white/40">
                <p className="text-xs tracking-wider uppercase font-semibold">Terdapat keterbatasan data.</p>
                <p className="text-[10px] uppercase tracking-wide mt-1 text-white/30">Input minimal 2 transaksi untuk merender kurva pertumbuhan.</p>
              </div>
            ) : (
              <div className="w-full relative">
                <svg viewBox="0 0 500 150" className="w-full h-auto overflow-visible select-none">
                  {/* Glowing Fill Ambient Area */}
                  <path 
                    d={lineSVGPath.area} 
                    fill="url(#ambientGlowGrad)" 
                    opacity="0.15"
                  />
                  
                  {/* Clean Stroke Line */}
                  <path 
                    d={lineSVGPath.path} 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* interactive node dots */}
                  {lineSVGPath.points.map((p, idx) => (
                    <g key={p.label} className="group/dot cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        fill="#ffffff" 
                        stroke="#050505" 
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover/dot:r-6"
                      />
                      <title>{`${p.label}: ${formatIDR(p.val)}`}</title>
                    </g>
                  ))}

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="ambientGlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#050505" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>

                {/* Grid X Axis Timeline indicators */}
                <div className="flex justify-between px-3 mt-4 text-[9px] text-white/40 font-mono tracking-wider">
                  {lineChartData.map((d) => (
                    <span key={d.label}>{d.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device breakdown percentages */}
        <div className="col-span-12 lg:col-span-5 premium-card p-6">
          <div>
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-white/50" />
              Frekuensi Inspeksi per Model
            </h4>
            <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">
              Model iPhone yang paling sering diperiksa di database.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {stats.modelFreqsArr.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-white/30 italic text-xs uppercase tracking-widest">
                Belum ada data evaluasi.
              </div>
            ) : (
              stats.modelFreqsArr.slice(0, 5).map((item) => {
                const totalInspects = transactions.length;
                const percentage = Math.round((item.count / totalInspects) * 100);

                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                      <span className="text-white">{item.name}</span>
                      <span className="text-white/40 font-mono">
                        {item.count} Inspeksi ({percentage}%/VOL)
                      </span>
                    </div>
                    {/* Bento visual Progress Bar */}
                    <div className="h-[3px] w-full bg-white/5 rounded-none overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-none transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-white/40 font-mono uppercase tracking-wide">
                      <span>Keuntungan: {formatIDR(item.profit)}</span>
                      <span>Target: Volume Tinggi</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Critical hardware failure hotspots section */}
      <section className="premium-card p-6">
        <div>
          <h4 className="font-display text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/50" />
            Sorotan: Rincian Suku Cadang Perangkat
          </h4>
          <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">
            Ringkasan biaya perbaikan teknis dari seluruh katalog Anda.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {stats.modelFreqsArr.slice(0, 4).map((model, idx) => {
            return (
              <div 
                key={model.name} 
                className="p-5 rounded-none border border-white/10 bg-white/[0.01]"
              >
                <h5 className="text-[9px] text-white/40 font-bold truncate uppercase tracking-widest">{model.name}</h5>
                <div className="font-mono text-base font-semibold text-white mt-1.5">{formatIDR(model.profit)}</div>
                <p className="text-[9px] text-white/40 uppercase mt-1 tracking-wider">{model.count} unit evaluasi</p>
              </div>
            );
          })}
          {stats.modelFreqsArr.length === 0 && (
            <div className="col-span-full py-8 text-center text-[11px] uppercase tracking-wider text-white/30 italic">Belum ada historical unit untuk dilaporkan.</div>
          )}
        </div>
      </section>
    </div>
  );
}
