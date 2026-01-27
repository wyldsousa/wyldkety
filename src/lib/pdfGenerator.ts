import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyReport } from '@/types/wallet';
import { formatCurrency } from './format';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function generateReportPDF(report: MonthlyReport, userName: string = 'Usuário') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(16, 185, 129); // Primary green
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FinanceApp', 14, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Mensal - ${MONTHS[report.month - 1]} ${report.year}`, 14, 32);
  
  // User info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Usuário: ${userName}`, 14, 55);
  doc.text(`Gerado em: ${new Date(report.generated_at).toLocaleDateString('pt-BR')}`, 14, 62);
  
  // Summary cards
  const summaryY = 75;
  
  // Income box
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(14, summaryY, 55, 30, 3, 3, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(10);
  doc.text('Receitas', 20, summaryY + 10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(report.total_income), 20, summaryY + 22);
  
  // Expense box
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(77, summaryY, 55, 30, 3, 3, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Despesas', 83, summaryY + 10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(report.total_expenses), 83, summaryY + 22);
  
  // Balance box
  const balanceColor = report.balance >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(140, summaryY, 55, 30, 3, 3, 'F');
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo', 146, summaryY + 10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(report.balance), 146, summaryY + 22);
  
  // Categories table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Despesas por Categoria', 14, summaryY + 50);
  
  const reportData = report.report_data as any;
  const categoryData = Object.entries(reportData?.byCategory || {})
    .filter(([_, values]: [string, any]) => values.expense > 0)
    .map(([category, values]: [string, any]) => [
      category,
      formatCurrency(values.expense),
      `${((values.expense / report.total_expenses) * 100).toFixed(1)}%`
    ]);
  
  if (categoryData.length > 0) {
    autoTable(doc, {
      startY: summaryY + 55,
      head: [['Categoria', 'Valor', '% do Total']],
      body: categoryData,
      theme: 'striped',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
      },
    });
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Relatório gerado automaticamente pelo FinanceApp', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Download
  doc.save(`relatorio-${MONTHS[report.month - 1].toLowerCase()}-${report.year}.pdf`);
}
