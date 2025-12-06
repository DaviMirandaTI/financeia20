import { useState } from 'react';
import { requestResetPassword } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestResetPassword(email);
      // Backend sempre retorna 200; em dev retornamos token para facilitar
      if (res?.token) setToken(res.token);
      toast.success('Se o email existir, enviamos instruções (token exibido aqui em dev).');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao solicitar reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0a1929 0%, #0f2239 50%, #0a1929 100%)' }}>
      <Card className="w-full max-w-md" style={{ background: 'rgba(15, 34, 57, 0.8)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </Button>
          </form>
          {token && (
            <p className="text-xs text-gray-300 mt-3 break-all">
              Token (dev): {token}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

