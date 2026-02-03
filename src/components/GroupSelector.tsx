import { Users, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActiveGroup } from '@/contexts/ActiveGroupContext';
import { Badge } from '@/components/ui/badge';

export function GroupSelector() {
  const { 
    activeGroup, 
    activeGroupId, 
    setActiveGroupId, 
    groups, 
    isLoading 
  } = useActiveGroup();

  if (isLoading) {
    return (
      <div className="h-9 w-32 animate-pulse bg-muted rounded-md" />
    );
  }

  // If no groups, don't show selector
  if (groups.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {activeGroup ? (
            <>
              <Users className="h-4 w-4" />
              <span className="max-w-[120px] truncate">{activeGroup.name}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Pessoal</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Selecionar Contexto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => setActiveGroupId(null)}
          className={!activeGroupId ? 'bg-accent' : ''}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Finanças Pessoais</span>
          {!activeGroupId && (
            <Badge variant="secondary" className="ml-auto">
              Ativo
            </Badge>
          )}
        </DropdownMenuItem>

        {groups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Grupos Financeiros
            </DropdownMenuLabel>
          </>
        )}

        {groups.map((group) => (
          <DropdownMenuItem
            key={group.id}
            onClick={() => setActiveGroupId(group.id)}
            className={activeGroupId === group.id ? 'bg-accent' : ''}
          >
            <Users className="mr-2 h-4 w-4" />
            <span className="truncate">{group.name}</span>
            {activeGroupId === group.id && (
              <Badge variant="secondary" className="ml-auto">
                Ativo
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
