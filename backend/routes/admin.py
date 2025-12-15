from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from server import db

admin_router = APIRouter(prefix="/admin", tags=["admin"])


class ResetDataRequest(BaseModel):
    reset_lancamentos: bool = False
    reset_fixos: bool = False
    reset_investimentos: bool = False
    reset_metas: bool = False


def _require_admin_token(token: str | None):
    expected = os.getenv("ADMIN_TOKEN")
    # Se ADMIN_TOKEN não estiver configurado, não exige token (uso pessoal)
    if expected:
        if not token or token != expected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token de administrador inválido.",
            )


@admin_router.post("/reset-data")
async def reset_data(
    payload: ResetDataRequest,
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
):
    """
    Remove dados das coleções selecionadas.

    Protegido por token opcional `ADMIN_TOKEN` (enviado via header `X-Admin-Token`).
    """
    _require_admin_token(x_admin_token)

    result = {}

    if payload.reset_lancamentos:
        delete_res = await db.lancamentos.delete_many({})
        result["lancamentos_apagados"] = delete_res.deleted_count

    if payload.reset_fixos:
        delete_res = await db.fixos.delete_many({})
        result["fixos_apagados"] = delete_res.deleted_count

    if payload.reset_investimentos:
        delete_res = await db.investimentos.delete_many({})
        result["investimentos_apagados"] = delete_res.deleted_count

    if payload.reset_metas and "metas" in await db.list_collection_names():
        delete_res = await db.metas.delete_many({})
        result["metas_apagadas"] = delete_res.deleted_count

    return {"status": "ok", "detalhes": result}
*** End Patch】}"""

