export const getFloorColor = (deviceName: string): string => {
  if (deviceName.includes("(P1)")) return "floor-p1 border";
  if (deviceName.includes("(P2)")) return "floor-p2 border";
  if (deviceName.includes("(P3)")) return "floor-p3 border";
  return "bg-muted text-muted-foreground border-border";
};

export const getFloorColorBadge = (deviceName: string): string => {
  if (deviceName.includes("(P1)")) return "bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))]";
  if (deviceName.includes("(P2)")) return "bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))]";
  if (deviceName.includes("(P3)")) return "bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))]";
  return "bg-muted text-muted-foreground";
};

export const getScoreColor = (score: number): string => {
  if (score >= 900) return "score-high border";
  if (score >= 600) return "score-mid border";
  return "score-low border";
};

export const getFloorAccent = (piso: number | string): string => {
  const p = String(piso);
  if (p === '1') return "bg-[hsl(var(--floor-1-accent))]";
  if (p === '2') return "bg-[hsl(var(--floor-2-accent))]";
  if (p === '3') return "bg-[hsl(var(--floor-3-accent))]";
  return "bg-muted-foreground";
};

export const getFloorPisoStyle = (pisoNum: string) => {
  const styles: Record<string, { name: string; bg: string; text: string; border: string; accent: string }> = {
    '1': { name: 'PAPEL', bg: 'bg-[hsl(var(--floor-1-bg))]', text: 'text-[hsl(var(--floor-1-text))]', border: 'border-[hsl(var(--floor-1-border))]', accent: 'bg-[hsl(var(--floor-1-accent))]' },
    '2': { name: 'MADERA', bg: 'bg-[hsl(var(--floor-2-bg))]', text: 'text-[hsl(var(--floor-2-text))]', border: 'border-[hsl(var(--floor-2-border))]', accent: 'bg-[hsl(var(--floor-2-accent))]' },
    '3': { name: 'TEXTIL', bg: 'bg-[hsl(var(--floor-3-bg))]', text: 'text-[hsl(var(--floor-3-text))]', border: 'border-[hsl(var(--floor-3-border))]', accent: 'bg-[hsl(var(--floor-3-accent))]' },
  };
  return styles[pisoNum] || styles['1'];
};

export const getGroupColor = (num: number | null): string => {
  if (!num) return "bg-muted text-muted-foreground border-border";
  if (num === 1) return "bg-[hsl(var(--floor-1-accent))] text-white border-[hsl(var(--floor-1-accent))]";
  if (num === 2) return "bg-[hsl(var(--floor-2-accent))] text-white border-[hsl(var(--floor-2-accent))]";
  if (num === 3) return "bg-[hsl(var(--floor-3-accent))] text-white border-[hsl(var(--floor-3-accent))]";
  return "bg-primary text-primary-foreground border-primary";
};

export const getGroupUnderline = (num: number | null): string => {
  if (!num) return "";
  if (num === 1) return "border-b-2 border-[hsl(var(--floor-1-accent))]";
  if (num === 2) return "border-b-2 border-[hsl(var(--floor-2-accent))]";
  if (num === 3) return "border-b-2 border-[hsl(var(--floor-3-accent))]";
  return "border-b-2 border-primary";
};

export const getPisoFromDeviceName = (name: string): string => {
  const match = name.match(/\(P(\d)\)/);
  return match ? match[1] : '1';
};

export const getPisoBadgeColor = (piso: string): string => {
  if (piso === 'P1') return 'bg-cyan-50 text-cyan-800 border-cyan-200';
  if (piso === 'P2') return 'bg-rose-50 text-rose-800 border-rose-200';
  if (piso === 'P3') return 'bg-amber-50 text-amber-800 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
};

export const parseUIDate = (uiDate: string, year: string): string => {
  const [d, m] = uiDate.split("/");
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

export const dbDateToUI = (dbDate: string): string => {
  const parts = dbDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dbDate;
};
