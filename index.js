const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// ✅ Webhook Verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ استقبال الرسائل
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const changes = body.entry?.[0]?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (message) {
      const from = message.from;
      const type = message.type;

      if (type === "text") {
        // أي رسالة نصية → ابعت زراير
        await sendButtons(from);
      } else if (type === "interactive") {
        // العميل ضغط زرار
        const buttonId = message.interactive?.button_reply?.id;
        await handleButton(from, buttonId);
      }
    }
  }

  res.sendStatus(200);
});

// ✅ بعت رسالة بزراير
async function sendButtons(to) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: "أهلاً بيك في سارة للهدايا 🎁\nإزاي أقدر أساعدك؟"
        },
        action: {
          buttons: [
            { type: "reply", reply: { id: "products", title: "🛍️ المنتجات" } },
            { type: "reply", reply: { id: "order",    title: "📦 تتبع طلبي" } },
            { type: "reply", reply: { id: "contact",  title: "💬 تواصل معنا" } }
          ]
        }
      }
    },
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
}

// ✅ رد حسب الزرار
async function handleButton(to, buttonId) {
  let text = "";

  if (buttonId === "products") {
    text = "🛍️ *منتجاتنا:*\n\n• بوكيهات ورد 🌹\n• هدايا مميزة 🎀\n• تغليف فاخر ✨\n\nللطلب تواصل معنا مباشرة!";
  } else if (buttonId === "order") {
    text = "📦 لتتبع طلبك\nابعتلنا رقم الطلب وهنرد عليك فوراً ✅";
  } else if (buttonId === "contact") {
    text = "💬 تواصل معنا:\n📞 01XXXXXXXXX\n🕐 يومياً من 10 ص لـ 10 م";
  }

  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    },
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
}

app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Sara Bot is running!");
});