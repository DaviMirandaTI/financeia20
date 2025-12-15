import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  updateProfile,
  changePassword,
  uploadImage,
  resetData,
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
  const [loading, setLoading] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resetState, setResetState] = useState({
    reset_lancamentos: false,
    reset_fixos: false,
    reset_investimentos: false,
    reset_metas: false,
    loading: false,
  });

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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file);
      if (res?.url) {
        setForm((prev) => ({ ...prev, foto_url: res.url }));
        toast.success('Foto enviada!');
      } else {
        toast.error('Falha ao enviar imagem.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
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
                <div className="mt-2 flex flex-col gap-2">
                  <Input type="file" accept="image/*" onChange={handleUpload} />
                  {uploading && <p className="text-xs text-gray-400">Enviando imagem...</p>}
                  {form.foto_url && (
                    <img src={form.foto_url} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
                  )}
                </div>
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

        <Card className="md:col-span-2 backdrop-blur border border-red-500/40" style={{ background: 'rgba(127, 29, 29, 0.2)' }}>
          <CardHeader>
            <CardTitle className="text-red-300">Ferramentas avançadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-red-100">
            <p className="text-red-200">
              <strong>Atenção:</strong> estas ações apagam dados do seu ambiente. Use apenas para testes.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={resetState.reset_lancamentos}
                  onChange={(e) => setResetState((p) => ({ ...p, reset_lancamentos: e.target.checked }))}
                />
                Apagar lançamentos
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={resetState.reset_fixos}
                  onChange={(e) => setResetState((p) => ({ ...p, reset_fixos: e.target.checked }))}
                />
                Apagar fixos
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={resetState.reset_investimentos}
                  onChange={(e) => setResetState((p) => ({ ...p, reset_investimentos: e.target.checked }))}
                />
                Apagar investimentos
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={resetState.reset_metas}
                  onChange={(e) => setResetState((p) => ({ ...p, reset_metas: e.target.checked }))}
                />
                Apagar metas
              </label>
            </div>
            <Button
              variant="destructive"
              className="w-full mt-2"
              disabled={
                !(
                  resetState.reset_lancamentos ||
                  resetState.reset_fixos ||
                  resetState.reset_investimentos ||
                  resetState.reset_metas
                ) || resetState.loading
              }
              onClick={async () => {
                if (!window.confirm('Tem certeza que deseja apagar esses dados? Esta ação não pode ser desfeita.')) {
                  return;
                }
                try {
                  setResetState((p) => ({ ...p, loading: true }));
                  const { reset_lancamentos, reset_fixos, reset_investimentos, reset_metas } = resetState;
                  const res = await resetData({ reset_lancamentos, reset_fixos, reset_investimentos, reset_metas });
                  toast.success('Dados apagados com sucesso.');
                  console.log('Reset response', res);
                } catch (e) {
                  console.error(e);
                  toast.error('Erro ao resetar dados. Verifique o token ADMIN_TOKEN no backend.');
                } finally {
                  setResetState({
                    reset_lancamentos: false,
                    reset_fixos: false,
                    reset_investimentos: false,
                    reset_metas: false,
                    loading: false,
                  });
                }
              }}
            >
              {resetState.loading ? 'Apagando...' : 'Apagar dados selecionados'}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

