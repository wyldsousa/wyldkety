import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to parse relative dates
function parseRelativeDate(dateStr: string): string {
  const today = new Date();
  const lower = dateStr.toLowerCase().trim();
  
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
    const result = new Date(today.getFullYear(), today.getMonth(), day);
    return result.toISOString().split('T')[0];
  }
  
  return today.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      accounts, 
      cards,
      categories,
      action,
      userId,
      transactionData,
      conversationHistory = []
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle direct actions
    if (action === 'confirm_transaction' && transactionData && userId) {
      return await handleConfirmTransaction(supabase, transactionData, userId, corsHeaders);
    }

    if (action === 'confirm_credit_card_transaction' && transactionData && userId) {
      return await handleCreditCardTransaction(supabase, transactionData, userId, corsHeaders);
    }

    if (action === 'delete_transaction' && transactionData?.id && userId) {
      return await handleDeleteTransaction(supabase, transactionData.id, userId, corsHeaders);
    }

    if (action === 'query' && userId) {
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

REGRAS IMPORTANTES:
- SEMPRE seja amigável e conversacional
- Para transações, SEMPRE use a função apropriada
- Para perguntas/consultas, use a função query_finances
- Detecte o INTENT do usuário corretamente

CONTEXTO DO USUÁRIO:
Contas disponíveis:
${accounts?.map((a: any) => `- ${a.name} (${a.bank_name}): ID "${a.id}"`).join('\n') || 'Nenhuma conta cadastrada'}

Cartões de crédito disponíveis:
${cards?.map((c: any) => `- ${c.name} (${c.bank_name}): ID "${c.id}"`).join('\n') || 'Nenhum cartão cadastrado'}

Categorias de receita: ${categories?.income?.join(', ') || 'Salário, Freelance, Investimentos, Outros'}
Categorias de despesa: ${categories?.expense?.join(', ') || 'Alimentação, Transporte, Moradia, Contas, Lazer, Saúde, Educação, Outros'}

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
    const transactions = [];
    const installments = transactionData.installments || 1;
    const baseAmount = transactionData.amount / installments;
    const baseDate = new Date(transactionData.date || new Date());

    // Create installments if more than 1
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(installmentDate.getMonth() + i);
      
      const description = installments > 1 
        ? `${transactionData.description} (${i + 1}/${installments})`
        : transactionData.description;

      transactions.push({
        user_id: userId,
        account_id: transactionData.account_id,
        type: transactionData.type,
        amount: baseAmount,
        category: transactionData.category,
        description: description,
        date: installmentDate.toISOString().split('T')[0],
        transfer_to_account_id: transactionData.transfer_to_account_id || null
      });
    }

    // Insert all transactions
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactions)
      .select();

    if (error) throw error;

    // Update account balance
    const totalAmount = transactionData.type === 'income' 
      ? transactionData.amount 
      : -transactionData.amount;

    const { data: account } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', transactionData.account_id)
      .single();

    if (account) {
      await supabase
        .from('bank_accounts')
        .update({ balance: Number(account.balance) + totalAmount })
        .eq('id', transactionData.account_id);
    }

    // Handle transfer destination
    if (transactionData.transfer_to_account_id) {
      const { data: destAccount } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', transactionData.transfer_to_account_id)
        .single();

      if (destAccount) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(destAccount.balance) + transactionData.amount })
          .eq('id', transactionData.transfer_to_account_id);
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
    const installments = transactionData.installments || 1;
    const baseAmount = transactionData.amount / installments;
    const baseDate = new Date(transactionData.date || new Date());

    // Get card info for invoice calculation
    const { data: card } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', transactionData.card_id)
      .single();

    if (!card) throw new Error("Cartão não encontrado");

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
        .eq('card_id', transactionData.card_id)
        .eq('month', invoiceMonth)
        .eq('year', invoiceYear)
        .single();

      if (!invoice) {
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('credit_card_invoices')
          .insert({
            user_id: userId,
            card_id: transactionData.card_id,
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
        ? `${transactionData.description} (${i + 1}/${installments})`
        : transactionData.description;

      const { error: txError } = await supabase
        .from('credit_card_transactions')
        .insert({
          user_id: userId,
          card_id: transactionData.card_id,
          invoice_id: invoice.id,
          amount: baseAmount,
          description: description,
          category: transactionData.category,
          date: installmentDate.toISOString().split('T')[0],
          installment_number: i + 1,
          total_installments: installments
        });

      if (txError) throw txError;

      // Update invoice total
      await supabase
        .from('credit_card_invoices')
        .update({ total_amount: Number(invoice.total_amount) + baseAmount })
        .eq('id', invoice.id);
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
    // Get transaction details first
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transação não encontrada");
    }

    // Revert balance
    const balanceChange = transaction.type === 'income' 
      ? -Number(transaction.amount)
      : Number(transaction.amount);

    const { data: account } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', transaction.account_id)
      .single();

    if (account) {
      await supabase
        .from('bank_accounts')
        .update({ balance: Number(account.balance) + balanceChange })
        .eq('id', transaction.account_id);
    }

    // Delete transaction
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

// Handler for financial queries
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
    // Get current month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false });

    if (error) throw error;

    // Calculate summaries
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpenses;

    // Group by category
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
      });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Get account balances
    const { data: accountData } = await supabase
      .from('bank_accounts')
      .select('name, balance, bank_name')
      .eq('user_id', userId);

    const totalBalance = accountData?.reduce((sum: number, a: any) => sum + Number(a.balance), 0) || 0;

    // Get credit card info
    const { data: cardData } = await supabase
      .from('credit_cards')
      .select('name, credit_limit')
      .eq('user_id', userId);

    const { data: invoiceData } = await supabase
      .from('credit_card_invoices')
      .select('total_amount, status')
      .eq('user_id', userId)
      .in('status', ['open', 'closed']);

    const totalCreditUsed = invoiceData?.reduce((sum: number, i: any) => sum + Number(i.total_amount), 0) || 0;

    // Get reminders
    const { data: reminders } = await supabase
      .from('reminders')
      .select('title, amount, due_date, is_completed')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
      .limit(5);

    // Build context for AI
    const financialContext = `
DADOS FINANCEIROS DO USUÁRIO (${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}):

Receitas do mês: R$ ${totalIncome.toFixed(2)}
Despesas do mês: R$ ${totalExpenses.toFixed(2)}
Saldo do mês: R$ ${balance.toFixed(2)}

Saldo total em contas: R$ ${totalBalance.toFixed(2)}

Contas:
${accountData?.map((a: any) => `- ${a.name} (${a.bank_name}): R$ ${Number(a.balance).toFixed(2)}`).join('\n') || 'Nenhuma conta'}

Cartões de crédito:
${cardData?.map((c: any) => `- ${c.name}: Limite R$ ${Number(c.credit_limit).toFixed(2)}`).join('\n') || 'Nenhum cartão'}
Total usado nos cartões: R$ ${totalCreditUsed.toFixed(2)}

Lembretes pendentes:
${reminders?.map((r: any) => `- ${r.title}${r.amount ? ': R$ ' + Number(r.amount).toFixed(2) : ''}${r.due_date ? ' (vence ' + new Date(r.due_date).toLocaleDateString('pt-BR') + ')' : ''}`).join('\n') || 'Nenhum lembrete'}

Top 5 categorias de gastos:
${topCategories.map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)}`).join('\n') || 'Sem gastos'}

Últimas 10 transações:
${transactions.slice(0, 10).map((t: any) => 
  `- ${t.date}: ${t.type === 'income' ? '+' : '-'}R$ ${Number(t.amount).toFixed(2)} - ${t.description || t.category}`
).join('\n') || 'Sem transações'}
`;

    // Send to AI for natural response
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
            content: `Você é Fin, um assistente financeiro amigável. Responda perguntas sobre finanças usando os dados reais fornecidos. Seja conciso, útil e use emojis ocasionalmente. Formate valores em Reais.

${financialContext}`
          },
          ...conversationHistory.slice(-6),
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) throw new Error("AI query failed");

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ 
      success: true,
      action: "query_response",
      ai_response: aiResponse,
      data: {
        totalIncome,
        totalExpenses,
        balance,
        totalBalance,
        topCategories
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Query error:", error);
    return new Response(JSON.stringify({ 
      error: "Erro ao consultar dados"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
