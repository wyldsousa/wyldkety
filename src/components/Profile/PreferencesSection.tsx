import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Bell, Bot, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

interface NotifPrefs {
  reminders: boolean;
  recurring: boolean;
  assistant: boolean;
}

export function PreferencesSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : { reminders: true, recurring: true, assistant: true };
  });

  const [aiEnabled, setAiEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ai_assistant_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Avoid hydration mismatch with next-themes
  useEffect(() => {
    setMounted(true);
  }, []);

  const updateNotifPref = (key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem('notification_preferences', JSON.stringify(updated));
    toast.success('Preferência de notificação atualizada');
  };

  const handleAiToggle = (enabled: boolean) => {
    setAiEnabled(enabled);
    localStorage.setItem('ai_assistant_enabled', JSON.stringify(enabled));
    toast.success(enabled ? 'Assistente IA ativado' : 'Assistente IA desativado');
  };

  if (!mounted) return null;

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Preferências
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Theme */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Tema</Label>
          </div>
          <Select value={theme || 'system'} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue placeholder="Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">☀️ Claro</SelectItem>
              <SelectItem value="dark">🌙 Escuro</SelectItem>
              <SelectItem value="system">🖥️ Automático (sistema)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tema atual: {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
            {theme === 'system' && ' (seguindo sistema)'}
          </p>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Notificações</Label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-reminders" className="text-sm text-muted-foreground">Lembretes</Label>
              <p className="text-xs text-muted-foreground/70">Notificações de vencimento</p>
            </div>
            <Switch
              id="notif-reminders"
              checked={notifPrefs.reminders}
              onCheckedChange={(v) => updateNotifPref('reminders', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-recurring" className="text-sm text-muted-foreground">Lembretes recorrentes</Label>
              <p className="text-xs text-muted-foreground/70">Avisos de recorrência automática</p>
            </div>
            <Switch
              id="notif-recurring"
              checked={notifPrefs.recurring}
              onCheckedChange={(v) => updateNotifPref('recurring', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-assistant" className="text-sm text-muted-foreground">Assistente IA</Label>
              <p className="text-xs text-muted-foreground/70">Notificações do assistente</p>
            </div>
            <Switch
              id="notif-assistant"
              checked={notifPrefs.assistant}
              onCheckedChange={(v) => updateNotifPref('assistant', v)}
            />
          </div>
        </div>

        {/* AI toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Assistente IA</Label>
            </div>
            <Switch
              id="ai-toggle"
              checked={aiEnabled}
              onCheckedChange={handleAiToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {aiEnabled
              ? 'A IA está ativa e pode registrar transações, criar lembretes e responder perguntas financeiras. Sempre pedirá confirmação antes de executar ações.'
              : 'A IA está desativada. Ative para usar o assistente financeiro.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
