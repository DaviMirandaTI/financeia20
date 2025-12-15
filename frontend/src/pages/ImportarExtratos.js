import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadExtrato, processarImportacao, aprenderCategoria } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CategoriaDialog } from "@/components/CategoriaDialog";
import { ArrowLeft } from "lucide-react";

export default function ImportarExtratos() {
  const navigate = useNavigate();
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
      const msg = `✅ Importação concluída! Adicionadas: ${resultado.adicionadas}, Duplicadas ignoradas: ${resultado.duplicadas}.`;
      setMensagem(msg);
      
      // Limpar lista após sucesso
      if (resultado.adicionadas > 0) {
        setTimeout(() => {
          setTransacoes([]);
          setFile(null);
          setMensagem("Importação salva com sucesso! Você pode importar outro arquivo ou voltar ao Dashboard.");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setMensagem("❌ " + (err.message || "Erro ao salvar importação."));
    } finally {
      setLoadingProcessar(false);
    }
  };

  const novas = transacoes.filter((t) => !t.is_duplicada);
  const duplicadas = transacoes.filter((t) => t.is_duplicada);
  const pendentesCategoria = novas.filter((t) => !t.categoria);

  return (
    <div
      className="min-h-screen w-full flex items-start justify-center px-2 sm:px-4 py-4 sm:py-8"
      style={{
        background:
          "radial-gradient(circle at top, rgba(16,185,129,0.15), transparent 55%), #020617",
      }}
    >
      <div className="w-full max-w-5xl space-y-4 sm:space-y-6">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mb-4 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Dashboard
        </Button>
        
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
              <div className={`p-3 rounded-lg mt-2 text-sm ${
                mensagem.includes("❌") 
                  ? "bg-red-500/10 border border-red-500/30 text-red-300" 
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {mensagem}
              </div>
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
            <CardContent className="overflow-auto max-h-[60vh] sm:max-h-[420px]">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-800/90 sticky top-0 z-10 border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold text-slate-200 bg-slate-800/90">Data</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-200 bg-slate-800/90">Descrição</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-200 bg-slate-800/90">Valor</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-200 bg-slate-800/90">Tipo</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-200 bg-slate-800/90">Categoria</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-200 bg-slate-800/90">Status</th>
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
                            "border-b border-slate-700/50 transition-colors" +
                            (t.is_duplicada
                              ? " text-slate-500 bg-slate-900/60"
                              : semCategoria
                              ? " bg-amber-500/10 text-slate-200"
                              : " text-slate-100 bg-slate-900/30 hover:bg-slate-800/50")
                          }
                        >
                          <td className="px-2 sm:px-3 py-2.5 whitespace-nowrap font-mono text-slate-300 text-[11px] sm:text-xs">
                            {t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : "-"}
                          </td>
                          <td className="px-3 py-2.5 max-w-xs">
                            <div className="flex flex-col gap-1">
                              <span className="line-clamp-2 text-slate-200">{t.descricao || "-"}</span>
                              {(t.parcelas_total || t.parcela_atual) && (
                                <span className="text-[10px] text-blue-400 font-medium">
                                  {t.parcela_atual && t.parcelas_total 
                                    ? `Parcela ${t.parcela_atual}/${t.parcelas_total}`
                                    : t.parcelas_total 
                                    ? `Em ${t.parcelas_total}x`
                                    : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-semibold">
                            <span className={t.tipo === "saida" ? "text-red-400" : "text-green-400"}>
                              {t.tipo === "saida" ? "-" : "+"}{" "}
                              {t.valor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              t.tipo === "saida" 
                                ? "bg-red-500/20 text-red-300 border border-red-500/40" 
                                : "bg-green-500/20 text-green-300 border border-green-500/40"
                            }`}>
                              {t.tipo === "saida" ? "Saída" : "Entrada"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {t.categoria ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[10px] font-medium">
                                {t.categoria}
                              </span>
                            ) : semCategoria ? (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => abrirCategoria(t)}
                                className="border-amber-400/70 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] h-6 px-2 font-medium"
                              >
                                Definir
                              </Button>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {t.is_duplicada ? (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Duplicada
                              </span>
                            ) : semCategoria ? (
                              <span className="text-[10px] text-amber-400 font-medium">
                                Sem categoria
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-medium">
                                Nova
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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


