from __future__ import annotations
from typing import Optional
from models.importacao import TransacaoExtraida


# Mapeamento de nomes/palavras-chave para responsável
RESPONSAVEL_POR_DESCRICAO = {
    # Aluguel
    "albino": "Davi",
    
    # Baba
    "sheila": "Davi",
    
    # Transferências internas (já detectadas como duplicatas, mas marcar responsável)
    "ana jullya": "Ana",
    "ana lima": "Ana",
    "davi miranda": "Davi",
    "davi stark": "Davi",
    
    # PIX de bico (quem recebe)
    "joão victor amaral": "Davi",
    "joao victor amaral": "Davi",
    "victor amaral": "Davi",
}


def detectar_responsavel(transacao: TransacaoExtraida) -> Optional[str]:
    """
    Detecta automaticamente o responsável pela transação baseado na descrição.
    Retorna 'Davi', 'Ana' ou None.
    """
    desc_lower = transacao.descricao.lower()
    
    # Se for entrada (recebimento), geralmente é do Davi (bicos)
    if transacao.tipo == "entrada":
        # Verificar se é PIX de bico
        for palavra, responsavel in RESPONSAVEL_POR_DESCRICAO.items():
            if palavra in desc_lower:
                return responsavel
        # Se não encontrou, mas é entrada, provavelmente é do Davi
        return "Davi"
    
    # Se for saída (gasto), verificar descrição
    for palavra, responsavel in RESPONSAVEL_POR_DESCRICAO.items():
        if palavra in desc_lower:
            return responsavel
    
    # Se não encontrou nada, retorna None (usuário pode definir depois)
    return None

