import type { Command } from "../game/types";
type Props = { size?: number; className?: string };
export function CommandIcon({
  command,
  size = 32,
}: Props & { command: Command }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      {command === "forward" || command === "backward" ? (
        <g transform={command === "backward" ? "rotate(180 20 20)" : undefined}>
          <path
            d="M20 32V9M10 19 20 9 30 19"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <g
          transform={
            command === "right" ? "translate(40 0) scale(-1 1)" : undefined
          }
        >
          <path
            d="M9 18a12 12 0 1 1 7 16M8 8v11h11"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="22" r="3" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
export function StarIcon({ size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="m12 2.8 2.8 5.7 6.3.9-4.55 4.45 1.07 6.28L12 17.16l-5.62 2.97 1.07-6.28L2.9 9.4l6.3-.9L12 2.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function RobotIcon({ size = 40 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 10V5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="24" cy="5" r="3" fill="#e6b650" />
      <rect x="5" y="11" width="38" height="31" rx="12" fill="currentColor" />
      <rect x="11" y="17" width="26" height="18" rx="7" fill="#fffdf3" />
      <path
        d="M19 24v3m10-3v3m-8 3q3 3 6 0"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function SoundIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m11 4-6 5H2v6h3l6 5V4Z" />
      {enabled ? (
        <>
          <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      ) : (
        <path d="m16 9 6 6m0-6-6 6" />
      )}
    </svg>
  );
}
export function ResetIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
    </svg>
  );
}
