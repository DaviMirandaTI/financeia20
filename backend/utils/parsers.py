from __future__ import annotations

import io
import re
from typing import List

import pdfplumber  # type: ignore

from models.importacao import TransacaoExtraida


def _normalizar_data_br(data_str: str) -> str:
    """Converte data DD/MM/YYYY para YYYY-MM-DD."""
    data_str = data_str.strip()
    dia, mes, ano = data_str.split("/")
    return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"


def _normalizar_valor_br(valor_str: str) -> float:
    """Converte valores no formato brasileiro para float."""
    s = valor_str.strip().replace(".", "").replace(" ", "")
    s = s.replace("R$", "").replace("r$", "")
    s = s.replace(",", ".")
    return float(s)


def _extrair_parcelas(descricao: str) -> tuple[Optional[int], Optional[int]]:
    """
    Extrai informações de parcelamento da descrição.
    Retorna (parcela_atual, parcelas_total) ou (None, None) se não encontrar.
    
    Exemplos:
    - "Em 4x" -> (None, 4)
    - "Parcela 2 de 4" -> (2, 4)
    - "Em 3x" -> (None, 3)
    """
    desc_lower = descricao.lower()
    
    # Padrão: "Parcela X de Y"
    match_parcela = re.search(r"parcela\s+(\d+)\s+de\s+(\d+)", desc_lower)
    if match_parcela:
        parcela_atual = int(match_parcela.group(1))
        parcelas_total = int(match_parcela.group(2))
        return (parcela_atual, parcelas_total)
    
    # Padrão: "Em Xx" (ex: "Em 4x", "Em 3x")
    match_em = re.search(r"em\s+(\d+)x", desc_lower)
    if match_em:
        parcelas_total = int(match_em.group(1))
        return (None, parcelas_total)
    
    return (None, None)


def detectar_banco(arquivo_nome: str, conteudo_inicial: str) -> str:
    nome = arquivo_nome.lower()
    texto = conteudo_inicial.lower()

    if "nubank" in texto or "nu pagamentos" in texto or "nu_" in nome:
        return "nubank"
    if "banco inter" in texto or "conta corrente" in texto or "extrato conta corrente" in texto:
        return "inter"

    # fallback simples
    return "desconhecido"


def parse_csv_inter(csv_content: str, arquivo_nome: str) -> List[TransacaoExtraida]:
    """
    Formato Inter (exemplo do arquivo que você enviou):
    Linha cabeçalho de dados:
    Data Lançamento;Histórico;Descrição;Valor;Saldo
    """
    linhas = csv_content.splitlines()
    transacoes: List[TransacaoExtraida] = []

    # pular cabeçalhos até achar linha que começa com "Data"
    dados_iniciados = False
    for linha in linhas:
        if not dados_iniciados:
            if linha.startswith("Data"):
                dados_iniciados = True
            continue

        if not linha.strip():
            continue

        partes = [p.strip() for p in linha.split(";")]
        if len(partes) < 5:
            continue

        data_br, historico, descricao, valor_str, _saldo = partes
        try:
            data_iso = _normalizar_data_br(data_br)
            valor = _normalizar_valor_br(valor_str)
        except Exception:
            continue

        tipo = "entrada" if valor > 0 else "saida"

        desc_completa = f"{historico} - {descricao}".strip(" -")
        
        # Extrair informações de parcelamento
        parcela_atual, parcelas_total = _extrair_parcelas(desc_completa)

        transacoes.append(
            TransacaoExtraida(
                data=data_iso,
                descricao=desc_completa,
                valor=abs(valor),
                tipo=tipo,
                banco_origem="inter",
                arquivo_nome=arquivo_nome,
                parcela_atual=parcela_atual,
                parcelas_total=parcelas_total,
            )
        )

    return transacoes


def parse_csv_nubank(csv_content: str, arquivo_nome: str) -> List[TransacaoExtraida]:
    """
    Formato Nubank (exemplo que você enviou):
    Data,Valor,Identificador,Descrição
    """
    linhas = csv_content.splitlines()
    transacoes: List[TransacaoExtraida] = []

    if not linhas:
        return transacoes

    # primeira linha é cabeçalho
    for linha in linhas[1:]:
        if not linha.strip():
            continue

        partes = []
        current = ""
        in_quotes = False
        for ch in linha:
            if ch == '"' and not in_quotes:
                in_quotes = True
                continue
            if ch == '"' and in_quotes:
                in_quotes = False
                continue
            if ch == "," and not in_quotes:
                partes.append(current)
                current = ""
            else:
                current += ch
        partes.append(current)

        if len(partes) < 4:
            continue

        data_br, valor_str, _identificador, descricao = [p.strip() for p in partes[:4]]

        try:
            data_iso = _normalizar_data_br(data_br)
            valor = float(valor_str.replace(",", "."))
        except Exception:
            continue

        tipo = "entrada" if valor > 0 else "saida"
        
        # Extrair informações de parcelamento
        parcela_atual, parcelas_total = _extrair_parcelas(descricao)

        transacoes.append(
            TransacaoExtraida(
                data=data_iso,
                descricao=descricao,
                valor=abs(valor),
                tipo=tipo,
                banco_origem="nubank",
                arquivo_nome=arquivo_nome,
                parcela_atual=parcela_atual,
                parcelas_total=parcelas_total,
            )
        )

    return transacoes


def parse_pdf_inter(pdf_bytes: bytes, arquivo_nome: str) -> List[TransacaoExtraida]:
    """
    Parser inicial e simplificado para PDF do Inter.
    Como o layout pode mudar, este parser foca em:
    - linhas que começam com data DD de Mês de YYYY ou DD/MM/YYYY
    - procura valores R$ na mesma linha
    """
    transacoes: List[TransacaoExtraida] = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        texto = ""
        for page in pdf.pages:
            texto += page.extract_text() + "\n"

    # divide em linhas
    linhas = texto.splitlines()

    # regex simplificada para capturar data DD/MM/YYYY
    data_regex = re.compile(r"(\d{2}/\d{2}/\d{4})")
    valor_regex = re.compile(r"(-?R?\$?\s?[\d\.,]+)")

    for linha in linhas:
        m_data = data_regex.search(linha)
        if not m_data:
            continue

        data_br = m_data.group(1)
        try:
            data_iso = _normalizar_data_br(data_br)
        except Exception:
            continue

        # tenta pegar último valor da linha
        valores = valor_regex.findall(linha)
        if not valores:
            continue

        valor_str = valores[-1]
        try:
            valor = _normalizar_valor_br(valor_str)
        except Exception:
            continue

        tipo = "entrada" if valor > 0 else "saida"

        # descrição = linha inteira sem o último valor
        descricao = linha.replace(data_br, "").replace(valor_str, "").strip(" -")

        transacoes.append(
            TransacaoExtraida(
                data=data_iso,
                descricao=descricao,
                valor=abs(valor),
                tipo=tipo,
                banco_origem="inter",
                arquivo_nome=arquivo_nome,
            )
        )

    return transacoes


