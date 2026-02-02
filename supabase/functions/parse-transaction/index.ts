import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============= INPUT VALIDATION UTILITIES =============

// Validate and sanitize amount values
function validateAmount(amount: unknown): { valid: boolean; value: number; error?: string } {
  if (amount === undefined || amount === null) {
    return { valid: false, value: 0, error: "Valor é obrigatório" };
  }
  
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: "Valor deve ser um número válido" };
  }
  
  if (num < 0.01) {
    return { valid: false, value: 0, error: "Valor mínimo é R$ 0,01" };
  }
  
  if (num > 999999999) {
    return { valid: false, value: 0, error: "Valor máximo é R$ 999.999.999,00" };
  }
  
  // Round to 2 decimal places
  return { valid: true, value: Math.round(num * 100) / 100 };
}

// Sanitize text input - remove control characters and limit length
function sanitizeText(text: unknown, maxLength: number = 500): string {
  if (text === undefined || text === null) return '';
  
  const str = String(text)
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit length
    .slice(0, maxLength)
    // Trim whitespace
    .trim();
  
  return str;
}

// Validate UUID format
function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Validate transaction type
function isValidTransactionType(type: unknown): type is 'income' | 'expense' {
  return type === 'income' || type === 'expense';
}

// Validate category name
function validateCategory(category: unknown): { valid: boolean; value: string; error?: string } {
  if (!category) {
    return { valid: false, value: '', error: "Categoria é obrigatória" };
  }
  
  const sanitized = sanitizeText(category, 100);
  
  if (sanitized.length < 1) {
    return { valid: false, value: '', error: "Categoria não pode estar vazia" };
  }
  
  return { valid: true, value: sanitized };
}

// Validate parsed transaction data
function validateParsedTransaction(data: any): { valid: boolean; data?: any; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: "Dados da transação inválidos" };
  }

  // Validate type
  if (!isValidTransactionType(data.type)) {
    return { valid: false, error: "Tipo de transação inválido (deve ser 'income' ou 'expense')" };
  }

  // Validate amount
  const amountResult = validateAmount(data.amount);
  if (!amountResult.valid) {
    return { valid: false, error: amountResult.error };
  }

  // Validate category
  const categoryResult = validateCategory(data.category);
  if (!categoryResult.valid) {
    return { valid: false, error: categoryResult.error };
  }

  // Validate account_id if provided
  if (data.account_id && !isValidUUID(data.account_id)) {
    return { valid: false, error: "ID da conta inválido" };
  }

  return {
    valid: true,
    data: {
      type: data.type,
      amount: amountResult.value,
      category: categoryResult.value,
      description: sanitizeText(data.description, 500),
      account_id: data.account_id
    }
  };
}

// ============= AUTHENTICATION =============

// Authenticate and get user ID from JWT
// Note: verify_jwt = false in config.toml is intentional per Lovable security guidelines.
// This allows manual JWT validation using getClaims() for proper authentication.
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
    
    // Validate required fields
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ 
        error: "Mensagem é obrigatória"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize and limit message length
    const sanitizedMessage = sanitizeText(message, 1000);
    if (sanitizedMessage.length < 1) {
      return new Response(JSON.stringify({ 
        error: "Mensagem não pode estar vazia"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate accounts array
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Pelo menos uma conta bancária é necessária"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate categories
    if (!categories || !categories.income || !categories.expense) {
      return new Response(JSON.stringify({ 
        error: "Categorias são obrigatórias"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
${accounts.map((a: any) => `- ${sanitizeText(a.name, 100)} (${sanitizeText(a.bank_name, 100)}): ID "${a.id}"`).join('\n')}

Categorias de receita: ${categories.income.map((c: string) => sanitizeText(c, 100)).join(', ')}
Categorias de despesa: ${categories.expense.map((c: string) => sanitizeText(c, 100)).join(', ')}

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
          { role: "user", content: sanitizedMessage }
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
      const rawTransactionData = JSON.parse(toolCall.function.arguments);
      
      // Validate the parsed transaction data
      const validation = validateParsedTransaction(rawTransactionData);
      if (!validation.valid) {
        return new Response(JSON.stringify({ 
          error: validation.error || "Dados da transação inválidos"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        transaction: validation.data 
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
