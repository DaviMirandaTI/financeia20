import { useState, useEffect, useMemo, useRef } from "react";
import "@/App.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Menu, X, TrendingUp, TrendingDown, Wallet, Target, Download, Upload, LayoutDashboard, Receipt, Repeat, Zap, DollarSign } from "lucide-react";

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");
  
  // Data states
  const [lancamentos, setLancamentos] = useState([]);
  const [fixos, setFixos] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [comprasCartao, setComprasCartao] = useState([]);
  const [movimentosInvest, setMovimentosInvest] = useState([]);
  const [precosAtivos, setPrecosAtivos] = useState([]);
  
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
  const [showCartaoDialog, setShowCartaoDialog] = useState(false);
  const [showCompraDialog, setShowCompraDialog] = useState(false);
  const [showMovimentoDialog, setShowMovimentoDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const fileInputRef = useRef(null);

  // Load all data from localStorage on mount
  useEffect(() => {
    const savedUsers = localStorage.getItem('fs_users');
    const savedCurrentUser = localStorage.getItem('fs_currentUser');
    const savedLancamentos = localStorage.getItem('fs_lancamentos');
    const savedFixos = localStorage.getItem('fs_fixos');
    const savedInvestimentos = localStorage.getItem('fs_investimentos');
    const savedCartoes = localStorage.getItem('fs_cartoes');
    const savedCompras = localStorage.getItem('fs_compras_cartao');
    const savedMovimentos = localStorage.getItem('fs_movimentos_investimento');
    const savedPrecos = localStorage.getItem('fs_precos_ativos');
    
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedCurrentUser) {
      const user = JSON.parse(savedCurrentUser);
      if (user.isLoggedIn) {
        setIsLoggedIn(true);
        setCurrentUser(user);
      }
    }
    if (savedLancamentos) setLancamentos(JSON.parse(savedLancamentos));
    if (savedFixos) setFixos(JSON.parse(savedFixos));
    if (savedInvestimentos) setInvestimentos(JSON.parse(savedInvestimentos));
    if (savedCartoes) setCartoes(JSON.parse(savedCartoes));
    if (savedCompras) setComprasCartao(JSON.parse(savedCompras));
    if (savedMovimentos) setMovimentosInvest(JSON.parse(savedMovimentos));
    if (savedPrecos) setPrecosAtivos(JSON.parse(savedPrecos));
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('fs_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fs_currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('fs_lancamentos', JSON.stringify(lancamentos));
  }, [lancamentos]);

  useEffect(() => {
    localStorage.setItem('fs_fixos', JSON.stringify(fixos));
  }, [fixos]);

  useEffect(() => {
    localStorage.setItem('fs_investimentos', JSON.stringify(investimentos));
  }, [investimentos]);

  useEffect(() => {
    localStorage.setItem('fs_cartoes', JSON.stringify(cartoes));
  }, [cartoes]);

  useEffect(() => {
    localStorage.setItem('fs_compras_cartao', JSON.stringify(comprasCartao));
  }, [comprasCartao]);

  useEffect(() => {
    localStorage.setItem('fs_movimentos_investimento', JSON.stringify(movimentosInvest));
  }, [movimentosInvest]);

  useEffect(() => {
    localStorage.setItem('fs_precos_ativos', JSON.stringify(precosAtivos));
  }, [precosAtivos]);

  // Auto-generate lancamentos from fixos
  useEffect(() => {
    if (isLoggedIn && currentUser && periodoTipo === "mes" && periodoMes) {
      gerarLancamentosDoMes(periodoMes);
    }
  }, [fixos, periodoMes, periodoTipo, isLoggedIn, currentUser]);

  const gerarLancamentosDoMes = (mesSelecionado) => {
    if (!currentUser) return;
    
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const fixosAtivos = fixos.filter(f => {
      if (!f.ativo || f.userId !== currentUser.userId) return false;
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
        l.data.startsWith(mesSelecionado) &&
        l.userId === currentUser.userId
      );

      if (!jaExiste) {
        const novoLancamento = {
          id: crypto.randomUUID(),
          userId: currentUser.userId,
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

  // Filter data by current user
  const lancamentosUsuario = useMemo(() => {
    if (!currentUser) return [];
    return lancamentos.filter(l => l.userId === currentUser.userId);
  }, [lancamentos, currentUser]);

  const fixosUsuario = useMemo(() => {
    if (!currentUser) return [];
    return fixos.filter(f => f.userId === currentUser.userId);
  }, [fixos, currentUser]);

  const cartoesUsuario = useMemo(() => {
    if (!currentUser) return [];
    return cartoes.filter(c => c.userId === currentUser.userId);
  }, [cartoes, currentUser]);

  const comprasUsuario = useMemo(() => {
    if (!currentUser) return [];
    return comprasCartao.filter(c => c.userId === currentUser.userId);
  }, [comprasCartao, currentUser]);

  const movimentosUsuario = useMemo(() => {
    if (!currentUser) return [];
    return movimentosInvest.filter(m => m.userId === currentUser.userId);
  }, [movimentosInvest, currentUser]);

  // Filter by period
  const lancamentosFiltrados = useMemo(() => {
    return lancamentosUsuario.filter(l => {
      if (periodoTipo === "mes") {
        return l.data.startsWith(periodoMes);
      } else if (periodoTipo === "ano") {
        return l.data.startsWith(periodoAno);
      } else if (periodoTipo === "intervalo" && periodoInicio && periodoFim) {
        return l.data >= periodoInicio && l.data <= periodoFim;
      }
      return true;
    });
  }, [lancamentosUsuario, periodoTipo, periodoMes, periodoAno, periodoInicio, periodoFim]);

  const movimentosFiltrados = useMemo(() => {
    return movimentosUsuario.filter(m => {
      if (periodoTipo === "mes") {
        return m.data.startsWith(periodoMes);
      } else if (periodoTipo === "ano") {
        return m.data.startsWith(periodoAno);
      } else if (periodoTipo === "intervalo" && periodoInicio && periodoFim) {
        return m.data >= periodoInicio && m.data <= periodoFim;
      }
      return true;
    });
  }, [movimentosUsuario, periodoTipo, periodoMes, periodoAno, periodoInicio, periodoFim]);

  // Dashboard stats
  const stats = useMemo(() => {
    const renda = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((sum, l) => sum + l.valor, 0);
    const despesas = lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((sum, l) => sum + l.valor, 0);
    const resultado = renda - despesas;
    const totalInvestido = movimentosFiltrados.filter(m => m.tipo === 'compra' || m.tipo === 'aporte').reduce((sum, m) => sum + (m.quantidade * m.precoUnitario), 0);
    
    const categorias = {};
    lancamentosFiltrados.filter(l => l.tipo === 'saida').forEach(l => {
      categorias[l.categoria] = (categorias[l.categoria] || 0) + l.valor;
    });

    return { renda, despesas, resultado, totalInvestido, categorias };
  }, [lancamentosFiltrados, movimentosFiltrados]);

  // Backup & Restore
  const handleBackup = () => {
    const data = {
      users,
      lancamentos,
      fixos,
      investimentos,
      cartoes,
      comprasCartao,
      movimentosInvest,
      precosAtivos
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finsystem-v2-backup-${new Date().toISOString().split('T')[0]}.json`;
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
            setUsers(data.users || []);
            setLancamentos(data.lancamentos || []);
            setFixos(data.fixos || []);
            setInvestimentos(data.investimentos || []);
            setCartoes(data.cartoes || []);
            setComprasCartao(data.comprasCartao || []);
            setMovimentosInvest(data.movimentosInvest || []);
            setPrecosAtivos(data.precosAtivos || []);
            toast.success("Dados restaurados com sucesso!");
          }
        } catch (error) {
          toast.error("Erro ao importar arquivo");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('fs_currentUser');
    toast.success("Logout realizado!");
  };

  // Removed login for v1.0 - direct access

  return (
    <>
      <Toaster position="top-right" />
      <div className="app-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo">
              <Wallet className="logo-icon" />
              {sidebarOpen && <span className="logo-text">FinSystem v2</span>}
            </div>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="menu-toggle-btn">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className="nav-menu">
            <button className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')} data-testid="nav-dashboard-btn">
              <LayoutDashboard size={20} />
              {sidebarOpen && <span>Dashboard</span>}
            </button>
            <button className={`nav-item ${currentView === 'lancamentos' ? 'active' : ''}`} onClick={() => setCurrentView('lancamentos')} data-testid="nav-lancamentos-btn">
              <Receipt size={20} />
              {sidebarOpen && <span>Lançamentos</span>}
            </button>
            <button className={`nav-item ${currentView === 'fixos' ? 'active' : ''}`} onClick={() => setCurrentView('fixos')} data-testid="nav-fixos-btn">
              <Repeat size={20} />
              {sidebarOpen && <span>Fixos</span>}
            </button>
            <button className={`nav-item ${currentView === 'cartoes' ? 'active' : ''}`} onClick={() => setCurrentView('cartoes')} data-testid="nav-cartoes-btn">
              <CreditCard size={20} />
              {sidebarOpen && <span>Cartões</span>}
            </button>
            <button className={`nav-item ${currentView === 'pagamento' ? 'active' : ''}`} onClick={() => setCurrentView('pagamento')} data-testid="nav-pagamento-btn">
              <Zap size={20} />
              {sidebarOpen && <span>Pag. Inteligente</span>}
            </button>
            <button className={`nav-item ${currentView === 'investimentos' ? 'active' : ''}`} onClick={() => setCurrentView('investimentos')} data-testid="nav-investimentos-btn">
              <TrendingUp size={20} />
              {sidebarOpen && <span>Investimentos</span>}
            </button>
          </nav>

          <div className="sidebar-footer">
            {sidebarOpen && (
              <div className="user-info">
                <p className="user-name">{currentUser?.name}</p>
                <p className="user-email">{currentUser?.email}</p>
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

            <div className="backup-section">
              <Button variant="outline" size="sm" onClick={handleBackup} className="backup-btn" data-testid="backup-btn">
                <Download size={16} />
                {sidebarOpen && <span>Backup</span>}
              </Button>
              <Button variant="outline" size="sm" className="backup-btn" onClick={() => fileInputRef.current?.click()} data-testid="restore-btn">
                <Upload size={16} />
                {sidebarOpen && <span>Restaurar</span>}
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} />
            </div>

            <Button variant="destructive" size="sm" onClick={handleLogout} className="logout-btn" data-testid="logout-btn">
              <LogOut size={16} />
              {sidebarOpen && <span>Sair</span>}
            </Button>
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
              onDelete={(id) => setLancamentos(prev => prev.filter(l => l.id !== id))}
            />
          )}
          {currentView === "fixos" && (
            <FixosView 
              fixos={fixosUsuario} 
              onAdd={() => { setEditingItem(null); setShowFixoDialog(true); }}
              onEdit={(item) => { setEditingItem(item); setShowFixoDialog(true); }}
              onDelete={(id) => setFixos(prev => prev.filter(f => f.id !== id))}
            />
          )}
          {currentView === "cartoes" && (
            <CartoesView 
              cartoes={cartoesUsuario}
              compras={comprasUsuario}
              onAddCartao={() => { setEditingItem(null); setShowCartaoDialog(true); }}
              onEditCartao={(item) => { setEditingItem(item); setShowCartaoDialog(true); }}
              onDeleteCartao={(id) => setCartoes(prev => prev.filter(c => c.id !== id))}
              onAddCompra={() => { setEditingItem(null); setShowCompraDialog(true); }}
              onEditCompra={(item) => { setEditingItem(item); setShowCompraDialog(true); }}
              onDeleteCompra={(id) => setComprasCartao(prev => prev.filter(c => c.id !== id))}
              periodoMes={periodoMes}
            />
          )}
          {currentView === "pagamento" && <PagamentoInteligenteView fixos={fixosUsuario} periodoMes={periodoMes} />}
          {currentView === "investimentos" && (
            <InvestimentosAvancadoView 
              movimentos={movimentosFiltrados}
              precosAtivos={precosAtivos}
              setPrecosAtivos={setPrecosAtivos}
              onAdd={() => { setEditingItem(null); setShowMovimentoDialog(true); }}
              onEdit={(item) => { setEditingItem(item); setShowMovimentoDialog(true); }}
              onDelete={(id) => setMovimentosInvest(prev => prev.filter(m => m.id !== id))}
            />
          )}
        </main>

        {/* Dialogs */}
        {showLancamentoDialog && (
          <LancamentoDialog 
            key={editingItem ? `edit-lanc-${editingItem.id}` : 'new-lanc'}
            open={showLancamentoDialog} 
            onOpenChange={setShowLancamentoDialog}
            onSave={(data) => {
              if (editingItem) {
                setLancamentos(prev => prev.map(l => l.id === editingItem.id ? { ...data, id: editingItem.id, userId: currentUser.userId } : l));
                toast.success("Lançamento atualizado!");
              } else {
                setLancamentos(prev => [...prev, { ...data, id: crypto.randomUUID(), userId: currentUser.userId, origem: 'manual' }]);
                toast.success("Lançamento criado!");
              }
              setShowLancamentoDialog(false);
              setEditingItem(null);
            }}
            editingItem={editingItem}
          />
        )}
        {showFixoDialog && (
          <FixoDialog 
            key={editingItem ? `edit-fixo-${editingItem.id}` : 'new-fixo'}
            open={showFixoDialog} 
            onOpenChange={setShowFixoDialog}
            onSave={(data) => {
              if (editingItem) {
                setFixos(prev => prev.map(f => f.id === editingItem.id ? { ...data, id: editingItem.id, userId: currentUser.userId } : f));
                toast.success("Fixo atualizado!");
              } else {
                setFixos(prev => [...prev, { ...data, id: crypto.randomUUID(), userId: currentUser.userId }]);
                toast.success("Fixo criado!");
              }
              setShowFixoDialog(false);
              setEditingItem(null);
            }}
            editingItem={editingItem}
          />
        )}
        {showCartaoDialog && (
          <CartaoDialog 
            key={editingItem ? `edit-cartao-${editingItem.id}` : 'new-cartao'}
            open={showCartaoDialog} 
            onOpenChange={setShowCartaoDialog}
            onSave={(data) => {
              if (editingItem) {
                setCartoes(prev => prev.map(c => c.id === editingItem.id ? { ...data, id: editingItem.id, userId: currentUser.userId } : c));
                toast.success("Cartão atualizado!");
              } else {
                setCartoes(prev => [...prev, { ...data, id: crypto.randomUUID(), userId: currentUser.userId }]);
                toast.success("Cartão criado!");
              }
              setShowCartaoDialog(false);
              setEditingItem(null);
            }}
            editingItem={editingItem}
          />
        )}
        {showCompraDialog && (
          <CompraDialog 
            key={editingItem ? `edit-compra-${editingItem.id}` : 'new-compra'}
            open={showCompraDialog} 
            onOpenChange={setShowCompraDialog}
            cartoes={cartoesUsuario}
            onSave={(data) => {
              if (editingItem) {
                setComprasCartao(prev => prev.map(c => c.id === editingItem.id ? { ...data, id: editingItem.id, userId: currentUser.userId } : c));
                toast.success("Compra atualizada!");
              } else {
                setComprasCartao(prev => [...prev, { ...data, id: crypto.randomUUID(), userId: currentUser.userId }]);
                toast.success("Compra criada!");
              }
              setShowCompraDialog(false);
              setEditingItem(null);
            }}
            editingItem={editingItem}
          />
        )}
        {showMovimentoDialog && (
          <MovimentoDialog 
            key={editingItem ? `edit-mov-${editingItem.id}` : 'new-mov'}
            open={showMovimentoDialog} 
            onOpenChange={setShowMovimentoDialog}
            onSave={(data) => {
              if (editingItem) {
                setMovimentosInvest(prev => prev.map(m => m.id === editingItem.id ? { ...data, id: editingItem.id, userId: currentUser.userId } : m));
                toast.success("Movimento atualizado!");
              } else {
                setMovimentosInvest(prev => [...prev, { ...data, id: crypto.randomUUID(), userId: currentUser.userId }]);
                toast.success("Movimento criado!");
              }
              setShowMovimentoDialog(false);
              setEditingItem(null);
            }}
            editingItem={editingItem}
          />
        )}
      </div>
    </>
  );
}

export default App;
