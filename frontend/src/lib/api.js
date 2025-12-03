const API_URL = '/api'; // O servidor de desenvolvimento do React irá redirecionar as chamadas

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
export const getLancamentos = () => fetchApi(`${API_URL}/lancamentos`);
export const createLancamento = (data) => fetchApi(`${API_URL}/lancamentos`, { method: 'POST', body: JSON.stringify(data) });
export const updateLancamento = (id, data) => fetchApi(`${API_URL}/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteLancamentoAPI = (id) => fetchApi(`${API_URL}/lancamentos/${id}`, { method: 'DELETE' });

// --- Fixos ---
export const getFixos = () => fetchApi(`${API_URL}/fixos`);
export const createFixo = (data) => fetchApi(`${API_URL}/fixos`, { method: 'POST', body: JSON.stringify(data) });
export const updateFixo = (id, data) => fetchApi(`${API_URL}/fixos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFixoAPI = (id) => fetchApi(`${API_URL}/fixos/${id}`, { method: 'DELETE' });

// --- Investimentos ---
export const getInvestimentos = () => fetchApi(`${API_URL}/investimentos`);
export const createInvestimento = (data) => fetchApi(`${API_URL}/investimentos`, { method: 'POST', body: JSON.stringify(data) });
export const updateInvestimento = (id, data) => fetchApi(`${API_URL}/investimentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteInvestimentoAPI = (id) => fetchApi(`${API_URL}/investimentos/${id}`, { method: 'DELETE' });