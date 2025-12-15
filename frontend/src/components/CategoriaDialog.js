import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function CategoriaDialog({ open, onOpenChange, transacao, onConfirm }) {
  const [categoria, setCategoria] = useState(transacao?.categoria || "");
  const [aplicarSimilares, setAplicarSimilares] = useState(true);

  const handleConfirm = () => {
    if (!categoria.trim()) return;
    onConfirm({
      categoria: categoria.trim(),
      aplicarSimilares,
    });
    setCategoria("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900/90 border border-slate-700 text-slate-50">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Definir categoria</DialogTitle>
        </DialogHeader>
        {transacao && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">Descrição</p>
              <p className="text-sm text-slate-100 line-clamp-3">{transacao.descricao}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-slate-300 mb-1 block">Categoria</Label>
                <Input
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Aluguel, Mercado, Luz..."
                  className="bg-slate-900/60 border-slate-700 text-slate-50"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={aplicarSimilares}
                onChange={(e) => setAplicarSimilares(e.target.checked)}
                className="accent-emerald-500"
              />
              Aplicar esta categoria para descrições parecidas no futuro
            </label>
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="border border-slate-700 bg-transparent hover:bg-slate-800/80"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


