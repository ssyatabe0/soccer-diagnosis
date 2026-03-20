import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { DIAGNOSIS_TYPES, SUB_LABELS } from '@/lib/constants';
import { TargetTag } from '@/lib/types';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeId = parseInt(searchParams.get('typeId') || '1');
  const tagsStr = searchParams.get('tags') || '';
  const tags = tagsStr.split(',').filter(Boolean) as TargetTag[];

  const type = DIAGNOSIS_TYPES.find(t => t.id === typeId) || DIAGNOSIS_TYPES[0];
  const subLabels = tags.map(t => SUB_LABELS[t]).filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #16a34a 0%, #10b981 100%)',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'white',
            borderRadius: '24px',
            padding: '48px',
            width: '90%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          }}
        >
          <p style={{ fontSize: 20, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
            サッカー才能の出し方診断
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 16 }}>
            {type.name}
          </h1>
          <p style={{ fontSize: 20, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
            {type.oneWord}
          </p>
          {subLabels.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {subLabels.map((label, i) => (
                <span
                  key={i}
                  style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {label.label}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 32 }}>
            サッカー技術の病院 × サッカー家庭教師
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
