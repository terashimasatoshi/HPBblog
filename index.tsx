
import React, { useState } from 'react';
import { createRoot } from "react-dom/client";

// --- Constants ---

const THEMES = [
  "METEO美髪矯正",
  "オーガニックカラー",
  "頭浸浴スパ",
  "白髪ぼかしハイライト",
  "乾燥対策トリートメント",
];

const SEASONS = ["春", "梅雨", "夏", "秋", "冬"];

// --- Styles (Same as before) ---
const styles = `
  :root {
    --primary-color: #ff6b9d;
    --primary-hover: #ff4785;
    --bg-color: #fdfdfd;
    --text-main: #333333;
    --text-sub: #666666;
    --border-color: #e0e0e0;
    --error-color: #d32f2f;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: sans-serif;
    background-color: #f9f9f9;
    color: #333;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    background-color: #fff;
    min-height: 100vh;
    box-shadow: 0 0 10px rgba(0,0,0,0.05);
  }
  h1 {
    text-align: center;
    color: var(--primary-color);
    margin-bottom: 40px;
  }
  .section { margin-bottom: 30px; }
  .section-title {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 10px;
    border-left: 4px solid var(--primary-color);
    padding-left: 10px;
  }
  .button-group { display: flex; flex-wrap: wrap; gap: 10px; }
  .btn-select {
    padding: 10px 16px;
    border: 1px solid var(--border-color);
    background-color: #fff;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-sub);
  }
  .btn-select:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .btn-select.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  .text-input {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  .action-area {
    display: flex;
    gap: 15px;
    margin-top: 20px;
    justify-content: center;
  }
  .btn-primary {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 14px 40px;
    border-radius: 30px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(255, 107, 157, 0.3);
  }
  .btn-primary:hover { background-color: var(--primary-hover); }
  .btn-primary:disabled { background-color: #ccc; cursor: not-allowed; box-shadow: none; }
  .btn-secondary {
    background-color: #f0f0f0;
    color: #555;
    border: none;
    padding: 14px 24px;
    border-radius: 30px;
    font-size: 1rem;
    cursor: pointer;
  }
  .btn-secondary:hover { background-color: #e0e0e0; }
  .result-area {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
  .result-textarea {
    width: 100%;
    height: 400px;
    padding: 15px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    resize: vertical;
    font-size: 1rem;
    line-height: 1.6;
    background-color: #fafafa;
    color: #333;
    box-sizing: border-box;
  }
  .copy-btn-wrapper { text-align: right; margin-top: 10px; }
  .error-message {
    color: var(--error-color);
    background-color: #ffebee;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    text-align: left;
    font-weight: bold;
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.5;
    border: 1px solid #ffcdd2;
  }
`;

// --- Main Component ---

function App() {
  const [theme, setTheme] = useState(null);
  const [season, setSeason] = useState(null);
  const [freeword, setFreeword] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleToggleTheme = (val) => setTheme(theme === val ? null : val);
  const handleToggleSeason = (val) => setSeason(season === val ? null : val);

  const handleReset = () => {
    setTheme(null);
    setSeason(null);
    setFreeword("");
    setGeneratedText("");
    setError("");
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setGeneratedText("");

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          season,
          freeword
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("API接続エラー: サーバーからの応答が正しくありません。\n(Vercelに 'pages/api/generate.js' が正しくデプロイされているか確認してください)");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `サーバーエラー: ${response.status}`);
      }

      setGeneratedText(data.body);

    } catch (err) {
      console.error(err);
      setError(`【生成エラー】\n${err.message}\n\n※このエラーが続く場合、Vercelの環境変数 GEMINI_API_KEY が正しく設定されているか確認してください。`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      alert("コピーしました！");
    } catch (err) {
      alert("コピーに失敗しました");
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <header>
          <h1>HPB 美容ブログ自動生成</h1>
        </header>

        {error && <div className="error-message">{error}</div>}

        <main>
          {/* Theme Selection */}
          <section className="section">
            <div className="section-title">テーマを選択</div>
            <div className="button-group">
              {THEMES.map((t) => (
                <button
                  key={t}
                  className={`btn-select ${theme === t ? "active" : ""}`}
                  onClick={() => handleToggleTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Season Selection */}
          <section className="section">
            <div className="section-title">季節を選択</div>
            <div className="button-group">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  className={`btn-select ${season === s ? "active" : ""}`}
                  onClick={() => handleToggleSeason(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Freeword Input */}
          <section className="section">
            <div className="section-title">フリーワード (任意)</div>
            <input
              type="text"
              className="text-input"
              placeholder="例: 梅雨 くせ毛 対策 前髪"
              value={freeword}
              onChange={(e) => setFreeword(e.target.value)}
            />
          </section>

          {/* Actions */}
          <div className="action-area">
            <button className="btn-secondary" onClick={handleReset} disabled={loading}>
              リセット
            </button>
            <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? "生成中..." : "記事を生成"}
            </button>
          </div>

          {/* Result */}
          <div className="result-area">
            <div className="section-title">生成結果</div>
            <textarea
              className="result-textarea"
              readOnly
              value={generatedText}
              placeholder="ここに生成された記事が表示されます..."
            />
            <div className="copy-btn-wrapper">
              <button
                className="btn-select"
                onClick={handleCopy}
                disabled={!generatedText}
              >
                本文をコピー
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
