#!/bin/bash

# Script to generate and setup CRX private key for GitHub Actions

echo "🔑 Setting up CRX private key for GitHub Actions"
echo ""

# Generate private key if it doesn't exist
if [ ! -f "private-key.pem" ]; then
    echo "📝 Generating new private key..."
    openssl genrsa -out private-key.pem 2048
    chmod 600 private-key.pem
    echo "✅ Private key generated: private-key.pem"
else
    echo "✅ Using existing private key: private-key.pem"
fi

echo ""
echo "🔒 GitHub Secret Setup Instructions:"
echo ""
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo "4. Name: CRX_PRIVATE_KEY"
echo "5. Value: Copy the content below (including BEGIN/END lines)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat private-key.pem
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "6. Click 'Add secret'"
echo ""

# Generate extension ID for reference
echo "📋 Extension ID (for reference):"
openssl rsa -in private-key.pem -pubout -outform DER 2>/dev/null | openssl dgst -sha256 -hex | cut -d' ' -f2 | cut -c1-32 | sed 's/./&/16' | tr '0-9a-f' 'a-p'

echo ""
echo "⚠️  Security Notes:"
echo "   - Keep private-key.pem secure and never commit it to git"
echo "   - The key in GitHub Secrets is encrypted and secure"
echo "   - Same key = same extension ID = auto-updates work"
echo "   - If you lose the key, users need to reinstall the CRX"
echo ""
echo "🎯 Next Steps:"
echo "   1. Add the secret to GitHub (see instructions above)"
echo "   2. Add private-key.pem to .gitignore"
echo "   3. Keep private-key.pem backed up securely"
echo "   4. Test release: git tag v1.0.1 && git push origin v1.0.1"