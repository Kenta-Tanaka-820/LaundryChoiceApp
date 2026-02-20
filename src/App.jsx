import { useMemo, useState } from "react";
import { normalizeText } from "./components/normalizeText";
import { classifyMaterial } from "./components/classfyMaterial";
import { RESULT_BY_TYPE } from "./components/result";
import "./style.css";

export const App = () => {
  const [text, setText] = useState("");
  const normalized = useMemo(() => normalizeText(text), [text]);

  return (
    <main className="container">
      <h1 className="row">LaundryChoiceApp</h1>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="素材名を入力"
      />
      <p>normalized: {normalized}</p>


      <div className="card">
        <p>classified: {classifyMaterial(normalized)}</p>
        <p>洗濯方法: {RESULT_BY_TYPE[classifyMaterial(normalized)].wash}</p>
        <p>乾燥方法: {RESULT_BY_TYPE[classifyMaterial(normalized)].dry}</p>
        <p>NG行為: {RESULT_BY_TYPE[classifyMaterial(normalized)].ng.join(", ")}</p>
      </div>
    </main>
  );
};
