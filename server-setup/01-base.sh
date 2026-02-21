#!/bin/bash
set -euo pipefail

echo "=== OpenFinance Server Setup: Base ==="

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y \
  curl \
  git \
  build-essential \
  ufw \
  htop \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release

# Set up 2GB swap
if [ ! -f /swapfile ]; then
  echo "Creating 2GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap created."
else
  echo "Swap already exists."
fi

# Set timezone to UTC
timedatectl set-timezone UTC

echo "=== Base setup complete ==="
echo "Timezone: $(timedatectl show --property=Timezone --value)"
echo "Swap: $(swapon --show)"
