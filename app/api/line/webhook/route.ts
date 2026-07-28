import { NextRequest, NextResponse } from 'next/server'
import { saveLineMessageForAiSecretary } from '@/lib/line-ai-secretary'
import { handleStaffLineReply } from '@/lib/ai-secretary/staff-replies'

const CTA = `
さらに具体的な改善方法は

個別で 全国対応オンライン診断
https://wp.me/P6mCSs-9B3

対面でのスタート診断
https://wp.me/P6mCSs-8Zp

診断と解決は
https://soccer-kateikyousi.com/
お気軽にご相談ください。
`

const LINE_AUTO_REPLY_ENABLED = process.env.LINE_AUTO_REPLY_ENABLED === 'true'
const LINE_BASIC_INFO_AUTO_REPLY_ENABLED = process.env.LINE_BASIC_INFO_AUTO_REPLY_ENABLED !== 'false'
const FACILITY_BOOKING_ACCOUNT_KEY = 'facility_booking'

function buildFacilityBookingReply(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const requestsReservationList =
    normalized.includes('予約状況') ||
    normalized.includes('予約一覧') ||
    normalized.includes('予約取れてる') ||
    normalized.includes('取れている予約') ||
    normalized.includes('現在の予約') ||
    (/予約/.test(normalized) && /(教えて|見せて|出して|一覧|全部|取れ|入って|ある)/.test(normalized)) ||
    (normalized.includes('予約') && normalized.includes('全部') && normalized.includes('日'))
  const requestsBooking =
    normalized.startsWith('予約 ') ||
    /(予約して|予約を取って|取って|押さえて)/.test(normalized)

  if (/^(ヘルプ|使い方|help)$/i.test(normalized)) {
    return [
      '施設予約アシスタントです。',
      '',
      '・空き状況',
      '・予約状況',
      '・キャンセル規約 芝浦中央',
      '・予約 8/5 8:00-10:00 芝浦中央 1400円まで',
      '・芝浦中央 8/5をキャンセル確認',
      '・一覧の2番を確定キャンセル',
      '',
      '予約番号は覚えていなくて大丈夫です。',
      '予約名義は「サッカー練習」、人数は3名で扱います。',
    ].join('\n')
  }

  if (normalized.includes('確定キャンセル')) {
    return '確定キャンセルを受け付けました。施設・日付または直前に表示した一覧番号から正式な予約番号をこちらで照合し、対象日時と現在の取消ペナルティを再確認してから実行します。'
  }

  if (normalized.includes('キャンセル確認')) {
    return 'キャンセル条件を確認します。予約番号は不要です。施設・日付または一覧番号から対象を照合します。この段階では取消さず、料金・予約制限を返信した後の「確定キャンセル」でのみ実行します。'
  }

  if (normalized.includes('キャンセル規約') || normalized.includes('取消規約')) {
    return '指定施設の最新キャンセル規約を確認します。金銭負担と新規予約制限を分けてLINEで返します。'
  }

  if (requestsReservationList) {
    return '港区・品川区の全アカウントを確認し、現在取れている予約を日付順で、一覧番号、日時、施設、料金、支払状況、取消期限つきでLINEに返します。予約がない日やアカウントは省きます。正式な予約番号はこちらで照合するので覚えていなくて大丈夫です。'
  }

  if (requestsBooking) {
    return '予約依頼を受け付けました。日時・施設・空き・料金上限・キャンセル条件を照合し、条件内の場合だけ「サッカー練習・3名」で予約します。'
  }

  if (normalized.includes('予約')) {
    return '予約一覧を確認する場合は「予約状況」、新しく取る場合は「予約 8/5 8:00-10:00 芝浦中央 料金上限…」の形式で送ってください。予約番号は不要です。'
  }

  if (normalized.includes('空き')) {
    return '港区・品川区の空き状況を確認します。近場・安い施設と7時台（芝浦中央は8時台）を優先してLINEで返します。'
  }

  return '「空き状況」「予約状況」「キャンセル規約」「予約 …」「キャンセル確認 …」のいずれかを送ってください。「使い方」で書式を確認できます。'
}

const REQUIRED_INFO_FIELDS = [
  { key: 'parent_name', label: '保護者様のお名前' },
  { key: 'child_name', label: 'お子様のお名前' },
  { key: 'grade', label: '学年' },
  { key: 'area', label: 'ご住所' },
  { key: 'phone', label: 'お電話番号' },
  { key: 'desired_time', label: 'ご希望日時' },
] as const

function extractType(text: string): string | null {
  const normalized = text
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/\s/g, '')
    .replace(/　/g, '')
    .replace(/：/g, ':')

  const patterns: Array<{ keys: string[]; type: string }> = [
    {
      keys: ['技術あるのに出せない温存型', '温存型'],
      type: '技術あるのに出せない温存型',
    },
    {
      keys: ['最初の一歩が遅れる受け身型', '受け身型'],
      type: '最初の一歩が遅れる受け身型',
    },
    {
      keys: ['ボール受ける前で負ける後手型', '後手型'],
      type: 'ボール受ける前で負ける後手型',
    },
    {
      keys: ['周りに合わせすぎる遠慮型', '遠慮型'],
      type: '周りに合わせすぎる遠慮型',
    },
    {
      keys: ['先に急ぎすぎる突進型', '突進型'],
      type: '先に急ぎすぎる突進型',
    },
    {
      keys: ['ミスを恐れて選択が減る慎重型', '慎重型'],
      type: 'ミスを恐れて選択が減る慎重型',
    },
    {
      keys: ['試合で消えやすい慎重派型', '慎重派型'],
      type: '試合で消えやすい慎重派型',
    },
    {
      keys: ['練習と試合で別人になる分離型', '分離型'],
      type: '練習と試合で別人になる分離型',
    },
    {
      keys: ['1対1で力を隠す安全運転型', '安全運転型'],
      type: '1対1で力を隠す安全運転型',
    },
    {
      keys: ['見えてるのに出せない準備不足型', '準備不足型'],
      type: '見えてるのに出せない準備不足型',
    },
    {
      keys: ['ボール触れは良いのに触れない待機型', '待機型'],
      type: 'ボール触れは良いのに触れない待機型',
    },
    {
      keys: ['頭ではわかってるのに体が合わない思考先行型', '思考先行型'],
      type: '頭ではわかってるのに体が合わない思考先行型',
    },
  ]

  for (const row of patterns) {
    for (const key of row.keys) {
      if (normalized.includes(key.replace(/\s/g, ''))) {
        return row.type
      }
    }
  }

  return null
}

function buildReply(type: string): string {
  switch (type) {
    case '技術あるのに出せない温存型':
      return `診断結果の続きです。

あなたは「技術はあるのに試合で出せない状態」です。

原因は
・判断が遅い
・安全な選択に逃げる
・プレー前に考えすぎている

改善はシンプルです

▶先に動く
▶先に触る
▶考える前にプレーする

この順番に変えるだけで一気に変わります。
ここは一番伸びやすいゾーンです。
${CTA}`

    case '最初の一歩が遅れる受け身型':
      return `診断結果の続きです。

このタイプは「待ってしまう」ことが原因です。

・ボールが来てから動く
・状況を見てから判断する

これでは遅れます。

改善はこれだけ

▶ボールが来る前に動く
▶次のプレーを先に決める

これができるだけで別人になります。
${CTA}`

    case 'ボール受ける前で負ける後手型':
      return `診断結果の続きです。

このタイプは「受ける前の準備」で負けています。

・見るのが遅い
・立ち位置が遅い
・準備が後手

改善

▶受ける前に首を振る
▶受ける前に立ち位置を作る
▶受ける前に次を決める

受ける前が変わるとプレー全体が変わります。
${CTA}`

    case '周りに合わせすぎる遠慮型':
      return `診断結果の続きです。

このタイプは「周りに合わせすぎる」ことが原因です。

・自分で決めきれない
・遠慮してしまう
・周り優先で自分の武器が消える

改善

▶まず自分の選択を持つ
▶遠慮せず出す
▶自分の強みを先に使う

協調性は武器です。
あとは自分で行く場面を決めれば伸びます。
${CTA}`

    case '先に急ぎすぎる突進型':
      return `診断結果の続きです。

このタイプは「改善ポイントが明確」なので、ここから一気に変わります。

急ぎすぎてプレーが雑になっています。

・突っ込む
・余裕がない

改善

▶一度止まる
▶状況を見る

これだけでプレーの質が上がります。
${CTA}`

    case 'ミスを恐れて選択が減る慎重型':
      return `診断結果の続きです。

このタイプは「ミスを恐れすぎる」ことで選択が減っています。

・無難になる
・逃げる判断が増える
・本来の良さが出ない

改善

▶1回チャレンジを入れる
▶失敗より再現を重視する
▶小さく攻める

慎重さは強みです。
使い方を変えるだけで良さが出ます。
${CTA}`

    case '試合で消えやすい慎重派型':
      return `診断結果の続きです。

このタイプは「試合で存在感が消えやすい」状態です。

・無難に終わる
・関わる回数が減る
・目立たない

改善

▶最初の5分で1回自分から関わる
▶受ける前に立ち位置を取る
▶消える前に1回行く

試合の入り方を変えるだけで印象は大きく変わります。
${CTA}`

    case '練習と試合で別人になる分離型':
      return `診断結果の続きです。

このタイプは「練習と試合で別人」になっています。

・練習ではできる
・試合だと固くなる
・再現できない

改善

▶試合でやることを1つに絞る
▶成功体験を小さく作る
▶練習から試合想定でやる

再現の設計を入れるだけで試合でも出せます。
${CTA}`

    case '1対1で力を隠す安全運転型':
      return `診断結果の続きです。

このタイプは「1対1で力を隠してしまう」状態です。

・勝負しない
・安全に逃げる
・武器が出ない

改善

▶1対1で1回は仕掛ける
▶抜くよりズラす意識を持つ
▶安全の中に勝負を入れる

安全運転を少し変えるだけで武器が見えます。
${CTA}`

    case '見えてるのに出せない準備不足型':
      return `診断結果の続きです。

このタイプは「見えているのに出せない」状態です。

・見えてはいる
・でも体が準備できていない
・出すのが遅れる

改善

▶受ける前に体の向きを作る
▶次の選択肢を先に持つ
▶出せる姿勢で受ける

見えているなら、あとは準備だけです。
ここは伸びます。
${CTA}`

    case 'ボール触れは良いのに触れない待機型':
      return `診断結果の続きです。

このタイプは「触れれば良いのに、触る前で止まる」状態です。

・待ってしまう
・関わりに行かない
・良さが出る前に終わる

改善

▶触りに行く回数を増やす
▶最初の関わりを早くする
▶待つより先に入る

触る回数が増えるだけで、良さは自然に出ます。
${CTA}`

    case '頭ではわかってるのに体が合わない思考先行型':
      return `診断結果の続きです。

このタイプは「頭ではわかっているのに、体が合っていない」状態です。

・理解はしている
・でも体が遅れる
・考えが先、動きが後

改善

▶考える量を減らす
▶1つだけ意識する
▶動きながら修正する

頭の理解は十分です。
あとは体に落とすだけです。
${CTA}`

    default:
      return `タイプがうまく取得できません。

「突進型」など一言送ってください。`
  }
}

function hasParentName(text: string) {
  return /保護者.{0,8}(氏名|名前)|父[:：]|母[:：]|保護者[:：]/.test(text) || /[一-龠ぁ-んァ-ン]{2,12}(です|と申します)/.test(text)
}

function hasChildName(text: string) {
  return /(子供|子ども|お子|選手).{0,8}(氏名|名前)|子供[:：]|子ども[:：]|お子様[:：]|選手[:：]/.test(text)
}

function hasGrade(text: string) {
  return /小学|小[1-6１-６]|中学|中[1-3１-３]|高校|高[1-3１-３]|年長|年中|年少|学年/.test(text)
}

function hasArea(text: string) {
  return /住所|在住|エリア|希望場所|場所|最寄|駅|区|市|町|村|都|県|公園|グラウンド/.test(text)
}

function hasPhone(text: string) {
  return /電話|tel|TEL|0\d{1,4}[-ー\s]?\d{1,4}[-ー\s]?\d{3,4}/.test(text)
}

function hasDesiredTime(text: string) {
  return /希望日時|希望日|候補日|日程|予約|空き|[0-9０-９]{1,2}\/[0-9０-９]{1,2}|[0-9０-９]{1,2}月[0-9０-９]{1,2}日|[0-9０-９]{1,2}時|午前|午後|平日|土日|月曜|火曜|水曜|木曜|金曜|土曜|日曜/.test(text)
}

function shouldIgnoreBasicInfoAutoReply(text: string) {
  const compact = text.replace(/\s+/g, '')
  if (!compact) return true
  if (/^(ありがとうございます|ありがとう|承知しました|了解です|よろしくお願いします|よろしくお願いいたします|はい|いいえ|大丈夫です)[。!！、]*$/.test(compact)) return true
  return /休み|欠席|中止|キャンセル|遅れ|遅刻|到着|向かって|出発|振込|支払|入金|領収|変更の場合|体調不良/.test(text)
}

function isBasicInfoAutoReplyCandidate(text: string) {
  if (shouldIgnoreBasicInfoAutoReply(text)) return false
  return /体験|問い合わせ|相談|診断|レッスン|個人|家庭教師|予約|日程|空き|候補日|希望|可能|できます|お願い|料金|費用|参加|入会|回数券|サッカー|ドリブル|足技|キッズ|SYSC|セレクション|見て|受け/.test(text)
}

function missingBasicInfoFields(text: string) {
  const present = {
    parent_name: hasParentName(text),
    child_name: hasChildName(text),
    grade: hasGrade(text),
    area: hasArea(text),
    phone: hasPhone(text),
    desired_time: hasDesiredTime(text),
  }

  return REQUIRED_INFO_FIELDS.filter((field) => !present[field.key]).map((field) => field.label)
}

function hasEnoughBasicInfo(text: string) {
  const presentCount = [
    hasParentName(text),
    hasChildName(text),
    hasGrade(text),
    hasArea(text),
    hasPhone(text),
    hasDesiredTime(text),
  ].filter(Boolean).length

  return presentCount >= 3
}

function buildBasicInfoAutoReply(text: string, isExistingLineUser: boolean) {
  if (isExistingLineUser) return ''
  if (!isBasicInfoAutoReplyCandidate(text)) return ''
  if (hasEnoughBasicInfo(text)) return ''

  const missingFields = missingBasicInfoFields(text)
  if (missingFields.length === 0) return ''

  return [
    'お問い合わせありがとうございます。',
    '',
    '詳しく確認してご案内いたしますので、以下をお知らせください。',
    '',
    ...missingFields.map((field) => `・${field}`),
    '',
    '確認でき次第、日程や進め方をご案内いたします。',
    '',
    'お待ちしております。',
    '',
    '谷田部',
  ].join('\n')
}

function getAccountKey(req: NextRequest, destination?: string | null) {
  const explicitAccount = req.nextUrl.searchParams.get('account') || req.nextUrl.searchParams.get('account_key')
  if (explicitAccount) return explicitAccount

  const rawMap = process.env.LINE_ACCOUNT_DESTINATION_MAP
  if (!rawMap || !destination) return process.env.LINE_ACCOUNT_KEY || 'soccer_private_lesson'

  try {
    const map = JSON.parse(rawMap) as Record<string, string>
    return map[destination] || process.env.LINE_ACCOUNT_KEY || 'soccer_private_lesson'
  } catch {
    return process.env.LINE_ACCOUNT_KEY || 'soccer_private_lesson'
  }
}

function getLineChannelAccessToken(accountKey: string) {
  const envKey = `LINE_CHANNEL_ACCESS_TOKEN_${accountKey.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
  const directToken = process.env[envKey]
  if (directToken) return directToken

  const rawMap = process.env.LINE_CHANNEL_ACCESS_TOKEN_MAP
  if (rawMap) {
    try {
      const map = JSON.parse(rawMap) as Record<string, string>
      if (map[accountKey]) return map[accountKey]
    } catch {
      // Fall back to the legacy single-account token below.
    }
  }

  return process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
}

async function hasPriorLineMessage(accountKey: string, lineUserId: string) {
  if (!lineUserId) return false

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return false

  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/line_messages?account_key=eq.${encodeURIComponent(accountKey)}&line_user_id=eq.${encodeURIComponent(lineUserId)}&select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    if (!response.ok) return false
    const rows = await response.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events = body.events || []
    const accountKey = getAccountKey(req, body.destination)

    for (const event of events) {
      if (event.type !== 'message') continue
      if (event.message?.type !== 'text') continue

      const text = event.message.text || ''
      const replyToken = event.replyToken
      const lineChannelAccessToken = getLineChannelAccessToken(accountKey)
      const lineUserId = event.source?.userId || ''

      if (accountKey === FACILITY_BOOKING_ACCOUNT_KEY) {
        const allowedUserId = process.env.FACILITY_BOOKING_LINE_USER_ID || ''
        if (!allowedUserId || lineUserId !== allowedUserId) continue

        const facilityReplyText = buildFacilityBookingReply(text)
        let facilityReplyStatus: number | undefined
        let facilityReplyOk: boolean | undefined

        if (facilityReplyText && replyToken && lineChannelAccessToken) {
          try {
            const response = await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${lineChannelAccessToken}`,
              },
              body: JSON.stringify({
                replyToken,
                messages: [{ type: 'text', text: facilityReplyText }],
              }),
            })
            facilityReplyStatus = response.status
            facilityReplyOk = response.ok
          } catch (facilityReplyError) {
            console.error('facility booking reply error:', facilityReplyError)
            facilityReplyOk = false
          }
        }

        await saveLineMessageForAiSecretary({
          event,
          text,
          extractedType: null,
          autoReplyText: facilityReplyText,
          accountKey,
          lineReplyStatus: facilityReplyStatus,
          lineReplyOk: facilityReplyOk,
        })
        continue
      }

      const staffReply = await handleStaffLineReply({
        accountKey,
        lineUserId,
        text,
        event,
      })

      if (staffReply.handled) {
        if (staffReply.replyText && replyToken && lineChannelAccessToken) {
          try {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${lineChannelAccessToken}`,
              },
              body: JSON.stringify({
                replyToken,
                messages: [{ type: 'text', text: staffReply.replyText }],
              }),
            })
          } catch (staffReplyError) {
            console.error('staff reply confirmation error:', staffReplyError)
          }
        }
        continue
      }

      const type = extractType(text)
      const isExistingLineUser = await hasPriorLineMessage(accountKey, lineUserId)
      const replyText = type ? buildReply(type) : buildBasicInfoAutoReply(text, isExistingLineUser)

      let lineReplyStatus: number | undefined
      let lineReplyOk: boolean | undefined

      const canAutoReply = type ? LINE_AUTO_REPLY_ENABLED : LINE_BASIC_INFO_AUTO_REPLY_ENABLED

      if (canAutoReply && replyText && replyToken && lineChannelAccessToken) {
        try {
          const lineReplyResponse = await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${lineChannelAccessToken}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [{ type: 'text', text: replyText }],
            }),
          })
          lineReplyStatus = lineReplyResponse.status
          lineReplyOk = lineReplyResponse.ok
        } catch (lineReplyError) {
          console.error('line reply error:', lineReplyError)
          lineReplyOk = false
        }
      }

      await saveLineMessageForAiSecretary({
        event,
        text,
        extractedType: type,
        autoReplyText: replyText,
        accountKey,
        lineReplyStatus,
        lineReplyOk,
      })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}
