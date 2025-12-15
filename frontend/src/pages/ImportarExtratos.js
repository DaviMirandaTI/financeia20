import { useState } from "react";
import { uploadExtrato, processarImportacao, aprenderCategoria } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CategoriaDialog } from "@/components/CategoriaDialog";

export default function ImportarExtratos() {
  const [file, setFile] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingProcessar, setLoadingProcessar] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoadingUpload(true);
    setMensagem(null);
    try {
      const data = await uploadExtrato(file);
      setTransacoes(data || []);
      if (!data || data.length === 0) {
        setMensagem("Nenhuma transação encontrada no arquivo.");
      }
    } catch (err) {
      console.error(err);
      setMensagem(err.message || "Erro ao processar extrato.");
    } finally {
      setLoadingUpload(false);
    }
  };

  const abrirCategoria = (t) => {
    setSelecionada(t);
    setDialogOpen(true);
  };

  const confirmarCategoria = async ({ categoria, aplicarSimilares }) => {
    if (!selecionada) return;

    // atualiza na lista local
    const atualizadas = transacoes.map((t) =>
      t.id === selecionada.id ? { ...t, categoria } : t
    );
    setTransacoes(atualizadas);
    setDialogOpen(false);

    if (aplicarSimilares) {
      try {
        await aprenderCategoria({
          descricao_padrao: selecionada.descricao,
          categoria,
          tipo_match: "substring",
        });
      } catch (err) {
        console.error("Erro ao salvar regra de categoria:", err);
      }
    }
  };

  const handleProcessar = async () => {
    if (!transacoes.length) return;
    setLoadingProcessar(true);
    setMensagem(null);
    try {
      const resultado = await processarImportacao(transacoes);
      setMensagem(
        `Importação concluída. Adicionadas: ${resultado.adicionadas}, Duplicadas ignoradas: ${resultado.duplicadas}.`
      );
    } catch (err) {
      console.error(err);
      setMensagem(err.message || "Erro ao salvar importação.");
    } finally {
      setLoadingProcessar(false);
    }
  };

  const novas = transacoes.filter((t) => !t.is_duplicada);
  const duplicadas = transacoes.filter((t) => t.is_duplicada);
  const pendentesCategoria = novas.filter((t) => !t.categoria);

  return (
    <div
      className="min-h-screen w-full flex items-start justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(circle at top, rgba(16,185,129,0.15), transparent 55%), #020617",
      }}
    >
      <div className="w-full max-w-5xl space-y-6">
        <Card className="bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-50 text-xl">
              Importar extratos bancários
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Envie extratos em CSV/PDF (Inter, Nubank). O sistema ignora o que
              já existe e só adiciona o que estiver faltando.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="file"
                accept=".csv,application/pdf,text/csv"
                onChange={handleFileChange}
                className="text-xs text-slate-200"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || loadingUpload}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950"
              >
                {loadingUpload ? "Processando..." : "Ler extrato"}
              </Button>
            </div>
            {mensagem && (
              <p className="text-xs text-emerald-400 mt-1">{mensagem}</p>
            )}
            {!!transacoes.length && (
              <div className="flex flex-wrap gap-4 text-xs text-slate-300 mt-2">
                <span>
                  Total lido:{" "}
                  <span className="text-slate-50 font-semibold">
                    {transacoes.length}
                  </span>
                </span>
                <span>
                  Novas:{" "}
                  <span className="text-emerald-400 font-semibold">
                    {novas.length}
                  </span>
                </span>
                <span>
                  Duplicadas:{" "}
                  <span className="text-slate-500 font-semibold">
                    {duplicadas.length}
                  </span>
                </span>
                <span>
                  Sem categoria:{" "}
                  <span className="text-amber-400 font-semibold">
                    {pendentesCategoria.length}
                  </span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {!!transacoes.length && (
          <Card className="bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-50 text-base">
                  Pré-visualização das transações
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Verde = novas / Cinza = duplicadas / Amarelo = precisa de
                  categoria
                </p>
              </div>
              <Button
                onClick={handleProcessar}
                disabled={loadingProcessar || !novas.length}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950"
              >
                {loadingProcessar ? "Salvando..." : "Processar importação"}
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[420px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900/80 sticky top-0 z-10">
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Categoria</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((t) => {
                    const nova = !t.is_duplicada;
                    const semCategoria = nova && !t.categoria;
                    return (
                      <tr
                        key={t.id}
                        className={
                          "border-t border-slate-800/70" +
                          (t.is_duplicada
                            ? " text-slate-500 bg-slate-900/40"
                            : semCategoria
                            ? " bg-amber-500/5"
                            : " text-slate-100")
                        }
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.data}
                        </td>
                        <td className="px-3 py-2 max-w-xs">
                          <span className="line-clamp-2">{t.descricao}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.tipo === "saida" ? "-" : "+"}{" "}
                          {t.valor.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.tipo === "saida" ? "Saída" : "Entrada"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.categoria ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 text-[11px]">
                              {t.categoria}
                            </span>
                          ) : semCategoria ? (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => abrirCategoria(t)}
                              className="border-amber-400/60 text-amber-300 bg-transparent hover:bg-amber-500/10 text-[11px] h-6 px-2"
                            >
                              Definir
                            </Button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.is_duplicada ? (
                            <span className="text-[11px] text-slate-400">
                              Duplicada (ignorará)
                            </span>
                          ) : semCategoria ? (
                            <span className="text-[11px] text-amber-400">
                              Sem categoria
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-400">
                              Nova
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <CategoriaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          transacao={selecionada}
          onConfirm={confirmarCategoria}
        />
      </div>
    </div>
  );
}


