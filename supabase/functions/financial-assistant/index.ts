import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============= INPUT VALIDATION UTILITIES =============

function sanitizeString(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}

function isValidAmount(amount: any): boolean {
  return typeof amount === "number" && !isNaN(amount) && amount > 0;
}

// ============= SERVER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const message = sanitizeString(body.message || "");
    const conversationHistory = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
      : [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mensagem vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    const systemPrompt = `
Você é um assistente financeiro inteligente.
Responda sempre em português.
Nunca invente dados.
Se não souber, diga que não sabe.
`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_transaction",
          description: "Cria uma transação financeira",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number" },
              type: { type: "string", enum: ["income", "expense"] },
              category: { type: "string" },
              description: { type: "string" },
              date: { type: "string" },
            },
            required: ["amount", "type", "category"],
          },
        },
      },
    ];

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-10),
            { role: "user", content: message },
          ],
          tools,
          tool_choice: "auto",
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (choice?.finish_reason === "tool_calls") {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (!isValidAmount(args.amount)) {
        throw new Error("Valor inválido");
      }

      const { error } = await supabase.from("transactions").insert({
        amount: args.amount,
        type: args.type,
        category: sanitizeString(args.category),
        description: sanitizeString(args.description || ""),
        date: args.date || new Date().toISOString().slice(0, 10),
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply = choice?.message?.content ?? "";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
