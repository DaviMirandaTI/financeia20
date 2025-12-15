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
from utils.responsavel import detectar_responsavel
from server import db
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


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

    # aplicar sugestão de categoria e responsável quando possível
    for t in transacoes:
        if not t.is_duplicada:
            # Categoria
            if not t.categoria:
                cat = await aplicar_regras(t)
                if cat:
                    t.categoria = cat
            
            # Responsável (adicionar campo ao modelo se necessário)
            # Por enquanto, vamos detectar mas não adicionar ao modelo ainda
            # responsavel = detectar_responsavel(t)

    return transacoes


@import_router.post("/processar")
async def processar_importacao(transacoes: List[TransacaoExtraida]):
    """
    Recebe lista de transações (já categorizadas) e grava apenas as que não são duplicadas.
    Cria lançamentos futuros para compras parceladas.
    """
    if not transacoes:
        return {"adicionadas": 0, "duplicadas": 0, "parcelas_criadas": 0}

    adicionadas = 0
    duplicadas = 0
    parcelas_criadas = 0

    for t in transacoes:
        if t.is_duplicada:
            duplicadas += 1
            continue

        # Detectar responsável
        responsavel = detectar_responsavel(t)
        
        # Detectar se é cartão de crédito
        forma = "credito" if "pix cred" in t.descricao.lower() or "cartão" in t.descricao.lower() else "pix"

        doc = {
            "id": t.id,
            "data": t.data,
            "descricao": t.descricao,
            "categoria": t.categoria or "Outros",
            "tipo": t.tipo,
            "valor": t.valor,
            "forma": forma,
            "origem": "importado",
            "responsavel": responsavel,
            "observacao": f"{t.banco_origem} - {t.arquivo_nome}",
        }
        
        # Se tem parcelas, adicionar info
        if t.parcelas_total:
            doc["parcelas_total"] = t.parcelas_total
            doc["parcela_atual"] = t.parcela_atual or 1
        
        await db.lancamentos.insert_one(doc)
        adicionadas += 1

        # Se é compra parcelada e ainda não tem todas as parcelas, criar lançamentos futuros
        if t.parcelas_total and t.parcelas_total > 1 and (not t.parcela_atual or t.parcela_atual == 1):
            data_base = datetime.strptime(t.data, "%Y-%m-%d")
            valor_parcela = t.valor / t.parcelas_total
            
            for i in range(2, t.parcelas_total + 1):
                data_parcela = data_base + relativedelta(months=i-1)
                parcela_id = f"{t.id}_parcela_{i}"
                
                # Verificar se já existe
                existe = await db.lancamentos.find_one({"id": parcela_id})
                if not existe:
                    doc_parcela = {
                        "id": parcela_id,
                        "data": data_parcela.strftime("%Y-%m-%d"),
                        "descricao": f"{t.descricao} (Parcela {i}/{t.parcelas_total})",
                        "categoria": t.categoria or "Outros",
                        "tipo": t.tipo,
                        "valor": valor_parcela,
                        "forma": forma,
                        "origem": "parcela_futura",
                        "responsavel": responsavel,
                        "parcelas_total": t.parcelas_total,
                        "parcela_atual": i,
                        "observacao": f"Parcela {i} de {t.parcelas_total} - {t.banco_origem}",
                    }
                    await db.lancamentos.insert_one(doc_parcela)
                    parcelas_criadas += 1

    return {"adicionadas": adicionadas, "duplicadas": duplicadas, "parcelas_criadas": parcelas_criadas}


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


