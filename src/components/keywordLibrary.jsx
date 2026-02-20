import { normalizeText } from "./normalizeText";
export const classifyMaterial = (ocrText) => {
  if (includesAny(ocrText, DICT.delicate)) return "delicate";
  if (includesAny(ocrText, DICT.synthetic)) return "synthetic";
  if (includesAny(ocrText, DICT.cotton)) return "cotton";
  return "unknown";
};

const includesAny = (text, keywords) => {
  const t = normalizeText(text);
  return keywords.some((k) => t.includes(normalizeText(k)));
};

const DICT = {
  delicate: [
    "ウール",
    "毛",
    "羊毛",
    "wool",
    "シルク",
    "絹",
    "silk",
    "レーヨン",
    "rayon",
    "カシミヤ",
    "cashmere",
  ],
  synthetic: [
    "ポリエステル",
    "ポリエ",
    "ポリ",
    "polyester",
    "ナイロン",
    "nylon",
    "アクリル",
    "acrylic",
    "ポリウレタン",
    "polyurethane",
    "spandex",
    "elastane",
    "pu",
  ],
  cotton: ["綿", "コットン", "cotton"],
};