import { useCallback } from 'react'
import { computeScore } from '@/features/assess/scoring'
import type { DeviceFormData, AssessmentResult, MarketPriceQuote } from '@/types'

const ML_HOST = () => import.meta.env.VITE_ML_SERVICE_URL ?? 'http://127.0.0.1:8000'

async function callCombined(
  formData: DeviceFormData,
): Promise<{
  damageAssessment: { input: string; predictedLabel: string; confidence: number }
  repairability: { deviceText: string; score: number; isRepairable: boolean; recommendation: string }
  marketplacePrices: MarketPriceQuote[]
  costAnalysis: {
    estimatedRepairCost: number; partsCost: number; laborCost: number
    deviceValue: number; repairRatio: number; recommendation: string
  }
  overallRecommendation: string
} | null> {
  const body = {
    damage_text: formData.damageDescription,
    device_brand: formData.brand.trim(),
    device_model: formData.model.trim(),
    device_age_months: formData.ageMonths,
    device_type: 'Smartphone',
    repair_cost: 0,
    price: 15000,
    fetch_marketplace: true,
  }

  try {
    const res = await fetch(`${ML_HOST()}/assess/combined`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      damageAssessment: {
        input: data.damage_assessment?.input ?? formData.damageDescription,
        predictedLabel: data.damage_assessment?.predicted_label ?? 'Unknown',
        confidence: data.damage_assessment?.confidence ?? 0,
      },
      repairability: {
        deviceText: data.repairability_assessment?.device_text ?? `${formData.brand} ${formData.model}`,
        score: data.repairability_assessment?.repairability_score ?? 5,
        isRepairable: data.repairability_assessment?.is_repairable ?? true,
        recommendation: data.repairability_assessment?.recommendation ?? '',
      },
      marketplacePrices: (data.marketplace_prices ?? []).map((p: Record<string, unknown>) => ({
        source: p.source as 'Shopee' | 'Lazada',
        title: p.title as string,
        price: p.price as number,
        currency: p.currency as string,
        url: p.url as string,
      })),
      costAnalysis: {
        estimatedRepairCost: data.cost_analysis?.estimated_repair_cost ?? 0,
        partsCost: data.cost_analysis?.estimated_parts_cost ?? 0,
        laborCost: data.cost_analysis?.labor_cost ?? 0,
        deviceValue: data.cost_analysis?.device_value ?? 15000,
        repairRatio: data.cost_analysis?.repair_ratio ?? 0,
        recommendation: data.cost_analysis?.recommendation ?? '',
      },
      overallRecommendation: data.overall_recommendation ?? '',
    }
  } catch {
    return null
  }
}

async function callPredict(
  imageFile: File,
  brand: string,
  model: string,
): Promise<{ label: string; probability: number; marketPrices: MarketPriceQuote[] } | null> {
  try {
    const formData = new FormData()
    formData.append('brand', brand)
    formData.append('model', model)
    formData.append('file', imageFile)

    const res = await fetch(`${ML_HOST()}/predict`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      label: data.label,
      probability: data.probability,
      marketPrices: (data.market_prices ?? []).map((p: Record<string, unknown>) => ({
        source: p.source as 'Shopee' | 'Lazada',
        title: p.title as string,
        price: p.price as number,
        currency: p.currency as string,
        url: p.url as string,
      })),
    }
  } catch {
    return null
  }
}

export function useMlAssessment() {
  const assessWithFallback = useCallback(
    async (
      formData: DeviceFormData,
      imageFile: File | null,
    ): Promise<{ result: AssessmentResult; usedMl: boolean }> => {
      const baseResult = computeScore(formData)

      const [mlCombined, mlPredict] = await Promise.all([
        callCombined(formData),
        imageFile ? callPredict(imageFile, formData.brand.trim(), formData.model.trim()) : Promise.resolve(null),
      ])

      if (!mlCombined) {
        return {
          result: {
            ...baseResult,
            modelLabel: mlPredict?.label,
            modelProbability: mlPredict?.probability,
            marketPrices: mlPredict?.marketPrices,
          },
          usedMl: false,
        }
      }

      const mlScore = Math.round(mlCombined.repairability.score * 10)
      const mlDirection = mlCombined.repairability.isRepairable ? 'REPAIR' as const : 'RECYCLE' as const
      const mlConfidence = mlCombined.damageAssessment.confidence >= 0.7 ? 'high' as const
        : mlCombined.damageAssessment.confidence >= 0.4 ? 'medium' as const
        : 'low' as const

      const costEstimate = mlCombined.costAnalysis.estimatedRepairCost > 0
        ? { min: Math.round(mlCombined.costAnalysis.estimatedRepairCost * 0.8), max: Math.round(mlCombined.costAnalysis.estimatedRepairCost * 1.2) }
        : baseResult.costEstimate

      return {
        result: {
          score: mlScore,
          direction: mlDirection,
          rationale: mlCombined.overallRecommendation || mlCombined.repairability.recommendation,
          confidence: mlConfidence,
          costEstimate,
          modelLabel: mlPredict?.label,
          modelProbability: mlPredict?.probability,
          marketPrices: mlCombined.marketplacePrices.length > 0 ? mlCombined.marketplacePrices : mlPredict?.marketPrices,
          mlDamage: mlCombined.damageAssessment,
          mlRepairability: mlCombined.repairability,
          mlCostAnalysis: mlCombined.costAnalysis,
          mlRecommendation: mlCombined.overallRecommendation,
          fromMl: true,
        },
        usedMl: true,
      }
    },
    [],
  )

  return { assessWithFallback }
}
