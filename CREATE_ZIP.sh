#!/bin/bash

echo "================================================"
echo "📦 Criando arquivo ZIP do FinSystem v1.0"
echo "================================================"

cd /app/frontend

# Criar ZIP excluindo node_modules e build
echo "Compactando arquivos..."
zip -r /tmp/finsystem-v1-complete.zip . \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/build/*" \
  -x "*/.cache/*" \
  -x "*/coverage/*" \
  -x "*/.DS_Store" \
  -x "*/npm-debug.log*" \
  -x "*/yarn-debug.log*" \
  -x "*/yarn-error.log*"

echo ""
echo "✅ ZIP criado com sucesso!"
echo "📁 Localização: /tmp/finsystem-v1-complete.zip"
echo ""
echo "📊 Tamanho do arquivo:"
ls -lh /tmp/finsystem-v1-complete.zip
echo ""
echo "================================================"
echo "PRÓXIMOS PASSOS:"
echo "================================================"
echo "1. Baixe o arquivo /tmp/finsystem-v1-complete.zip"
echo "2. Extraia em seu computador"
echo "3. Execute: yarn install"
echo "4. Execute: yarn start"
echo ""
echo "📖 Leia o README.md para instruções completas"
echo "================================================"
