import { NextRequest, NextResponse } from 'next/server';
import { calculateDiagnosis } from '@/lib/diagnosis-logic';
import { getServiceSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json();

    if (!Array.isArray(answers) || answers.length !== 10) {
      return NextResponse.json({ error: '回答が不正です' }, { status: 400 });
    }

    const id = uuidv4();
    const result = calculateDiagnosis(id, answers);
    const supabase = getServiceSupabase();

    const { data, error: insertError } = await supabase
      .from('diagnosis_results')
      .insert({
        id: id,
        type_id: result.type.id,
        type_name: result.type.name,
        lane: result.lane,
        tags: result.tags,
        total_score: result.totalScore,
        answers: result.answers,
        created_at: result.createdAt,
      })
      .select();

    if (insertError) {
      console.error('INSERT ERROR:', insertError);
      return NextResponse.json(
        { error: '保存エラー: ' + insertError.message },
        { status: 500 }
      );
    }

    console.log('INSERT SUCCESS:', data);

    const { error: userError } = await supabase.from('users').insert({
      id: id,
      diagnosis_result_id: id,
      type_id: result.type.id,
      type_name: result.type.name,
      lane: result.lane,
      tags: result.tags,
      total_score: result.totalScore,
      line_delivery_step: 0,
      conversion_status: 'new',
      staff_required: result.lane === 'C',
      selection_priority: result.tags.includes('selection'),
    });

    if (userError) {
      console.error('USERS INSERT ERROR:', userError);
    }

    return NextResponse.json({
      id: id,
      type: result.type.name,
      lane: result.lane,
    });
  } catch (err) {
    console.error('FATAL ERROR:', err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
