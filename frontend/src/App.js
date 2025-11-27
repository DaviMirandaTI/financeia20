import { useState, useEffect, useMemo } from "react";
import "@/App.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Menu, X, TrendingUp, TrendingDown, Wallet, Calendar, Target, PieChart, Download, Upload, LayoutDashboard, Receipt, Repeat, Zap, DollarSign } from "lucide-react";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");
  
  // Data states
  const [lancamentos, setLancamentos] = useState([]);
  const [fixos, setFixos] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  
  // Filter states
  const [periodoTipo, setPeriodoTipo] = useState("mes");
  const [periodoMes, setPeriodoMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [periodoAno, setPeriodoAno] = useState(new Date().getFullYear().toString());
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  
  // Dialog states
  const [showLancamentoDialog, setShowLancamentoDialog] = useState(false);
  const [showFixoDialog, setShowFixoDialog] = useState(false);
  const [showInvestimentoDialog, setShowInvestimentoDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Load data from localStorage
  useEffect(() => {
    const savedLancamentos = localStorage.getItem('fs_lancamentos');
    const savedFixos = localStorage.getItem('fs_fixos');
    const savedInvestimentos = localStorage.getItem('fs_investimentos');
    
    if (savedLancamentos) setLancamentos(JSON.parse(savedLancamentos));
    if (savedFixos) setFixos(JSON.parse(savedFixos));
    if (savedInvestimentos) setInvestimentos(JSON.parse(savedInvestimentos));
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('fs_lancamentos', JSON.stringify(lancamentos));
  }, [lancamentos]);

  useEffect(() => {
    localStorage.setItem('fs_fixos', JSON.stringify(fixos));
  }, [fixos]);

  useEffect(() => {
    localStorage.setItem('fs_investimentos', JSON.stringify(investimentos));
  }, [investimentos]);

  // Auto-generate lancamentos from fixos
  useEffect(() => {
    if (periodoTipo === "mes" && periodoMes) {
      gerarLancamentosDoMes(periodoMes);
    }
  }, [fixos, periodoMes, periodoTipo]);

  const gerarLancamentosDoMes = (mesSelecionado) => {
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const fixosAtivos = fixos.filter(f => {
      if (!f.ativo) return false;
      const [anoInicio, mesInicio] = f.mesInicio.split('-').map(Number);
      if (ano < anoInicio || (ano === anoInicio && mes < mesInicio)) return false;
      if (f.mesFim) {
        const [anoFim, mesFim] = f.mesFim.split('-').map(Number);
        if (ano > anoFim || (ano === anoFim && mes > mesFim)) return false;
      }
      return true;
    });

    fixosAtivos.forEach(fixo => {
      const diaValido = Math.min(fixo.diaVencimento, new Date(ano, mes, 0).getDate());
      const dataLancamento = `${ano}-${String(mes).padStart(2, '0')}-${String(diaValido).padStart(2, '0')}`;
      
      const jaExiste = lancamentos.some(l => 
        l.origem === 'fixo' && 
        l.descricao === fixo.descricao && 
        l.data.startsWith(mesSelecionado)
      );

      if (!jaExiste) {
        const novoLancamento = {
          id: crypto.randomUUID(),
          data: dataLancamento,
          descricao: fixo.descricao,
          categoria: fixo.categoria,
          tipo: fixo.tipo,
          valor: fixo.valor,
          forma: 'boleto',
          origem: 'fixo',
          observacao: `Gerado automaticamente de: ${fixo.descricao}`
        };
        setLancamentos(prev => [...prev, novoLancamento]);
      }
    });
  };

  // Filter lancamentos by period
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (periodoTipo === "mes") {
        return l.data.startsWith(periodoMes);
      } else if (periodoTipo === "ano") {
        return l.data.startsWith(periodoAno);
      } else if (periodoTipo === "intervalo" && periodoInicio && periodoFim) {
        return l.data >= periodoInicio && l.data <= periodoFim;
      }
      return true;
    });
  }, [lancamentos, periodoTipo, periodoMes, periodoAno, periodoInicio, periodoFim]);

  // Filter investimentos by period
  const investimentosFiltrados = useMemo(() => {
    return investimentos.filter(inv => {
      if (periodoTipo === "mes") {
        return inv.data.startsWith(periodoMes);
      } else if (periodoTipo === "ano") {
        return inv.data.startsWith(periodoAno);
      } else if (periodoTipo === "intervalo" && periodoInicio && periodoFim) {
        return inv.data >= periodoInicio && inv.data <= periodoFim;
      }
      return true;
    });
  }, [investimentos, periodoTipo, periodoMes, periodoAno, periodoInicio, periodoFim]);

  // Calculate dashboard stats
  const stats = useMemo(() => {
    const renda = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((sum, l) => sum + l.valor, 0);
    const despesas = lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((sum, l) => sum + l.valor, 0);
    const resultado = renda - despesas;
    const totalInvestido = investimentosFiltrados.reduce((sum, inv) => sum + inv.valor, 0);
    
    const categorias = {};
    lancamentosFiltrados.filter(l => l.tipo === 'saida').forEach(l => {
      categorias[l.categoria] = (categorias[l.categoria] || 0) + l.valor;
    });

    return { renda, despesas, resultado, totalInvestido, categorias };
  }, [lancamentosFiltrados, investimentosFiltrados]);

  // Backup & Restore
  const handleBackup = () => {
    const data = {
      lancamentos,
      fixos,
      investimentos
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finsystem-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success("Backup realizado com sucesso!");
  };

  const handleRestore = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (window.confirm("Isso irá sobrescrever todos os dados. Continuar?")) {
            setLancamentos(data.lancamentos || []);
            setFixos(data.fixos || []);
            setInvestimentos(data.investimentos || []);
            toast.success("Dados restaurados com sucesso!");
          }
        } catch (error) {
          toast.error("Erro ao importar arquivo");
        }
      };
      reader.readAsText(file);
    }
  };

  // CRUD Lancamentos
  const salvarLancamento = (formData) => {
    if (editingItem) {
      setLancamentos(prev => prev.map(l => l.id === editingItem.id ? { ...formData, id: editingItem.id } : l));
      toast.success("Lançamento atualizado!");
    } else {
      setLancamentos(prev => [...prev, { ...formData, id: crypto.randomUUID(), origem: 'manual' }]);
      toast.success("Lançamento criado!");
    }
    setShowLancamentoDialog(false);
    setEditingItem(null);
  };

  const deletarLancamento = (id) => {
    if (window.confirm("Deseja realmente excluir?")) {
      setLancamentos(prev => prev.filter(l => l.id !== id));
      toast.success("Lançamento excluído!");
    }
  };

  // CRUD Fixos
  const salvarFixo = (formData) => {
    if (editingItem) {
      setFixos(prev => prev.map(f => f.id === editingItem.id ? { ...formData, id: editingItem.id } : f));
      toast.success("Fixo atualizado!");
    } else {
      setFixos(prev => [...prev, { ...formData, id: crypto.randomUUID() }]);
      toast.success("Fixo criado!");
    }
    setShowFixoDialog(false);
    setEditingItem(null);
  };

  const deletarFixo = (id) => {
    if (window.confirm("Deseja realmente excluir?")) {
      setFixos(prev => prev.filter(f => f.id !== id));
      toast.success("Fixo excluído!");
    }
  };

  // CRUD Investimentos
  const salvarInvestimento = (formData) => {
    if (editingItem) {
      setInvestimentos(prev => prev.map(inv => inv.id === editingItem.id ? { ...formData, id: editingItem.id } : inv));
      toast.success("Investimento atualizado!");
    } else {
      setInvestimentos(prev => [...prev, { ...formData, id: crypto.randomUUID() }]);
      toast.success("Investimento criado!");
    }
    setShowInvestimentoDialog(false);
    setEditingItem(null);
  };

  const deletarInvestimento = (id) => {
    if (window.confirm("Deseja realmente excluir?")) {
      setInvestimentos(prev => prev.filter(inv => inv.id !== id));
      toast.success("Investimento excluído!");
    }
  };

  // Pagamento Inteligente Algorithm
  const calcularPagamentoInteligente = () => {
    const mesAtual = periodoTipo === "mes" ? periodoMes : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const rendas = fixos
      .filter(f => f.ativo && f.tipo === 'entrada')
      .filter(f => {
        const [anoInicio, mesInicio] = f.mesInicio.split('-').map(Number);
        const [anoAtual, mesAtualNum] = mesAtual.split('-').map(Number);
        if (anoAtual < anoInicio || (anoAtual === anoInicio && mesAtualNum < mesInicio)) return false;
        if (f.mesFim) {
          const [anoFim, mesFim] = f.mesFim.split('-').map(Number);
          if (anoAtual > anoFim || (anoAtual === anoFim && mesAtualNum > mesFim)) return false;
        }
        return true;
      })
      .map(f => ({
        descricao: f.descricao,
        dia: f.diaVencimento,
        valor: f.valor,
        saldo: f.valor
      }))
      .sort((a, b) => a.dia - b.dia);

    const despesas = fixos
      .filter(f => f.ativo && f.tipo === 'saida')
      .filter(f => {
        const [anoInicio, mesInicio] = f.mesInicio.split('-').map(Number);
        const [anoAtual, mesAtualNum] = mesAtual.split('-').map(Number);
        if (anoAtual < anoInicio || (anoAtual === anoInicio && mesAtualNum < mesInicio)) return false;
        if (f.mesFim) {
          const [anoFim, mesFim] = f.mesFim.split('-').map(Number);
          if (anoAtual > anoFim || (anoAtual === anoFim && mesAtualNum > mesFim)) return false;
        }
        return true;
      })
      .map(f => ({
        descricao: f.descricao,
        diaVencimento: f.diaVencimento,
        valor: f.valor,
        categoria: f.categoria
      }))
      .sort((a, b) => a.diaVencimento - b.diaVencimento);

    const distribuicao = [];
    
    despesas.forEach(desp => {
      let rendaUsada = rendas.find(r => r.dia <= desp.diaVencimento && r.saldo >= desp.valor);
      
      if (!rendaUsada) {
        rendaUsada = rendas.find(r => r.saldo >= desp.valor);
      }
      
      if (!rendaUsada) {
        rendaUsada = rendas[0];
      }

      const aviso = rendaUsada && rendaUsada.dia <= desp.diaVencimento ? "✅ Ok" : "⚠ Paga depois";
      
      if (rendaUsada) {
        rendaUsada.saldo -= desp.valor;
      }

      distribuicao.push({
        despesa: desp.descricao,
        vencimento: desp.diaVencimento,
        valor: desp.valor,
        pagarCom: rendaUsada ? rendaUsada.descricao : "Sem renda",
        diaRenda: rendaUsada ? rendaUsada.dia : "-",
        aviso
      });
    });

    const totalRendas = rendas.reduce((sum, r) => sum + r.valor, 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
    const saldoFinal = totalRendas - totalDespesas;

    let analise = "";
    if (saldoFinal >= 1000) {
      analise = "✅ Mês saudável. Dá pra pensar em investir ou comprar algo planejado.";
    } else if (saldoFinal > 0) {
      analise = "⚠ Mês apertado. Qualquer gasto extra vai bater no cartão ou nos investimentos.";
    } else {
      analise = "❌ Mês no vermelho. Ideal cortar gastos variáveis ou renegociar contas.";
    }

    return { rendas, distribuicao, totalRendas, totalDespesas, saldoFinal, analise };
  };

  const pagamentoInteligente = useMemo(() => calcularPagamentoInteligente(), [fixos, periodoMes]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Wallet className="logo-icon" />
            {sidebarOpen && <span className="logo-text">FinSystem</span>}
          </div>
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="menu-toggle-btn">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setCurrentView('dashboard')}
            data-testid="nav-dashboard-btn"
          >
            <LayoutDashboard size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'lancamentos' ? 'active' : ''}`} 
            onClick={() => setCurrentView('lancamentos')}
            data-testid="nav-lancamentos-btn"
          >
            <Receipt size={20} />
            {sidebarOpen && <span>Lançamentos</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'fixos' ? 'active' : ''}`} 
            onClick={() => setCurrentView('fixos')}
            data-testid="nav-fixos-btn"
          >
            <Repeat size={20} />
            {sidebarOpen && <span>Fixos</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'pagamento' ? 'active' : ''}`} 
            onClick={() => setCurrentView('pagamento')}
            data-testid="nav-pagamento-btn"
          >
            <Zap size={20} />
            {sidebarOpen && <span>Pag. Inteligente</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'investimentos' ? 'active' : ''}`} 
            onClick={() => setCurrentView('investimentos')}
            data-testid="nav-investimentos-btn"
          >
            <TrendingUp size={20} />
            {sidebarOpen && <span>Investimentos</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="filter-section">
            {sidebarOpen && <Label className="filter-label">Período</Label>}
            <Select value={periodoTipo} onValueChange={setPeriodoTipo}>
              <SelectTrigger className="filter-select" data-testid="periodo-tipo-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês</SelectItem>
                <SelectItem value="ano">Ano</SelectItem>
                <SelectItem value="intervalo">Intervalo</SelectItem>
              </SelectContent>
            </Select>

            {periodoTipo === "mes" && (
              <Input 
                type="month" 
                value={periodoMes} 
                onChange={(e) => setPeriodoMes(e.target.value)}
                className="filter-input"
                data-testid="periodo-mes-input"
              />
            )}

            {periodoTipo === "ano" && (
              <Input 
                type="number" 
                value={periodoAno} 
                onChange={(e) => setPeriodoAno(e.target.value)}
                placeholder="2025"
                className="filter-input"
                data-testid="periodo-ano-input"
              />
            )}

            {periodoTipo === "intervalo" && (
              <>
                <Input 
                  type="date" 
                  value={periodoInicio} 
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  placeholder="Início"
                  className="filter-input"
                  data-testid="periodo-inicio-input"
                />
                <Input 
                  type="date" 
                  value={periodoFim} 
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  placeholder="Fim"
                  className="filter-input"
                  data-testid="periodo-fim-input"
                />
              </>
            )}
          </div>

          <div className="backup-section">
            <Button variant="outline" size="sm" onClick={handleBackup} className="backup-btn" data-testid="backup-btn">
              <Download size={16} />
              {sidebarOpen && <span>Backup</span>}
            </Button>
            <Button variant="outline" size="sm" className="backup-btn" asChild data-testid="restore-btn">
              <label>
                <Upload size={16} />
                {sidebarOpen && <span>Restaurar</span>}
                <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} />
              </label>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {currentView === "dashboard" && <DashboardView stats={stats} lancamentos={lancamentosFiltrados} />}
        {currentView === "lancamentos" && (
          <LancamentosView 
            lancamentos={lancamentosFiltrados} 
            onAdd={() => { setEditingItem(null); setShowLancamentoDialog(true); }}
            onEdit={(item) => { setEditingItem(item); setShowLancamentoDialog(true); }}
            onDelete={deletarLancamento}
          />
        )}
        {currentView === "fixos" && (
          <FixosView 
            fixos={fixos} 
            onAdd={() => { setEditingItem(null); setShowFixoDialog(true); }}
            onEdit={(item) => { setEditingItem(item); setShowFixoDialog(true); }}
            onDelete={deletarFixo}
          />
        )}
        {currentView === "pagamento" && <PagamentoInteligenteView data={pagamentoInteligente} />}
        {currentView === "investimentos" && (
          <InvestimentosView 
            investimentos={investimentosFiltrados}
            totalInvestido={stats.totalInvestido}
            saldoPlanejado={pagamentoInteligente.saldoFinal}
            onAdd={() => { setEditingItem(null); setShowInvestimentoDialog(true); }}
            onEdit={(item) => { setEditingItem(item); setShowInvestimentoDialog(true); }}
            onDelete={deletarInvestimento}
          />
        )}
      </main>

      {/* Dialogs */}
      <LancamentoDialog 
        open={showLancamentoDialog} 
        onOpenChange={setShowLancamentoDialog}
        onSave={salvarLancamento}
        editingItem={editingItem}
      />
      <FixoDialog 
        open={showFixoDialog} 
        onOpenChange={setShowFixoDialog}
        onSave={salvarFixo}
        editingItem={editingItem}
      />
      <InvestimentoDialog 
        open={showInvestimentoDialog} 
        onOpenChange={setShowInvestimentoDialog}
        onSave={salvarInvestimento}
        editingItem={editingItem}
      />
    </div>
  );
}

// Dashboard View
function DashboardView({ stats, lancamentos }) {
  const topCategorias = Object.entries(stats.categorias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="view-container" data-testid="dashboard-view">
      <h1 className="view-title">Dashboard</h1>
      
      <div className="stats-grid">
        <Card className="stat-card renda">
          <CardHeader>
            <CardTitle className="stat-title">
              <TrendingUp className="stat-icon" />
              Renda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value" data-testid="stat-renda">R$ {stats.renda.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="stat-card despesas">
          <CardHeader>
            <CardTitle className="stat-title">
              <TrendingDown className="stat-icon" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value" data-testid="stat-despesas">R$ {stats.despesas.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="stat-card resultado">
          <CardHeader>
            <CardTitle className="stat-title">
              <DollarSign className="stat-icon" />
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value" data-testid="stat-resultado">R$ {stats.resultado.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="stat-card investido">
          <CardHeader>
            <CardTitle className="stat-title">
              <Target className="stat-icon" />
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value" data-testid="stat-investido">R$ {stats.totalInvestido.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="charts-section">
        <Card className="chart-card">
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategorias.length > 0 ? (
              <div className="categoria-list">
                {topCategorias.map(([cat, valor]) => {
                  const percentual = ((valor / stats.despesas) * 100).toFixed(1);
                  return (
                    <div key={cat} className="categoria-item">
                      <div className="categoria-info">
                        <span className="categoria-nome">{cat}</span>
                        <span className="categoria-valor">R$ {valor.toFixed(2)} ({percentual}%)</span>
                      </div>
                      <div className="categoria-bar">
                        <div className="categoria-fill" style={{ width: `${percentual}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">Nenhuma despesa registrada</p>
            )}
          </CardContent>
        </Card>

        <Card className="chart-card">
          <CardHeader>
            <CardTitle>Últimos Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {lancamentos.length > 0 ? (
              <div className="lancamentos-recentes">
                {lancamentos.slice(0, 5).map(l => (
                  <div key={l.id} className="lancamento-item">
                    <div>
                      <p className="lancamento-desc">{l.descricao}</p>
                      <p className="lancamento-data">{new Date(l.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Badge variant={l.tipo === 'entrada' ? 'default' : 'destructive'}>
                      {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Nenhum lançamento no período</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Lancamentos View
function LancamentosView({ lancamentos, onAdd, onEdit, onDelete }) {
  return (
    <div className="view-container" data-testid="lancamentos-view">
      <div className="view-header">
        <h1 className="view-title">Lançamentos</h1>
        <Button onClick={onAdd} data-testid="add-lancamento-btn">
          <span>+ Novo Lançamento</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.length > 0 ? (
                  lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data)).map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{l.descricao}</TableCell>
                      <TableCell>{l.categoria}</TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === 'entrada' ? 'default' : 'destructive'}>
                          {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {l.valor.toFixed(2)}</TableCell>
                      <TableCell>{l.forma}</TableCell>
                      <TableCell>
                        <div className="action-buttons">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(l)} data-testid={`edit-lancamento-${l.id}`}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(l.id)} data-testid={`delete-lancamento-${l.id}`}>Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Nenhum lançamento no período</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Fixos View
function FixosView({ fixos, onAdd, onEdit, onDelete }) {
  return (
    <div className="view-container" data-testid="fixos-view">
      <div className="view-header">
        <h1 className="view-title">Contas Fixas</h1>
        <Button onClick={onAdd} data-testid="add-fixo-btn">
          <span>+ Novo Fixo</span>
        </Button>
      </div>

      <div className="fixos-grid">
        {fixos.length > 0 ? (
          fixos.sort((a, b) => a.diaVencimento - b.diaVencimento).map(f => (
            <Card key={f.id} className={`fixo-card ${!f.ativo ? 'inativo' : ''}`}>
              <CardHeader>
                <CardTitle className="fixo-title">{f.descricao}</CardTitle>
                <Badge variant={f.tipo === 'entrada' ? 'default' : 'destructive'}>
                  {f.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="fixo-info">Dia {f.diaVencimento} · {f.categoria}</p>
                <p className="fixo-valor">R$ {f.valor.toFixed(2)}</p>
                <p className="fixo-responsavel">Responsável: {f.responsavel}</p>
                <div className="fixo-actions">
                  <Button variant="outline" size="sm" onClick={() => onEdit(f)} data-testid={`edit-fixo-${f.id}`}>Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => onDelete(f.id)} data-testid={`delete-fixo-${f.id}`}>Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="empty-state">Nenhuma conta fixa cadastrada</p>
        )}
      </div>
    </div>
  );
}

// Pagamento Inteligente View
function PagamentoInteligenteView({ data }) {
  return (
    <div className="view-container" data-testid="pagamento-view">
      <h1 className="view-title">Pagamento Inteligente</h1>

      <Card className="analise-card">
        <CardHeader>
          <CardTitle>Análise do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="analise-text">{data.analise}</p>
          <div className="analise-stats">
            <div>
              <span className="analise-label">Total de Rendas:</span>
              <span className="analise-value">R$ {data.totalRendas.toFixed(2)}</span>
            </div>
            <div>
              <span className="analise-label">Total de Despesas:</span>
              <span className="analise-value">R$ {data.totalDespesas.toFixed(2)}</span>
            </div>
            <div>
              <span className="analise-label">Saldo Planejado:</span>
              <span className={`analise-value ${data.saldoFinal >= 0 ? 'positivo' : 'negativo'}`}>
                R$ {data.saldoFinal.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rendas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {data.rendas.length > 0 ? (
            <div className="rendas-list">
              {data.rendas.map((r, idx) => (
                <div key={idx} className="renda-item">
                  <span>Dia {r.dia} — {r.descricao}</span>
                  <span>R$ {r.valor.toFixed(2)} (saldo após contas: R$ {r.saldo.toFixed(2)})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Nenhuma renda fixa cadastrada</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Despesa</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagar com</TableHead>
                  <TableHead>Dia da Renda</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.distribuicao.length > 0 ? (
                  data.distribuicao.map((d, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{d.despesa}</TableCell>
                      <TableCell>Dia {d.vencimento}</TableCell>
                      <TableCell>R$ {d.valor.toFixed(2)}</TableCell>
                      <TableCell>{d.pagarCom}</TableCell>
                      <TableCell>Dia {d.diaRenda}</TableCell>
                      <TableCell>{d.aviso}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Nenhuma despesa fixa cadastrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Investimentos View
function InvestimentosView({ investimentos, totalInvestido, saldoPlanejado, onAdd, onEdit, onDelete }) {
  const porAtivo = investimentos.reduce((acc, inv) => {
    acc[inv.ativo] = (acc[inv.ativo] || 0) + inv.valor;
    return acc;
  }, {});

  return (
    <div className="view-container" data-testid="investimentos-view">
      <div className="view-header">
        <h1 className="view-title">Investimentos</h1>
        <Button onClick={onAdd} data-testid="add-investimento-btn">
          <span>+ Novo Investimento</span>
        </Button>
      </div>

      <div className="stats-grid">
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="stat-title">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value">R$ {totalInvestido.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="stat-title">Por Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(porAtivo).map(([ativo, valor]) => (
              <div key={ativo} className="ativo-item">
                <span>{ativo}:</span>
                <span>R$ {valor.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {saldoPlanejado > 0 && (
          <Card className="stat-card sugestao">
            <CardHeader>
              <CardTitle className="stat-title">Sugestão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="sugestao-text">
                Você pode investir até R$ {saldoPlanejado.toFixed(2)} sem mexer nas contas fixas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investimentos.length > 0 ? (
                  investimentos.sort((a, b) => new Date(b.data) - new Date(a.data)).map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>{new Date(inv.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{inv.ativo}</TableCell>
                      <TableCell>R$ {inv.valor.toFixed(2)}</TableCell>
                      <TableCell>{inv.origem || '-'}</TableCell>
                      <TableCell>
                        <div className="action-buttons">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(inv)} data-testid={`edit-investimento-${inv.id}`}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(inv.id)} data-testid={`delete-investimento-${inv.id}`}>Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Nenhum investimento no período</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Lancamento Dialog
function LancamentoDialog({ open, onOpenChange, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    data: '',
    descricao: '',
    categoria: 'Outros',
    tipo: 'saida',
    valor: '',
    forma: 'pix',
    observacao: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        categoria: 'Outros',
        tipo: 'saida',
        valor: '',
        forma: 'pix',
        observacao: ''
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, valor: parseFloat(formData.valor) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="lancamento-dialog">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <Label>Data</Label>
            <Input 
              type="date" 
              value={formData.data} 
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
              data-testid="lancamento-data-input"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input 
              value={formData.descricao} 
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
              data-testid="lancamento-descricao-input"
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
              <SelectTrigger data-testid="lancamento-categoria-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alimentação">Alimentação</SelectItem>
                <SelectItem value="Moradia">Moradia</SelectItem>
                <SelectItem value="Transporte">Transporte</SelectItem>
                <SelectItem value="Saúde">Saúde</SelectItem>
                <SelectItem value="Lazer">Lazer</SelectItem>
                <SelectItem value="Filha">Filha</SelectItem>
                <SelectItem value="Dívidas">Dívidas</SelectItem>
                <SelectItem value="Investimento">Investimento</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
              <SelectTrigger data-testid="lancamento-tipo-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={formData.valor} 
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              required
              data-testid="lancamento-valor-input"
            />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formData.forma} onValueChange={(v) => setFormData({ ...formData, forma: v })}>
              <SelectTrigger data-testid="lancamento-forma-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Observação</Label>
            <Input 
              value={formData.observacao} 
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              data-testid="lancamento-observacao-input"
            />
          </div>
          <DialogFooter className="col-span-2">
            <Button type="submit" data-testid="lancamento-submit-btn">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Fixo Dialog
function FixoDialog({ open, onOpenChange, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'Outros',
    tipo: 'saida',
    valor: '',
    responsavel: 'Davi',
    diaVencimento: 1,
    mesInicio: '',
    mesFim: '',
    ativo: true
  });

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      const now = new Date();
      setFormData({
        descricao: '',
        categoria: 'Outros',
        tipo: 'saida',
        valor: '',
        responsavel: 'Davi',
        diaVencimento: 1,
        mesInicio: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        mesFim: '',
        ativo: true
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...formData, 
      valor: parseFloat(formData.valor),
      diaVencimento: parseInt(formData.diaVencimento),
      mesFim: formData.mesFim || null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="fixo-dialog">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar Fixo' : 'Novo Fixo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <Label>Descrição</Label>
            <Input 
              value={formData.descricao} 
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
              data-testid="fixo-descricao-input"
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
              <SelectTrigger data-testid="fixo-categoria-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Renda">Renda</SelectItem>
                <SelectItem value="Moradia">Moradia</SelectItem>
                <SelectItem value="Transporte">Transporte</SelectItem>
                <SelectItem value="Saúde">Saúde</SelectItem>
                <SelectItem value="Educação">Educação</SelectItem>
                <SelectItem value="Dívidas">Dívidas</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
              <SelectTrigger data-testid="fixo-tipo-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={formData.valor} 
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              required
              data-testid="fixo-valor-input"
            />
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={formData.responsavel} onValueChange={(v) => setFormData({ ...formData, responsavel: v })}>
              <SelectTrigger data-testid="fixo-responsavel-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Davi">Davi</SelectItem>
                <SelectItem value="Ana">Ana</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dia de {formData.tipo === 'entrada' ? 'Recebimento' : 'Vencimento'}</Label>
            <Input 
              type="number" 
              min="1" 
              max="31" 
              value={formData.diaVencimento} 
              onChange={(e) => setFormData({ ...formData, diaVencimento: e.target.value })}
              required
              data-testid="fixo-dia-input"
            />
          </div>
          <div>
            <Label>Mês Início</Label>
            <Input 
              type="month" 
              value={formData.mesInicio} 
              onChange={(e) => setFormData({ ...formData, mesInicio: e.target.value })}
              required
              data-testid="fixo-mes-inicio-input"
            />
          </div>
          <div>
            <Label>Mês Fim (opcional)</Label>
            <Input 
              type="month" 
              value={formData.mesFim} 
              onChange={(e) => setFormData({ ...formData, mesFim: e.target.value })}
              data-testid="fixo-mes-fim-input"
            />
          </div>
          <div className="col-span-2">
            <Label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={formData.ativo} 
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                data-testid="fixo-ativo-checkbox"
              />
              Ativo
            </Label>
          </div>
          <DialogFooter className="col-span-2">
            <Button type="submit" data-testid="fixo-submit-btn">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Investimento Dialog
function InvestimentoDialog({ open, onOpenChange, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    data: '',
    ativo: 'BNB',
    valor: '',
    origem: '',
    observacao: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        data: new Date().toISOString().split('T')[0],
        ativo: 'BNB',
        valor: '',
        origem: '',
        observacao: ''
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, valor: parseFloat(formData.valor) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="investimento-dialog">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar Investimento' : 'Novo Investimento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <Label>Data</Label>
            <Input 
              type="date" 
              value={formData.data} 
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
              data-testid="investimento-data-input"
            />
          </div>
          <div>
            <Label>Ativo</Label>
            <Input 
              value={formData.ativo} 
              onChange={(e) => setFormData({ ...formData, ativo: e.target.value })}
              placeholder="BNB, BTC, etc."
              required
              data-testid="investimento-ativo-input"
            />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={formData.valor} 
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              required
              data-testid="investimento-valor-input"
            />
          </div>
          <div>
            <Label>Origem</Label>
            <Input 
              value={formData.origem} 
              onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
              placeholder="Ex: sobra dezembro 2025"
              data-testid="investimento-origem-input"
            />
          </div>
          <div className="col-span-2">
            <Label>Observação</Label>
            <Input 
              value={formData.observacao} 
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              data-testid="investimento-observacao-input"
            />
          </div>
          <DialogFooter className="col-span-2">
            <Button type="submit" data-testid="investimento-submit-btn">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default App;