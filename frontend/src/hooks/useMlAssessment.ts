import { useCallback } from 'react'
import { computeScore } from '@/features/assess/scoring'
import type { DeviceFormData, AssessmentResult, MarketPriceQuote } from '@/types'

// ── ML damage label → issue type mapping ────────────────────────────
const DAMAGE_LABEL_TO_ISSUE: Record<string, string> = {
  'cracked screen': 'Cracked screen',
  'screen crack': 'Cracked screen',
  'broken screen': 'Cracked screen',
  'shattered screen': 'Cracked screen',
  'display damage': 'Cracked screen',
  'battery drain': 'Battery degradation',
  'battery degradation': 'Battery degradation',
  'battery swelling': 'Battery degradation',
  'swollen battery': 'Battery degradation',
  'battery health': 'Battery degradation',
  'charging issue': 'Charging port issue',
  'charging port': 'Charging port issue',
  'not charging': 'Charging port issue',
  'speaker': 'Speaker problem',
  'audio': 'Speaker problem',
  'microphone': 'Speaker problem',
  'no sound': 'Speaker problem',
  'camera': 'Camera malfunction',
  'camera not working': 'Camera malfunction',
  'software': 'Software issue',
  'boot loop': 'Software issue',
  'frozen': 'Software issue',
  'slow performance': 'Software issue',
  'overheating': 'Overheating',
  'thermal': 'Overheating',
  'hot': 'Overheating',
  'motherboard': 'Motherboard failure',
  'no power': 'Motherboard failure',
  'dead board': 'Motherboard failure',
  'water damage': 'Water/Liquid damage',
  'liquid damage': 'Water/Liquid damage',
  'water exposed': 'Water/Liquid damage',
  'moisture': 'Water/Liquid damage',
  'storage': 'Storage failure',
  'storage full': 'Storage failure',
  'corrupt': 'Storage failure',
}

function inferIssueFromMl(predictedLabel: string): string | undefined {
  const lower = predictedLabel.toLowerCase()
  for (const [keyword, issue] of Object.entries(DAMAGE_LABEL_TO_ISSUE)) {
    if (lower.includes(keyword)) return issue
  }
  return undefined
}

function inferSeverity(
  confidence: number,
  repairRatio: number,
): 'low' | 'moderate' | 'severe' {
  if (repairRatio > 0.7 || confidence > 0.8) return 'severe'
  if (repairRatio > 0.4 || confidence > 0.5) return 'moderate'
  return 'low'
}

const ML_HOST = () => import.meta.env.VITE_ML_SERVICE_URL ?? 'http://127.0.0.1:8000'

// ── Unified API call ─────────────────────────────────────────────────
async function callUnified(
  formData: DeviceFormData,
  imageFile: File | null,
): Promise<{
  damageAnalysis: { input: string; predictedLabel: string; confidence: number }
  repairability: { deviceText: string; score: number; isRepairable: boolean; recommendation: string }
  marketplacePrices: MarketPriceQuote[]
  costAnalysis: {
    estimatedRepairCost: number; partsCost: number; laborCost: number
    deviceValue: number; repairRatio: number; recommendation: string
  }
  overallRecommendation: string
  crackDetection?: 'cracked' | 'not_cracked' | 'unknown'
  corrosionLevel?: number | null
  ageWarning: boolean
  damagedComponents: string[]
} | null> {
  const body = new FormData()
  body.append('damage_text', formData.damageDescription)
  body.append('device_brand', formData.brand.trim())
  body.append('device_model', formData.model.trim())
  body.append('device_age_years', String(formData.ageMonths / 12))
  body.append('device_type', formData.deviceType ?? 'Smartphone')
  body.append('price_php', String(formData.pricePhp ?? 15000))
  body.append('fetch_marketplace', 'true')
  if (imageFile) body.append('image', imageFile)

  try {
    const res = await fetch(`${ML_HOST()}/assess/unified`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const data = await res.json()

    const textAnalysis = data.damage_analysis?.text ?? {}
    const combinedAnalysis = data.damage_analysis?.combined ?? {}
    const cracksAnalysis = data.damage_analysis?.cracks ?? {}
    const corrosionAnalysis = data.damage_analysis?.corrosion ?? {}
    const damagedComponents: string[] = data.damage_analysis?.damaged_components ?? []

    return {
      damageAnalysis: {
        input: textAnalysis.predicted_label ?? formData.damageDescription,
        predictedLabel: combinedAnalysis.damage_type ?? textAnalysis.predicted_label ?? 'Unknown',
        confidence: combinedAnalysis.combined_confidence ?? textAnalysis.confidence ?? 0,
      },
      repairability: {
        deviceText: `${formData.brand} ${formData.model} ${formData.deviceType ?? ''}`.trim(),
        score: (data.repairability?.repairability_index ?? 50) / 10,
        isRepairable: data.repairability?.is_repairable ?? false, // Fix 5: safe default is false
        recommendation: data.repairability?.reason ?? '',
      },
      marketplacePrices: (data.marketplace_prices ?? []).map((p: Record<string, unknown>) => ({
        source: p.source as 'Shopee' | 'Lazada',
        title: p.title as string,
        price: p.price_php as number,
        currency: (p.currency as string) ?? 'PHP',
        url: p.url as string,
        component: p.component as string | undefined,
      })),
      costAnalysis: {
        estimatedRepairCost: data.pricing?.total_repair_cost_php ?? 0,
        partsCost: data.pricing?.estimated_parts_cost_php ?? 0,
        laborCost: data.pricing?.labor_fee_php ?? 600,
        deviceValue: data.pricing?.original_device_price_php ?? (formData.pricePhp ?? 15000),
        repairRatio: data.pricing?.repair_ratio ?? 0,
        recommendation: data.pricing?.price_recommendation ?? '',
      },
      overallRecommendation: data.final_recommendation?.decision ?? '',
      crackDetection: cracksAnalysis.classification,
      corrosionLevel: corrosionAnalysis.corrosion_level ?? null,
      ageWarning: data.repairability?.age_warning ?? false,
      damagedComponents,
    }
  } catch {
    return null
  }
}

// ── Direction decision (Fix 4) ───────────────────────────────────────
// Previously direction was set ONLY from isRepairable.
// Now we also enforce RECYCLE when repair cost exceeds 70% of device value,
// matching the logic the ML backend already computes in final_recommendation.
const REPAIR_RATIO_RECYCLE_THRESHOLD = 0.70

function resolveDirection(
  isRepairable: boolean,
  repairRatio: number,
): 'REPAIR' | 'RECYCLE' {
  if (!isRepairable) return 'RECYCLE'
  if (repairRatio >= REPAIR_RATIO_RECYCLE_THRESHOLD) return 'RECYCLE'
  return 'REPAIR'
}

export function useMlAssessment() {
  const assessWithFallback = useCallback(
    async (
      formData: DeviceFormData,
      imageFile: File | null,
    ): Promise<{ result: AssessmentResult; usedMl: boolean }> => {
      const baseResult = computeScore(formData)

      const mlResult = await callUnified(formData, imageFile)

      if (!mlResult) {
        return { result: baseResult, usedMl: false }
      }

      const mlScore = Math.round(mlResult.repairability.score * 10)

      // Fix 4: direction now accounts for repair cost ratio, not just isRepairable
      const mlDirection = resolveDirection(
        mlResult.repairability.isRepairable,
        mlResult.costAnalysis.repairRatio,
      )

      const mlConfidence = mlResult.damageAnalysis.confidence >= 0.7 ? 'high' as const
        : mlResult.damageAnalysis.confidence >= 0.4 ? 'medium' as const
        : 'low' as const

      const costEstimate = mlResult.costAnalysis.estimatedRepairCost > 0
        ? { min: Math.round(mlResult.costAnalysis.estimatedRepairCost * 0.8), max: Math.round(mlResult.costAnalysis.estimatedRepairCost * 1.2) }
        : baseResult.costEstimate

      const issue = inferIssueFromMl(mlResult.damageAnalysis.predictedLabel)
      const severity = inferSeverity(
        mlResult.damageAnalysis.confidence,
        mlResult.costAnalysis.repairRatio,
      )

      return {
        result: {
          score: mlScore,
          direction: mlDirection,
          rationale: mlResult.overallRecommendation || mlResult.repairability.recommendation,
          confidence: mlConfidence,
          costEstimate,
          marketPrices: mlResult.marketplacePrices,
          mlDamage: mlResult.damageAnalysis,
          mlRepairability: mlResult.repairability,
          mlCostAnalysis: mlResult.costAnalysis,
          mlRecommendation: mlResult.overallRecommendation,
          mlCrackDetection: mlResult.crackDetection,
          mlCorrosionLevel: mlResult.corrosionLevel,
          mlAgeWarning: mlResult.ageWarning,
          mlDamagedComponents: mlResult.damagedComponents,
          fromMl: true,
          issue,
          severity,
        },
        usedMl: true,
      }
    },
    [],
  )

  return { assessWithFallback }
}
