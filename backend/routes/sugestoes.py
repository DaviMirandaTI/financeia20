"""
Rotas para sugestões inteligentes de lançamentos.
Reaproveita a lógica de categorização da importação de extratos.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.categorizacao import aplicar_regras, sugerir_categoria_por_padrao
from models.importacao import TransacaoExtraida

sugestoes_router = APIRouter(prefix="/api", tags=["sugestoes"])


class SugestaoRequest(BaseModel):
    descricao: str
    valor: Optional[float] = None
    tipo: Optional[str] = None  # 'entrada' | 'saida'
    forma: Optional[str] = None  # 'pix' | 'debito' | 'credito' | etc.


class SugestaoResponse(BaseModel):
    categoria_sugerida: Optional[str] = None
    responsavel_sugerido: Optional[str] = None  # Futuro: aprender com histórico


@sugestoes_router.post("/sugerir-lancamento", response_model=SugestaoResponse)
async def sugerir_lancamento(request: SugestaoRequest):
    """
    Sugere categoria e responsável para um lançamento baseado na descrição.
    Usa as regras aprendidas (regras_categorizacao) + palavras padrão.
    """
    if not request.descricao or len(request.descricao.strip()) < 2:
        return SugestaoResponse()

    # Cria uma TransacaoExtraida temporária para usar a lógica existente
    transacao_temp = TransacaoExtraida(
        data="2000-01-01",  # Data dummy, não usada na categorização
        descricao=request.descricao.strip(),
        valor=request.valor or 0.0,
        tipo=request.tipo or "saida",
        banco_origem="manual",
        arquivo_nome="",
    )

    # Aplica regras aprendidas + palavras padrão
    categoria_sugerida = await aplicar_regras(transacao_temp)

    # Por enquanto, responsável sempre None (futuro: aprender com histórico)
    responsavel_sugerido = None

    return SugestaoResponse(
        categoria_sugerida=categoria_sugerida,
        responsavel_sugerido=responsavel_sugerido,
    )

