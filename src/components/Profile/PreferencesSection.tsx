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
  const { theme, setTheme } = useTheme();

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : { reminders: true, recurring: true, assistant: true };
  });

  const updateNotifPref = (key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem('notification_preferences', JSON.stringify(updated));
    toast.success('Preferência atualizada');
  };

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
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="system">Automático</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Notificações</Label>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notif-reminders" className="text-sm text-muted-foreground">Lembretes</Label>
            <Switch
              id="notif-reminders"
              checked={notifPrefs.reminders}
              onCheckedChange={(v) => updateNotifPref('reminders', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notif-recurring" className="text-sm text-muted-foreground">Lembretes recorrentes</Label>
            <Switch
              id="notif-recurring"
              checked={notifPrefs.recurring}
              onCheckedChange={(v) => updateNotifPref('recurring', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notif-assistant" className="text-sm text-muted-foreground">Assistente IA</Label>
            <Switch
              id="notif-assistant"
              checked={notifPrefs.assistant}
              onCheckedChange={(v) => updateNotifPref('assistant', v)}
            />
          </div>
        </div>

        {/* AI toggle */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Assistente IA</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            A IA respeita seus dados reais e solicita confirmação antes de executar ações financeiras. Quando não possuir dados suficientes, informará suas limitações.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
