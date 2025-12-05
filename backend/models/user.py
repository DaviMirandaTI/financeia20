from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class UserCreate(BaseModel):
    """Schema para criação de usuário (dados recebidos do frontend)"""
    model_config = ConfigDict(extra="forbid")
    
    nome: str = Field(..., min_length=2, max_length=100, description="Nome completo do usuário")
    email: EmailStr = Field(..., description="Email único do usuário")
    senha: str = Field(..., min_length=6, max_length=100, description="Senha do usuário (mínimo 6 caracteres)")
    telefone: Optional[str] = Field(None, max_length=20, description="Telefone do usuário")
    foto_url: Optional[str] = Field(None, max_length=500, description="URL da foto de perfil")


class UserUpdate(BaseModel):
    """Schema para atualização de usuário (campos opcionais)"""
    model_config = ConfigDict(extra="forbid")
    
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    telefone: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = Field(None, max_length=500)


class UserDB(BaseModel):
    """Schema do usuário como salvo no MongoDB"""
    model_config = ConfigDict(extra="ignore", populate_by_name=True, arbitrary_types_allowed=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    nome: str
    email: str
    senha_hash: str  # Senha já com hash
    telefone: Optional[str] = None
    foto_url: Optional[str] = None
    email_verified: bool = Field(default=False, description="Se o email foi confirmado")
    workspace_id: Optional[str] = Field(default=None, description="ID do workspace compartilhado (futuro)")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UserResponse(BaseModel):
    """Schema de resposta pública (sem senha)"""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str
    nome: str
    email: str
    telefone: Optional[str] = None
    foto_url: Optional[str] = None
    email_verified: bool
    workspace_id: Optional[str] = None
    created_at: str
    updated_at: str


class Token(BaseModel):
    """Schema de resposta do token JWT"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Dados decodificados do token JWT"""
    user_id: Optional[str] = None
    email: Optional[str] = None

