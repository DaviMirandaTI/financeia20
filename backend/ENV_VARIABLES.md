# Variáveis de Ambiente Necessárias

## Variáveis Obrigatórias (já existentes)
- `MONGO_USER`: Usuário do MongoDB Atlas
- `MONGO_PASSWORD`: Senha do MongoDB Atlas
- `MONGO_HOST_URL`: URL do cluster MongoDB
- `DB_NAME`: Nome do banco de dados
- `CORS_ORIGINS`: Origens permitidas para CORS (separadas por vírgula)

## Variáveis Opcionais (para Autenticação)

### SECRET_KEY (Recomendado adicionar)
- **Descrição**: Chave secreta para assinar tokens JWT
- **Padrão**: "your-secret-key-change-in-production-min-32-chars" (NÃO usar em produção!)
- **Recomendação**: Gere uma chave segura de pelo menos 32 caracteres
- **Como gerar**: 
  ```python
  import secrets
  print(secrets.token_urlsafe(32))
  ```
- **Exemplo**: `SECRET_KEY=super-secret-key-min-32-chars-for-production-use`

### ACCESS_TOKEN_EXPIRE_MINUTES (Opcional)
- **Descrição**: Tempo de expiração do token JWT em minutos
- **Padrão**: 1440 (24 horas)
- **Exemplo**: `ACCESS_TOKEN_EXPIRE_MINUTES=1440`

### ADMIN_TOKEN (Opcional, para reset de dados via API)
- **Descrição**: Token para proteger o endpoint de reset de dados (`/admin/reset-data`)
- **Uso**: Enviar via header `X-Admin-Token` nas requisições de reset
- **Padrão**: Se não definido, o endpoint aceita requisições sem token (não recomendado em produção)
- **Exemplo**: `ADMIN_TOKEN=StarkReset123`

## Como Adicionar no Render

1. Acesse seu serviço no Render
2. Vá em "Environment"
3. Adicione a variável `SECRET_KEY` com uma chave segura
4. (Opcional) Ajuste `ACCESS_TOKEN_EXPIRE_MINUTES` se necessário

## Exemplo de .env local (para desenvolvimento)

```env
MONGO_USER=seu_usuario
MONGO_PASSWORD=sua_senha
MONGO_HOST_URL=cluster0.xxxxx.mongodb.net
DB_NAME=financeia
CORS_ORIGINS=*
SECRET_KEY=sua-chave-secreta-super-segura-aqui-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```







