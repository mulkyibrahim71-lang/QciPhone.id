export interface QCPartCondition {
  label: string;
  cost: number;
  isInfo?: boolean;
  infoText?: string;
}

export interface QCPart {
  name: string;
  hasHealth?: boolean;
  isInfoPart?: boolean;
  conditions: QCPartCondition[];
}

export interface PartState {
  conditionIdx: number;
  repairCost: number;
  bhVal?: number; // battery health percent
}

export interface Transaction {
  id: string; // e.g., "TRX-QC-12345"
  date: string; // e.g., "2026-06-06"
  customerName: string;
  customerWa: string;
  deviceModel: string;
  imei?: string;
  deviceStorage: string;
  deviceColor: string;
  buyPrice: number;
  sellPrice: number;
  totalRepairCost: number;
  netProfit: number;
  eligibility: "LAYAK BELI" | "PERTIMBANGKAN" | "BERESIKO TINGGI" | "AWAITING DATA";
  notes: string;
  partsState: Record<string, PartState>;
  status?: "Belum Terjual" | "DP" | "Terjual";
  dpAmount?: number;
  buyerName?: string;
}

export interface ConditionOption {
  label: string;
  costMultiplier: "none" | "costMinor" | "costMajor";
}

