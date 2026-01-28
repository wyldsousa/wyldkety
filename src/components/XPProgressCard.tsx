import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUserProgress } from '@/hooks/useUserProgress';
import { Sparkles, Star } from 'lucide-react';

export function XPProgressCard() {
  const { progress, isLoading, getMood, getXPProgress, getLevelTitle } = useUserProgress();

  if (isLoading || !progress) {
    return null;
  }

  const mood = getMood();
  const xpProgress = getXPProgress();
  const levelTitle = getLevelTitle();

  return (
    <Card className="shadow-soft border-0 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center gap-4">
          {/* Mood Emoji */}
          <div className="relative">
            <div className="text-5xl">{mood.emoji}</div>
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
              <Star className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
            </div>
          </div>

          {/* Level & XP Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-foreground">Nível {progress.level}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {levelTitle}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${mood.color}`}>{mood.label}</span>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {xpProgress.current} XP
                </span>
                <span>{xpProgress.needed} XP</span>
              </div>
              <Progress value={xpProgress.percentage} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
