import { TIPO_CONFIG, ESTADO_LABELS } from '@/types/tablero';
import type { TableroItem } from '@/types/tablero';

interface TableroCardProps {
  item: TableroItem;
  onClick: (item: TableroItem) => void;
}

export function TableroCard({ item, onClick }: TableroCardProps) {
  const tipoCfg = TIPO_CONFIG[item.tipo];
  const fecha = new Date(item.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <button
      onClick={() => onClick(item)}
      className={`w-full text-left bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all cursor-pointer ${tipoCfg.border} group`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tipoCfg.badge}`}>
          {tipoCfg.icon} {tipoCfg.label}
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fecha}</span>
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight mb-1 line-clamp-2">
        {item.titulo}
      </p>
      {item.descripcion && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
          {item.descripcion}
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground font-medium">
          {item.autor_nombre}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground/60">
          {ESTADO_LABELS[item.estado]}
        </span>
      </div>
    </button>
  );
}
