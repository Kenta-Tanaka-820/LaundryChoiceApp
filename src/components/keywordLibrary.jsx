export const includesAny = (text, keywords) => {
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