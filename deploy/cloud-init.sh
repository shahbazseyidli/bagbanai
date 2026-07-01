#!/bin/bash
# Hetzner Cloud user-data: self-deploy Bağban AI on first boot (no SSH needed).
# Paste this into the "Cloud config / user data" box when creating the server.
# TLS is provided by Cloudflare at the edge (proxied A records) → origin serves HTTP :80.
set -eux
export DEBIAN_FRONTEND=noninteractive

# Authorize the operator's SSH key first, so the box is reachable even if a later
# build step fails (useful for debugging). Public key only — safe to store.
mkdir -p /root/.ssh && chmod 700 /root/.ssh
grep -q 'macbookpro' /root/.ssh/authorized_keys 2>/dev/null || \
  echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMjeGrLTovCGB+ZECcF0DC46gb25CiCp5zCilWJjn/+x macbookpro' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# 2 GB swap so the Next.js Docker build is safe on a 4 GB (CX22) box
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update
apt-get install -y git nginx curl ca-certificates
curl -fsSL https://get.docker.com | sh

git clone https://github.com/shahbazseyidli/bagbanai.git /opt/bagbanai
cd /opt/bagbanai

# generate secrets, migrate, seed, build + start api/web (binds 127.0.0.1:8000 / :3000)
bash deploy/bootstrap.sh

# origin nginx vhost on :80 (Cloudflare terminates TLS)
cp deploy/nginx-agradex-http.conf /etc/nginx/sites-available/agradex.com
ln -sf /etc/nginx/sites-available/agradex.com /etc/nginx/sites-enabled/agradex.com
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "bagban-ai cloud-init complete" > /var/log/bagban-init.done
