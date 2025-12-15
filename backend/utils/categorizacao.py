from __future__ import annotations

from typing import Optional, List

from models.importacao import TransacaoExtraida
from server import db


PALAVRAS_PADRAO = {
    "cpfl": "Conta de Luz",
    "sanasa": "Água",
    "desktop": "Internet",
    "spotify": "Assinaturas",
    "ifood": "Alimentação",
    "uber": "Transporte",
    "mercado": "Mercado",
}


async def aplicar_regras(transacao: TransacaoExtraida) -> Optional[str]:
    """
    Aplica regras salvas em `regras_categorizacao` (por enquanto sem separar por usuário).
    """
    regras_cursor = db.regras_categorizacao.find({})
    regras: List[dict] = [r async for r in regras_cursor]

    desc = transacao.descricao.lower()

    for regra in regras:
        padrao = str(regra.get("descricao_padrao", "")).lower()
        tipo_match = regra.get("tipo_match", "substring")
        categoria = regra.get("categoria")

        if not categoria or not padrao:
            continue

        if tipo_match == "substring" and padrao in desc:
            return categoria
        if tipo_match == "exato" and padrao == desc:
            return categoria

    # fallback: regras padrão
    return sugerir_categoria_por_padrao(transacao.descricao)


def sugerir_categoria_por_padrao(descricao: str) -> Optional[str]:
    desc = descricao.lower()
    for palavra, categoria in PALAVRAS_PADRAO.items():
        if palavra in desc:
            return categoria
    return None


