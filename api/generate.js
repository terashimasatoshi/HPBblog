
import { GoogleGenAI } from "@google/genai";

// ヘルパー: 季節のキーワード取得
const getSeasonKeywords = (season) => {
  switch (season) {
    case "春": return ["春 髪 軽やか 質感", "花粉 頭皮 ケア"];
    case "梅雨": return ["梅雨 くせ毛 うねり 対策", "酸性 ストレート 湿気"];
    case "夏": return ["夏 UV 退色 予防", "汗 湿気 広がり"];
    case "秋": return ["秋 抜け毛 ボリューム ケア", "夏ダメージ リペア"];
    case "冬": return ["冬 乾燥 静電気 高保湿", "艶 維持 トリートメント"];
    default: return [];
  }
};

// ヘルパー: サニタイズ処理
const sanitizeForHPB = (text) => {
  if (!text) return "";
  let cleaned = text;
  // 改行統一
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // URL除去
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");
  // 絵文字・記号除去 (基本的な句読点以外を除去)
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
  cleaned = cleaned.replace(/#/g, ""); // ハッシュタグ記号のみ除去

  // 行数制限 (80行)
  const lines = cleaned.split("\n");
  if (lines.length > 80) {
    cleaned = lines.slice(0, 80).join("\n");
  } else {
    cleaned = lines.join("\n");
  }

  // 文字数制限 (約1000文字)
  if (cleaned.length > 1000) {
    cleaned = cleaned.substring(0, 1000);
  }

  return cleaned.trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { theme, season, freeword } = req.body;

    // 1. APIキーの確認 (サーバーサイド環境変数)
    const geminiKey = process.env.GEMINI_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;

    if (!geminiKey) {
      console.error("Server Error: GEMINI_API_KEY is missing");
      throw new Error("サーバー設定エラー: GEMINI_API_KEY が設定されていません。Vercelの環境変数を確認してください。");
    }

    // 2. クエリの構築
    const baseQuery = freeword || theme || "艶髪 ケア 美容室";
    const seasonKeywords = getSeasonKeywords(season);
    const fullQuery = `${baseQuery} ${seasonKeywords.join(" ")}`.trim();

    // 3. YouTube情報の取得 (APIキーがある場合のみ)
    let contextBullets = [];
    if (youtubeKey) {
      try {
        const params = new URLSearchParams({
          part: "snippet",
          q: fullQuery,
          type: "video",
          order: "date",
          maxResults: "3",
          key: youtubeKey,
          relevanceLanguage: "ja",
        });
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          const items = ytData.items || [];
          contextBullets = items.map(item => {
             return `トレンド情報(YouTube): ${item.snippet.title} / ${item.snippet.description}`.substring(0, 100);
          });
        } else {
            console.warn("YouTube API Error:", ytRes.status, ytRes.statusText);
            // キーが無効などの場合も続行
        }
      } catch (e) {
        console.error("YouTube Fetch Error:", e);
        // YouTubeエラーでもブログ生成は止めない
        contextBullets.push(`(YouTube取得失敗: キーワードに関連する美容情報を参照してください)`);
      }
    } else {
      contextBullets.push("※ YouTube連携なし (APIキー未設定)");
    }

    // 補足情報の追加
    contextBullets.push(`季節: ${season || "指定なし"}`);
    contextBullets.push(`ターゲット: 30-50代の大人女性`);

    // 4. Gemini API 呼び出し
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    
    // 構成パターンのランダム選択
    const patterns = [
        "Q&A形式（お客様の悩みに答えるスタイル）",
        "失敗例から学ぶ（やってはいけないケアなど）",
        "専門家コラム風（知識を分かりやすく解説）",
        "お客様のBefore/Afterストーリー風",
    ];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

    const systemPrompt = `
      あなたは美容室「HAIR&MAKE peace」の専属ブログライター兼・美容専門の編集者です。
      ターゲット読者は30〜50代の美容感度が高い大人女性です。

      以下の【禁止事項】を厳守してブログ記事を作成してください。
      1. ホットペッパービューティーの掲載規定により、**絵文字および記号（★、♪、！、？以外の特殊文字）は一切使用禁止**です。
      2. URL、リンク、ハッシュタグ(#)は本文に含めないでください。
      3. 全角1000文字以内、改行は80回以内に収めてください。
      4. 同じフレーズを繰り返さず、自然でプロフェッショナルな語り口にしてください。
      5. 最後の一文は「相談・予約につながる自然な一文」で締めてください。
    `;

    const userPrompt = `
      以下の条件でブログを執筆してください。

      【テーマ】: ${theme || "未指定"}
      【季節】: ${season || "未指定"}
      【キーワード】: ${fullQuery}
      【構成パターン】: ${selectedPattern}

      【参考情報】:
      ${contextBullets.join("\n")}

      出力はブログの本文のみにしてください。タイトルは不要です。
    `;

    // 新しいSDKの正しい呼び出し方
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n\n" + userPrompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
      }
    });

    // .text() ではなく .text プロパティを使用する
    const rawContent = response.text || "";
    const sanitized = sanitizeForHPB(rawContent);

    res.status(200).json({ ok: true, body: sanitized });

  } catch (error) {
    console.error("API Error Details:", error);
    res.status(500).json({ 
      ok: false, 
      message: `生成エラー: ${error.message || "サーバーエラーが発生しました"}` 
    });
  }
}
