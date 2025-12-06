from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from models.user import (
    UserCreate,
    UserDB,
    UserResponse,
    Token,
    VerifyEmailRequest,
    RequestVerifyEmailResponse,
    RequestResetPassword,
    ResetPasswordPayload,
    ChangePasswordPayload,
    UpdateProfilePayload,
)
from auth.security import get_password_hash, verify_password, create_access_token, decode_access_token
from server import db  # Importa a conexão do MongoDB do server.py
from datetime import timedelta

logger = logging.getLogger(__name__)

# Router para autenticação
auth_router = APIRouter(prefix="/auth", tags=["autenticação"])

# OAuth2 scheme para login (Swagger Authorize)
# Importante: usar o caminho real da rota (/auth/login) sem o prefixo /api
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_user_by_email(email: str) -> Optional[dict]:
    """
    Busca usuário no MongoDB pelo email.
    
    Args:
        email: Email do usuário
        
    Returns:
        Documento do usuário ou None se não encontrado
    """
    user = await db.users.find_one({"email": email.lower()})
    if user:
        # Garante que o campo "id" existe (pode ser _id ou id)
        if "_id" in user:
            if "id" not in user:
                user["id"] = str(user["_id"])
            user["_id"] = str(user["_id"])
        elif "id" not in user:
            # Se não tem nem _id nem id, cria um id baseado no _id
            user["id"] = str(user.get("_id", ""))
    return user


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """
    Busca usuário no MongoDB pelo ID.
    
    Args:
        user_id: ID do usuário
        
    Returns:
        Documento do usuário ou None se não encontrado
    """
    # Tenta buscar por "id" primeiro, depois por "_id"
    user = await db.users.find_one({"id": user_id})
    if not user:
        # Se não encontrar por "id", tenta por "_id" (ObjectId)
        try:
            from bson import ObjectId
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if user:
        # Garante que o campo "id" existe (pode ser _id ou id)
        if "_id" in user:
            user["id"] = str(user["_id"])
            user["_id"] = str(user["_id"])
        elif "id" not in user:
            user["id"] = str(user.get("_id", user_id))
    return user


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """
    Autentica usuário verificando email e senha.
    
    Args:
        email: Email do usuário
        password: Senha em texto plano
        
    Returns:
        Dados do usuário se autenticado, None caso contrário
    """
    user = await get_user_by_email(email)
    if not user:
        return None
    
    if not verify_password(password, user.get("senha_hash")):
        return None
    
    return user


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency para obter o usuário atual a partir do token JWT.
    Usado para proteger rotas que requerem autenticação.
    
    Args:
        token: Token JWT do header Authorization
        
    Returns:
        Dados do usuário autenticado
        
    Raises:
        HTTPException: Se o token for inválido ou o usuário não existir
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")  # 'sub' é o padrão JWT para subject (user_id)
    email: str = payload.get("email")
    
    if user_id is None or email is None:
        raise credentials_exception
    
    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return user


async def create_token_record(collection: str, user_id: str, ttl_minutes: int) -> str:
    """Cria token simples com expiração."""
    token = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ttl_minutes)
    await db[collection].insert_one(
        {
            "token": token,
            "user_id": user_id,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "used": False,
        }
    )
    return token


async def get_token_record(collection: str, token: str) -> Optional[dict]:
    return await db[collection].find_one({"token": token})


async def invalidate_token(collection: str, token: str):
    await db[collection].update_one({"token": token}, {"$set": {"used": True}})


@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Registra um novo usuário no sistema.
    
    - Verifica se o email já existe
    - Faz hash da senha
    - Salva no MongoDB
    - Retorna dados do usuário (sem senha)
    """
    # Normaliza email para lowercase
    email_lower = user_data.email.lower()
    
    # Verifica se email já existe
    existing_user = await get_user_by_email(email_lower)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Verifica se username já existe
    existing_username = await db.users.find_one({"username": user_data.username.lower()})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já cadastrado"
        )
    
    # Cria documento do usuário
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "nome": user_data.nome,
        "username": user_data.username.lower(),
        "email": email_lower,
        "senha_hash": get_password_hash(user_data.senha),
        "telefone": user_data.telefone,
        "foto_url": user_data.foto_url,
        "email_verified": False,
        "workspace_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insere no MongoDB
    try:
        result = await db.users.insert_one(user_dict)
        # Garante que o _id do MongoDB também está no documento
        user_dict["_id"] = str(result.inserted_id)
        logger.info(f"Novo usuário registrado: {email_lower} (ID: {user_id})")
    except Exception as e:
        logger.error(f"Erro ao registrar usuário: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar usuário"
        )
    
    # Remove senha_hash da resposta
    user_dict.pop("senha_hash", None)
    return UserResponse(**user_dict)


@auth_router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Autentica usuário e retorna token JWT.
    
    - Recebe email e senha via OAuth2PasswordRequestForm
    - Verifica credenciais
    - Retorna token JWT de acesso
    """
    # OAuth2PasswordRequestForm usa 'username' como campo, mas vamos usar para email
    user = await authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Cria token JWT
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]}
    )
    
    logger.info(f"Login realizado: {user['email']}")
    
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Retorna informações do usuário autenticado.
    
    - Requer token JWT válido
    - Retorna dados do usuário (sem senha)
    """
    # Remove senha_hash da resposta
    user_dict = current_user.copy()
    user_dict.pop("senha_hash", None)
    return UserResponse(**user_dict)


# ---------------------------
# Confirmação de email
# ---------------------------


@auth_router.post("/request-verify-email", response_model=RequestVerifyEmailResponse)
async def request_verify_email(current_user: dict = Depends(get_current_user)):
    """
    Gera token de verificação de email e retorna (para fins de debug/dev).
    Em produção, esse token deveria ser enviado por email.
    """
    if current_user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email já verificado")

    token = await create_token_record("verification_tokens", current_user["id"], ttl_minutes=60 * 24)
    logger.info(f"Token de verificação gerado para {current_user['email']}")
    return RequestVerifyEmailResponse(token=token)


@auth_router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    token_doc = await get_token_record("verification_tokens", payload.token)
    if not token_doc:
        raise HTTPException(status_code=400, detail="Token inválido")

    if token_doc.get("used"):
        raise HTTPException(status_code=400, detail="Token já utilizado")

    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Token expirado")

    user = await get_user_by_id(token_doc["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    await db.users.update_one({"id": user["id"]}, {"$set": {"email_verified": True}})
    await invalidate_token("verification_tokens", payload.token)

    return {"detail": "Email verificado com sucesso"}


# ---------------------------
# Reset de senha
# ---------------------------


@auth_router.post("/request-reset-password")
async def request_reset_password(payload: RequestResetPassword):
    """
    Gera token de reset de senha. Em produção, deve ser enviado por email.
    Retornamos o token para facilitar testes.
    """
    user = await get_user_by_email(payload.email)
    token = None
    if user:
        token = await create_token_record("reset_tokens", user["id"], ttl_minutes=60)
        logger.info(f"Token de reset gerado para {payload.email}")
    # Sempre responde 200 para não vazar existência de email
    return {"detail": "Se o email existir, o token foi gerado.", "token": token}


@auth_router.post("/reset-password")
async def reset_password(payload: ResetPasswordPayload):
    token_doc = await get_token_record("reset_tokens", payload.token)
    if not token_doc:
        raise HTTPException(status_code=400, detail="Token inválido")
    if token_doc.get("used"):
        raise HTTPException(status_code=400, detail="Token já utilizado")

    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Token expirado")

    user = await get_user_by_id(token_doc["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"senha_hash": get_password_hash(payload.nova_senha), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await invalidate_token("reset_tokens", payload.token)
    logger.info(f"Senha redefinida para usuário {user['email']}")

    return {"detail": "Senha redefinida com sucesso"}


# ---------------------------
# Troca de senha autenticado
# ---------------------------


@auth_router.post("/change-password")
async def change_password(payload: ChangePasswordPayload, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.senha_atual, current_user.get("senha_hash")):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"senha_hash": get_password_hash(payload.nova_senha), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    logger.info(f"Senha alterada para usuário {current_user['email']}")
    return {"detail": "Senha alterada com sucesso"}


# ---------------------------
# Atualização de perfil
# ---------------------------


@auth_router.put("/profile", response_model=UserResponse)
async def update_profile(payload: UpdateProfilePayload, current_user: dict = Depends(get_current_user)):
    updates = {}

    if payload.nome is not None:
        updates["nome"] = payload.nome
    if payload.username is not None and payload.username.lower() != current_user.get("username"):
        existing_username = await db.users.find_one({"username": payload.username.lower(), "id": {"$ne": current_user["id"]}})
        if existing_username:
            raise HTTPException(status_code=400, detail="Nome de usuário já cadastrado")
        updates["username"] = payload.username.lower()
    if payload.email is not None and payload.email.lower() != current_user.get("email"):
        existing_email = await db.users.find_one({"email": payload.email.lower(), "id": {"$ne": current_user["id"]}})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        updates["email"] = payload.email.lower()
        updates["email_verified"] = False  # precisa reverificar
    if payload.telefone is not None:
        updates["telefone"] = payload.telefone
    if payload.foto_url is not None:
        updates["foto_url"] = payload.foto_url

    if not updates:
        return UserResponse(**{k: v for k, v in current_user.items() if k != "senha_hash"})

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.users.update_one({"id": current_user["id"]}, {"$set": updates})

    # Retorna usuário atualizado
    user = await get_user_by_id(current_user["id"])
    user.pop("senha_hash", None)
    return UserResponse(**user)

