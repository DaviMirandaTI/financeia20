from __future__ import annotations

from fastapi import APIRouter
from typing import Dict, List
from server import db
from collections import defaultdict

estatisticas_router = APIRouter(prefix="/api/estatisticas", tags=["estatisticas"])


@estatisticas_router.get("/dashboard")
async def get_estatisticas_dashboard(
    periodo_mes: str = None,  # YYYY-MM
    periodo_ano: str = None,  # YYYY
):
    """
    Retorna estatísticas para o Dashboard:
    - Gastos por categoria
    - Gastos por responsável (Davi vs Ana)
    - Uso de cartão de crédito
    - Top categorias
    """
    
    # Construir filtro de data
    filtro_data = {}
    if periodo_mes:
        filtro_data["data"] = {"$regex": f"^{periodo_mes}"}
    elif periodo_ano:
        filtro_data["data"] = {"$regex": f"^{periodo_ano}"}
    
    # Buscar lançamentos
    cursor = db.lancamentos.find(filtro_data)
    lancamentos = [doc async for doc in cursor]
    
    # Gastos por categoria
    gastos_por_categoria: Dict[str, float] = defaultdict(float)
    gastos_por_responsavel: Dict[str, float] = defaultdict(float)
    uso_cartao = {
        "total": 0.0,
        "por_categoria": defaultdict(float),
    }
    
    renda_total = 0.0
    despesas_total = 0.0
    
    for lanc in lancamentos:
        valor = float(lanc.get("valor", 0))
        tipo = lanc.get("tipo", "saida")
        categoria = lanc.get("categoria", "Outros")
        responsavel = lanc.get("responsavel", "Outro")
        forma = lanc.get("forma", "")
        
        if tipo == "entrada":
            renda_total += valor
        else:
            despesas_total += valor
            gastos_por_categoria[categoria] += valor
            gastos_por_responsavel[responsavel] += valor
            
            # Uso de cartão
            if forma == "credito":
                uso_cartao["total"] += valor
                uso_cartao["por_categoria"][categoria] += valor
    
    # Top 5 categorias
    top_categorias = sorted(
        gastos_por_categoria.items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    # Top 5 categorias do cartão
    top_cartao = sorted(
        uso_cartao["por_categoria"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    return {
        "renda_total": renda_total,
        "despesas_total": despesas_total,
        "saldo": renda_total - despesas_total,
        "gastos_por_categoria": dict(gastos_por_categoria),
        "gastos_por_responsavel": dict(gastos_por_responsavel),
        "top_categorias": [{"categoria": k, "valor": v} for k, v in top_categorias],
        "uso_cartao": {
            "total": uso_cartao["total"],
            "por_categoria": dict(uso_cartao["por_categoria"]),
            "top_categorias": [{"categoria": k, "valor": v} for k, v in top_cartao],
        },
    }

