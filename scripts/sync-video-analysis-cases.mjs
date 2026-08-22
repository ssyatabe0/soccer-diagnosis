#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const defaultSource = '/Users/yatabeshinnosuke/Documents/フル動画解析/case_records'
const defaultOutput = path.resolve('data/generated/video-analysis-imports.json')
const args = new Map(process.argv.slice(2).map((value, index, all) => (
  value.startsWith('--') ? [value, all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : true] : [value, true]
)))
const sourceDir = path.resolve(String(args.get('--source') || defaultSource))
const outputFile = path.resolve(String(args.get('--output') || defaultOutput))

function text(value) {
  if (value === undefined || value === null) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized && !/^(未入力|未確定|抽出待ち)/.test(normalized) ? normalized : null
}

function list(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : []
}

function stableCode(sourceId) {
  return `VIDEO-${createHash('sha256').update(sourceId).digest('hex').slice(0, 12).toUpperCase()}`
}

function verifiedImprovementSeconds(record) {
  const moments = Array.isArray(record.improvement_moments) ? record.improvement_moments : []
  const verified = moments.find((moment) => (
    moment?.verification === 'video_verified' &&
    Number.isFinite(Number(moment?.improvement_time_seconds))
  ))
  if (verified) return Number(verified.improvement_time_seconds)
  if (record.improvement_time?.video_verified && Number.isFinite(Number(record.improvement_time?.seconds))) {
    return Number(record.improvement_time.seconds)
  }
  return null
}

function publicYoutubeUrl(record) {
  const candidates = [
    record.youtube_url,
    record.public_case?.youtube_url,
    record.source?.youtube_url,
  ].flat().filter(Boolean)
  return candidates.find((url) => /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//.test(String(url))) || null
}

function hasVideoCheckRequired(record) {
  const explicitValues = [
    record.status,
    record.verification,
    record.verification_status,
    record.public_case?.verification,
  ]
  return explicitValues.some((value) => (
    typeof value === 'string' && value.includes('video_check_required')
  ))
}

function normalize(record, sourceFile) {
  const sourceId = text(record.id) || text(record.case_id) || path.basename(sourceFile, '.json')
  const publicCase = record.public_case || {}
  const anonymized = record.verification?.public_anonymization_checked === true
  const problem = text(publicCase.problem) || text(record.initial_problem)
  const cause = text(publicCase.cause) || text(record.root_cause) || text(record.root_cause_hypothesis)
  const prescriptions = list(record.training_prescription)
  const improvement = text(publicCase.body) || (prescriptions.length ? prescriptions.join('。') : null)
  const result = text(publicCase.result) || text(record.before_after_summary)
  const student = record.student || record.student_profile || {}
  const age = Number.isFinite(Number(student.age)) ? Number(student.age) : null
  const sourceUpdated = text(record.updated_at) || text(record.created_at) || text(record.lesson_date)
  const verificationStatus = verifiedImprovementSeconds(record) !== null
    ? 'video_verified'
    : (hasVideoCheckRequired(record) ? 'video_check_required' : (problem && cause ? 'case_ready_video_pending' : 'incomplete'))

  return {
    case_code: stableCode(sourceId),
    source_id: sourceId,
    source_file: path.basename(sourceFile),
    title: text(publicCase.title) || problem,
    age,
    grade: text(student.grade),
    position: text(student.position),
    problem,
    cause,
    improvement,
    result,
    improvement_time_seconds: verifiedImprovementSeconds(record),
    publish_status: 'permission_needed',
    publication_consent: false,
    anonymized_verified: anonymized,
    verification_status: verificationStatus,
    tags: [...new Set([...list(record.tags), ...list(record.lesson_theme)])],
    youtube_url: publicYoutubeUrl(record),
    lesson_date: text(record.lesson_date),
    updated_at: sourceUpdated || new Date().toISOString(),
  }
}

function isCaseRecord(record, fileName) {
  return Boolean(
    record &&
    typeof record === 'object' &&
    !Array.isArray(record) &&
    (record.id || record.case_id) &&
    (
      record.student ||
      record.public_case ||
      record.initial_problem ||
      /^\d{8}_.+\.json$/.test(fileName)
    ),
  )
}

const entries = await readdir(sourceDir, { withFileTypes: true })
const records = []
const errors = []

for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name))) {
  const file = path.join(sourceDir, entry.name)
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    if (isCaseRecord(parsed, entry.name)) records.push(normalize(parsed, file))
  } catch (error) {
    errors.push({ file: entry.name, error: error instanceof Error ? error.message : String(error) })
  }
}

const unique = [...new Map(records.map((record) => [record.source_id, record])).values()]
const output = {
  schema_version: '1.0.0',
  generated_at: new Date().toISOString(),
  source: '谷田部指導パターンを分析',
  policy: {
    default_publish_status: 'permission_needed',
    auto_publish: false,
    note: '公開許可と匿名化確認が揃うまで公開症例には表示しない。',
  },
  count: unique.length,
  errors,
  records: unique,
}

let changed = true
try {
  const previous = JSON.parse(await readFile(outputFile, 'utf8'))
  const previousComparable = { ...previous, generated_at: null }
  const nextComparable = { ...output, generated_at: null }
  changed = JSON.stringify(previousComparable) !== JSON.stringify(nextComparable)
} catch {}

if (changed) await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
process.stdout.write(JSON.stringify({
  status: 'ok',
  source: sourceDir,
  output: outputFile,
  count: unique.length,
  errors: errors.length,
  changed,
}, null, 2) + '\n')
