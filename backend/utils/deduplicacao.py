from __future__ import annotations

from typing import List
from difflib import SequenceMatcher

from models.importacao import TransacaoExtraida
from server import db


async def verificar_duplicatas(
    transacoes: List[TransacaoExtraida],
) -> List[TransacaoExtraida]:
    """
    Marca transações extraídas que já existem na coleção de lancamentos,
    usando heurística de data + valor + similaridade de descrição.
    """
    if not transacoes:
        return transacoes

    # coletar datas únicas e valores para reduzir busca no Mongo
    datas = {t.data for t in transacoes}
    valores = {t.valor for t in transacoes}

    # busca aproximada: mesma data e mesmo valor
    existentes_cursor = db.lancamentos.find(
        {
            "data": {"$in": list(datas)},
            "valor": {"$in": list(valores)},
        }
    )
    existentes = [doc async for doc in existentes_cursor]

    for t in transacoes:
        for e in existentes:
            if e.get("data") != t.data:
                continue
            if float(e.get("valor", 0)) != float(t.valor):
                continue

            desc_existente = str(e.get("descricao", "")).lower()
            desc_nova = t.descricao.lower()
            similaridade = SequenceMatcher(None, desc_existente, desc_nova).ratio()

            if similaridade >= 0.8:
                t.is_duplicada = True
                t.transacao_existente_id = e.get("id") or str(e.get("_id"))
                break

    return transacoes


