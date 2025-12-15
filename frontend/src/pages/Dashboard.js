// Este arquivo contém o conteúdo original do App.js
// Movido para Dashboard.js para ser usado como rota protegida

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "@/App.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Menu, X, TrendingUp, TrendingDown, Wallet, Target, Download, Upload, LayoutDashboard, Receipt, Repeat, Zap, DollarSign, LogOut, User, Search, Plus } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  getLancamentos, createLancamento, updateLancamento, deleteLancamentoAPI,
  getFixos, createFixo, updateFixo, deleteFixoAPI,
  getInvestimentos, createInvestimento, updateInvestimento, deleteInvestimentoAPI,
  sugerirLancamento,
  getEstatisticasDashboard,
  getAlertasVencimento
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { GlobalSearch } from '../components/GlobalSearch';
import { CATEGORIAS_PADRAO } from '../config/categories';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  
  // Data states
  const [lancamentos, setLancamentos] = useState([]);
  const [fixos, setFixos] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [alertasVencimento, setAlertasVencimento] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Centralized data fetching function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando dados da API...');
      
      const periodo = periodoTipo === "mes" ? periodoMes : periodoTipo === "ano" ? periodoAno : null;
      const periodoParam = periodoTipo === "mes" ? { periodoMes: periodo } : periodoTipo === "ano" ? { periodoAno: periodo } : {};
      
      const [lancamentosData, fixosData, investimentosData, estatisticasData, alertasData] = await Promise.all([
        getLancamentos(),
        getFixos(),
        getInvestimentos(),
        getEstatisticasDashboard(periodoParam.periodoMes, periodoParam.periodoAno).catch(() => null),
        getAlertasVencimento(7).catch(() => ({ alertas: [], total: 0 }))
      ]);
      
      setLancamentos(lancamentosData || []);
      setFixos(fixosData || []);
      setInvestimentos(investimentosData || []);
      setEstatisticas(estatisticasData);
      setAlertasVencimento(alertasData?.alertas || []);
      
      console.log('✅ Dados carregados com sucesso:', {
        lancamentos: lancamentosData?.length || 0,
        fixos: fixosData?.length || 0,
        investimentos: investimentosData?.length || 0,
        estatisticas: !!estatisticasData,
        alertas: alertasData?.total || 0,
      });

    } catch (error) {
      toast.error("Erro ao carregar os dados. Tente recarregar a página.");
      console.error("Erro ao carregar dados da API:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch estatísticas quando período mudar
  useEffect(() => {
    const fetchEstatisticas = async () => {
      try {
        const periodo = periodoTipo === "mes" ? periodoMes : periodoTipo === "ano" ? periodoAno : null;
        const periodoParam = periodoTipo === "mes" ? { periodoMes: periodo } : periodoTipo === "ano" ? { periodoAno: periodo } : {};
        const estatisticasData = await getEstatisticasDashboard(periodoParam.periodoMes, periodoParam.periodoAno).catch(() => null);
        if (estatisticasData) setEstatisticas(estatisticasData);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    };
    fetchEstatisticas();
  }, [periodoTipo, periodoMes, periodoAno]);

  // Load all data from API on startup
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Atalho de teclado para busca global (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      if (e.key === 'Escape' && showGlobalSearch) {
        setShowGlobalSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGlobalSearch]);

  // Auto-generate lancamentos from fixos
  useEffect(() => {
    const runGerarLancamentos = async () => {
      if (periodoTipo === "mes" && periodoMes && !loading) {
        await gerarLancamentosDoMes(periodoMes);
      }
    };
    runGerarLancamentos();
  }, [fixos, periodoMes, periodoTipo, loading]);

  const gerarLancamentosDoMes = async (mesSelecionado) => {
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

    const novosLancamentosParaCriar = [];
    for (const fixo of fixosAtivos) {
      const diaValido = Math.min(fixo.diaVencimento, new Date(ano, mes, 0).getDate());
      const dataLancamento = `${ano}-${String(mes).padStart(2, '0')}-${String(diaValido).padStart(2, '0')}`;
      
      const jaExiste = lancamentos.some(l => 
        l.origem === 'fixo' && 
        l.descricao === fixo.descricao && 
        l.data.startsWith(mesSelecionado)
      );

      if (!jaExiste) {
        novosLancamentosParaCriar.push({
          data: dataLancamento,
          descricao: fixo.descricao,
          categoria: fixo.categoria,
          tipo: fixo.tipo,
          valor: fixo.valor,
          forma: 'boleto',
          origem: 'fixo',
          observacao: `Gerado automaticamente de: ${fixo.descricao}`
        });
      }
    }

    if (novosLancamentosParaCriar.length > 0) {
      try {
        await Promise.all(novosLancamentosParaCriar.map(createLancamento));
        toast.info(`${novosLancamentosParaCriar.length} lançamento(s) gerado(s) a partir das contas fixas.`);
        await fetchData(); // Re-fetch data after auto-generation
      } catch (error) {
        toast.error("Erro ao gerar lançamentos automáticos.");
      }
    }
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
    const renda = lancamentosFiltrados
      .filter(l => l.tipo === 'entrada')
      .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    
    const despesas = lancamentosFiltrados
      .filter(l => l.tipo === 'saida')
      .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    
    const resultado = renda - despesas;
    
    const totalInvestido = investimentosFiltrados
      .reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);
    
    const categorias = {};
    lancamentosFiltrados
      .filter(l => l.tipo === 'saida')
      .forEach(l => {
        categorias[l.categoria] = (categorias[l.categoria] || 0) + (Number(l.valor) || 0);
      });

    return { renda, despesas, resultado, totalInvestido, categorias };
  }, [lancamentosFiltrados, investimentosFiltrados]);

  // CRUD Lancamentos
  const salvarLancamento = async (formData) => {
    try {
      if (editingItem) {
        await updateLancamento(editingItem.id, formData);
        toast.success("Lançamento atualizado!");
      } else {
        await createLancamento({ ...formData, origem: 'manual' });
        toast.success("Lançamento criado!");
      }
      setShowLancamentoDialog(false);
      setEditingItem(null);
      await fetchData(); // Re-fetch all data
    } catch (error) {
      toast.error("Erro ao salvar lançamento.");
    }
  };

  const deletarLancamento = async (id) => {
    if (window.confirm("Deseja realmente excluir?")) {
      try {
        await deleteLancamentoAPI(id);
        toast.success("Lançamento excluído!");
        await fetchData(); // Re-fetch all data
      } catch (error) {
        toast.error("Erro ao excluir lançamento.");
      }
    }
  };

  // CRUD Fixos
  const salvarFixo = async (formData) => {
    try {
      if (editingItem) {
        await updateFixo(editingItem.id, formData);
        toast.success("Fixo atualizado!");
      } else {
        await createFixo(formData);
        toast.success("Fixo criado!");
      }
      setShowFixoDialog(false);
      setEditingItem(null);
      await fetchData(); // Re-fetch all data
    } catch (error) {
      toast.error("Erro ao salvar fixo.");
    }
  };

  const deletarFixo = async (id) => {
    if (window.confirm("Deseja realmente excluir?")) {
      try {
        await deleteFixoAPI(id);
        toast.success("Fixo excluído!");
        await fetchData(); // Re-fetch all data
      } catch (error) {
        toast.error("Erro ao excluir fixo.");
      }
    }
  };

  // CRUD Investimentos
  const salvarInvestimento = async (formData) => {
    try {
      if (editingItem) {
        await updateInvestimento(editingItem.id, formData);
        toast.success("Investimento atualizado!");
      } else {
        await createInvestimento(formData);
        toast.success("Investimento criado!");
      }
      setShowInvestimentoDialog(false);
      setEditingItem(null);
      await fetchData(); // Re-fetch all data
    } catch (error) {
      toast.error("Erro ao salvar investimento.");
    }
  };

  const deletarInvestimento = async (id) => {
    if (window.confirm("Deseja realmente excluir?")) {
      try {
        await deleteInvestimentoAPI(id);
        toast.success("Investimento excluído!");
        await fetchData(); // Re-fetch all data
      } catch (error) {
        toast.error("Erro ao excluir investimento.");
      }
    }
  };

  // Pagamento Inteligente Algorithm
  const calcularPagamentoInteligente = () => {
    const mesAtual = periodoTipo === "mes" ? periodoMes : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const rendas = fixos
      .filter(f => {
        if (!f.ativo || f.tipo !== 'entrada') return false;
        try {
          const [anoInicio, mesInicio] = f.mesInicio.split('-').map(Number);
          const [anoAtual, mesAtualNum] = mesAtual.split('-').map(Number);
          if (anoAtual < anoInicio || (anoAtual === anoInicio && mesAtualNum < mesInicio)) return false;
          if (f.mesFim) {
            const [anoFim, mesFim] = f.mesFim.split('-').map(Number);
            if (anoAtual > anoFim || (anoAtual === anoFim && mesAtualNum > mesFim)) return false;
          }
          return true;
        } catch (e) { return false; }
      })
      .map(f => ({
        descricao: f.descricao,
        dia: Number(f.diaVencimento) || 1,
        valor: Number(f.valor) || 0,
        saldo: Number(f.valor) || 0
      }))
      .sort((a, b) => a.dia - b.dia);

    const despesas = fixos
      .filter(f => {
        if (!f.ativo || f.tipo !== 'saida') return false;
        try {
          const [anoInicio, mesInicio] = f.mesInicio.split('-').map(Number);
          const [anoAtual, mesAtualNum] = mesAtual.split('-').map(Number);
          if (anoAtual < anoInicio || (anoAtual === anoInicio && mesAtualNum < mesInicio)) return false;
          if (f.mesFim) {
            const [anoFim, mesFim] = f.mesFim.split('-').map(Number);
            if (anoAtual > anoFim || (anoAtual === anoFim && mesAtualNum > mesFim)) return false;
          }
          return true;
        } catch (e) { return false; }
      })
      .map(f => ({
        descricao: f.descricao,
        diaVencimento: Number(f.diaVencimento) || 1,
        valor: Number(f.valor) || 0,
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
        rendaUsada = rendas.length > 0 ? rendas[0] : null;
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

  const pagamentoInteligente = useMemo(() => calcularPagamentoInteligente(), [fixos, periodoTipo, periodoMes, periodoAno]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="app-container">
              {/* Sidebar */}
              <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                  <div className="logo">
                    <Wallet className="logo-icon" />
                    {sidebarOpen && <span className="logo-text">FinSystem</span>}
                  </div>
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
                  {/* User Info */}
                  {sidebarOpen && user && (
                    <div className="mb-4 p-3 rounded-lg" style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" style={{ color: '#10b981' }} />
                        <span className="text-sm font-medium text-gray-300">{user.nome}</span>
                      </div>
                      <span className="text-xs text-gray-400">{user.email}</span>
                    </div>
                  )}
                  
                  <div className="filter-section">
                    {sidebarOpen && <Label className="filter-label">Período</Label>}
                    <select 
                      value={periodoTipo} 
                      onChange={(e) => setPeriodoTipo(e.target.value)}
                      className="filter-select"
                      data-testid="periodo-tipo-select"
                    >
                      <option value="mes">Mês</option>
                      <option value="ano">Ano</option>
                      <option value="intervalo">Intervalo</option>
                    </select>
      
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
                  
                  {/* Perfil / Logout */}
                  {sidebarOpen && (
                    <Button
                      onClick={() => navigate('/profile')}
                      variant="outline"
                      className="w-full mt-2"
                      style={{
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        color: '#22d3ee',
                      }}
                    >
                      Perfil
                    </Button>
                  )}
                  {sidebarOpen && (
                    <Button
                      onClick={logout}
                      variant="outline"
                      className="w-full mt-4"
                      style={{
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  )}
                </div>
              </aside>
      
              {/* This button now lives outside the sidebar */}
              <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="menu-toggle-btn">
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
      
              {/* Barra de Atalhos Rápidos e Busca */}
              <div className="quick-actions-bar" style={{
                padding: '0.75rem',
                background: 'rgba(15, 23, 42, 0.8)',
                borderBottom: '1px solid rgba(34, 211, 238, 0.2)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                overflowX: 'auto',
              }}>
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setShowLancamentoDialog(true);
                    setTimeout(() => {
                      const event = new CustomEvent('quick-action', { detail: { tipo: 'entrada', forma: 'pix' } });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  <span className="hidden sm:inline">Pix Recebido</span>
                  <span className="sm:hidden">Pix</span>
                </Button>
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setShowLancamentoDialog(true);
                    setTimeout(() => {
                      const event = new CustomEvent('quick-action', { detail: { tipo: 'saida', forma: 'debito' } });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  <span className="hidden sm:inline">Compra no Débito</span>
                  <span className="sm:hidden">Débito</span>
                </Button>
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setShowFixoDialog(true);
                  }}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  style={{
                    background: 'rgba(34, 211, 238, 0.2)',
                    border: '1px solid rgba(34, 211, 238, 0.4)',
                    color: '#22d3ee',
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  <span className="hidden sm:inline">Conta Fixa</span>
                  <span className="sm:hidden">Fixo</span>
                </Button>
                <Button
                  onClick={() => navigate('/importar-extratos')}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#60a5fa',
                  }}
                >
                  <Upload size={14} className="mr-1" />
                  <span className="hidden sm:inline">Importar Extrato</span>
                  <span className="sm:hidden">Importar</span>
                </Button>
                <div className="hidden sm:block" style={{ flex: 1 }} />
                <Button
                  onClick={() => setShowGlobalSearch(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  style={{
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#94a3b8',
                  }}
                >
                  <Search size={14} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Buscar</span>
                  <span className="hidden lg:inline ml-2 text-xs opacity-60">Ctrl+K</span>
                </Button>
              </div>
      
              {/* Main Content */}
              <main className="main-content">
                        {currentView === "dashboard" && (
                          <DashboardView 
                            stats={stats} 
                            lancamentos={lancamentosFiltrados} 
                            saldoPlanejado={pagamentoInteligente.saldoFinal}
                            estatisticas={estatisticas}
                            alertasVencimento={alertasVencimento}
                          />
                        )}
                        {currentView === "lancamentos" && (
                          <LancamentosView 
                            lancamentos={lancamentosFiltrados}                     onAdd={() => { setEditingItem(null); setShowLancamentoDialog(true); }}
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

        {/* Busca Global */}
        <GlobalSearch open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />

        {/* Dialogs */}
        {showLancamentoDialog && (
          <LancamentoDialog 
            key={editingItem ? `edit-lanc-${editingItem.id}` : 'new-lanc'}
            open={showLancamentoDialog} 
            onOpenChange={setShowLancamentoDialog}
            onSave={salvarLancamento}
            editingItem={editingItem}
          />
        )}
        {showFixoDialog && (
          <FixoDialog 
            key={editingItem ? `edit-fixo-${editingItem.id}` : 'new-fixo'}
            open={showFixoDialog} 
            onOpenChange={setShowFixoDialog}
            onSave={salvarFixo}
            editingItem={editingItem}
          />
        )}
        {showInvestimentoDialog && (
          <InvestimentoDialog 
            key={editingItem ? `edit-inv-${editingItem.id}` : 'new-inv'}
            open={showInvestimentoDialog} 
            onOpenChange={setShowInvestimentoDialog}
            onSave={salvarInvestimento}
            editingItem={editingItem}
          />
        )}
      </div>
    </>
  );
}

// Dashboard View
function DashboardView({ stats, lancamentos, saldoPlanejado, estatisticas, alertasVencimento }) {
  // Usar estatísticas da API se disponível, senão usar stats local
  const topCategoriasData = estatisticas?.top_categorias || Object.entries(stats.categorias || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoria, valor]) => ({ categoria, valor }));
  
  const topCategorias = topCategoriasData.map(item => ({
    name: item.categoria || item[0],
    value: item.valor || item[1],
  }));

  const CHART_COLORS = ['#10b981', '#22d3ee', '#a855f7', '#fbbf24', '#f87171'];
  
  // Dados para gráfico Davi vs Ana
  const gastosPorResponsavel = estatisticas?.gastos_por_responsavel || {};
  const dadosResponsavel = [
    { name: 'Davi', valor: gastosPorResponsavel['Davi'] || 0 },
    { name: 'Ana', valor: gastosPorResponsavel['Ana'] || 0 },
    { name: 'Outro', valor: gastosPorResponsavel['Outro'] || 0 },
  ].filter(item => item.valor > 0);
  
  // Dados para gráfico de cartão
  const usoCartao = estatisticas?.uso_cartao || {};
  const topCartao = usoCartao.top_categorias || [];

  return (
    <div className="view-container" data-testid="dashboard-view">
      <h1 className="view-title">Resumo Mensal</h1>
      
      <div className="stats-grid">
        <Card className="stat-card renda">
          <CardHeader>
            <CardTitle className="stat-title">
              <TrendingUp className="stat-icon" />
              Renda do Período
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
              Despesas do Período
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
              Saldo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`stat-value ${stats.resultado >= 0 ? 'positivo' : 'negativo'}`} data-testid="stat-resultado">R$ {stats.resultado.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="stat-card investido">
          <CardHeader>
            <CardTitle className="stat-title">
              <Zap className="stat-icon" />
              Saldo Planejado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`stat-value ${saldoPlanejado >= 0 ? 'positivo' : 'negativo'}`} data-testid="stat-saldo-planejado">R$ {saldoPlanejado.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="charts-section">
        <Card className="chart-card">
          <CardHeader>
            <CardTitle>Top 5 Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategorias.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topCategorias}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {topCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-state">Nenhuma despesa registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico Davi vs Ana */}
        {dadosResponsavel.length > 0 && (
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Gastos por Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosResponsavel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto']}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="valor" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Cartão de Crédito */}
        {usoCartao.total > 0 && (
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Uso de Cartão de Crédito</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Total: R$ {usoCartao.total.toFixed(2)}</p>
            </CardHeader>
            <CardContent>
              {topCartao.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topCartao} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="categoria" type="category" stroke="#94a3b8" width={100} />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto']}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="valor" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="empty-state">Nenhum gasto no cartão no período</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alertas de Vencimento */}
        {alertasVencimento.length > 0 && (
          <Card className="chart-card border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-amber-400">⚠️ Alertas de Vencimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertasVencimento.map((alerta) => (
                  <div key={alerta.id} className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="font-semibold text-amber-300">Fatura vencendo em breve</p>
                    <p className="text-sm text-slate-300">Valor: R$ {alerta.valor_total?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-slate-400">Vencimento: {new Date(alerta.data_vencimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                      <p className="lancamento-data">{new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
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
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.length > 0 ? (
                  lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data)).map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                      <TableCell>{l.descricao}</TableCell>
                      <TableCell>{l.categoria}</TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === 'entrada' ? 'default' : 'destructive'}>
                          {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {l.valor.toFixed(2)}</TableCell>
                      <TableCell>{l.forma}</TableCell>
                      <TableCell>{l.responsavel || '-'}</TableCell>
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
                    <TableCell colSpan={8} className="text-center py-8">Nenhum lançamento no período</TableCell>
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
                      <TableCell>{new Date(inv.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
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
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    categoria: 'Outros',
    tipo: 'saida',
    valor: '',
    forma: 'pix',
    responsavel: 'Davi',
    observacao: ''
  });
  const [sugestao, setSugestao] = useState(null);
  const [carregandoSugestao, setCarregandoSugestao] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultData = {
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        categoria: 'Outros',
        tipo: 'saida',
        valor: '',
        forma: 'pix',
        responsavel: 'Davi',
        observacao: ''
      };
      if (editingItem) {
        setFormData({ ...defaultData, ...editingItem });
        setSugestao(null);
      } else {
        setFormData(defaultData);
        setSugestao(null);
      }
    }
  }, [editingItem, open]);

  // Escutar evento de atalho rápido
  useEffect(() => {
    const handleQuickAction = (e) => {
      if (open && !editingItem) {
        const { tipo, forma } = e.detail;
        setFormData(prev => ({ ...prev, tipo, forma }));
      }
    };
    window.addEventListener('quick-action', handleQuickAction);
    return () => window.removeEventListener('quick-action', handleQuickAction);
  }, [open, editingItem]);

  // Buscar sugestão quando descrição mudar
  useEffect(() => {
    if (!open || editingItem) return;
    
    const descricao = formData.descricao.trim();
    if (descricao.length < 3) {
      setSugestao(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCarregandoSugestao(true);
      try {
        const resposta = await sugerirLancamento({
          descricao,
          valor: formData.valor ? parseFloat(formData.valor) : null,
          tipo: formData.tipo,
          forma: formData.forma,
        });
        if (resposta.categoria_sugerida) {
          setSugestao(resposta);
          // Aplicar sugestão automaticamente se categoria ainda não foi alterada manualmente
          if (formData.categoria === 'Outros' || formData.categoria === '') {
            setFormData(prev => ({
              ...prev,
              categoria: resposta.categoria_sugerida,
            }));
          }
        } else {
          setSugestao(null);
        }
      } catch (error) {
        console.error('Erro ao buscar sugestão:', error);
        setSugestao(null);
      } finally {
        setCarregandoSugestao(false);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData.descricao, formData.tipo, formData.forma, open, editingItem]);

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
            {carregandoSugestao && (
              <p className="text-xs text-muted-foreground mt-1">Buscando sugestão...</p>
            )}
            {sugestao && sugestao.categoria_sugerida && !carregandoSugestao && (
              <p className="text-xs text-cyan-400 mt-1">
                💡 Sugestão: {sugestao.categoria_sugerida} (pode alterar)
              </p>
            )}
          </div>
          <div>
            <Label>Categoria</Label>
            <select 
              value={formData.categoria} 
              onChange={(e) => {
                setFormData({ ...formData, categoria: e.target.value });
                setSugestao(null); // Limpar sugestão quando usuário alterar manualmente
              }}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="lancamento-categoria-select"
            >
              {CATEGORIAS_PADRAO.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tipo</Label>
            <select 
              value={formData.tipo} 
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="lancamento-tipo-select"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
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
            <select 
              value={formData.forma} 
              onChange={(e) => setFormData({ ...formData, forma: e.target.value })}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="lancamento-forma-select"
            >
              <option value="pix">PIX</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="boleto">Boleto</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <Label>Responsável</Label>
            <select 
              value={formData.responsavel} 
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="lancamento-responsavel-select"
            >
              <option value="Davi">Davi</option>
              <option value="Ana">Ana</option>
              <option value="Outro">Outro</option>
            </select>
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
  const now = new Date();
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (open) {
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
            <select 
              value={formData.categoria} 
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="fixo-categoria-select"
            >
              <option value="Renda">Renda</option>
              <option value="Moradia">Moradia</option>
              <option value="Transporte">Transporte</option>
              <option value="Saúde">Saúde</option>
              <option value="Educação">Educação</option>
              <option value="Dívidas">Dívidas</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          <div>
            <Label>Tipo</Label>
            <select 
              value={formData.tipo} 
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="fixo-tipo-select"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
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
            <select 
              value={formData.responsavel} 
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="fixo-responsavel-select"
            >
              <option value="Davi">Davi</option>
              <option value="Ana">Ana</option>
              <option value="Outro">Outro</option>
            </select>
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
    data: new Date().toISOString().split('T')[0],
    ativo: 'BNB',
    valor: '',
    origem: '',
    observacao: ''
  });

  useEffect(() => {
    if (open) {
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

