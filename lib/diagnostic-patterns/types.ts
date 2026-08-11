export type ReviewStatus = 'documented' | 'needs_yatabe_review'

export type LocalizedValue = {
  ja: string
  en: string
}

export type SourceReference = {
  source_id: string
  source_type: 'public_case_page' | 'case_database' | 'video'
  url: string
  note: LocalizedValue
}

export type DiagnosticPattern = {
  pattern_id: string
  slug: string
  version: string
  title: LocalizedValue
  review_status: 'partial_review'
  subject: {
    age: string | null
    grade: LocalizedValue | null
    position: string | null
  }
  symptom: {
    statement: LocalizedValue
    observed_facts: Array<{
      id: string
      fact: LocalizedValue
      status: 'documented'
      source_refs: string[]
    }>
  }
  observation_points: Array<{
    id: string
    label: LocalizedValue
    what_to_observe: LocalizedValue
    status: 'documented'
    source_refs: string[]
  }>
  cause_groups: Array<{
    id: string
    label: LocalizedValue
    documented_finding: LocalizedValue
    priority: 'unconfirmed'
    status: 'documented'
    source_refs: string[]
  }>
  discrimination: {
    status: 'needs_yatabe_review'
    known: LocalizedValue
    missing: LocalizedValue
    review_questions: LocalizedValue[]
  }
  interventions: Array<{
    id: string
    target_cause_ids: string[]
    change: LocalizedValue
    status: 'documented'
    source_refs: string[]
  }>
  improvement: {
    changes: LocalizedValue[]
    time_to_improvement: null
    success_rate: null
    reproducibility: LocalizedValue
    status: 'documented'
    source_refs: string[]
  }
  evidence_cases: Array<{
    case_id: string
    slug: string
    role: 'primary'
    url: string
  }>
  media: Array<{
    youtube_id: string
    role: 'related_comparison'
    before_after_segments: null
    verification_note: LocalizedValue
  }>
  fallback_logic: {
    status: 'needs_yatabe_review'
    missing: LocalizedValue
    review_questions: LocalizedValue[]
  }
  sources: SourceReference[]
  provenance: {
    invented_content: false
    extracted_at: string
    last_reviewed_at: string | null
    reviewed_by: string | null
  }
}
