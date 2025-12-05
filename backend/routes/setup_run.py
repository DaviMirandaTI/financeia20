import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Request
from passlib.context import CryptContext

from server import db  # Importa o client configurado no server.py

logger = logging.getLogger(__name__)

setup_router = APIRouter(prefix="/admin", tags=["setup"])

# Configuração de hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_setup_flag() -> Optional[dict]:
    """Retorna o status da execução do setup."""
    return await db.setup_status.find_one({"_id": "setup"})


async def set_setup_flag():
    """Marca o setup como executado."""
    await db.setup_status.update_one(
        {"_id": "setup"},
        {
            "$set": {
                "done": True,
                "executed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )


async def create_or_get_user(user_email: str, username: str, nome: str, senha: str) -> str:
    """Cria o usuário inicial ou retorna seu id se já existir."""
    existing_user = await db.users.find_one(
        {
            "$or": [
                {"email": user_email.lower()},
                {"username": username.lower()},
            ]
        }
    )

    if existing_user:
        user_id = existing_user.get("id") or str(existing_user.get("_id"))
        return user_id

    user_id = str(uuid.uuid4())
    senha_hash = pwd_context.hash(senha)

    user_dict = {
        "id": user_id,
        "nome": nome,
        "username": username.lower(),
        "email": user_email.lower(),
        "senha_hash": senha_hash,
        "telefone": None,
        "foto_url": None,
        "email_verified": False,
        "workspace_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    return user_id


async def migrate_collections(user_id: str):
    """Migra documentos sem user_id para o usuário informado."""
    colecoes = ["lancamentos", "fixos", "investimentos"]

    for colecao in colecoes:
        await db[colecao].update_many(
            {"user_id": {"$exists": False}},
            {"$set": {"user_id": user_id}},
        )

    colecoes_existentes = await db.list_collection_names()
    if "metas" in colecoes_existentes:
        await db.metas.update_many(
            {"user_id": {"$exists": False}},
            {"$set": {"user_id": user_id}},
        )


@setup_router.post("/run-setup")
async def run_setup(request: Request):
    """
    Endpoint temporário para rodar o setup no Render (sem shell).
    Protegido por token de ambiente `SETUP_RUN_TOKEN`.
    Só executa uma vez (flag em `setup_status`).
    """
    token_env = os.environ.get("SETUP_RUN_TOKEN")
    if not token_env:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SETUP_RUN_TOKEN não configurado no ambiente",
        )

    # Token pode vir no header ou query string
    token_req = request.headers.get("X-Setup-Token") or request.query_params.get("token")
    if token_req != token_env:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    # Verifica se já foi executado
    flag = await get_setup_flag()
    if flag and flag.get("done"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup já foi executado",
        )

    # Lê variáveis de ambiente com defaults
    user_email = os.environ.get("SETUP_USER_EMAIL", "davi.stark@example.com")
    user_username = os.environ.get("SETUP_USER_USERNAME", "Davi_Stark")
    user_nome = os.environ.get("SETUP_USER_NOME", "Davi Stark")
    user_senha = os.environ.get("SETUP_USER_SENHA", "Mudar@123")

    try:
        # Cria ou obtém usuário
        user_id = await create_or_get_user(user_email, user_username, user_nome, user_senha)
        # Migra dados
        await migrate_collections(user_id)
        # Marca flag
        await set_setup_flag()

        return {"status": "ok", "message": "SETUP CONCLUÍDO", "user_id": user_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao executar setup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao executar setup",
        )

