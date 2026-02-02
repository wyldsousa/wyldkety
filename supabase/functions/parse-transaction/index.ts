import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Authenticate and get user ID from JWT
async function authenticateRequest(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'Missing or invalid Authorization header' };
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { userId: null, error: 'Server configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  
  if (error || !data?.claims) {
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request first
    const { userId, error: authError } = await authenticateRequest(req);
    
    if (authError || !userId) {
      return new Response(JSON.stringify({ 
        error: authError || 'Unauthorized'
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, accounts, categories } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um assistente financeiro especializado em extrair informações de transações a partir de texto em português brasileiro.

IMPORTANTE: Você deve responder SEMPRE com uma chamada de função, nunca com texto.

Ao analisar a mensagem do usuário, extraia:
1. Tipo: "income" (receita/entrada) ou "expense" (despesa/gasto)
2. Valor: O valor numérico mencionado
3. Categoria: A categoria mais apropriada da lista fornecida
4. Descrição: Um resumo breve da transação
5. Conta: Se o usuário mencionar um banco específico, use o ID correspondente

Contas disponíveis:
${accounts.map((a: any) => `- ${a.name} (${a.bank_name}): ID "${a.id}"`).join('\n')}

Categorias de receita: ${categories.income.join(', ')}
Categorias de despesa: ${categories.expense.join(', ')}

Exemplos:
- "Gastei 50 reais no mercado" → expense, 50, Alimentação
- "Recebi 3000 de salário" → income, 3000, Salário
- "Paguei 150 de luz" → expense, 150, Contas
- "Ganhei 500 de freelance" → income, 500, Freelance`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_transaction",
              description: "Cria uma nova transação financeira com os dados extraídos da mensagem do usuário",
              parameters: {
                type: "object",
                properties: {
                  type: { 
                    type: "string", 
                    enum: ["income", "expense"],
                    description: "Tipo da transação: income para receita, expense para despesa"
                  },
                  amount: { 
                    type: "number",
                    description: "Valor da transação em reais (apenas o número, sem símbolos)"
                  },
                  category: { 
                    type: "string",
                    description: "Categoria da transação baseada nas categorias disponíveis"
                  },
                  description: { 
                    type: "string",
                    description: "Descrição resumida da transação"
                  },
                  account_id: { 
                    type: "string",
                    description: "ID da conta bancária. Use o ID da primeira conta se não especificado"
                  }
                },
                required: ["type", "amount", "category", "description", "account_id"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_transaction" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar a mensagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function?.arguments) {
      const transactionData = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ 
        success: true, 
        transaction: transactionData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      error: "Não consegui entender a transação. Tente algo como 'Gastei 50 reais no mercado'" 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("parse-transaction error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
