import 'server-only'

import { getServiceClient } from '@/lib/ai-secretary/api'
import {
  soccerCases,
  type CaseCategory,
  type SoccerCase,
} from '@/data/cases'

type PublishedCaseRow = {
  case_code: string | null
  age: number | null
  grade: string | null
  position: string | null
  problem: string | null
  cause: string | null
  improvement: string | null
  result: string | null
  publish_status: string
  tags: string[] | null
  youtube_urls: string[] | null
  created_at: string
  updated_at: string
}

const categoryRules: Array<[CaseCategory, string[]]> = [
  ['shooting', ['シュート', 'キック', 'shoot']],
  ['first-touch', ['トラップ', 'ファーストタッチ', 'first touch']],
  ['dribbling', ['ドリブル', 'dribbl']],
  ['one-v-one', ['1対1', '1v1']],
  ['body-movement', ['身体', '体の使い方', 'body']],
  ['running', ['走り', '加速', 'スピード', 'running']],
  ['defending', ['守備', '奪う', 'defend']],
  ['passing', ['パス', 'pass']],
  ['long-ball', ['ロング', 'クロス', 'long ball']],
  ['decision-making', ['判断', 'decision']],
  ['breathing', ['呼吸', 'breath']],
  ['return-from-injury', ['怪我', 'けが', 'injury']],
  ['match-play', ['試合', '実戦', 'match']],
]

function categoriesFor(row: PublishedCaseRow): CaseCategory[] {
  const text = [row.problem, row.cause, row.improvement, ...(row.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const matched = categoryRules
    .filter(([, words]) => words.some((word) => text.includes(word)))
    .map(([category]) => category)
  return matched.length ? matched : ['other']
}

function youtubeId(url: string | null | undefined) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return match?.[1] || null
}

function rowToCase(row: PublishedCaseRow, rank: number): SoccerCase | null {
  if (!row.case_code || !row.problem) return null
  const slug = row.case_code.toLowerCase()
  const video = youtubeId(row.youtube_urls?.[0])
  return {
    case_id: row.case_code,
    slug,
    title: { ja: row.problem, en: '' },
    age: row.age === null ? null : String(row.age),
    grade: row.grade ? { ja: row.grade, en: '' } : null,
    position: row.position,
    symptom: { ja: row.problem, en: '' },
    complaint: { ja: row.problem, en: '' },
    diagnosis: row.cause ? { ja: row.cause, en: '' } : null,
    treatment: row.improvement ? { ja: row.improvement, en: '' } : null,
    before_video: null,
    after_video: null,
    comparison_video: video,
    improvement_time: null,
    result: row.result ? { ja: row.result, en: '' } : null,
    reproducibility: null,
    comment: null,
    category: categoriesFor(row),
    tags: { ja: (row.tags || []).join(' '), en: '' },
    created_at: row.created_at,
    updated_at: row.updated_at,
    source_url: 'https://soccer-kateikyousi.com/cases/',
    source_status: 'public-source',
    featured_rank: rank,
    future: {
      player_id: null,
      lesson_id: null,
      improvement_events: [],
      cause_identification_seconds: null,
      improvement_seconds: null,
      success_rate: null,
      session_tracking: [],
      overseas_case: false,
      ai_analysis: null,
    },
  }
}

export async function getPublicCases(): Promise<SoccerCase[]> {
  const supabase = getServiceClient()
  if (!supabase) return soccerCases

  const { data, error } = await supabase
    .from('ai_secretary_case_assets')
    .select('case_code,age,grade,position,problem,cause,improvement,result,publish_status,tags,youtube_urls,created_at,updated_at')
    .eq('publish_status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1000)

  if (error || !data) return soccerCases

  const staticIds = new Set(soccerCases.map((item) => item.case_id))
  const databaseCases = (data as PublishedCaseRow[])
    .map((row, index) => rowToCase(row, soccerCases.length + index + 1))
    .filter((item): item is SoccerCase => Boolean(item))
    .filter((item) => !staticIds.has(item.case_id))

  return [...soccerCases, ...databaseCases]
}

export async function getPublicCase(slug: string) {
  const cases = await getPublicCases()
  return {
    cases,
    item: cases.find((entry) => entry.slug === slug),
  }
}

