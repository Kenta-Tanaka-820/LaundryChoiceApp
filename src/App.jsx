import { useEffect, useMemo, useState } from "react";
import { normalizeText } from "./components/normalizeText";
import { classifyMaterial } from "./components/classfyMaterial";
import { RESULT_BY_TYPE } from "./components/result";
import "./style.css";

const API_URL = "https://api.openai.com/v1/responses";
const MATERIALS = ["delicate", "synthetic", "cotton", "unknown"];

const getMimeType = (file) => {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  if (ext === "tiff") return "image/tiff";
  return "application/octet-stream";
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });

const extractTextFromResponse = (result) => {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  if (!Array.isArray(result.output)) return "";

  const textParts = [];
  for (const item of result.output) {
    if (!item || !Array.isArray(item.content)) continue;
    for (const contentItem of item.content) {
      if (contentItem?.type === "output_text" && typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n").trim();
};

export const App = () => {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [resultMaterial, setResultMaterial] = useState("unknown");
  const [resultSource, setResultSource] = useState("手入力テキスト");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const normalized = useMemo(() => normalizeText(text), [text]);
  const result = RESULT_BY_TYPE[resultMaterial];
  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setError("");
  };

  const runTextClassify = () => {
    const material = classifyMaterial(normalized);
    setResultMaterial(material);
    setResultSource("手入力テキスト");
  };

  const runOcr = async () => {
    if (!imageFile) {
      setError("先に画像を選択してください。");
      return;
    }

    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    const model = process.env.REACT_APP_OPENAI_MODEL || "gpt-4.1-mini";
    if (!apiKey) {
      setError("REACT_APP_OPENAI_API_KEY が未設定です。");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const imageBase64 = await fileToBase64(imageFile);
      const mimeType = getMimeType(imageFile);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text:
                    "Classify the clothing material category from this label image. " +
                    "Use only these categories: delicate, synthetic, cotton, unknown. " +
                    "Keyword rules: delicate=[ウール,毛,羊毛,wool,シルク,絹,silk,レーヨン,rayon,カシミヤ,cashmere], " +
                    "synthetic=[ポリエステル,ポリエ,ポリ,polyester,ナイロン,nylon,アクリル,acrylic,ポリウレタン,polyurethane,spandex,elastane,pu], " +
                    "cotton=[綿,コットン,cotton]. " +
                    'Return JSON only in the format: {"material":"<category>"}',
                },
                {
                  type: "input_image",
                  image_url: `data:${mimeType};base64,${imageBase64}`,
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "material_result",
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  material: {
                    type: "string",
                    enum: MATERIALS,
                  },
                },
                required: ["material"],
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errText}`);
      }

      const apiResult = await response.json();
      const outputText = extractTextFromResponse(apiResult);
      if (!outputText) {
        throw new Error("OCR結果のテキスト抽出に失敗しました。");
      }

      const parsed = JSON.parse(outputText);
      if (!parsed?.material || !MATERIALS.includes(parsed.material)) {
        throw new Error("material の形式が不正です。");
      }

      setResultMaterial(parsed.material);
      setResultSource("画像OCR");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCRに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <h1 className="row">LaundryChoiceApp</h1>
      <div className="row">
        <input type="file" accept="image/*" onChange={onFileChange} />
        <button className="primaryBtn" onClick={runOcr} disabled={isLoading}>
          {isLoading ? "判定中..." : "画像から素材判定"}
        </button>
      </div>
      {imageFile && <p className="row">選択画像: {imageFile.name}</p>}
      {imagePreviewUrl && (
        <img className="previewImage" src={imagePreviewUrl} alt="選択画像プレビュー" />
      )}
      {error && <p className="row errorText">{error}</p>}

      <div className="row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="素材名を入力"
        />
        <button className="primaryBtn" onClick={runTextClassify}>
          素材判定
        </button>
      </div>
      <p>normalized: {normalized}</p>

      <div className="card">
        <p>classified: {resultMaterial}</p>
        <p>判定元: {resultSource}</p>
        <p>洗濯方法: {result.wash}</p>
        <p>乾燥方法: {result.dry}</p>
        <p>NG行為: {result.ng.join(", ")}</p>
      </div>
    </main>
  );
};
