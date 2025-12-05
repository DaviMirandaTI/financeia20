from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from ..models.user import UserCreate, UserDB, UserResponse, Token
from ..auth.security import get_password_hash, verify_password, create_access_token, decode_access_token
from ..server import db  # Importa a conexão do MongoDB do server.py

logger = logging.getLogger(__name__)

# Router para autenticação
auth_router = APIRouter(prefix="/auth", tags=["autenticação"])

# OAuth2 scheme para login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


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
        user["_id"] = str(user["_id"])
    return user


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """
    Busca usuário no MongoDB pelo ID.
    
    Args:
        user_id: ID do usuário
        
    Returns:
        Documento do usuário ou None se não encontrado
    """
    user = await db.users.find_one({"id": user_id})
    if user:
        user["_id"] = str(user["_id"])
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
    
    # Cria documento do usuário
    user_dict = {
        "id": str(uuid.uuid4()),
        "nome": user_data.nome,
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
        await db.users.insert_one(user_dict)
        logger.info(f"Novo usuário registrado: {email_lower}")
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

