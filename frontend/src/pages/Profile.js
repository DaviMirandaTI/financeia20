import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  updateProfile,
  changePassword,
  requestVerifyEmail,
  verifyEmail,
} from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nome: '',
    username: '',
    email: '',
    telefone: '',
    foto_url: '',
  });
  const [pwdForm, setPwdForm] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmacao: '',
  });
  const [verifyToken, setVerifyToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        nome: user.nome || '',
        username: user.username || '',
        email: user.email || '',
        telefone: user.telefone || '',
        foto_url: user.foto_url || '',
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateProfile(form);
      updateUser(updated);
      toast.success('Perfil atualizado!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.nova_senha !== pwdForm.confirmacao) {
      toast.error('Confirmação diferente da nova senha.');
      return;
    }
    setLoadingPwd(true);
    try {
      await changePassword(pwdForm.senha_atual, pwdForm.nova_senha);
      toast.success('Senha alterada!');
      setPwdForm({ senha_atual: '', nova_senha: '', confirmacao: '' });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao alterar senha');
    } finally {
      setLoadingPwd(false);
    }
  };

  const handleRequestVerify = async () => {
    setLoadingVerify(true);
    try {
      const res = await requestVerifyEmail();
      setGeneratedToken(res.token || '');
      toast.success('Token de verificação gerado (para testes).');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao gerar token');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyToken) {
      toast.error('Informe o token.');
      return;
    }
    setLoadingVerify(true);
    try {
      await verifyEmail(verifyToken);
      const updated = { ...user, email_verified: true };
      updateUser(updated);
      toast.success('Email verificado!');
      setVerifyToken('');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao verificar email');
    } finally {
      setLoadingVerify(false);
    }
  };

  if (!user) {
    return <div className="p-4 text-center text-sm text-gray-300">Carregando perfil...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0a1929 0%, #0f2239 50%, #0a1929 100%)' }}>
      <div className="w-full max-w-4xl grid gap-4 md:grid-cols-2">
        <Card className="backdrop-blur border border-[rgba(16,185,129,0.2)]" style={{ background: 'rgba(15, 34, 57, 0.8)' }}>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSaveProfile}>
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={form.username} onChange={(e) => handleChange('username', e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">
                  Status: {user.email_verified ? 'Verificado' : 'Não verificado'}
                </p>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => handleChange('telefone', e.target.value)} />
              </div>
              <div>
                <Label>Foto URL</Label>
                <Input value={form.foto_url} onChange={(e) => handleChange('foto_url', e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="backdrop-blur border border-[rgba(16,185,129,0.2)]" style={{ background: 'rgba(15, 34, 57, 0.8)' }}>
          <CardHeader>
            <CardTitle>Senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleChangePassword}>
              <div>
                <Label>Senha atual</Label>
                <Input type="password" value={pwdForm.senha_atual} onChange={(e) => setPwdForm((p) => ({ ...p, senha_atual: e.target.value }))} />
              </div>
              <div>
                <Label>Nova senha</Label>
                <Input type="password" value={pwdForm.nova_senha} onChange={(e) => setPwdForm((p) => ({ ...p, nova_senha: e.target.value }))} />
              </div>
              <div>
                <Label>Confirmação</Label>
                <Input type="password" value={pwdForm.confirmacao} onChange={(e) => setPwdForm((p) => ({ ...p, confirmacao: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={loadingPwd}>
                {loadingPwd ? 'Alterando...' : 'Alterar senha'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="backdrop-blur border border-[rgba(16,185,129,0.2)] md:col-span-2" style={{ background: 'rgba(15, 34, 57, 0.8)' }}>
          <CardHeader>
            <CardTitle>Verificação de Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRequestVerify} disabled={loadingVerify || user.email_verified}>
                {user.email_verified ? 'Email já verificado' : 'Gerar token de verificação'}
              </Button>
              {generatedToken && (
                <span className="text-xs text-gray-300 break-all">
                  Token gerado (para testes): {generatedToken}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Token</Label>
              <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Cole o token aqui" />
              <Button onClick={handleVerifyEmail} disabled={loadingVerify || user.email_verified}>
                Verificar email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

