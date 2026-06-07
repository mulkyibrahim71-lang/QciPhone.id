import { jsPDF } from "jspdf";
import { Transaction, QCPart, PartState } from "../types";
import { formatNumberIDR } from "../utils";

// Exquisitely customized scoring and grading logic
export const calculateScoreAndGrade = (partsState: Record<string, any>, partsList: QCPart[]) => {
  let score = 100;
  partsList.forEach((part) => {
    const state = partsState[part.name];
    if (!state) return;
    const conditionIdx = state.conditionIdx;
    if (conditionIdx === 0) return; // Perfect

    // Realistic custom deductions for negative conditions
    if (part.name === "Layar") {
      score -= (conditionIdx * 15); // Deduct 15-105 points
    } else if (part.name === "Face ID" || part.name === "Kamera Belakang") {
      score -= 15;
    } else if (part.name === "Kamera Depan" || part.name === "Mikrofon") {
      score -= 10;
    } else if (part.name === "Baterai") {
      if (conditionIdx >= 2) score -= 15;
    } else if (part.name === "Sinyal / Jaringan") {
      if (conditionIdx >= 2) score -= 25;
    } else {
      if (!part.isInfoPart) score -= 5;
    }
  });

  score = Math.max(0, Math.min(100, score));

  // Determine Letter Grade
  let grade = "A";
  if (score >= 95) grade = "A+";
  else if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  return { score, grade };
};

// jsPDF engine configured for pristine high-contrast layout with watermark
export const generatePDF = (t: Transaction, partsList: QCPart[], shop: any) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const shopName = shop.shopName || "auraphone.id";
  const owner = shop.ownerName || "Rd. Mulky Ibrahim";
  const tel = shop.whatsapp || "088971544885";

  // Page 1 Setup
  const drawBackgroundAndWatermark = () => {
    // Semi-transparent diagonal AURAPHONE.ID watermark centered beautifully
    doc.setTextColor(240, 240, 240);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(44);
    
    // jsPDF graphic context and opacity handling
    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.08 });
      doc.setGState(gState);
      doc.text("AURAPHONE.ID", 105, 145, { align: "center", angle: 45 });
      doc.restoreGraphicsState();
    } catch (e) {
      // Safe fallback if GState is not fully initialized
      doc.text("AURAPHONE.ID", 105, 145, { align: "center", angle: 45 });
    }
  };

  drawBackgroundAndWatermark();

  // BRAND HEADER / LOGO
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(shopName.toUpperCase(), 20, 24);

  // Small top-right aesthetic logo for auraphone.id
  doc.setFillColor(0, 0, 0);
  doc.rect(170, 16, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("a.", 174, 21.5, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${owner} | Contact: ${tel}`, 20, 30);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`Official Certified Diagnostic Certificate • Printed on ${new Date().toLocaleString("id-ID")}`, 20, 35);

  // Black accent primary horizontal bar
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(20, 38, 190, 38);

  // METADATA SPEC INFORMATION CARD
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.25);
  doc.setFillColor(252, 252, 252);
  doc.rect(20, 43, 170, 24, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("INFORMASI UNIT", 24, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Model     : ${t.deviceModel}`, 24, 53);
  doc.text(`IMEI      : ${t.imei || "—"}`, 110, 53);

  doc.text(`Storage   : ${t.deviceStorage}`, 24, 59);
  doc.text(`Warna     : ${t.deviceColor || "Normal Slate"}`, 110, 59);

  doc.text(`Kontak    : ${t.customerWa || "—"}`, 24, 65);
  doc.text(`Pelanggan : ${t.customerName || "—"}`, 110, 65);

  // WORKPLACE TABLE HEADER
  let y = 73;
  doc.setFillColor(0, 0, 0);
  doc.rect(20, y, 170, 7.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DIAGNOSTIC CHECKPOINT", 23, y + 5);
  doc.text("APPRAISAL CONDITION", 100, y + 5);
  doc.text("OVERHEAD COST", 160, y + 5);

  y += 7.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  const partsState = t.partsState || {};

  partsList.forEach((part) => {
    const status = partsState[part.name] || { conditionIdx: 0, repairCost: 0 };
    const cond = part.conditions[status.conditionIdx];
    const isNormal = status.conditionIdx === 0;

    // Page safety height protection check
    if (y > 265) {
      doc.addPage();
      y = 20;
      drawBackgroundAndWatermark();
      
      // Reprint header row for spanning page
      doc.setFillColor(0, 0, 0);
      doc.rect(20, y, 170, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("DIAGNOSTIC CHECKPOINT", 23, y + 5);
      doc.text("APPRAISAL CONDITION", 100, y + 5);
      doc.text("OVERHEAD COST", 160, y + 5);
      y += 7.5;
    }

    // Row Checkbox prefix indicator
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", isNormal ? "normal" : "bold");
    doc.text(isNormal ? "[✓]" : "[!]", 23, y + 5.5);

    doc.setFont("helvetica", isNormal ? "normal" : "bold");
    doc.text(part.name, 30, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const labelStr = (cond?.label || "NORMAL / MULUS").toUpperCase();
    const bhVal = status.bhVal ? ` (BH: ${status.bhVal}%)` : "";
    doc.text(`${labelStr}${bhVal}`, 100, y + 5.5);

    const costLabel = part.isInfoPart ? "INFO" : `Rp ${formatNumberIDR(status.repairCost)}`;
    doc.text(costLabel, 160, y + 5.5);

    // Grid divider row lines lines
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.15);
    doc.line(20, y + 8, 190, y + 8);
    y += 8;
  });

  // Score Calculation
  const { score, grade } = calculateScoreAndGrade(partsState, partsList);

  y += 4;
  if (y > 230) {
    doc.addPage();
    y = 20;
    drawBackgroundAndWatermark();
  }

  // APPRAISAL VERDICT CARD
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.setFillColor(252, 252, 252);
  doc.rect(20, y, 170, 31, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`SKOR TOTAL      : ${score} / 100`, 24, y + 7);
  doc.text(`GRADE           : ${grade}`, 24, y + 13);
  
  let statusText = "BELUM TERJUAL";
  if (t.status === "DP") {
    statusText = `DP / INDENT (Rp ${formatNumberIDR(t.dpAmount || 0)} oleh ${t.buyerName || "—"})`;
  } else if (t.status === "Terjual") {
    statusText = `TERJUAL (Rp ${formatNumberIDR(t.sellPrice || 0)}${t.buyerName ? ` oleh ${t.buyerName}` : ""})`;
  } else if (t.status === "Belum Terjual") {
    statusText = "BELUM TERJUAL";
  }
  doc.text(`HARGA JUAL EST. : Rp ${formatNumberIDR(t.sellPrice || 0)}`, 24, y + 19);
  doc.text(`STATUS UNIT     : ${statusText.toUpperCase()}`, 24, y + 25);

  doc.text("VERDIKT INVESTASI:", 112, y + 10);
  doc.setFillColor(0, 0, 0);
  doc.rect(112, y + 13, 68, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(t.eligibility, 146, y + 18.5, { align: "center" });

  y += 37;

  // Notes card block
  if (t.notes) {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("CATATAN TEKNISI:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    const splitText = doc.splitTextToSize(t.notes, 170);
    doc.text(splitText, 20, y + 5);
    y += splitText.length * 4.5 + 5;
  }

  // Footer labels across all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`${shopName.toLowerCase()} | ${tel} | Halaman ${i} dari ${totalPages}`, 105, 281, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Dibuat dengan auraphone.id | wa.me/6288971544885", 105, 287, { align: "center" });
  }

  doc.save(`QC-CERT-${t.id}-${t.deviceModel.replace(/\s+/g, "_")}.pdf`);
};
