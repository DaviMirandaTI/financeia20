import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0a1929 0%, #0f2239 50%, #0a1929 100%)',
    }}>
      <Card className="w-full max-w-md" style={{
        background: 'rgba(15, 34, 57, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
      }}>
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
            }}>
              <Wallet className="w-8 h-8" style={{ color: '#10b981' }} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Bem-vindo de volta
          </CardTitle>
          <CardDescription className="text-gray-400">
            Entre na sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="pl-10"
                  style={{
                    background: 'rgba(10, 25, 41, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: '#e0e7ff',
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pl-10"
                  style={{
                    background: 'rgba(10, 25, 41, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: '#e0e7ff',
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || loading}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
                color: '#0a1929',
                fontWeight: '600',
              }}
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Esqueceu a senha?{' '}
              <Link
                to="/forgot-password"
                className="font-medium hover:underline"
                style={{ color: '#10b981' }}
              >
                Recuperar
              </Link>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Não tem uma conta?{' '}
              <Link
                to="/register"
                className="font-medium hover:underline"
                style={{ color: '#10b981' }}
              >
                Criar conta
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




