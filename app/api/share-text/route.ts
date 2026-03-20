import { NextRequest, NextResponse } from 'next/server';
import { DIAGNOSIS_TYPES, SUB_LABELS } from '@/lib/constants';
import { generateShareText } from '@/lib/diagnosis-logic';
import { DiagnosisResult, Lane, TargetTag } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeId = parseInt(searchParams.get('typeId') || '1');
  const tagsStr = searchParams.get('tags') || '';
  const lane = (searchParams.get('lane') || 'B') as Lane;
  const tags = tagsStr.split(',').filter(Boolean) as TargetTag[];

  const type = DIAGNOSIS_TYPES.find(t => t.id === typeId) || DIAGNOSIS_TYPES[0];

  const result: DiagnosisResult = {
    id: 'share',
    type,
    lane,
    tags,
    subLabels: tags.map(t => SUB_LABELS[t]),
    totalScore: 0,
    answers: [],
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ text: generateShareText(result) });
}
