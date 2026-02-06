import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { XPProgressCard } from '@/components/XPProgressCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Default colors for categories without custom colors
const DEFAULT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

export default function Dashboard() {
  const { totalBalance, totalInvestments, accounts } = useBankAccounts();
  const { transactions, monthlyIncome, monthlyExpenses, getMonthlyTotals } = useTransactions();
  const { categories } = useCategories();

  // Create a color map for categories
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      if (cat.color) {
        map[cat.name] = cat.color;
      }
    });
    return map;
  }, [categories]);

  // Prepare chart data for the last 30 days
  const areaChartData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => t.date === dayStr);
      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        receitas: income,
        despesas: expenses,
      };
    });
  }, [transactions]);

  // Prepare expense categories data with custom colors
  const categoryData = useMemo(() => {
    const categoriesMap: Record<string, { value: number; color: string }> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach((t, index) => {
        if (!categoriesMap[t.category]) {
          categoriesMap[t.category] = { 
            value: 0, 
            color: categoryColorMap[t.category] || DEFAULT_COLORS[Object.keys(categoriesMap).length % DEFAULT_COLORS.length]
          };
        }
        categoriesMap[t.category].value += Number(t.amount);
      });
    
    return Object.entries(categoriesMap)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, categoryColorMap]);

  // Monthly comparison data
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const monthKey = format(parseISO(t.date), 'MMM', { locale: ptBR });
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        months[monthKey].income += Number(t.amount);
      } else if (t.type === 'expense') {
        months[monthKey].expense += Number(t.amount);
      }
    });

    return Object.entries(months)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);
  }, [transactions]);

  const stats = [
    { title: 'Saldo Total', value: totalBalance, icon: Wallet, color: 'primary' },
    { title: 'Receitas do Mês', value: monthlyIncome, icon: TrendingUp, color: 'income' },
    { title: 'Despesas do Mês', value: monthlyExpenses, icon: TrendingDown, color: 'expense' },
    { title: 'Investimentos', value: totalInvestments, icon: PiggyBank, color: 'investment' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>
      {/* XP Progress Card */}
      <XPProgressCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-soft border-0">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 lg:p-3 rounded-xl ${
                  stat.color === 'primary' ? 'gradient-primary' :
                  stat.color === 'income' ? 'gradient-income' :
                  stat.color === 'expense' ? 'gradient-expense' :
                  'gradient-investment'
                }`}>
                  <stat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-lg lg:text-xl font-bold text-foreground truncate">
                    {formatCurrency(stat.value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Area Chart */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="receitas" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#colorReceitas)" />
                  <Area type="monotone" dataKey="despesas" stroke="hsl(0, 72%, 51%)" fillOpacity={1} fill="url(#colorDespesas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart with custom category colors */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhuma despesa registrada
                </div>
              )}
            </div>
            {categoryData.length > 0 && (
              <div className="mt-4 space-y-2">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="text-lg">Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="income" name="Receitas" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">{t.category}</p>
                    {t.description && (
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    )}
                  </div>
                  <span className={`font-semibold ${
                    t.type === 'income' ? 'text-income' : 
                    t.type === 'expense' ? 'text-expense' : 
                    'text-transfer'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação registrada ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
