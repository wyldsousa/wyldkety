import { validatePassword, getStrengthColor, getStrengthLabel } from '@/lib/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showErrors?: boolean;
}

export function PasswordStrengthIndicator({ password, showErrors = true }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { errors, strength } = validatePassword(password);
  const strengthColor = getStrengthColor(strength);
  const strengthLabel = getStrengthLabel(strength);

  const strengthWidth = strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strengthColor)}
            style={{ width: strengthWidth }}
          />
        </div>
        <span className={cn(
          "text-xs font-medium",
          strength === 'weak' && 'text-destructive',
          strength === 'medium' && 'text-yellow-600',
          strength === 'strong' && 'text-green-600',
        )}>
          {strengthLabel}
        </span>
      </div>
      
      {showErrors && errors.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-destructive">•</span>
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
