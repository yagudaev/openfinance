# Firewall Rules (Hetzner Cloud Console)

Apply these rules in the Hetzner Cloud Console under **Firewalls**.

## Inbound Rules

| Protocol | Port | Source | Description |
|----------|------|--------|-------------|
| TCP | 22 | 0.0.0.0/0 | SSH (secured by Tailscale at OS level) |
| TCP | 80 | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 6001 | 0.0.0.0/0 | Coolify WebSocket (real-time) |
| TCP | 6002 | 0.0.0.0/0 | Coolify Soketi (WebSocket) |
| TCP | 8000 | 0.0.0.0/0 | Coolify dashboard |

## Default Policy

- **Deny all** other inbound traffic

## Notes

- **Hetzner cloud firewall limitation**: Hetzner's firewall operates at the infrastructure level and only sees public source IPs. It cannot filter by Tailscale overlay IPs (100.64.0.0/10) because Tailscale traffic arrives encapsulated over the public internet. Restricting ports to Tailscale IPs at the Hetzner firewall level silently drops all Tailscale traffic.
- Because of this, all ports must be open to 0.0.0.0/0 in the Hetzner firewall. Access control for SSH, Coolify dashboard, and WebSocket ports is enforced at the OS level by Tailscale (only devices on the tailnet can connect).
- Ports 80/443 are open to the world for the web app
- Apply the firewall to the server in Hetzner Cloud Console > Servers > openfinance > Networking > Firewalls
