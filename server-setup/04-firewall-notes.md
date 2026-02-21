# Firewall Rules (Hetzner Cloud Console)

Apply these rules in the Hetzner Cloud Console under **Firewalls**.

## Inbound Rules

| Protocol | Port | Source | Description |
|----------|------|--------|-------------|
| TCP | 22 | 100.64.0.0/10 | SSH via Tailscale only |
| TCP | 80 | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 6001 | 100.64.0.0/10 | Coolify WebSocket (real-time) via Tailscale only |
| TCP | 6002 | 100.64.0.0/10 | Coolify Soketi (WebSocket) via Tailscale only |
| TCP | 8000 | 100.64.0.0/10 | Coolify dashboard via Tailscale only |

## Default Policy

- **Deny all** other inbound traffic

## Notes

- Port 22 is restricted to Tailscale IPs (100.64.0.0/10) so SSH is only accessible through the Tailscale network
- Port 8000 (Coolify dashboard) is also Tailscale-only for security
- Ports 80/443 are open to the world for the web app
- Apply the firewall to the server in Hetzner Cloud Console > Servers > openfinance > Networking > Firewalls
