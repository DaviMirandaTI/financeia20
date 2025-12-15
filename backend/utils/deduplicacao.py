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
    
    Também detecta transferências internas (mesma pessoa entre contas):
    - Se tem "Pix enviado" e "Pix recebido" com mesmo valor e data próxima
    - Se tem nomes conhecidos (Ana Jullya, Davi Miranda) em ambas as descrições
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

    # Nomes conhecidos para detectar transferências internas
    nomes_internos = ["ana jullya", "ana lima", "davi miranda", "davi stark"]
    
    for t in transacoes:
        # Verificar duplicatas exatas
        for e in existentes:
            if e.get("data") != t.data:
                continue
            if abs(float(e.get("valor", 0)) - float(t.valor)) > 0.01:
                continue

            desc_existente = str(e.get("descricao", "")).lower()
            desc_nova = t.descricao.lower()
            similaridade = SequenceMatcher(None, desc_existente, desc_nova).ratio()

            if similaridade >= 0.8:
                t.is_duplicada = True
                t.transacao_existente_id = e.get("id") or str(e.get("_id"))
                break
        
        # Se já marcou como duplicada, pula
        if t.is_duplicada:
            continue
        
        # Detectar transferências internas: se tem "pix enviado" e "pix recebido" 
        # com mesmo valor e nomes conhecidos, marca como duplicada
        desc_lower = t.descricao.lower()
        tem_nome_interno = any(nome in desc_lower for nome in nomes_internos)
        
        if tem_nome_interno and ("pix enviado" in desc_lower or "pix recebido" in desc_lower):
            # Buscar transação oposta (enviado <-> recebido) com mesmo valor
            tipo_oposto = "entrada" if t.tipo == "saida" else "saida"
            palavra_oposta = "pix recebido" if "pix enviado" in desc_lower else "pix enviado"
            
            for e in existentes:
                if e.get("tipo") != tipo_oposto:
                    continue
                if abs(float(e.get("valor", 0)) - float(t.valor)) > 0.01:
                    continue
                
                desc_e = str(e.get("descricao", "")).lower()
                if palavra_oposta in desc_e:
                    # Verificar se tem mesmo nome interno
                    if any(nome in desc_e for nome in nomes_internos):
                        t.is_duplicada = True
                        t.transacao_existente_id = e.get("id") or str(e.get("_id"))
                        break

    return transacoes


