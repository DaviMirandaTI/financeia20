import { useState } from 'react';
import { resetPassword } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmacao) {
      toast.error('Confirmação diferente da nova senha.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, novaSenha);
      toast.success('Senha redefinida! Faça login.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0a1929 0%, #0f2239 50%, #0a1929 100%)' }}>
      <Card className="w-full max-w-md" style={{ background: 'rgba(15, 34, 57, 0.8)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Token</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole o token recebido" required />
            </div>
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
            </div>
            <div>
              <Label>Confirmação</Label>
              <Input type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

