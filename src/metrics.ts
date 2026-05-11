import { Registry, Gauge, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const activeConnections = new Gauge({
  name: "pairup_active_connections",
  help: "Number of active WebRTC connections",
  registers: [registry],
});

export const totalMatches = new Counter({
  name: "pairup_total_matches_total",
  help: "Total number of successful matches made",
  registers: [registry],
});

export const usersInQueue = new Gauge({
  name: "pairup_users_in_queue",
  help: "Number of users currently waiting in queue",
  registers: [registry],
});

export const skipCounter = new Counter({
  name: "pairup_skips_total",
  help: "Total number of skip events",
  registers: [registry],
});

export const matchDuration = new Histogram({
  name: "pairup_match_duration_seconds",
  help: "Duration of matched sessions in seconds",
  buckets: [5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});
