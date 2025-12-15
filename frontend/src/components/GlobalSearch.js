import { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { buscarLancamentos } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResultados([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResultados([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await buscarLancamentos(query, 1, 20);
        setResultados(data.resultados || []);
      } catch (error) {
        console.error("Erro ao buscar:", error);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  const formatarValor = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarData = (dataStr) => {
    try {
      const data = new Date(dataStr);
      return format(data, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar transações... (ex: ifood, CPFL, Ana, pix 200)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Buscando...
          </div>
        )}
        {!loading && query.length < 2 && (
          <CommandEmpty>Digite pelo menos 2 caracteres para buscar</CommandEmpty>
        )}
        {!loading && query.length >= 2 && resultados.length === 0 && (
          <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>
        )}
        {!loading && resultados.length > 0 && (
          <CommandGroup heading={`${resultados.length} resultado(s)`}>
            {resultados.map((lancamento) => (
              <CommandItem
                key={lancamento.id}
                onSelect={() => {
                  // Por enquanto só fecha, futuro: pode abrir detalhes
                  onOpenChange(false);
                }}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{lancamento.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatarData(lancamento.data)} • {lancamento.categoria}
                    {lancamento.responsavel && ` • ${lancamento.responsavel}`}
                  </div>
                </div>
                <div
                  className={`font-semibold ${
                    lancamento.tipo === "entrada"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {lancamento.tipo === "entrada" ? "+" : "-"}
                  {formatarValor(Math.abs(lancamento.valor))}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

