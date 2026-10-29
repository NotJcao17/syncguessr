import { LOGO_VIEWBOX, QUESTION_DOT, QUESTION_PATH, RING_MASK, RINGS_PATH } from "./logoPaths";

/** syncguessr mark: Syncora's sound rings around a question mark. */
export function LogoMark({ className = "size-8", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <mask id="sg-ring-mask">
          <rect width="1024" height="1024" fill="#fff" />
          <circle {...RING_MASK} fill="#000" />
        </mask>
      </defs>
      <path mask="url(#sg-ring-mask)" fill="var(--color-indigo-soft)" fillRule="evenodd" d={RINGS_PATH} />
      <path d={QUESTION_PATH} fill="none" stroke="currentColor" strokeWidth="104" strokeLinecap="round" />
      <circle {...QUESTION_DOT} fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wide text-[1.35rem] font-extrabold tracking-[-0.035em] ${className}`}>
      sync<span className="text-indigo-soft">guessr</span>
    </span>
  );
}
