import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

/**
 * KidsCode certificate with a Kenyan look: flag-colour corners (black, red, green with
 * white fimbriation), Maasai beadwork bands, a faint Mount Kenya watermark, a Maasai
 * shield seal and a QR code that opens the public verification page.
 *
 * The artwork is drawn on a fixed A4-landscape canvas (1123 x 794 px = 297 x 210 mm at
 * 96 dpi), scaled to fit its container on screen and printed at true size.
 *
 * Props: name, courseName, curriculumCode, certificateNumber, verificationCode, verifyUrl,
 *        issueDate (display string), hours, score, modules, lessons, sample (preview),
 *        labels (translated strings, see DEFAULT_LABELS)
 */
const W = 1123;
const H = 794;
const NAVY = '#0b1f3a';
const RED = '#bb0000';
const GREEN = '#006600';
// Everything readable stays at least this far from the edges, inside the corner brackets
// (their three lines sit 44-68 px in) and clear of the flag corners.
const SAFE = 92;

export const DEFAULT_LABELS = {
  certificate: 'CERTIFICATE',
  ofCompletion: 'of Completion',
  presentedTo: 'This certificate is proudly presented to',
  forCompleting: 'for successfully completing the course',
  certificateNo: 'Certificate No.',
  duration: 'Study time',
  hoursUnit: 'hours',
  curriculum: 'Curriculum',
  issueDate: 'Issue date',
  scanToVerify: 'Scan to verify',
  modulesLessons: '{m} modules · {l} lessons · practical, written & oral assessments',
  overallScore: 'Overall score',
  verified: 'Digitally issued & verified',
  sealText: 'KIDSCODE ✦ VERIFIED CERTIFICATE ✦ KENYA ✦',
  motto: 'Code Today · Create Tomorrow · Change Kenya',
  hongera: 'Hongera!',
  sample: 'SAMPLE',
  org: 'KidsCode Adventures · Professional Development',
};

/** Maasai beadwork: repeating squares in traditional bead colours. */
const Beadwork = ({ x, y, width, size = 9, vertical = false }) => {
  const colours = ['#bb0000', '#ffffff', '#1d4ed8', '#ffffff', '#f59e0b', '#ffffff', '#006600', '#ffffff', '#000000', '#ffffff'];
  const count = Math.floor(width / size);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={vertical ? x : x + i * size} y={vertical ? y + i * size : y} width={size - 1.5} height={size - 1.5} rx={1.5}
          fill={colours[i % colours.length]} stroke={colours[i % colours.length] === '#ffffff' ? '#e5e7eb' : 'none'} strokeWidth="0.6" />
      ))}
    </g>
  );
};

/** Diagonal Kenyan-flag stripes filling a corner triangle. */
const FlagCorner = ({ corner }) => {
  // Stripes run diagonally; the triangle clips them.
  const tl = corner === 'tl';
  const clip = tl ? `0,0 130,0 0,130` : `${W},${H} ${W - 130},${H} ${W},${H - 130}`;
  const bands = [[0, 36, '#000000'], [36, 7, '#ffffff'], [43, 36, RED], [79, 7, '#ffffff'], [86, 36, GREEN]];
  return (
    <g>
      <defs><clipPath id={`clip-${corner}`}><polygon points={clip} /></clipPath></defs>
      <g clipPath={`url(#clip-${corner})`}>
        {bands.map(([offset, size, fill]) => {
          // A band at distance `offset` from the corner, `size` thick, along the diagonal.
          const a = offset; const b = offset + size;
          const pts = tl
            ? `${a},0 ${b},0 0,${b} 0,${a}`
            : `${W - a},${H} ${W - b},${H} ${W},${H - b} ${W},${H - a}`;
          return <polygon key={offset} points={pts} fill={fill} />;
        })}
      </g>
    </g>
  );
};

/** A simple Maasai shield with crossed spears (as on the Kenyan flag). */
const Shield = ({ cx, cy, s = 1 }) => (
  <g transform={`translate(${cx} ${cy}) scale(${s})`}>
    <line x1="-26" y1="-40" x2="26" y2="40" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
    <line x1="26" y1="-40" x2="-26" y2="40" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
    <line x1="-26" y1="-40" x2="26" y2="40" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="26" y1="-40" x2="-26" y2="40" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
    <ellipse rx="17" ry="30" fill="#ffffff" />
    <ellipse rx="15" ry="28" fill={RED} />
    <ellipse rx="6" ry="28" fill="#000000" />
    <ellipse rx="2.5" ry="9" fill="#ffffff" />
    <ellipse cy="-19" rx="2" ry="4" fill="#ffffff" />
    <ellipse cy="19" rx="2" ry="4" fill="#ffffff" />
  </g>
);

const TechBadge = ({ x, label, colour }) => (
  <g transform={`translate(${x} 0)`}>
    <path d="M0 0 h62 l-6 58 l-25 8 l-25 -8 z" fill={colour} />
    <path d="M31 4 v58 l20 -6 l5 -52 z" fill="#ffffff" opacity="0.18" />
    <text x="31" y="38" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize={label.length > 3 ? 13 : 17} fill="#ffffff">{label}</text>
  </g>
);

const KenyanCertificate = ({
  name, courseName = 'Professional Web Development', curriculumCode = 'ICT/CU/CP/CR/08/6/A', certificateNumber, verificationCode,
  verifyUrl, issueDate, hours, score, modules = 8, lessons = 44, sample = false, labels: labelsIn = {},
}) => {
  const L = { ...DEFAULT_LABELS, ...labelsIn };
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [qr, setQr] = useState('');

  // Scale the fixed canvas to the width it is given.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, el.clientWidth / W) || 1);
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', fit);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); };
  }, []);

  useEffect(() => {
    if (!verifyUrl) { setQr(''); return; }
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 260, errorCorrectionLevel: 'M', color: { dark: NAVY, light: '#ffffff' } })
      .then(setQr).catch(() => setQr(''));
  }, [verifyUrl]);

  const nameSize = !name ? 54 : name.length > 28 ? 42 : name.length > 20 ? 48 : 56;

  return (
    <div ref={wrapRef} className="kc-cert-wrap w-full" style={{ height: H * scale }}>
      <div className="kc-cert relative bg-white overflow-hidden shadow-xl"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left', color: NAVY, fontFamily: 'Montserrat, Nunito, sans-serif' }}>
        <svg width={W} height={H} className="absolute inset-0" aria-hidden="true">
          {/* faint Mount Kenya watermark */}
          <g opacity="0.05" transform={`translate(${W / 2 - 260} ${H / 2 - 120})`}>
            <path d="M0 260 L150 90 L200 130 L260 20 L320 120 L370 80 L520 260 Z" fill={NAVY} />
            <path d="M232 70 L260 20 L290 75 L272 66 L260 80 L248 66 Z" fill="#ffffff" />
          </g>
          {/* flag corners */}
          <FlagCorner corner="tl" />
          <FlagCorner corner="br" />
          {/* corner brackets (black, red, green) */}
          {[[0, '#000000'], [12, RED], [24, GREEN]].map(([o, c]) => (
            <g key={o} fill="none" stroke={c} strokeWidth="4">
              <path d={`M${W - 330 - o} ${44 + o} H${W - 44 - o} V${330 + o}`} />
              <path d={`M${44 + o} ${H - 330 - o} V${H - 44 - o} H${330 + o}`} />
            </g>
          ))}
          {/* beadwork bands */}
          <Beadwork x={340} y={22} width={W - 680} />
          <Beadwork x={340} y={H - 31} width={W - 680} />
        </svg>

        {/* Header */}
        <img src="/kidscode_logo.png" alt="KidsCode" className="absolute" style={{ left: SAFE + 4, top: 70, width: 112, height: 112, objectFit: 'contain' }} />
        <div className="absolute text-center" style={{ left: 340, right: 340, top: 54 }}>
          {/* Organisation name on two short lines so it never runs into the details on the right. */}
          {String(L.org).split(' · ').map((part, i) => (
            <div key={part} style={{ fontSize: i === 0 ? 15 : 11, letterSpacing: i === 0 ? '0.18em' : '0.3em', fontWeight: i === 0 ? 800 : 600, color: i === 0 ? GREEN : NAVY, marginTop: i ? 2 : 0 }}>{part.toUpperCase()}</div>
          ))}
          <div className="flex items-center justify-center gap-2 mt-2" aria-hidden="true">
            <span style={{ width: 46, height: 4, background: '#000' }} /><span style={{ width: 46, height: 4, background: RED }} /><span style={{ width: 46, height: 4, background: GREEN }} />
          </div>
        </div>
        <div className="absolute text-right" style={{ right: SAFE + 4, top: SAFE, fontSize: 13.5, lineHeight: 1.55 }}>
          <div><span style={{ opacity: 0.7 }}>{L.certificateNo}: </span><b>{certificateNumber}</b></div>
          <div><span style={{ opacity: 0.7 }}>{L.duration}: </span><b>{hours} {L.hoursUnit}</b></div>
          <div><span style={{ opacity: 0.7 }}>{L.curriculum}: </span><b>{curriculumCode}</b></div>
        </div>

        {/* Title + name */}
        <div className="absolute text-center" style={{ left: 230, right: 230, top: 176 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 70, letterSpacing: '0.2em', lineHeight: 1, paddingLeft: '0.2em', whiteSpace: 'nowrap' }}>{L.certificate}</div>
          <div style={{ fontSize: 25, marginTop: 4, fontWeight: 500 }}>{L.ofCompletion}</div>
          <div style={{ fontSize: 17, marginTop: 10, opacity: 0.85 }}>{L.presentedTo}</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: nameSize, marginTop: 2, lineHeight: 1.15, minHeight: 64 }}>{name}</div>
          <div style={{ width: 560, height: 2, margin: '6px auto 0', background: `linear-gradient(90deg, transparent, ${NAVY} 15%, ${NAVY} 85%, transparent)` }} />
          <div style={{ fontSize: 17, marginTop: 8, opacity: 0.85 }}>{L.forCompleting}</div>
          <div style={{ fontSize: 27, marginTop: 2, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{String(courseName).toUpperCase()}</div>
        </div>

        {/* Technology badges */}
        <svg className="absolute" style={{ left: W / 2 - 128, top: 478 }} width="256" height="70" aria-hidden="true">
          <TechBadge x={0} label="HTML" colour="#e34f26" />
          <TechBadge x={97} label="CSS" colour="#1572b6" />
          <TechBadge x={194} label="JS" colour="#d4a017" />
        </svg>

        {/* Bottom left: QR + issue date */}
        <div className="absolute text-center" style={{ left: SAFE + 8, bottom: SAFE, width: 168 }}>
          {qr ? <img src={qr} alt={L.scanToVerify} style={{ width: 100, height: 100, margin: '0 auto' }} /> : <div style={{ width: 100, height: 100, margin: '0 auto', border: `2px dashed ${NAVY}`, opacity: 0.3 }} />}
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{L.scanToVerify}</div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.75 }}>{L.issueDate}</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{issueDate}</div>
        </div>

        {/* Bottom centre: course facts */}
        <div className="absolute text-center" style={{ left: W / 2 - 280, width: 560, bottom: SAFE, background: '#f1f5f9', borderRadius: 20, padding: '12px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{L.modulesLessons.replace('{m}', modules).replace('{l}', lessons)}</div>
          <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>
            {L.overallScore}: <b>{score}{score !== '—' ? '%' : ''}</b> · {L.duration}: <b>{hours} {L.hoursUnit}</b>
          </div>
          <div style={{ fontSize: 12, marginTop: 6, color: GREEN, fontWeight: 700, letterSpacing: '0.08em' }}>{L.motto.toUpperCase()}</div>
        </div>

        {/* Bottom right: seal */}
        <div className="absolute text-center" style={{ right: SAFE + 4, bottom: SAFE, width: 168 }}>
          <svg width="124" height="124" viewBox="-75 -75 150 150" style={{ margin: '0 auto' }} aria-hidden="true">
            <defs><path id="seal-arc" d="M -54 0 A 54 54 0 1 1 54 0 A 54 54 0 1 1 -54 0" /></defs>
            <circle r="72" fill={GREEN} />
            <circle r="68" fill="none" stroke="#ffffff" strokeWidth="2" />
            <circle r="64" fill="#000000" />
            <circle r="44" fill={RED} stroke="#ffffff" strokeWidth="2.5" />
            <text fontFamily="Montserrat, sans-serif" fontSize="10.5" fontWeight="700" fill="#ffffff" letterSpacing="1.6">
              <textPath href="#seal-arc" startOffset="0">{L.sealText}</textPath>
            </text>
            <Shield cx={0} cy={0} s={0.82} />
          </svg>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{L.hongera}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{L.verified}</div>
          {verificationCode && <div style={{ fontSize: 10, opacity: 0.6, fontFamily: "'Fira Code', monospace" }}>{verificationCode}</div>}
        </div>

        {sample && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <span style={{ fontSize: 150, fontWeight: 800, color: RED, opacity: 0.08, transform: 'rotate(-20deg)', letterSpacing: '0.1em' }}>{L.sample}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KenyanCertificate;
