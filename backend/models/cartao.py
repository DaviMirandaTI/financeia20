from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CartaoCredito(BaseModel):
    """Modelo para rastreamento de cartão de crédito"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str  # Ex: "Inter", "Nubank"
    limite_total: float
    limite_usado: float = 0.0
    limite_disponivel: float = 0.0
    dia_vencimento: int  # Dia do mês (1-31)
    melhor_dia_compra: Optional[int] = None  # Dia ideal para comprar (1-31)
    ativo: bool = True
    user_id: Optional[str] = None


class FaturaCartao(BaseModel):
    """Modelo para faturas do cartão"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cartao_id: str
    mes_referencia: str  # YYYY-MM
    valor_total: float
    valor_pago: float = 0.0
    data_vencimento: str  # YYYY-MM-DD
    status: str = "aberta"  # 'aberta' | 'paga' | 'vencida'
    lancamentos_ids: list[str] = []  # IDs dos lançamentos que compõem a fatura
    criado_em: datetime = Field(default_factory=datetime.utcnow)
    pago_em: Optional[datetime] = None

