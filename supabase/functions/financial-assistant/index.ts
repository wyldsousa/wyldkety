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

// Validate date string format (YYYY-MM-DD)
function isValidDateString(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
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

// Validate installments
function validateInstallments(installments: unknown): number {
  if (installments === undefined || installments === null) return 1;
  
  const num = Number(installments);
  if (isNaN(num) || num < 1) return 1;
  if (num > 60) return 60; // Max 60 installments
  
  return Math.floor(num);
}

// Validate transaction data object
function validateTransactionData(data: any): { valid: boolean; data?: any; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: "Dados da transação inválidos" };
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

  // Validate card_id if provided
  if (data.card_id && !isValidUUID(data.card_id)) {
    return { valid: false, error: "ID do cartão inválido" };
  }

  // Validate type if provided
  if (data.type && !isValidTransactionType(data.type)) {
    return { valid: false, error: "Tipo de transação inválido" };
  }

  return {
    valid: true,
    data: {
      ...data,
      amount: amountResult.value,
      category: categoryResult.value,
      description: sanitizeText(data.description, 500),
      installments: validateInstallments(data.installments)
    }
  };
}

// ============= DATE PARSING =============

// Helper to parse relative dates
function parseRelativeDate(dateStr: string): string {
  const today = new Date();
  const lower = sanitizeText(dateStr, 50).toLowerCase();
  
  if (lower === 'hoje' || lower === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (lower === 'ontem' || lower === 'yesterday') {
    today.setDate(today.getDate() - 1);
    return today.toISOString().split('T')[0];
  }
  if (lower === 'anteontem') {
    today.setDate(today.getDate() - 2);
    return today.toISOString().split('T')[0];
  }
  if (lower.includes('semana passada')) {
    today.setDate(today.getDate() - 7);
    return today.toISOString().split('T')[0];
  }
  
  // Try to parse "dia X"
  const dayMatch = lower.match(/dia\s*(\d{1,2})/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    if (day >= 1 && day <= 31) {
      const result = new Date(today.getFullYear(), today.getMonth(), day);
      return result.toISOString().split('T')[0];
    }
  }
  
  // Try to parse ISO date format
  if (isValidDateString(dateStr)) {
    return dateStr;
  }
  
  return today.toISOString().split('T')[0];
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
    const { userId: authenticatedUserId, error: authError } = await authenticateRequest(req);
    
    if (authError || !authenticatedUserId) {
      return new Response(JSON.stringify({ 
        error: authError || 'Unauthorized',
        type: 'auth_error'
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      message, 
      accounts, 
      cards,
      categories,
      action,
      userId: providedUserId,
      transactionData,
      conversationHistory = []
    } = await req.json();

    // CRITICAL: Always use the authenticated user ID, never trust the provided one
    const userId = authenticatedUserId;

    // Validate that provided userId matches authenticated user (if provided)
    if (providedUserId && providedUserId !== authenticatedUserId) {
      console.warn(`User ${authenticatedUserId} attempted to access data for user ${providedUserId}`);
      return new Response(JSON.stringify({ 
        error: 'Access denied',
        type: 'auth_error'
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle direct actions - now using authenticated userId
    if (action === 'confirm_transaction' && transactionData) {
      return await handleConfirmTransaction(supabase, transactionData, userId, corsHeaders);
    }

    if (action === 'confirm_credit_card_transaction' && transactionData) {
      return await handleCreditCardTransaction(supabase, transactionData, userId, corsHeaders);
    }

    if (action === 'delete_transaction' && transactionData?.id) {
      return await handleDeleteTransaction(supabase, transactionData.id, userId, corsHeaders);
    }

    if (action === 'pay_invoice' && transactionData) {
      return await handlePayInvoice(supabase, transactionData, userId, corsHeaders);
    }

    if (action === 'prepay_installments' && transactionData) {
      return await handlePrepayInstallments(supabase, transactionData, userId, corsHeaders);
    }

    if (action === 'query') {
      return await handleQuery(supabase, LOVABLE_API_KEY, message, userId, accounts, conversationHistory, corsHeaders);
    }

    // Main AI processing for transaction parsing
    const systemPrompt = `Você é um assistente financeiro inteligente e conversacional chamado "Fin". Você ajuda usuários a gerenciar suas finanças através de conversa natural em português brasileiro.

SUAS CAPACIDADES:
1. Criar transações (receitas e despesas)
2. Criar transferências entre contas
3. Criar compras no cartão de crédito
4. Criar categorias novas
5. Criar lembretes de pagamentos
6. Detectar parcelamentos (em Xx, X parcelas, dividido em X)
7. Detectar recorrências (mensal, semanal, anual, assinatura, aluguel)
8. Entender datas relativas (hoje, ontem, semana passada, dia X)
9. Responder perguntas sobre finanças
10. Fornecer insights financeiros
11. Pagar faturas de cartão de crédito
12. Pagar parcialmente faturas
13. Antecipar parcelas de compras parceladas

REGRAS IMPORTANTES:
- SEMPRE seja amigável e conversacional
- Para transações, SEMPRE use a função apropriada
- Para perguntas/consultas, use a função query_finances
- Detecte o INTENT do usuário corretamente
- Para pagar fatura, SEMPRE pergunte qual conta usar se não especificado

CONTEXTO DO USUÁRIO:
Contas disponíveis:
${accounts?.map((a: any) => `- ${a.name} (${a.bank_name}): ID "${a.id}"`).join('\n') || 'Nenhuma conta cadastrada'}

Cartões de crédito disponíveis:
${cards?.map((c: any) => `- ${c.name} (${c.bank_name}): ID "${c.id}"`).join('\n') || 'Nenhum cartão cadastrado'}

Categorias de receita: ${categories?.income?.join(', ') || 'Salário, Freelance, Investimentos, Outros'}
Categorias de despesa: ${categories?.expense?.join(', ') || 'Alimentação, Transporte, Moradia, Contas, Lazer, Saúde, Educação, Outros'}

DETECÇÃO DE PAGAMENTO DE FATURA:
- "pagar fatura", "paguei a fatura", "quitar fatura" → pay_invoice
- "pagar parte da fatura", "pagar parcial" → pay_invoice_partial
- "antecipar parcela", "quitar compra" → prepay_installments

DETECÇÃO DE CARTÃO DE CRÉDITO:
- "no crédito", "no cartão", "cartão de crédito", "crédito" → credit_card
- Compras parceladas geralmente são no cartão

DETECÇÃO DE PARCELAMENTO:
- "em 10x" → 10 parcelas
- "3 parcelas" → 3 parcelas  
- "dividido em 6" → 6 parcelas
- "parcelado em 12x" → 12 parcelas

DETECÇÃO DE LEMBRETE:
- "lembrar", "lembrete", "não esquecer" → create_reminder
- "pagar X dia Y" → create_reminder

DETECÇÃO DE CATEGORIA:
- "criar categoria", "nova categoria" → create_category

DETECÇÃO DE TRANSFERÊNCIA:
- "transferi X de A para B" → transfer
- "passei X do A pro B" → transfer
- "movi X de A para B" → transfer

DATAS:
- "hoje" → data atual
- "ontem" → data -1 dia
- "anteontem" → data -2 dias
- "semana passada" → data -7 dias
- "dia 15" → dia 15 do mês atual`;

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
          ...conversationHistory.slice(-10),
          { role: "user", content: message }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_transaction",
              description: "Cria uma transação financeira (receita ou despesa) com todos os detalhes extraídos",
              parameters: {
                type: "object",
                properties: {
                  type: { 
                    type: "string", 
                    enum: ["income", "expense"],
                    description: "income para receita, expense para despesa"
                  },
                  amount: { 
                    type: "number",
                    description: "Valor da transação"
                  },
                  category: { 
                    type: "string",
                    description: "Categoria da transação"
                  },
                  description: { 
                    type: "string",
                    description: "Descrição da transação"
                  },
                  account_id: { 
                    type: "string",
                    description: "ID da conta"
                  },
                  date: {
                    type: "string",
                    description: "Data no formato YYYY-MM-DD ou relativa (hoje, ontem, etc)"
                  },
                  installments: {
                    type: "number",
                    description: "Número de parcelas (1 se não parcelado)"
                  },
                  recurrence: {
                    type: "string",
                    enum: ["none", "weekly", "monthly", "yearly"],
                    description: "Tipo de recorrência"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA confirmando o que entendeu"
                  }
                },
                required: ["type", "amount", "category", "description", "account_id", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "create_credit_card_transaction",
              description: "Cria uma compra no cartão de crédito",
              parameters: {
                type: "object",
                properties: {
                  amount: { 
                    type: "number",
                    description: "Valor da compra"
                  },
                  category: { 
                    type: "string",
                    description: "Categoria da compra"
                  },
                  description: { 
                    type: "string",
                    description: "Descrição da compra"
                  },
                  card_id: { 
                    type: "string",
                    description: "ID do cartão de crédito"
                  },
                  date: {
                    type: "string",
                    description: "Data da compra"
                  },
                  installments: {
                    type: "number",
                    description: "Número de parcelas (1 se à vista)"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA"
                  }
                },
                required: ["amount", "category", "description", "card_id", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "create_transfer",
              description: "Cria uma transferência entre contas",
              parameters: {
                type: "object",
                properties: {
                  amount: { 
                    type: "number",
                    description: "Valor da transferência"
                  },
                  from_account_id: { 
                    type: "string",
                    description: "ID da conta de origem"
                  },
                  to_account_id: { 
                    type: "string",
                    description: "ID da conta de destino"
                  },
                  description: {
                    type: "string",
                    description: "Descrição da transferência"
                  },
                  date: {
                    type: "string",
                    description: "Data da transferência"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA"
                  }
                },
                required: ["amount", "from_account_id", "to_account_id", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "create_category",
              description: "Cria uma nova categoria de receita ou despesa",
              parameters: {
                type: "object",
                properties: {
                  name: { 
                    type: "string",
                    description: "Nome da categoria"
                  },
                  type: {
                    type: "string",
                    enum: ["income", "expense"],
                    description: "Tipo da categoria"
                  },
                  color: {
                    type: "string",
                    description: "Cor em hex (opcional)"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA"
                  }
                },
                required: ["name", "type", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "create_reminder",
              description: "Cria um lembrete de pagamento ou dívida",
              parameters: {
                type: "object",
                properties: {
                  title: { 
                    type: "string",
                    description: "Título do lembrete"
                  },
                  description: {
                    type: "string",
                    description: "Descrição adicional"
                  },
                  amount: {
                    type: "number",
                    description: "Valor (se aplicável)"
                  },
                  due_date: {
                    type: "string",
                    description: "Data de vencimento"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA"
                  }
                },
                required: ["title", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "query_finances",
              description: "Consulta dados financeiros do usuário para responder perguntas",
              parameters: {
                type: "object",
                properties: {
                  query_type: {
                    type: "string",
                    enum: ["monthly_summary", "category_breakdown", "balance", "top_expenses", "comparison", "custom"],
                    description: "Tipo de consulta"
                  },
                  period: {
                    type: "string",
                    description: "Período da consulta (este mês, semana, etc)"
                  },
                  category: {
                    type: "string",
                    description: "Categoria específica se aplicável"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta inicial da IA"
                  }
                },
                required: ["query_type", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "pay_invoice",
              description: "Paga uma fatura de cartão de crédito (total ou parcialmente)",
              parameters: {
                type: "object",
                properties: {
                  card_id: {
                    type: "string",
                    description: "ID do cartão de crédito"
                  },
                  account_id: {
                    type: "string",
                    description: "ID da conta para pagamento"
                  },
                  amount: {
                    type: "number",
                    description: "Valor a pagar (se parcial)"
                  },
                  is_partial: {
                    type: "boolean",
                    description: "Se é pagamento parcial"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA"
                  }
                },
                required: ["card_id", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "prepay_installments",
              description: "Antecipa parcelas de uma compra parcelada no cartão",
              parameters: {
                type: "object",
                properties: {
                  card_id: {
                    type: "string",
                    description: "ID do cartão de crédito"
                  },
                  account_id: {
                    type: "string",
                    description: "ID da conta para pagamento"
                  },
                  installments_to_pay: {
                    type: "number",
                    description: "Quantidade de parcelas a antecipar"
                  },
                  description: {
                    type: "string",
                    description: "Descrição da compra a antecipar"
                  },
                  ai_response: {
                    type: "string",
                    description: "Resposta amigável da IA"
                  }
                },
                required: ["card_id", "ai_response"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "general_response",
              description: "Resposta geral para conversas, saudações ou quando não há ação específica",
              parameters: {
                type: "object",
                properties: {
                  ai_response: {
                    type: "string",
                    description: "Resposta conversacional da IA"
                  }
                },
                required: ["ai_response"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requisições excedido. Aguarde alguns segundos.",
          type: "rate_limit"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Créditos insuficientes.",
          type: "payment_required"
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao processar mensagem");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const textContent = data.choices?.[0]?.message?.content;
    
    if (toolCall && toolCall.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      const functionName = toolCall.function.name;

      // Process date if present
      if (args.date) {
        args.date = parseRelativeDate(args.date);
      } else {
        args.date = new Date().toISOString().split('T')[0];
      }

      // Process due_date for reminders
      if (args.due_date) {
        args.due_date = parseRelativeDate(args.due_date);
      }

      return new Response(JSON.stringify({ 
        success: true,
        action: functionName,
        data: args,
        ai_response: args.ai_response
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to text response
    return new Response(JSON.stringify({ 
      success: true,
      action: "general_response",
      ai_response: textContent || "Desculpe, não entendi. Pode reformular?"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("financial-assistant error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido",
      type: "error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Handler for confirming and saving transactions
async function handleConfirmTransaction(
  supabase: any, 
  transactionData: any, 
  userId: string,
  corsHeaders: any
) {
  try {
    // Validate transaction data
    const validation = validateTransactionData(transactionData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: validation.error || "Dados inválidos"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const validatedData = validation.data!;
    const transactions = [];
    const installments = validatedData.installments;
    const baseAmount = validatedData.amount / installments;
    const baseDate = new Date(validatedData.date || new Date());

    // Verify account belongs to user before proceeding
    if (!isValidUUID(validatedData.account_id)) {
      return new Response(JSON.stringify({ 
        error: "ID da conta inválido"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: accountCheck, error: accountError } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('id', validatedData.account_id)
      .eq('user_id', userId)
      .single();

    if (accountError || !accountCheck) {
      return new Response(JSON.stringify({ 
        error: "Conta não encontrada ou acesso negado"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create installments if more than 1
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(installmentDate.getMonth() + i);
      
      const description = installments > 1 
        ? `${validatedData.description} (${i + 1}/${installments})`
        : validatedData.description;

      transactions.push({
        user_id: userId,
        account_id: validatedData.account_id,
        type: validatedData.type,
        amount: baseAmount,
        category: validatedData.category,
        description: description,
        date: installmentDate.toISOString().split('T')[0],
        transfer_to_account_id: validatedData.transfer_to_account_id || null
      });
    }

    // Insert all transactions
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactions)
      .select();

    if (error) throw error;

    // Update account balance
    const totalAmount = validatedData.type === 'income' 
      ? validatedData.amount 
      : -validatedData.amount;

    const { data: account } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', validatedData.account_id)
      .eq('user_id', userId)
      .single();

    if (account) {
      await supabase
        .from('bank_accounts')
        .update({ balance: Number(account.balance) + totalAmount })
        .eq('id', validatedData.account_id)
        .eq('user_id', userId);
    }

    // Handle transfer destination
    if (validatedData.transfer_to_account_id) {
      // Validate transfer destination UUID
      if (!isValidUUID(validatedData.transfer_to_account_id)) {
        return new Response(JSON.stringify({ 
          error: "ID da conta de destino inválido"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify destination account also belongs to user
      const { data: destAccount } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', validatedData.transfer_to_account_id)
        .eq('user_id', userId)
        .single();

      if (destAccount) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(destAccount.balance) + validatedData.amount })
          .eq('id', validatedData.transfer_to_account_id)
          .eq('user_id', userId);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: installments > 1 
        ? `${installments} parcelas criadas com sucesso!`
        : "Transação salva com sucesso!",
      transactions: data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Confirm transaction error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao salvar transação"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Handler for credit card transactions
async function handleCreditCardTransaction(
  supabase: any,
  transactionData: any,
  userId: string,
  corsHeaders: any
) {
  try {
    // Validate transaction data
    const validation = validateTransactionData(transactionData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: validation.error || "Dados inválidos"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const validatedData = validation.data!;
    const installments = validatedData.installments;
    const baseAmount = validatedData.amount / installments;
    const baseDate = new Date(validatedData.date || new Date());

    // Validate card_id
    if (!isValidUUID(validatedData.card_id)) {
      return new Response(JSON.stringify({ 
        error: "ID do cartão inválido"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify card belongs to user
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', validatedData.card_id)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ 
        error: "Cartão não encontrado ou acesso negado"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create transactions for each installment
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(installmentDate.getMonth() + i);
      
      // Determine which invoice this installment goes to
      const purchaseDay = installmentDate.getDate();
      let invoiceMonth = installmentDate.getMonth() + 1;
      let invoiceYear = installmentDate.getFullYear();
      
      // If purchase is after closing day, goes to next month's invoice
      if (purchaseDay > card.closing_day) {
        invoiceMonth++;
        if (invoiceMonth > 12) {
          invoiceMonth = 1;
          invoiceYear++;
        }
      }

      // Get or create invoice
      let { data: invoice } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('card_id', validatedData.card_id)
        .eq('user_id', userId)
        .eq('month', invoiceMonth)
        .eq('year', invoiceYear)
        .single();

      if (!invoice) {
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('credit_card_invoices')
          .insert({
            user_id: userId,
            card_id: validatedData.card_id,
            month: invoiceMonth,
            year: invoiceYear,
            total_amount: 0,
            minimum_amount: 0,
            status: 'open'
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoice = newInvoice;
      }

      // Create the transaction
      const description = installments > 1
        ? `${validatedData.description} (${i + 1}/${installments})`
        : validatedData.description;

      const { error: txError } = await supabase
        .from('credit_card_transactions')
        .insert({
          user_id: userId,
          card_id: validatedData.card_id,
          invoice_id: invoice.id,
          amount: baseAmount,
          description: description,
          category: validatedData.category,
          date: installmentDate.toISOString().split('T')[0],
          installment_number: i + 1,
          total_installments: installments
        });

      if (txError) throw txError;

      // Update invoice total
      await supabase
        .from('credit_card_invoices')
        .update({ total_amount: Number(invoice.total_amount) + baseAmount })
        .eq('id', invoice.id)
        .eq('user_id', userId);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: installments > 1 
        ? `Compra em ${installments}x registrada no cartão!`
        : "Compra registrada no cartão!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Credit card transaction error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao registrar compra no cartão"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Handler for deleting transactions
async function handleDeleteTransaction(
  supabase: any,
  transactionId: string,
  userId: string,
  corsHeaders: any
) {
  try {
    // Get transaction details first - verify ownership
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !transaction) {
      return new Response(JSON.stringify({ 
        error: "Transação não encontrada ou acesso negado"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Revert balance change
    const balanceChange = transaction.type === 'income' 
      ? -transaction.amount 
      : transaction.amount;

    const { data: account } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', transaction.account_id)
      .eq('user_id', userId)
      .single();

    if (account) {
      await supabase
        .from('bank_accounts')
        .update({ balance: Number(account.balance) + balanceChange })
        .eq('id', transaction.account_id)
        .eq('user_id', userId);
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ 
      success: true,
      message: "Transação excluída com sucesso!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Delete transaction error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao excluir transação"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Handler for paying invoices
async function handlePayInvoice(
  supabase: any,
  transactionData: any,
  userId: string,
  corsHeaders: any
) {
  try {
    // Verify card belongs to user
    const { data: card } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', transactionData.card_id)
      .eq('user_id', userId)
      .single();

    if (!card) {
      return new Response(JSON.stringify({ 
        error: "Cartão não encontrado ou acesso negado"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find current open invoice
    const now = new Date();
    const { data: invoice } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('card_id', transactionData.card_id)
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .limit(1)
      .single();

    if (!invoice) {
      return new Response(JSON.stringify({ 
        error: "Nenhuma fatura aberta encontrada"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payAmount = transactionData.amount || invoice.total_amount;

    // Verify account belongs to user if specified
    if (transactionData.account_id) {
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', transactionData.account_id)
        .eq('user_id', userId)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ 
          error: "Conta não encontrada ou acesso negado"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update account balance
      await supabase
        .from('bank_accounts')
        .update({ balance: Number(account.balance) - payAmount })
        .eq('id', transactionData.account_id)
        .eq('user_id', userId);
    }

    // Update invoice
    const newStatus = payAmount >= invoice.total_amount ? 'paid' : 'partial';
    await supabase
      .from('credit_card_invoices')
      .update({ 
        paid_amount: payAmount,
        paid_at: new Date().toISOString(),
        status: newStatus,
        payment_account_id: transactionData.account_id
      })
      .eq('id', invoice.id)
      .eq('user_id', userId);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Fatura ${newStatus === 'paid' ? 'paga' : 'parcialmente paga'}!`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Pay invoice error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao pagar fatura"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Handler for prepaying installments
async function handlePrepayInstallments(
  supabase: any,
  transactionData: any,
  userId: string,
  corsHeaders: any
) {
  try {
    // Verify card belongs to user
    const { data: card } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', transactionData.card_id)
      .eq('user_id', userId)
      .single();

    if (!card) {
      return new Response(JSON.stringify({ 
        error: "Cartão não encontrado ou acesso negado"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      action: "prepay_installments",
      ai_response: "Para antecipar parcelas, acesse a aba de Cartões de Crédito e selecione a compra que deseja antecipar."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Prepay installments error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao antecipar parcelas"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Handler for querying financial data
async function handleQuery(
  supabase: any,
  apiKey: string,
  message: string,
  userId: string,
  accounts: any[],
  conversationHistory: any[],
  corsHeaders: any
) {
  try {
    // Fetch user's financial data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [transactionsResult, accountsResult, cardsResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]),
      supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
    ]);

    const transactions = transactionsResult.data || [];
    const userAccounts = accountsResult.data || [];
    const userCards = cardsResult.data || [];

    // Calculate summaries
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    
    const totalExpenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const totalBalance = userAccounts.reduce((sum: number, a: any) => sum + Number(a.balance), 0);

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
      });

    const financialContext = `
DADOS FINANCEIROS DO USUÁRIO (${now.toLocaleDateString('pt-BR')}):

RESUMO DO MÊS:
- Total de Receitas: R$ ${totalIncome.toFixed(2)}
- Total de Despesas: R$ ${totalExpenses.toFixed(2)}
- Saldo do Mês: R$ ${(totalIncome - totalExpenses).toFixed(2)}

SALDO TOTAL EM CONTAS: R$ ${totalBalance.toFixed(2)}

CONTAS:
${userAccounts.map((a: any) => `- ${a.name} (${a.bank_name}): R$ ${Number(a.balance).toFixed(2)}`).join('\n')}

DESPESAS POR CATEGORIA:
${Object.entries(expensesByCategory)
  .sort((a, b) => (b[1] as number) - (a[1] as number))
  .map(([cat, amount]) => `- ${cat}: R$ ${(amount as number).toFixed(2)}`)
  .join('\n')}

TRANSAÇÕES RECENTES:
${transactions.slice(-10).map((t: any) => 
  `- ${t.date}: ${t.type === 'income' ? '+' : '-'}R$ ${Number(t.amount).toFixed(2)} - ${t.category} - ${t.description || 'Sem descrição'}`
).join('\n')}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: `Você é o Fin, um assistente financeiro amigável. Responda perguntas sobre as finanças do usuário com base nos dados abaixo. Seja conversacional e forneça insights úteis.

${financialContext}` 
          },
          ...conversationHistory.slice(-10),
          { role: "user", content: message }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error("Erro ao processar consulta");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua consulta.";

    return new Response(JSON.stringify({ 
      success: true,
      action: "query_response",
      ai_response: aiResponse
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Query handler error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao consultar dados financeiros"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
