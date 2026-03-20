import { DiagnosisResult, TargetTag } from './types';
import { LINE_SCENARIOS } from './constants';
import { getLaneDescription } from './diagnosis-logic';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

export async function sendLineMessage(userId: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: message }],
      }),
    });
    return res.ok;
  } catch {
    console.error('LINE message send failed');
    return false;
  }
}

export function buildLineMessage(
  template: string,
  result: DiagnosisResult,
  name: string,
  resultUrl: string
): string {
  const laneInfo = getLaneDescription(result.lane);
  return template
    .replace('{name}', name)
    .replace('{type}', result.type.name)
    .replace('{resultUrl}', resultUrl)
    .replace('{causeRedefinition}', result.type.causeRedefinition)
    .replace('{priorityTheme}', result.type.priorityTheme)
    .replace('{laneOffer}', laneInfo.label)
    .replace('{offerUrl}', laneInfo.url);
}

export function getScenarioForUser(tags: TargetTag[]): string[] {
  // Priority: selection > stagnation > late_start > low_grade > beginner > default
  const priority: TargetTag[] = ['selection', 'stagnation', 'late_start', 'low_grade', 'beginner'];
  for (const tag of priority) {
    if (tags.includes(tag)) {
      return LINE_SCENARIOS[tag];
    }
  }
  return LINE_SCENARIOS.default;
}

export async function handleLineWebhook(body: {
  events: Array<{
    type: string;
    source: { userId: string };
    message?: { type: string; text: string };
    replyToken: string;
  }>;
}): Promise<void> {
  for (const event of body.events) {
    if (event.type === 'follow') {
      // New friend added - welcome message
      await sendLineMessage(
        event.source.userId,
        'サッカー才能の出し方診断へようこそ！\n無料診断で、お子さんの才能の"出し方"を見つけましょう。\n\n▶ 診断はこちらから'
      );
    }
  }
}
