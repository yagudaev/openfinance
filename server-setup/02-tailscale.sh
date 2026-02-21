#!/bin/bash
set -euo pipefail

echo "=== OpenFinance Server Setup: Tailscale ==="

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale — this will print an auth URL
echo ""
echo "============================================"
echo "  IMPORTANT: Tailscale auth required!"
echo "  Running 'tailscale up' now..."
echo "  Copy the URL below and open it in your browser"
echo "  to authenticate this server."
echo "============================================"
echo ""

tailscale up

echo ""
echo "=== Tailscale setup complete ==="
echo "Tailscale IP: $(tailscale ip -4)"
