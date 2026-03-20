import { DiagnosisResult, Lane, TargetTag } from './types';
import { DIAGNOSIS_TYPES, QUESTIONS, SCORE_TYPE_MAP, SUB_LABELS } from './constants';

/** IDは呼び出し側で生成して渡す */
export function calculateDiagnosis(id: string, answers: number[]): DiagnosisResult {
  const scoreMap: Record<string, number> = {};
  const tags: Set<TargetTag> = new Set();
  let totalScore = 0;

  answers.forEach((answerIndex, questionIndex) => {
    const question = QUESTIONS[questionIndex];
    if (!question) return;
    const option = question.options[answerIndex];
    if (!option) return;

    Object.entries(option.scores).forEach(([key, value]) => {
      if (key === 'all') {
        Object.keys(SCORE_TYPE_MAP).forEach(k => {
          scoreMap[k] = (scoreMap[k] || 0) + value;
        });
      } else {
        scoreMap[key] = (scoreMap[key] || 0) + value;
      }
      totalScore += value;
    });

    if (option.tags) {
      option.tags.forEach(tag => tags.add(tag));
    }
  });

  let maxScore = 0;
  let maxKey = 'invisible';
  Object.entries(scoreMap).forEach(([key, score]) => {
    if (score > maxScore && SCORE_TYPE_MAP[key]) {
      maxScore = score;
      maxKey = key;
    }
  });

  const typeId = SCORE_TYPE_MAP[maxKey] || 1;
  const type = DIAGNOSIS_TYPES.find(t => t.id === typeId) || DIAGNOSIS_TYPES[0];

  let lane: Lane;
  if (totalScore <= 4) {
    lane = 'A';
  } else if (totalScore <= 8) {
    lane = 'B';
  } else {
    lane = 'C';
  }

  const tagsArray = Array.from(tags) as TargetTag[];
  const subLabels = tagsArray.map(tag => SUB_LABELS[tag]);

  return {
    id,
    type,
    lane,
    tags: tagsArray,
    subLabels,
    totalScore,
    answers,
    createdAt: new Date().toISOString(),
  };
}

export function getLaneDescription(lane: Lane): { label: string; cta: string; url: string } {
  switch (lane) {
    case 'A':
      return {
        label: '無料フォローコース',
        cta: 'まずはLINEで無料アドバイスを受け取る',
        url: 'https://lin.ee/q7xbzrk',
      };
    case 'B':
      return {
        label: 'オンライン診断',
        cta: '動画を送ってプロに診てもらう',
        url: 'https://soccer-kateikyousi.com/%e3%82%aa%e3%83%b3%e3%83%a9%e3%82%a4%e3%83%b3%e8%a8%ba%e6%96%ad/',
      };
    case 'C':
      return {
        label: 'スタート診断（対面）',
        cta: '対面で直接見てもらう（優先予約）',
        url: 'https://soccer-kateikyousi.com/%E5%88%9D%E3%82%81%E3%81%A6%E3%81%94%E6%9D%A5%E9%99%A2%E3%81%AE%E6%96%B9%E3%81%B8/',
      };
  }
}

export function generateShareText(result: DiagnosisResult): string {
  const tagMessages: string[] = [];
  if (result.tags.includes('beginner')) tagMessages.push('始めたての子にも良さそう');
  if (result.tags.includes('low_grade')) tagMessages.push('低学年のうちに見た方がいいかも');
  if (result.tags.includes('late_start')) tagMessages.push('遅く始めた子にも合うと思う');
  if (result.tags.includes('stagnation')) tagMessages.push('伸び悩んでる子は見てみて');
  if (result.tags.includes('selection')) tagMessages.push('セレクション前に見ると整理できそう');

  const extra = tagMessages.length > 0 ? `\n${tagMessages[0]}` : '';

  return `うちの子「${result.type.name}」だった😳
ただの技術不足じゃなかった…！
同じチームの子も違うタイプかも👀${extra}

▶ サッカー才能の出し方診断（無料・30秒）`;
}
