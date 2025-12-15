from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class TransacaoExtraida(BaseModel):
    """
    Representa uma transação extraída de um extrato (PDF/CSV),
    ainda não necessariamente persistida como Lancamento.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str  # ISO YYYY-MM-DD
    descricao: str
    valor: float
    tipo: str  # 'entrada' | 'saida'

    banco_origem: str
    arquivo_nome: str

    categoria: Optional[str] = None
    is_duplicada: bool = False
    transacao_existente_id: Optional[str] = None


class RegraCategorizacao(BaseModel):
    """
    Regra aprendida para categorizar transações com base na descrição.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    descricao_padrao: str
    categoria: str
    tipo_match: str = "substring"  # 'substring' | 'exato' | 'regex'
    criado_em: datetime = Field(default_factory=datetime.utcnow)


