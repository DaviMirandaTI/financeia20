import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ImportarExtratos from './pages/ImportarExtratos';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* App liberado: rota principal direto para Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/importar-extratos"
            element={
              <ProtectedRoute>
                <ImportarExtratos />
              </ProtectedRoute>
            }
          />
          
          {/* Redireciona qualquer rota desconhecida para dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
