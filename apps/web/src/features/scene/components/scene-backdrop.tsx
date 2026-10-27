import type { SceneDefinition } from '../model/scene-definition';
export function SceneBackdrop({ definition }: { definition: SceneDefinition }) {
  const { palette: p, visual: v } = definition;
  return (
    <svg
      className="custom-backdrop"
      viewBox="0 0 1440 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="1440" height="1000" fill={p.background} />
      <rect x="300" y="70" width="1080" height="720" rx="6" fill={p.accent} opacity=".08" />
      {v.setting === 'bookshop' ? (
        <g>
          {[140, 340, 540].map((y) => (
            <g key={y}>
              <rect x="440" y={y + 150} width="920" height="15" fill={p.accent} opacity=".5" />
              {Array.from({ length: 18 }, (_, i) => (
                <rect
                  key={i}
                  x={454 + i * 48}
                  y={y + 25 + (i % 3) * 15}
                  width={30 + (i % 2) * 7}
                  height={125 - (i % 3) * 15}
                  rx="2"
                  fill={[p.accent, p.outfit, '#705b46'][i % 3]}
                  opacity=".65"
                />
              ))}
            </g>
          ))}
          <path d="M600 80v700m480-700v700" stroke={p.accent} strokeWidth="15" opacity=".3" />
        </g>
      ) : v.setting === 'station' ? (
        <g>
          <path
            d="M300 700h1140M280 740h1160m-700 0 500 260m-300-260 500 260"
            stroke={p.accent}
            strokeWidth="5"
            opacity=".4"
          />
          <path
            d="M450 100v600m400-600v600m400-600v600M300 130h1140"
            stroke={p.accent}
            strokeWidth="16"
            opacity=".35"
          />
          <rect x="850" y="210" width="340" height="88" rx="6" fill={p.outfit} />
          <text x="1020" y="264" fill={p.accent} textAnchor="middle" fontSize="28">
            {definition.location}
          </text>
          <circle cx="515" cy="280" r="55" fill={p.accent} opacity=".5" />
          <path d="M515 242v38l25 15" stroke={p.background} strokeWidth="5" />
        </g>
      ) : (
        <g>
          <path
            d="M430 80v730m300-730v730m300-730v730m300-730v730M350 480h1040"
            stroke={p.accent}
            strokeWidth="14"
            opacity=".22"
          />
          <path d="M1010 0v180l-110 90h220Z" fill={p.accent} opacity=".4" />
          <ellipse cx="1010" cy="270" rx="110" ry="15" fill={p.accent} opacity=".8" />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d={`m${450 + i * 60} ${110 + (i % 4) * 120}-10 42`}
              stroke={p.accent}
              opacity=".2"
              strokeWidth="2"
            />
          ))}
        </g>
      )}
      <rect y="835" width="1440" height="165" fill={p.background} opacity=".8" />
    </svg>
  );
}
