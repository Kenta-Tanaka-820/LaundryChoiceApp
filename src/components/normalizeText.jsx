export const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\s/g, "") // 空白・改行を消す
    .replace(/[()（）[\]【】,，.。:：;；]/g, ""); // 記号ちょい消す
};
