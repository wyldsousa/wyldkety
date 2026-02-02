export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-4">Última atualização: 02 de Fevereiro de 2026</p>
        
        <div className="prose prose-sm dark:prose-invert space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introdução</h2>
            <p className="text-muted-foreground">
              O FinanceApp ("nós", "nosso" ou "aplicativo") está comprometido em proteger sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações pessoais 
              quando você utiliza nosso aplicativo de controle financeiro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground">Coletamos as seguintes informações:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Informações de conta:</strong> Nome, email e telefone (opcional)</li>
              <li><strong>Dados financeiros:</strong> Transações, contas bancárias, cartões de crédito, categorias e lembretes que você cadastra</li>
              <li><strong>Dados de uso:</strong> Como você interage com o aplicativo para melhorar sua experiência</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Como Usamos suas Informações</h2>
            <p className="text-muted-foreground">Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Fornecer e manter o serviço de controle financeiro</li>
              <li>Gerar relatórios e análises financeiras personalizadas</li>
              <li>Sincronizar dados entre dispositivos</li>
              <li>Permitir compartilhamento seguro com membros do seu grupo financeiro</li>
              <li>Enviar notificações sobre lembretes e faturas</li>
              <li>Melhorar e personalizar sua experiência no aplicativo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground">
              Seus dados financeiros são compartilhados apenas com membros autorizados do seu grupo financeiro 
              (como cônjuge ou familiares que você convidar). Não vendemos, alugamos ou compartilhamos suas 
              informações pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Autenticação segura com senhas fortes</li>
              <li>Controle de acesso baseado em permissões (Row Level Security)</li>
              <li>Isolamento completo entre grupos financeiros diferentes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Seus Direitos</h2>
            <p className="text-muted-foreground">Você tem direito a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir informações incorretas</li>
              <li>Exportar seus dados financeiros</li>
              <li>Solicitar exclusão de sua conta e dados</li>
              <li>Revogar acesso de membros do seu grupo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Retenção de Dados</h2>
            <p className="text-muted-foreground">
              Mantemos seus dados enquanto sua conta estiver ativa. Se você solicitar a exclusão da conta, 
              seus dados serão removidos permanentemente dentro de 30 dias, exceto quando a retenção for 
              necessária por obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Menores de Idade</h2>
            <p className="text-muted-foreground">
              O FinanceApp não é destinado a menores de 18 anos. Não coletamos intencionalmente informações 
              de menores de idade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Alterações nesta Política</h2>
            <p className="text-muted-foreground">
              Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas 
              através do aplicativo ou por email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Contato</h2>
            <p className="text-muted-foreground">
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco através 
              do email de suporte disponível no aplicativo.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t">
          <a href="/" className="text-primary hover:underline">← Voltar ao aplicativo</a>
        </div>
      </div>
    </div>
  );
}
