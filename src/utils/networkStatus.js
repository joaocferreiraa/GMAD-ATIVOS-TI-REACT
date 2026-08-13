import { DEFAULT_THRESHOLDS } from '../constants/monitoramento'

// Classificação de status de um ponto monitorado — SEMPRE a partir de
// medições reais já coletadas (measurements) e dos limites configurados
// pra aquele ponto (thresholds). Nunca gera ou estima um valor; se não há
// medição nenhuma, o status é 'sem-dados', não um chute.

const OSCILLATION_SAMPLE_SIZE = 6 // últimas N medições consideradas pra detectar oscilação
const OSCILLATION_COEF_VARIATION = 0.25 // desvio padrão / média acima disso = "oscilando"
const OSCILLATION_FIELDS = ['latenciaMs', 'downloadMbps', 'uploadMbps', 'packetLossPct']

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdDev(values) {
  const m = mean(values)
  const variance = mean(values.map((v) => (v - m) ** 2))
  return Math.sqrt(variance)
}

// Coeficiente de variação (desvio padrão / média): mede dispersão relativa
// à escala do próprio valor, então a mesma lógica serve tanto pra Mbps
// quanto pra ms sem precisar de um limite arbitrário por métrica. Ex.: a
// série 500,498,501,220,480,190,500 Mbps tem média ~384 e desvio grande o
// bastante pra passar do limite mesmo com a média "parecendo aceitável" —
// exatamente o cenário de oscilação que não pode passar despercebido.
function coefficientOfVariation(values) {
  if (values.length < 2) return 0
  const m = mean(values)
  if (!m) return 0
  return stdDev(values) / m
}

// `measurements` deve vir ordenado da mais antiga pra mais nova.
export function detectOscillation(measurements, field, sampleSize = OSCILLATION_SAMPLE_SIZE) {
  const recent = measurements
    .slice(-sampleSize)
    .map((m) => m[field])
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
  if (recent.length < Math.min(4, sampleSize)) return false
  return coefficientOfVariation(recent) > OSCILLATION_COEF_VARIATION
}

// status: 'sem-dados' | 'offline' | 'problema' | 'atencao' | 'estavel'
export function computeMonitorStatus(measurements, thresholds = {}) {
  if (!measurements || !measurements.length) {
    return { status: 'sem-dados', detalhe: 'Nenhuma medição registrada ainda.' }
  }

  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }
  const ordered = measurements.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const latest = ordered[ordered.length - 1]

  let consecutiveFailures = 0
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].disponivel === false) consecutiveFailures++
    else break
  }
  if (!latest.disponivel || consecutiveFailures >= t.falhasConsecutivasLimite) {
    return {
      status: 'offline',
      detalhe: `Sem resposta (${consecutiveFailures} falha${consecutiveFailures === 1 ? '' : 's'} consecutiva${consecutiveFailures === 1 ? '' : 's'}).`,
    }
  }

  if (latest.latenciaMs != null && latest.latenciaMs > t.latenciaMaximaMs) {
    return {
      status: 'problema',
      detalhe: `Latência de ${latest.latenciaMs}ms acima do limite (${t.latenciaMaximaMs}ms).`,
    }
  }
  if (latest.packetLossPct != null && latest.packetLossPct > t.packetLossMaximoPct) {
    return {
      status: 'problema',
      detalhe: `Perda de pacotes de ${latest.packetLossPct}% acima do limite (${t.packetLossMaximoPct}%).`,
    }
  }
  if (
    t.downloadMinimoMbps > 0 &&
    latest.downloadMbps != null &&
    latest.downloadMbps < t.downloadMinimoMbps
  ) {
    return {
      status: 'problema',
      detalhe: `Download de ${latest.downloadMbps} Mbps abaixo do mínimo (${t.downloadMinimoMbps} Mbps).`,
    }
  }
  if (
    t.uploadMinimoMbps > 0 &&
    latest.uploadMbps != null &&
    latest.uploadMbps < t.uploadMinimoMbps
  ) {
    return {
      status: 'problema',
      detalhe: `Upload de ${latest.uploadMbps} Mbps abaixo do mínimo (${t.uploadMinimoMbps} Mbps).`,
    }
  }

  const oscilando = OSCILLATION_FIELDS.some((field) => detectOscillation(ordered, field))
  if (oscilando) {
    return { status: 'atencao', detalhe: 'Variação significativa nas últimas medições.' }
  }

  return { status: 'estavel', detalhe: null }
}

export const STATUS_LABEL = {
  'sem-dados': 'Sem dados',
  offline: 'Offline',
  problema: 'Problema',
  atencao: 'Atenção',
  estavel: 'Normal',
}

// Mapeia pro Badge genérico (ok/warn/danger/muted) do resto do sistema.
export function statusBadgeVariant(status) {
  if (status === 'estavel') return 'ok'
  if (status === 'atencao') return 'warn'
  if (status === 'offline' || status === 'problema') return 'danger'
  return 'muted'
}
