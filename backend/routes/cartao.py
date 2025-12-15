from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from models.cartao import CartaoCredito, FaturaCartao
from server import db
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

cartao_router = APIRouter(prefix="/api/cartao", tags=["cartao"])


@cartao_router.get("", response_model=List[dict])
async def listar_cartoes():
    """Lista todos os cartões de crédito"""
    cursor = db.cartoes.find({})
    cartoes = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        cartoes.append(doc)
    return cartoes


@cartao_router.post("", response_model=dict)
async def criar_cartao(cartao: CartaoCredito):
    """Cria um novo cartão de crédito"""
    cartao.limite_disponivel = cartao.limite_total - cartao.limite_usado
    doc = cartao.model_dump()
    await db.cartoes.insert_one(doc)
    doc["_id"] = str(doc.get("_id", ""))
    return doc


@cartao_router.put("/{cartao_id}", response_model=dict)
async def atualizar_cartao(cartao_id: str, cartao: CartaoCredito):
    """Atualiza um cartão de crédito"""
    cartao.limite_disponivel = cartao.limite_total - cartao.limite_usado
    doc = cartao.model_dump()
    result = await db.cartoes.update_one({"id": cartao_id}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    doc["_id"] = cartao_id
    return doc


@cartao_router.get("/{cartao_id}/faturas", response_model=List[dict])
async def listar_faturas(cartao_id: str, mes: Optional[str] = None):
    """Lista faturas de um cartão"""
    filtro = {"cartao_id": cartao_id}
    if mes:
        filtro["mes_referencia"] = mes
    
    cursor = db.faturas.find(filtro).sort("mes_referencia", -1)
    faturas = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        faturas.append(doc)
    return faturas


@cartao_router.post("/{cartao_id}/calcular-fatura")
async def calcular_fatura_atual(cartao_id: str, mes: Optional[str] = None):
    """
    Calcula a fatura atual do cartão baseado nos lançamentos do mês.
    Se não passar o mês, usa o mês atual.
    """
    if not mes:
        mes = datetime.now().strftime("%Y-%m")
    
    # Buscar lançamentos do cartão no mês
    cursor = db.lancamentos.find({
        "forma": "credito",
        "data": {"$regex": f"^{mes}"},
        "tipo": "saida",
    })
    
    lancamentos = [doc async for doc in cursor]
    valor_total = sum(float(l.get("valor", 0)) for l in lancamentos)
    lancamentos_ids = [l.get("id") for l in lancamentos]
    
    # Buscar ou criar fatura
    fatura_existente = await db.faturas.find_one({
        "cartao_id": cartao_id,
        "mes_referencia": mes,
    })
    
    if fatura_existente:
        await db.faturas.update_one(
            {"_id": fatura_existente["_id"]},
            {"$set": {
                "valor_total": valor_total,
                "lancamentos_ids": lancamentos_ids,
            }}
        )
        fatura_existente["valor_total"] = valor_total
        fatura_existente["lancamentos_ids"] = lancamentos_ids
        fatura_existente["_id"] = str(fatura_existente["_id"])
        return fatura_existente
    else:
        # Buscar cartão para pegar dia de vencimento
        cartao = await db.cartoes.find_one({"id": cartao_id})
        if not cartao:
            raise HTTPException(status_code=404, detail="Cartão não encontrado")
        
        dia_venc = cartao.get("dia_vencimento", 12)
        ano, mes_num = mes.split("-")
        data_venc = datetime(int(ano), int(mes_num), min(dia_venc, 28))
        data_venc += relativedelta(months=1)  # Vencimento é no mês seguinte
        
        nova_fatura = {
            "id": f"{cartao_id}_{mes}",
            "cartao_id": cartao_id,
            "mes_referencia": mes,
            "valor_total": valor_total,
            "valor_pago": 0.0,
            "data_vencimento": data_venc.strftime("%Y-%m-%d"),
            "status": "aberta",
            "lancamentos_ids": lancamentos_ids,
            "criado_em": datetime.utcnow(),
        }
        
        await db.faturas.insert_one(nova_fatura)
        nova_fatura["_id"] = str(nova_fatura.get("_id", ""))
        return nova_fatura


@cartao_router.get("/alertas/vencimento")
async def alertas_vencimento(dias_antes: int = 7):
    """
    Retorna faturas que vencem nos próximos N dias (padrão: 7 dias)
    """
    hoje = datetime.now().date()
    limite = hoje + timedelta(days=dias_antes)
    
    cursor = db.faturas.find({
        "status": "aberta",
        "data_vencimento": {
            "$gte": hoje.strftime("%Y-%m-%d"),
            "$lte": limite.strftime("%Y-%m-%d"),
        }
    })
    
    alertas = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        alertas.append(doc)
    
    return {"alertas": alertas, "total": len(alertas)}

