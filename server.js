const express = require("express");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));

// السماح لتطبيق الهاتف بالاتصال بالخادم
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// حد بسيط للطلبات لتقليل إساءة الاستخدام
const requests = new Map();

app.use("/chat", (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const record = requests.get(ip) || { count: 0, start: now };

  if (now - record.start > 60 * 1000) {
    record.count = 0;
    record.start = now;
  }

  record.count++;
  requests.set(ip, record);

  if (record.count > 10) {
    return res.status(429).json({
      error: "طلبات كثيرة. حاول بعد دقيقة."
    });
  }

  next();
});

app.get("/", (req, res) => {
  res.send("I.M.B.P.I.S.H. server is running");
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "اكتب رسالة أولاً." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "الخادم غير مجهز بمفتاح API." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: "أنت مساعد شخصي اسمه I.M.B.P.I.S.H. أجب باللغة العربية بوضوح وود، وكن مفيداً وآمناً.",
      input: message.trim()
    });

    res.json({ reply: response.output_text });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالمساعد. حاول لاحقاً."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
