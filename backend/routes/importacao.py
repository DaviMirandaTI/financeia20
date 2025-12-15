from __future__ import annotations

from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

from models.importacao import TransacaoExtraida, RegraCategorizacao
from utils.parsers import (
    detectar_banco,
    parse_csv_inter,
    parse_csv_nubank,
    parse_pdf_inter,
)
from utils.deduplicacao import verificar_duplicatas
from utils.categorizacao import aplicar_regras
from server import db


import_router = APIRouter(prefix="/api/importar-extrato", tags=["importacao"])


@import_router.post("", response_model=List[TransacaoExtraida])
async def upload_extrato(file: UploadFile = File(...)):
    """
    Recebe um arquivo de extrato (PDF/CSV), detecta banco e formata as transações.
    NÃO grava no banco ainda, apenas retorna a prévia com flag de duplicadas.
    """
    conteudo_bytes = await file.read()
    nome = file.filename or "extrato"

    if file.content_type in ("text/csv", "application/vnd.ms-excel", "application/octet-stream"):
        texto = conteudo_bytes.decode("utf-8", errors="ignore")
        banco = detectar_banco(nome, texto[:500])

        if banco == "inter":
            transacoes = parse_csv_inter(texto, nome)
        elif banco == "nubank":
            transacoes = parse_csv_nubank(texto, nome)
        else:
            raise HTTPException(status_code=400, detail="Formato de CSV não reconhecido (Inter/Nubank).")

    elif file.content_type in ("application/pdf",):
        banco = detectar_banco(nome, conteudo_bytes[:1024].decode("latin-1", errors="ignore"))
        if banco != "inter":
            raise HTTPException(status_code=400, detail="Parser de PDF implementado apenas para Banco Inter.")
        transacoes = parse_pdf_inter(conteudo_bytes, nome)
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de arquivo não suportado: {file.content_type}")

    transacoes = await verificar_duplicatas(transacoes)

    # aplicar sugestão de categoria quando possível
    for t in transacoes:
        if not t.categoria and not t.is_duplicada:
            cat = await aplicar_regras(t)
            if cat:
                t.categoria = cat

    return transacoes


@import_router.post("/processar")
async def processar_importacao(transacoes: List[TransacaoExtraida]):
    """
    Recebe lista de transações (já categorizadas) e grava apenas as que não são duplicadas.
    """
    if not transacoes:
        return {"adicionadas": 0, "duplicadas": 0}

    adicionadas = 0
    duplicadas = 0

    for t in transacoes:
        if t.is_duplicada:
            duplicadas += 1
            continue

        doc = {
            "id": t.id,
            "data": t.data,
            "descricao": t.descricao,
            "categoria": t.categoria or "Outros",
            "tipo": t.tipo,
            "valor": t.valor,
            "forma": "pix",
            "origem": "importado",
            "observacao": f"{t.banco_origem} - {t.arquivo_nome}",
        }
        await db.lancamentos.insert_one(doc)
        adicionadas += 1

    return {"adicionadas": adicionadas, "duplicadas": duplicadas}


@import_router.post("/aprender-categoria")
async def aprender_categoria(regra: RegraCategorizacao):
    """
    Salva regra de categorização e aplica em transações sem categoria existentes.
    """
    regra_dict = regra.model_dump()
    await db.regras_categorizacao.insert_one(regra_dict)

    padrao = regra.descricao_padrao
    categoria = regra.categoria

    # aplica em lançamentos existentes sem categoria específica (simples, por substring)
    cursor = db.lancamentos.find(
        {
            "descricao": {"$regex": padrao, "$options": "i"},
        }
    )
    async for doc in cursor:
        await db.lancamentos.update_one(
            {"_id": doc["_id"]},
            {"$set": {"categoria": categoria}},
        )

    return {"status": "ok"}


