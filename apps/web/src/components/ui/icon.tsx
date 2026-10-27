import type { SVGProps } from 'react';
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | 'mic'
    | 'send'
    | 'sound'
    | 'mute'
    | 'close'
    | 'rain'
    | 'arrow'
    | 'refresh'
    | 'photo'
    | 'stop'
    | 'info'
    | 'settings';
}) {
  const paths = {
    settings: (
      <>
        <path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2v3l-1 3h-4l-2-2H9l-3 1-2-3 1-3-2-3 2-3 3 1Z" />
        <circle cx="12" cy="11" r="3" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
      </>
    ),
    send: (
      <>
        <path d="m3 11 18-8-8 18-2-8-8-2Z" />
        <path d="m11 13 10-10" />
      </>
    ),
    sound: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 6 6m0-6-6 6" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    rain: (
      <>
        <path d="M6 13a4 4 0 1 1 1-8 6 6 0 0 1 11 2 3 3 0 0 1 0 6H6ZM7 17l-1 3m6-3-1 3m6-3-1 3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3" />
      </>
    ),
    photo: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </>
    ),
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-11v1" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
