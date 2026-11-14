const express = require("express");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

// CORS: required because the Android HTML app may be opened from a local file.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Small in-memory request guard. This resets when the server restarts.
const requestCounts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

app.use("/chat", (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = requestCounts.get(key);

  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestCounts.set(key, { startedAt: now, count: 1 });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: "تم تجاوز عدد الطلبات المسموح مؤقتاً. حاول بعد دقيقة."
    });
  }
  next();
});

app.get("/", (_req, res) => {
  res.send("I.M.B.P.I.S.H. Groq server is running.");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "Groq",
    configured: Boolean(process.env.GROQ_API_KEY)
  });
});

app.post("/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "مفتاح Groq غير مضبوط في إعدادات الخادم."
      });
    }

    const message = typeof req.body.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({ error: "اكتب رسالة أولاً." });
    }

    if (message.length > 6000) {
      return res.status(413).json({ error: "الرسالة طويلة جداً." });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: "أنت I.M.B.P.I.S.H.، مساعد شخصي ودود ومفيد. أجب باللغة العربية عندما يكتب المستخدم بالعربية، وكن واضحاً ومختصراً. لا تدّعِ أنك تتذكر معلومات لم تُذكر في سياق المحادثة."
        },
        { role: "user", content: message }
      ],
      max_completion_tokens: 700,
      temperature: 0.7
    });

    const answer = completion.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return res.status(502).json({ error: "لم يصل رد نصي من نموذج الذكاء الاصطناعي." });
    }

    res.json({ reply: answer });
  } catch (error) {
    const status = error.status || 500;
    console.error("Groq chat error:", status, error.message);

    if (status === 401 || status === 403) {
      return res.status(502).json({
        error: "تعذّر التحقق من مفتاح Groq. راجع إعدادات GROQ_API_KEY في Render."
      });
    }
    if (status === 429) {
      return res.status(429).json({
        error: "تم بلوغ حد الاستخدام المجاني في Groq مؤقتاً. انتظر حتى يتجدد الحد."
      });
    }

    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي."
    });
  }
});

app.listen(PORT, () => {
  console.log(`I.M.B.P.I.S.H. Groq server listening on port ${PORT}`);
});
