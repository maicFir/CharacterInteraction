import type { SceneDefinition } from '../model/scene-definition';
import type { Phase, Reply } from '../model/turns';

/** Safe vector primitives: generated scene data never becomes raw HTML or SVG. */
export function SceneCharacter({
  definition,
  phase,
  emotion,
  action = 'none',
}: {
  definition: SceneDefinition;
  phase: Phase;
  emotion: Reply['emotion'];
  action?: Reply['action'];
}) {
  const { palette: p, visual: v } = definition;
  const performance = phase === 'listening' || phase === 'thinking' ? phase : action;
  return (
    <div className={`custom-performance ${phase}`} data-performance={performance}>
      <svg className={`custom-character ${phase}`} viewBox="0 0 480 720" aria-hidden="true">
        <g className="custom-actor-body">
          {v.hairstyle === 'long' && (
            <path d="M134 155Q118 75 235 50Q355 65 350 180L370 396H115Z" fill={p.hair} />
          )}
          <path
            d={
              v.outfit === 'coat'
                ? 'M155 302Q90 315 75 460L55 698H425L395 445Q380 320 316 302Z'
                : 'M153 306Q90 326 87 440L79 700H402L390 440Q385 326 315 306Z'
            }
            fill={p.outfit}
          />
          <path d="M194 264v57l46 39 45-39v-57" fill={p.skin} />
          {v.outfit === 'sweater' ? (
            <path d="M176 309q64 65 128 0" fill="none" stroke={p.accent} strokeWidth="8" />
          ) : (
            <>
              <path
                d="m180 307 60 55-43 52-42-96m145-11-60 55 43 52 42-96"
                fill={p.accent}
                opacity=".65"
              />
              <path d="M240 362v332" stroke={p.accent} strokeWidth="3" opacity=".6" />
            </>
          )}
          <path
            d="m113 425-29 220q4 39 25 16l34-211m225-25 29 220q-4 39-25 16l-34-211"
            fill={p.outfit}
            stroke="#00000025"
            strokeWidth="3"
          />
          <ellipse cx="239" cy="186" rx="91" ry="112" fill={p.skin} />
          <ellipse cx="148" cy="197" rx="12" ry="24" fill={p.skin} />
          <ellipse cx="330" cy="197" rx="12" ry="24" fill={p.skin} />
          {v.hairstyle === 'bun' && <circle cx="271" cy="65" r="43" fill={p.hair} />}
          <path
            d={
              v.hairstyle === 'short'
                ? 'M145 190Q115 57 234 52Q352 59 340 193L309 135 290 104Q230 153 159 142Z'
                : 'M144 188Q113 67 236 56Q355 62 336 203L310 158Q258 131 216 90Q198 141 144 188Z'
            }
            fill={p.hair}
          />
          <path
            d={
              emotion === 'curious'
                ? 'M172 163q18-13 35-4m64 4q17-13 34-3'
                : emotion === 'sad'
                  ? 'M172 177q18-15 35-7m64 0q17-8 34 7'
                  : 'M172 170q18-9 35-1m64 0q17-7 34 2'
            }
            fill="none"
            stroke={p.hair}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g className="custom-eyes" fill={p.hair}>
            <ellipse
              cx="191"
              cy="196"
              rx="5"
              ry={emotion === 'curious' ? 9 : emotion === 'sad' ? 4 : 7}
            />
            <ellipse
              cx="286"
              cy="196"
              rx="5"
              ry={emotion === 'curious' ? 9 : emotion === 'sad' ? 4 : 7}
            />
          </g>
          <path d="m240 204-5 28 9 3" fill="none" stroke="#9c7154" strokeWidth="2" />
          <path
            className="custom-mouth"
            d={
              emotion === 'sad'
                ? 'M224 263q15-13 30 0'
                : emotion === 'curious'
                  ? 'M222 252q17 22 34 0Z'
                  : 'M224 255q15 10 30 0'
            }
            stroke="#a77366"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {v.accessory === 'glasses' && (
            <g fill="none" stroke={p.hair} strokeWidth="3">
              <circle cx="191" cy="198" r="25" />
              <circle cx="286" cy="198" r="25" />
              <path d="M216 198h45m-95-4-21-5m166 5 22-5" />
            </g>
          )}
          {v.accessory === 'star' && (
            <path d="m309 124 4 10 12 1-9 8 3 11-10-6-10 6 3-11-9-8 12-1Z" fill={p.accent} />
          )}
          {v.accessory === 'scarf' && (
            <path d="M180 301q58 35 118 0l9 27-53 19 38 104-26 10-46-114-48-20Z" fill={p.accent} />
          )}
          {performance === 'offer_photo' ? (
            <g data-prop="photo" transform="rotate(-12 340 430)">
              <rect x="275" y="355" width="135" height="170" rx="4" fill="#f6edda" />
              <rect x="285" y="366" width="115" height="120" fill="#7caba8" />
              <circle cx="369" cy="391" r="14" fill="#f7d58d" />
              <path d="M285 446q30-20 58 0t57 0v40H285Z" fill="#396c77" />
              <path d="M350 519q55-5 44-40l-15 4q-5 17-29 14" fill={p.skin} />
            </g>
          ) : (
            definition.visual.setting === 'bookshop' && (
              <g transform="rotate(-8 244 490)">
                <rect x="175" y="425" width="133" height="180" rx="5" fill="#eee3c3" />
                <rect x="183" y="425" width="124" height="174" rx="3" fill={p.accent} />
                <path d="M201 456h87m-87 10h87" stroke="#303b33" opacity=".5" />
              </g>
            )
          )}
          {definition.visual.setting === 'cafe' &&
            /摄影|photo/i.test(definition.character.profession) && (
              <g>
                <path d="m280 365 34 120" stroke={p.hair} strokeWidth="12" />
                <rect x="188" y="468" width="112" height="76" rx="8" fill="#26352d" />
                <circle cx="244" cy="506" r="27" fill="#14221c" stroke="#70806a" strokeWidth="7" />
              </g>
            )}
        </g>
      </svg>
    </div>
  );
}
