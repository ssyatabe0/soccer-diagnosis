import { matchService, nextAction, summarizeText } from './intelligence'

export type DiagnosisInput = {
  text: string
  sourceType?: string | null
  sourceId?: string | number | null
  customerName?: string | null
  customerServiceType?: string | null
}

export type CaseMatch = {
  id: string
  title: string
  problem: string | null
  result: string | null
  score: number
}

export type ProductOption = {
  id: string
  name: string
  service_type: string
  product_type: string
  ticket_count: number | null
  price: number | null
  monthly_fee: number | null
  notes: string | null
}

export function classifyConcern(text: string) {
  const value = text.toLowerCase()
  if (text.includes('ドリブル') || text.includes('抜け') || text.includes('1対1')) return 'ドリブル・1対1改善'
  if (text.includes('シュート') || text.includes('キック') || text.includes('決定力')) return 'シュート・キック改善'
  if (text.includes('セレクション') || value.includes('tryout') || value.includes('selection')) return 'セレクション対策'
  if (text.includes('試合') || text.includes('消える') || text.includes('活躍')) return '試合での関与・判断改善'
  if (text.includes('自信') || text.includes('メンタル') || text.includes('楽しく')) return '自信・メンタル面の改善'
  if (text.includes('初心者') || text.includes('初めて') || text.includes('キッズ')) return '初心者・低学年の基礎づくり'
  if (text.includes('海外') || text.includes('グアム') || value.includes('mls next')) return '海外・短期滞在向けサポート'
  return '総合サッカー相談'
}

export function inferCauses(text: string) {
  const causes: string[] = []
  if (text.includes('ドリブル') || text.includes('抜け')) causes.push('相手との距離、身体の向き、仕掛けるタイミングが整理できていない可能性')
  if (text.includes('シュート') || text.includes('キック')) causes.push('軸足、踏み込み、上半身の使い方、ボールへの入り方に改善余地')
  if (text.includes('試合') || text.includes('消える')) causes.push('ボールを受ける前の準備、立ち位置、判断の優先順位が曖昧な可能性')
  if (text.includes('自信') || text.includes('消極')) causes.push('成功体験不足により、チャレンジ回数が減っている可能性')
  if (text.includes('セレクション')) causes.push('評価されやすいプレーの整理と試合形式での再現性が不足している可能性')
  if (causes.length === 0) causes.push('動画・試合状況・現在の練習環境を確認して原因を絞る必要')
  return causes
}

export function improvementPriorities(text: string) {
  const concern = classifyConcern(text)
  if (concern.includes('ドリブル')) return ['現状の抜けない場面を動画で確認', '身体の向きとファーストタッチを修正', '1対1で成功体験を作る', '試合で使う判断条件を整理']
  if (concern.includes('シュート')) return ['フォームと踏み込みを確認', '強く蹴る前の入り方を修正', '止まったボールから動いたボールへ段階化', '試合で打つ判断を増やす']
  if (concern.includes('セレクション')) return ['評価ポイントを整理', '強みと弱みを診断', '試合形式で見せるプレーを決める', '短期集中で再現性を上げる']
  if (concern.includes('試合')) return ['立ち位置と関わり方を確認', 'ボールを受ける前の準備を作る', '判断の優先順位を整理', '試合動画で振り返る']
  return ['現状ヒアリング', '動画または体験で原因診断', '優先課題を1つに絞る', 'サービス・回数を提案']
}

export function recommendService(text: string, currentService?: string | null) {
  const service = matchService(text)
  if (service !== 'unknown') return service
  if (currentService && currentService !== 'unknown') return currentService
  if (text.includes('動画') || text.includes('遠方') || text.includes('海外')) return 'private_lesson'
  return 'private_lesson'
}

export function serviceLabel(service: string) {
  const labels: Record<string, string> = {
    private_lesson: '個人レッスン',
    ashiwaza_dribble: '足技塾',
    kids_school: 'キッズスクール',
    sysc: 'SYSC',
    overseas: '海外向けサービス',
    unknown: '個別相談',
  }
  return labels[service] || service
}

export function choosePlan(text: string, service: string, products: ProductOption[]) {
  const value = text.toLowerCase()
  const serviceProducts = products.filter((product) => product.service_type === service || (service === 'overseas' && product.service_type === 'private_lesson'))
  if (text.includes('短期') || text.includes('セレクション') || value.includes('tryout')) return serviceProducts.find((p) => p.product_type === 'intensive') || serviceProducts[0] || products[0]
  if (text.includes('動画') || text.includes('オンライン') || text.includes('遠方')) return serviceProducts.find((p) => p.product_type === 'diagnosis') || serviceProducts[0] || products[0]
  if (text.includes('継続') || text.includes('しっかり') || text.includes('改善')) return serviceProducts.find((p) => p.ticket_count === 8) || serviceProducts.find((p) => p.product_type === 'monthly') || serviceProducts[0] || products[0]
  return serviceProducts.find((p) => p.ticket_count === 4) || serviceProducts[0] || products[0]
}

export function scoreCases(text: string, cases: Array<{ id: string; case_code: string | null; child_name?: string | null; full_name?: string | null; problem: string | null; cause: string | null; improvement: string | null; result: string | null; tags: string[] | null }>) {
  const words = [classifyConcern(text), ...text.split(/[\s、。・,]+/)].map((w) => w.toLowerCase()).filter((w) => w.length >= 2)
  return cases.map((item) => {
    const haystack = [item.case_code, item.child_name, item.full_name, item.problem, item.cause, item.improvement, item.result, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase()
    const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0)
    return { id: item.id, title: item.case_code || item.child_name || item.full_name || '症例', problem: item.problem, result: item.result, score }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
}

export function generateDiagnosisText(input: DiagnosisInput, caseMatches: CaseMatch[], products: ProductOption[]) {
  const concern = classifyConcern(input.text)
  const causes = inferCauses(input.text)
  const priorities = improvementPriorities(input.text)
  const service = recommendService(input.text, input.customerServiceType)
  const plan = choosePlan(input.text, service, products)
  return {
    concern,
    causes,
    priorities,
    recommendedService: service,
    recommendedPlan: plan,
    nextStep: nextAction(input.text),
    summary: `${input.customerName || '相談者'}: ${summarizeText(input.text, '相談内容')}`,
    proposal: buildProposal({ input, concern, causes, priorities, caseMatches, service, plan }),
  }
}

export function buildProposal({ input, concern, causes, priorities, caseMatches, service, plan }: { input: DiagnosisInput; concern: string; causes: string[]; priorities: string[]; caseMatches: CaseMatch[]; service: string; plan?: ProductOption }) {
  const cases = caseMatches.length > 0 ? caseMatches.map((item) => `- ${item.title}: ${item.problem || ''} / ${item.result || ''}`).join('\n') : '- 類似症例は今後追加データから補強'
  const price = plan?.price ? `${plan.price.toLocaleString()}円` : plan?.monthly_fee ? `月謝 ${plan.monthly_fee.toLocaleString()}円` : '料金は確認後に提示'
  return `# AI提案書下書き\n\n## 現在の悩み\n${concern}\n\n## 相談内容\n${summarizeText(input.text, '相談内容')}\n\n## 推定原因\n${causes.map((cause) => `- ${cause}`).join('\n')}\n\n## 改善優先順位\n${priorities.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n## 類似症例\n${cases}\n\n## おすすめサービス\n${serviceLabel(service)}\n\n## おすすめプラン\n${plan?.name || '個別診断後に確定'}\n\n## 料金\n${price}\n\n## 次のステップ\n- 体験または動画診断で現状を確認\n- 優先課題を1つに絞る\n- 回数・期間・料金を谷田部が確認して正式提案\n\n※この提案書は下書きです。契約・料金は確定していません。`
}
