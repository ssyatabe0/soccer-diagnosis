import type { DiagnosticPattern } from '@/lib/diagnostic-patterns/types'

const sourceUrl = 'https://soccer-kateikyousi.com/intl-mlsnext-001-fw-wg/'
const caseUrl = 'https://soccer-diagnosis.vercel.app/cases/mls-next-forward-receiving-turning'

export const diagnosticPatterns: DiagnosticPattern[] = [
  {
    pattern_id: 'DP-0001',
    slug: 'receiving-turning-under-contact',
    version: '0.1.0',
    title: {
      ja: 'ボールが来ない／背負うとキープ・ターンが乱れる',
      en: 'Not receiving passes / losing control when turning under pressure',
    },
    review_status: 'partial_review',
    subject: {
      age: '16',
      grade: { ja: '高校生', en: 'High school player' },
      position: 'FW / WG',
    },
    symptom: {
      statement: {
        ja: 'ボールが来ず、相手を背負うとキープやターンが乱れる',
        en: 'The player was not receiving enough passes and lost control when holding off a defender or turning.',
      },
      observed_facts: [
        {
          id: 'OF-001',
          fact: { ja: 'パスを受ける回数とボールへの関与が少ない', en: 'The player received too few passes and was not involved enough.' },
          status: 'documented',
          source_refs: ['SRC-001', 'SRC-002'],
        },
        {
          id: 'OF-002',
          fact: { ja: '相手を背負った状態でキープとターンが乱れる', en: 'Retention and turning broke down with a defender behind.' },
          status: 'documented',
          source_refs: ['SRC-001', 'SRC-002'],
        },
      ],
    },
    observation_points: [
      {
        id: 'OP-001',
        label: { ja: 'パスを引き出す準備', en: 'Preparation to receive' },
        what_to_observe: {
          ja: '立ち位置、走り出しのタイミング、コース取り、体の向き、コートの使い方と戦術理解',
          en: 'Positioning, run timing, movement lines, body orientation, use of space and tactical understanding.',
        },
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
      {
        id: 'OP-002',
        label: { ja: '背負って受けた瞬間', en: 'The moment of receiving with pressure behind' },
        what_to_observe: {
          ja: 'ボールの置き場所と、ターン時の身体操作',
          en: 'Ball placement and body mechanics during the turn.',
        },
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
      {
        id: 'OP-003',
        label: { ja: '接触への反応', en: 'Response to contact' },
        what_to_observe: {
          ja: '相手の力を受けた時に力むか、脱力して利用できるか',
          en: 'Whether contact creates tension or can be absorbed and used.',
        },
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
    ],
    cause_groups: [
      {
        id: 'CG-001',
        label: { ja: 'オフザボールの受ける準備', en: 'Off-ball receiving preparation' },
        documented_finding: {
          ja: '味方がパスを出しやすい立ち位置、走り出し、コース、体の向き、空間の使い方が整理されていなかった。',
          en: 'Positioning, run timing, movement lines, body orientation and use of space did not provide a clear passing option.',
        },
        priority: 'unconfirmed',
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
      {
        id: 'CG-002',
        label: { ja: 'ボールの置き場所とターン操作', en: 'Ball placement and turning mechanics' },
        documented_finding: {
          ja: '背負った状態でのボールの置き場所とターン時の身体操作が整理されていなかった。',
          en: 'Ball placement and turning mechanics were not organised when receiving with a defender behind.',
        },
        priority: 'unconfirmed',
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
      {
        id: 'CG-003',
        label: { ja: '接触時の脱力と力の利用', en: 'Relaxation and use of contact' },
        documented_finding: {
          ja: '相手の力を受けた時の脱力と、その力の利用が整理されていなかった。',
          en: 'The player had not organised how to relax under contact and use the opponent’s force.',
        },
        priority: 'unconfirmed',
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
    ],
    discrimination: {
      status: 'needs_yatabe_review',
      known: {
        ja: '公開記録から3つの原因群は確認できる。',
        en: 'Three documented cause groups can be confirmed from the public record.',
      },
      missing: {
        ja: 'どの観察から何を除外し、どの順番で主原因を決めたかは記録されていない。',
        en: 'The record does not state which observations ruled causes in or out, or the order used to identify the primary cause.',
      },
      review_questions: [
        { ja: '最初に変えた項目は何で、その場で何が変わったか？', en: 'What was changed first, and what changed immediately?' },
        { ja: '3つの原因群を、どのテストで切り分けたか？', en: 'Which tests separated the three cause groups?' },
        { ja: '主原因と副次原因の優先順位はどうだったか？', en: 'What was the priority order of primary and secondary causes?' },
      ],
    },
    interventions: [
      {
        id: 'IV-001',
        target_cause_ids: ['CG-001'],
        change: {
          ja: '走り出しのタイミング、パスコースを作るコース取り、体の向き、受け方、コートの使い方と戦術理解を修正した。',
          en: 'Adjusted run timing, movement to create a passing lane, body orientation, receiving shape, use of space and tactical understanding.',
        },
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
      {
        id: 'IV-002',
        target_cause_ids: ['CG-002', 'CG-003'],
        change: {
          ja: '基本ターン、ボールコントロール、相手の力を利用する考え方、身体操作、実戦的なトラップ技術を簡略化して指導した。',
          en: 'Simplified the basic turn, ball control, use of the opponent’s force, body mechanics and game-realistic first touch.',
        },
        status: 'documented',
        source_refs: ['SRC-001', 'SRC-002'],
      },
    ],
    improvement: {
      changes: [
        { ja: 'パスを受ける回数とボールへの関与回数が増えた', en: 'The player received more passes and became involved more often.' },
        { ja: '受ける位置が改善した', en: 'Receiving positions improved.' },
        { ja: '背負った状態でもボールを失いにくくなった', en: 'Ball retention became more reliable with a defender behind.' },
        { ja: 'ターン時のコントロールが安定し、接触でプレーが乱れにくくなった', en: 'Turns became more stable and contact disrupted play less often.' },
      ],
      time_to_improvement: null,
      success_rate: null,
      reproducibility: {
        ja: '高校サッカー部練習参加・ゲーム形式トレーニングを含む実戦環境で変化を確認。',
        en: 'The change was observed in high-school team training and game-based practice.',
      },
      status: 'documented',
      source_refs: ['SRC-001', 'SRC-002'],
    },
    evidence_cases: [
      {
        case_id: 'CASE-0018',
        slug: 'mls-next-forward-receiving-turning',
        role: 'primary',
        url: caseUrl,
      },
    ],
    media: [
      {
        youtube_id: '-yBaE4kztvU',
        role: 'related_comparison',
        before_after_segments: null,
        verification_note: {
          ja: '公開症例に紐づく関連・比較動画。BEFORE / AFTERの正確な区間は未確定のため、改善証明動画とは断定しない。',
          en: 'A related comparison video linked to the public case. Exact before/after segments are not confirmed, so it is not labelled as definitive proof of improvement.',
        },
      },
    ],
    fallback_logic: {
      status: 'needs_yatabe_review',
      missing: {
        ja: '最初の処方で改善しなかった場合に、次に何を見るかは公開記録にない。',
        en: 'The public record does not state what would be checked next if the first intervention failed.',
      },
      review_questions: [
        { ja: '受ける回数が増えない場合、次に視野・味方との距離・走る方向のどれを確認するか？', en: 'If receptions do not increase, what is checked next: scanning, teammate distance or run direction?' },
        { ja: '背負ったキープが変わらない場合、ボール位置・重心・接触への力みをどう再検査するか？', en: 'If retention does not improve, how are ball position, centre of gravity and tension under contact retested?' },
      ],
    },
    sources: [
      {
        source_id: 'SRC-001',
        source_type: 'public_case_page',
        url: sourceUrl,
        note: { ja: '公式サイトの公開症例カルテ', en: 'Public case record on the official website' },
      },
      {
        source_id: 'SRC-002',
        source_type: 'case_database',
        url: caseUrl,
        note: { ja: '症例データベース CASE-0018', en: 'Case Database CASE-0018' },
      },
      {
        source_id: 'SRC-003',
        source_type: 'video',
        url: 'https://www.youtube.com/watch?v=-yBaE4kztvU',
        note: { ja: '関連・比較動画（区間未確定）', en: 'Related comparison video (segments unconfirmed)' },
      },
    ],
    provenance: {
      invented_content: false,
      extracted_at: '2026-08-12T00:00:00+09:00',
      last_reviewed_at: null,
      reviewed_by: null,
    },
  },
]

export function getDiagnosticPattern(slug: string) {
  return diagnosticPatterns.find((pattern) => pattern.slug === slug) ?? null
}
