import { ImageResponse } from 'next/og';

export const alt = 'Pulsio. Premium analytics, made simple.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: '#f7f8f2',
        color: '#183b36',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '72px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', fontSize: 42, fontWeight: 800, letterSpacing: '-2px' }}>
        pulsio<span style={{ color: '#467b3b' }}>.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>
        <div style={{ display: 'flex', fontSize: 82, fontWeight: 700, letterSpacing: '-5px', lineHeight: 1 }}>Premium analytics, made simple.</div>
        <div style={{ display: 'flex', fontSize: 32, opacity: 0.76 }}>Privacy-first. Developer-friendly. Fairly priced.</div>
      </div>
      <div style={{ alignItems: 'center', background: '#d4f47d', borderRadius: 999, display: 'flex', fontSize: 24, fontWeight: 700, padding: '16px 28px', width: 'auto' }}>
        From $4 per month
      </div>
    </div>,
    size,
  );
}
