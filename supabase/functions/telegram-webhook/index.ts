import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_USER_ID = Deno.env.get("TELEGRAM_USER_ID");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const update = await req.json();
    console.log("Telegram update received:", JSON.stringify(update).slice(0, 200));

    const message = update.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;
    const userId = String(message.from.id);
    const text = message.text;

    // Whitelist check
    if (TELEGRAM_USER_ID && userId !== TELEGRAM_USER_ID) {
      await sendTelegram(TELEGRAM_BOT_TOKEN, chatId, "⛔ Unauthorized.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle commands
    if (text === "/start") {
      await sendTelegram(TELEGRAM_BOT_TOKEN, chatId, "🤖 *Nexus AI Agent* is online\\.\n\nSend me any message and I'll respond using AI\\.", "MarkdownV2");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/status") {
      await sendTelegram(TELEGRAM_BOT_TOKEN, chatId, "✅ Nexus is running and ready.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send typing indicator
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // Call AI via Lovable AI Gateway
    if (!LOVABLE_API_KEY) {
      await sendTelegram(TELEGRAM_BOT_TOKEN, chatId, "❌ AI not configured on server.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are Nexus, a powerful AI assistant responding via Telegram. You have browser capabilities to search and read web pages when needed. Keep responses concise but helpful. Use markdown formatting sparingly (Telegram supports *bold*, _italic_, \`code\`). When you don't know something, say so honestly. If asked to browse or search, confirm you can do so.`,
          },
          { role: "user", content: text },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      await sendTelegram(TELEGRAM_BOT_TOKEN, chatId, `❌ AI error (${aiResponse.status}). Try again.`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let reply = aiData.choices?.[0]?.message?.content || "No response generated.";

    // Split long messages (Telegram limit ~4096 chars)
    const chunks = splitMessage(reply, 4000);
    for (const chunk of chunks) {
      await sendTelegram(TELEGRAM_BOT_TOKEN, chatId, chunk);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendTelegram(token: string, chatId: number, text: string, parseMode?: string) {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram sendMessage error:", err);
    // Retry without parse_mode if markdown fails
    if (parseMode) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    }
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt === -1 || splitAt < maxLen / 2) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}
