// Define a URL base da API. Usa a variável de ambiente se estiver disponível (em produção),
// senão, usa o endereço local do backend para desenvolvimento.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Função genérica para chamadas fetch
const fetchApi = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Falha na chamada da API:', response.status, errorBody);
      throw new Error(`Erro na API: ${response.statusText}`);
    }

    // Retorna null para respostas 204 No Content (comuns em DELETE)
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Erro de conexão com a API:", error);
    // Você pode usar 'sonner' ou 'toast' aqui se quiser mostrar um erro global
    throw error;
  }
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