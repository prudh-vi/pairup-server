#!/bin/bash
# Installs Prometheus, Node Exporter, and Grafana on Ubuntu 22.04.
# Run as root or with sudo on the Azure VM.
set -euo pipefail

PROMETHEUS_VERSION="2.51.2"
NODE_EXPORTER_VERSION="1.7.0"
ARCH="linux-amd64"

# ─── Token ───────────────────────────────────────────────────────────────────
METRICS_TOKEN="${1:-}"
if [ -z "$METRICS_TOKEN" ]; then
  read -rp "Enter METRICS_TOKEN (same value as in your .env): " METRICS_TOKEN
fi
if [ -z "$METRICS_TOKEN" ]; then
  echo "Error: METRICS_TOKEN cannot be empty." >&2
  exit 1
fi

# ─── Helpers ─────────────────────────────────────────────────────────────────
need_sudo() { [ "$(id -u)" -ne 0 ] && echo "sudo" || echo ""; }
SUDO=$(need_sudo)

echo "==> Updating package lists..."
$SUDO apt-get update -q

# ─── Prometheus ──────────────────────────────────────────────────────────────
echo "==> Installing Prometheus ${PROMETHEUS_VERSION}..."

cd /tmp
curl -fsSL "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.${ARCH}.tar.gz" \
  -o prometheus.tar.gz
tar xzf prometheus.tar.gz
cd "prometheus-${PROMETHEUS_VERSION}.${ARCH}"

$SUDO mv prometheus /usr/local/bin/prometheus
$SUDO mv promtool  /usr/local/bin/promtool

$SUDO useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || true
$SUDO mkdir -p /etc/prometheus /var/lib/prometheus
$SUDO cp -r consoles console_libraries /etc/prometheus/
$SUDO chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus

cd /tmp && rm -rf "prometheus-${PROMETHEUS_VERSION}.${ARCH}" prometheus.tar.gz

# Write prometheus.yml with the real token substituted in
$SUDO tee /etc/prometheus/prometheus.yml > /dev/null <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "pairup-backend"
    scheme: https
    metrics_path: /metrics
    authorization:
      credentials: "${METRICS_TOKEN}"
    static_configs:
      - targets: ["backxpairup.zrxprudhvi.tech"]
    tls_config:
      insecure_skip_verify: false

  - job_name: "node-exporter"
    static_configs:
      - targets: ["localhost:9100"]
EOF

$SUDO chown prometheus:prometheus /etc/prometheus/prometheus.yml

$SUDO tee /etc/systemd/system/prometheus.service > /dev/null <<'EOF'
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --web.listen-address=127.0.0.1:9090 \
  --storage.tsdb.retention.time=15d
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# ─── Node Exporter ───────────────────────────────────────────────────────────
echo "==> Installing Node Exporter ${NODE_EXPORTER_VERSION}..."

cd /tmp
curl -fsSL "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.${ARCH}.tar.gz" \
  -o node_exporter.tar.gz
tar xzf node_exporter.tar.gz

$SUDO mv "node_exporter-${NODE_EXPORTER_VERSION}.${ARCH}/node_exporter" /usr/local/bin/node_exporter
$SUDO useradd --no-create-home --shell /bin/false node_exporter 2>/dev/null || true

rm -rf "node_exporter-${NODE_EXPORTER_VERSION}.${ARCH}" node_exporter.tar.gz

$SUDO tee /etc/systemd/system/node_exporter.service > /dev/null <<'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# ─── Grafana ─────────────────────────────────────────────────────────────────
echo "==> Installing Grafana..."

$SUDO apt-get install -y apt-transport-https software-properties-common wget gnupg
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | $SUDO tee /usr/share/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
  | $SUDO tee /etc/apt/sources.list.d/grafana.list > /dev/null
$SUDO apt-get update -q
$SUDO apt-get install -y grafana

# Bind Grafana to localhost only
$SUDO sed -i 's/^;http_addr =.*$/http_addr = 127.0.0.1/' /etc/grafana/grafana.ini

# ─── Enable & start everything ───────────────────────────────────────────────
echo "==> Enabling and starting services..."

$SUDO systemctl daemon-reload

for svc in prometheus node_exporter grafana-server; do
  $SUDO systemctl enable "$svc"
  $SUDO systemctl restart "$svc"
done

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Monitoring stack installed and running."
echo ""
echo "   Prometheus : http://127.0.0.1:9090  (localhost only)"
echo "   Grafana    : http://127.0.0.1:3001  (localhost only)"
echo "   Node Exp.  : http://127.0.0.1:9100  (localhost only)"
echo ""
echo "   To access Grafana from your machine, run:"
echo "     ssh -L 3001:127.0.0.1:3001 <user>@<vm-ip>"
echo "   Default Grafana login: admin / admin"
echo ""
echo "   Prometheus scraping: https://backxpairup.zrxprudhvi.tech/metrics"
echo "   Token used: ${METRICS_TOKEN:0:4}****"
