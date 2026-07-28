export type CauseDiagnosisObservation = {
  id: string
  timestamp_seconds: number
  fact: string
  visibility: 'visible' | 'unclear'
}

export type CauseDiagnosisHypothesis = {
  rank: number
  cause: string
  evidence_ids: string[]
  reasoning: string
  confidence: number
  verification_test: string
  if_confirmed_intervention: string
}

export type CauseDiagnosisRelatedCase = {
  case_id: string
  title: string
  symptom: string
  improvement_time: string | null
  url: string
}

export type CauseDiagnosisResult = {
  analysis_id: string
  primary_issue: string
  summary: string
  observations: CauseDiagnosisObservation[]
  cause_hypotheses: CauseDiagnosisHypothesis[]
  verification_order: string[]
  related_cases: CauseDiagnosisRelatedCase[]
  limitations: string[]
  reviewed_by_coach: false
  model: string
  analyzed_at: string
}

export type CauseDiagnosisFrame = {
  timestamp_seconds: number
  image_data_url: string
}
