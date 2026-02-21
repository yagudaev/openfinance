#!/bin/bash
set -euo pipefail

echo "=== OpenFinance Server Setup: Coolify ==="

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

echo ""
echo "=== Coolify setup complete ==="
echo "Dashboard: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "Next steps:"
echo "1. Open the Coolify dashboard in your browser"
echo "2. Create an admin account"
echo "3. Add your GitHub repo as a new project"
echo "4. Configure the build settings (Nixpacks or Dockerfile)"
echo "5. Set environment variables"
echo "6. Deploy!"
