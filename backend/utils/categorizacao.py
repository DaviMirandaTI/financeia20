from __future__ import annotations

from typing import Optional, List

from models.importacao import TransacaoExtraida
from server import db


PALAVRAS_PADRAO = {
    # Utilidades
    "cpfl": "Conta de Luz",
    "sanasa": "Água",
    "desktop": "Internet",
    
    # Assinaturas e Serviços
    "spotify": "Assinaturas",
    "nuuvem": "Lazer",
    
    # Alimentação
    "ifood": "Alimentação",
    "restaurante": "Alimentação",
    "churrascaria": "Alimentação",
    
    # Transporte
    "uber": "Transporte",
    "auto posto": "Transporte",
    "posto": "Transporte",
    "lt stark": "Transporte",
    
    # Mercado
    "mercado": "Mercado",
    "higa atacado": "Mercado",
    "mercado sol nascente": "Mercado",
    "am pm": "Mercado",
    "oxxo": "Mercado",
    
    # Transferências Internas
    "ana jullya": "Transferência Interna",
    "ana lima": "Transferência Interna",
    "davi miranda": "Transferência Interna",
    "davi stark": "Transferência Interna",
    "pix enviado": "Transferência",
    "pix recebido": "Transferência",
    
    # Investimentos
    "aplicação poupança": "Investimento",
    "crédito liberado": "Transferência",
    
    # Dívidas e Cartão
    "pagamento fatura": "Dívidas",
    "pagamento online de fatura": "Dívidas",
    "cartão": "Dívidas",
    "pix cred": "Dívidas",  # Uso do crédito do cartão via Pix
    "fatura": "Dívidas",
    
    # Saúde
    "academia": "Saúde",
    "panobianco academia": "Saúde",
    "dentista": "Saúde",
    "farmacia": "Saúde",
    
    # Renda
    "salario": "Renda",
    "pensão": "Renda",
    "vale": "Renda",
    "joão victor amaral": "Renda",  # PIX de bico
    "joao victor amaral": "Renda",
    "victor amaral": "Renda",
    "bico": "Renda",
    "pagamento recebido": "Renda",
    
    # Taxas e Impostos
    "iof": "Taxas e Impostos",
    "juros pix credito": "Taxas e Impostos",
    "juros": "Taxas e Impostos",
    "iof adicional": "Taxas e Impostos",
    "iof diario": "Taxas e Impostos",
    "iof internacional": "Taxas e Impostos",
    
    # Educação / Trabalho / Jogos
    "udemy": "Educação",
    "cursor": "Trabalho",  # Ferramentas de trabalho
    "supercell": "Lazer",  # Jogos
    "ggmax": "Lazer",
    "eneba": "Lazer",
    "playstation": "Lazer",
    # Alimentação adicionais
    "containertimb": "Alimentação",  # Food truck/barraca
    "churroslandia": "Alimentação",
}


async def aplicar_regras(transacao: TransacaoExtraida) -> Optional[str]:
    """
    Aplica regras salvas em `regras_categorizacao` (por enquanto sem separar por usuário).
    """
    regras_cursor = db.regras_categorizacao.find({})
    regras: List[dict] = [r async for r in regras_cursor]

    desc = transacao.descricao.lower()

    for regra in regras:
        padrao = str(regra.get("descricao_padrao", "")).lower()
        tipo_match = regra.get("tipo_match", "substring")
        categoria = regra.get("categoria")

        if not categoria or not padrao:
            continue

        if tipo_match == "substring" and padrao in desc:
            return categoria
        if tipo_match == "exato" and padrao == desc:
            return categoria

    # fallback: regras padrão
    return sugerir_categoria_por_padrao(transacao.descricao)


def sugerir_categoria_por_padrao(descricao: str) -> Optional[str]:
    desc = descricao.lower()
    for palavra, categoria in PALAVRAS_PADRAO.items():
        if palavra in desc:
            return categoria
    return None


