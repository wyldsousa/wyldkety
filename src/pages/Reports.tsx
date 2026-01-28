import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Download, RefreshCw, TrendingUp, TrendingDown, Calendar, Trash2, Wallet, PiggyBank } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/format';
import { generateReportPDF } from '@/lib/pdfGenerator';
import { useProfile } from '@/hooks/useProfile';
import { MonthlyReport } from '@/types/app';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export default function Reports() {
  const { reports, isLoading, generateReport, deleteReport } = useReports();
  const { profile } = useProfile();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const handleGenerateReport = () => {
    generateReport.mutate({ month: selectedMonth, year: selectedYear });
  };

  const handleDownloadPDF = (report: MonthlyReport) => {
    generateReportPDF(report, profile?.full_name || 'Usuário');
  };

  const handleDeleteReport = (id: string) => {
    deleteReport.mutate(id);
  };

  const getReportData = (report: MonthlyReport) => {
    const data = report.report_data as any;
    return {
      accountBalances: data?.accountBalances ?? 0,
      investedBalance: data?.investedBalance ?? 0,
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Gere e baixe relatórios mensais</p>
      </div>

      {/* Generate Report */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Gerar Novo Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Mês</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Ano</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerateReport} 
              disabled={generateReport.isPending}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generateReport.isPending ? 'animate-spin' : ''}`} />
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Relatórios Gerados</h2>
        
        {isLoading ? (
          <Card className="shadow-soft border-0">
            <CardContent className="p-6 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="shadow-soft border-0">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum relatório gerado ainda. Selecione um mês e clique em "Gerar Relatório".
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => {
              const { accountBalances, investedBalance } = getReportData(report);
              return (
                <Card key={report.id} className="shadow-soft border-0">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {MONTHS.find(m => m.value === report.month)?.label} {report.year}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Gerado em {new Date(report.generated_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleDownloadPDF(report)}
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteReport(report.id)} 
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-muted-foreground">Receitas</span>
                          </div>
                          <span className="font-semibold text-green-600">{formatCurrency(report.total_income)}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-muted-foreground">Despesas</span>
                          </div>
                          <span className="font-semibold text-red-600">{formatCurrency(report.total_expenses)}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Saldo Contas</span>
                          </div>
                          <span className="font-semibold text-foreground">{formatCurrency(accountBalances)}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <PiggyBank className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-muted-foreground">Investido</span>
                          </div>
                          <span className="font-semibold text-purple-600">{formatCurrency(investedBalance)}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-primary/10">
                          <div className="text-xs text-muted-foreground mb-1">Balanço</div>
                          <Badge 
                            variant={report.balance >= 0 ? 'default' : 'destructive'}
                            className="text-sm"
                          >
                            {formatCurrency(report.balance)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
