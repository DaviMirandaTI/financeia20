// Define a URL base da API.
// - Usa REACT_APP_API_URL se estiver configurada
// - Em dev (localhost) usa http://localhost:8000
// - Em produção (sem env) faz fallback para o backend no Render
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://financeia20-backend.onrender.com');

// Função para obter token do localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Função genérica para chamadas fetch com interceptors
const fetchApi = async (url, options = {}) => {
  try {
    const token = getAuthToken();
    
    // Headers padrão
    const headers = {
      ...options.headers,
    };

    // Define Content-Type padrão se não for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    // Adiciona token de autenticação se existir
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Se receber 401 (não autorizado), remove token e redireciona
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      // Dispara evento customizado para o AuthContext reagir
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      console.error('Falha na chamada da API:', response.status, errorBody);
      
      // Cria erro com mais informações
      const error = new Error(errorBody.detail || errorBody.message || `Erro na API: ${response.statusText}`);
      error.response = { status: response.status, data: errorBody };
      throw error;
    }

    // Retorna null para respostas 204 No Content (comuns em DELETE)
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Erro de conexão com a API:", error);
    throw error;
  }
};

// Função para login (usa form-data para OAuth2)
export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email); // OAuth2 usa 'username' para email
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    const error = new Error(errorBody.detail || 'Erro ao fazer login');
    error.response = { status: response.status, data: errorBody };
    throw error;
  }

  return response.json();
};

// Função para registro
export const register = async (userData) => {
  return fetchApi(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// Função para obter usuário atual
export const getCurrentUser = async () => {
  return fetchApi(`${API_BASE_URL}/auth/me`);
};

// --- Lancamentos ---
export const getLancamentos = () => fetchApi(`${API_BASE_URL}/api/lancamentos`);
export const createLancamento = (data) => fetchApi(`${API_BASE_URL}/api/lancamentos`, { method: 'POST', body: JSON.stringify(data) });
export const updateLancamento = (id, data) => fetchApi(`${API_BASE_URL}/api/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteLancamentoAPI = (id) => fetchApi(`${API_BASE_URL}/api/lancamentos/${id}`, { method: 'DELETE' });

// --- Fixos ---
export const getFixos = () => fetchApi(`${API_BASE_URL}/api/fixos`);
export const createFixo = (data) => fetchApi(`${API_BASE_URL}/api/fixos`, { method: 'POST', body: JSON.stringify(data) });
export const updateFixo = (id, data) => fetchApi(`${API_BASE_URL}/api/fixos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFixoAPI = (id) => fetchApi(`${API_BASE_URL}/api/fixos/${id}`, { method: 'DELETE' });

// --- Investimentos ---
export const getInvestimentos = () => fetchApi(`${API_BASE_URL}/api/investimentos`);
export const createInvestimento = (data) => fetchApi(`${API_BASE_URL}/api/investimentos`, { method: 'POST', body: JSON.stringify(data) });
export const updateInvestimento = (id, data) => fetchApi(`${API_BASE_URL}/api/investimentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteInvestimentoAPI = (id) => fetchApi(`${API_BASE_URL}/api/investimentos/${id}`, { method: 'DELETE' });

// --- Auth avançada ---
export const requestVerifyEmail = () => fetchApi(`${API_BASE_URL}/auth/request-verify-email`, { method: 'POST' });
export const verifyEmail = (token) =>
  fetchApi(`${API_BASE_URL}/auth/verify-email`, { method: 'POST', body: JSON.stringify({ token }) });

export const requestResetPassword = (email) =>
  fetchApi(`${API_BASE_URL}/auth/request-reset-password`, { method: 'POST', body: JSON.stringify({ email }) });

export const resetPassword = (token, nova_senha) =>
  fetchApi(`${API_BASE_URL}/auth/reset-password`, { method: 'POST', body: JSON.stringify({ token, nova_senha }) });

export const changePassword = (senha_atual, nova_senha) =>
  fetchApi(`${API_BASE_URL}/auth/change-password`, { method: 'POST', body: JSON.stringify({ senha_atual, nova_senha }) });

export const updateProfile = (payload) =>
  fetchApi(`${API_BASE_URL}/auth/profile`, { method: 'PUT', body: JSON.stringify(payload) });

// Upload
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return fetchApi(`${API_BASE_URL}/upload/image`, { method: 'POST', body: formData });
};

// --- Sugestões e Busca ---
export const sugerirLancamento = (data) =>
  fetchApi(`${API_BASE_URL}/api/sugerir-lancamento`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const buscarLancamentos = (query, pagina = 1, limite = 50) => {
  const params = new URLSearchParams({ q: query, pagina: pagina.toString(), limite: limite.toString() });
  return fetchApi(`${API_BASE_URL}/api/lancamentos/busca?${params.toString()}`);
};

// --- Admin / Reset ---
const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN;

export const resetData = (options) => {
  const headers = {};
  if (ADMIN_TOKEN) {
    headers['X-Admin-Token'] = ADMIN_TOKEN;
  }
  return fetchApi(`${API_BASE_URL}/admin/reset-data`, {
    method: 'POST',
    headers,
    body: JSON.stringify(options),
  });
};

// --- Importação de extratos ---
export const uploadExtrato = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return fetchApi(`${API_BASE_URL}/api/importar-extrato`, {
    method: 'POST',
    body: formData,
  });
};

export const processarImportacao = (transacoes) => {
  return fetchApi(`${API_BASE_URL}/api/importar-extrato/processar`, {
    method: 'POST',
    body: JSON.stringify(transacoes),
  });
};

export const aprenderCategoria = (regra) => {
  return fetchApi(`${API_BASE_URL}/api/importar-extrato/aprender-categoria`, {
    method: 'POST',
    body: JSON.stringify(regra),
  });
};

// --- Estatísticas ---
export const getEstatisticasDashboard = (periodoMes = null, periodoAno = null) => {
  const params = new URLSearchParams();
  if (periodoMes) params.append("periodo_mes", periodoMes);
  if (periodoAno) params.append("periodo_ano", periodoAno);
  return fetchApi(`${API_BASE_URL}/api/estatisticas/dashboard?${params.toString()}`);
};

// --- Cartão de Crédito ---
export const listarCartoes = () => fetchApi(`${API_BASE_URL}/api/cartao`);
export const criarCartao = (cartao) =>
  fetchApi(`${API_BASE_URL}/api/cartao`, {
    method: "POST",
    body: JSON.stringify(cartao),
  });
export const atualizarCartao = (cartaoId, cartao) =>
  fetchApi(`${API_BASE_URL}/api/cartao/${cartaoId}`, {
    method: "PUT",
    body: JSON.stringify(cartao),
  });
export const listarFaturas = (cartaoId, mes = null) => {
  const params = mes ? `?mes=${mes}` : "";
  return fetchApi(`${API_BASE_URL}/api/cartao/${cartaoId}/faturas${params}`);
};
export const calcularFaturaAtual = (cartaoId, mes = null) => {
  const params = mes ? `?mes=${mes}` : "";
  return fetchApi(`${API_BASE_URL}/api/cartao/${cartaoId}/calcular-fatura${params}`, {
    method: "POST",
  });
};
export const getAlertasVencimento = (diasAntes = 7) =>
  fetchApi(`${API_BASE_URL}/api/cartao/alertas/vencimento?dias_antes=${diasAntes}`);