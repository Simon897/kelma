/**
 * The Kelma cat, drawn after the real one and the idle animation: tabby back, head and tail,
 * white muzzle, belly and paws, pale green-yellow eyes, dark-tipped tail, purple collar.
 * Same drawing as public/favicon.svg.
 */
export function CatLogo({
  className,
  title,
  sleeping = false,
  tailClassName,
}: {
  className?: string;
  title?: string;
  /** Eyes closed (Għerq's cat naps in the tree's shade). */
  sleeping?: boolean;
  /** Class on the tail group, so it can be animated on its own. */
  tailClassName?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {/* tail, dark at the tip */}
      <g className={tailClassName}>
        <path d="M45 58c9 0 14-5 13-12-.6-4-4-5-5.5-3" fill="none" stroke="#6e6556" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M58 46c-.6-4-4-5-5.5-3" fill="none" stroke="#2b2621" strokeWidth="4.5" strokeLinecap="round" />
      </g>
      {/* body: tabby back showing at the sides, stripes on the flanks */}
      <path d="M16 60c-2.5-12 2-24 16-25.5C46 36 50.5 48 48 60Z" fill="#6e6556" />
      <path d="M17.6 45c1.8.4 3.1 1.3 3.9 2.8M16.9 51.5c1.8.3 3 1 3.8 2.3M46.4 45c-1.8.4-3.1 1.3-3.9 2.8M47.1 51.5c-1.8.3-3 1-3.8 2.3" fill="none" stroke="#2b2621" strokeWidth="1.9" strokeLinecap="round" />
      {/* white chest and belly, widening to the bottom */}
      <path d="M24 39.8c5-3 11-3 16 0 3.2 6 4.4 13 3.9 20.2H20.1c-.5-7.2.7-14.2 3.9-20.2Z" fill="#f8f2e2" />
      <ellipse cx="24.5" cy="59.5" rx="4" ry="2.2" fill="#f8f2e2" />
      <ellipse cx="39.5" cy="59.5" rx="4" ry="2.2" fill="#f8f2e2" />
      {/* head, pink inner ears, tabby "M" and cheek stripes */}
      <path d="M18.5 29 17 7.5l10.5 7.3c3-1 6-1 9 0L47 7.5 45.5 29c0 7-5.5 10.5-13.5 10.5S18.5 36 18.5 29Z" fill="#6e6556" />
      <path d="M19.4 11.5 20.3 19.5l4.6-3.6ZM44.6 11.5 43.7 19.5l-4.6-3.6Z" fill="#d49a8a" />
      <path d="M29 15.8v4.2M32 15.2v5.3M35 15.8v4.2M19.3 26.5h3.6M19.8 30.2l3.3-.8M44.7 26.5h-3.6M44.2 30.2l-3.3-.8" fill="none" stroke="#2b2621" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M26 31.5c0-2.6 2.7-3.6 6-3.6s6 1 6 3.6c0 3.8-2.7 6.5-6 6.5s-6-2.7-6-6.5Z" fill="#f8f2e2" />
      {/* eyes */}
      {sleeping ? (
        <path d="M22.8 25.2c1.9 1.6 4.5 1.6 6.4 0M34.8 25.2c1.9 1.6 4.5 1.6 6.4 0" fill="none" stroke="#1d1813" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="26" cy="24.5" rx="3.4" ry="3.6" fill="#dfe29a" />
          <ellipse cx="38" cy="24.5" rx="3.4" ry="3.6" fill="#dfe29a" />
          <ellipse cx="26" cy="24.5" rx="1" ry="2.8" fill="#1d1813" />
          <ellipse cx="38" cy="24.5" rx="1" ry="2.8" fill="#1d1813" />
        </>
      )}
      <path d="M30.6 30h2.8L32 31.8Z" fill="#c98a8a" />
      {/* purple collar */}
      <path d="M22 37.2c6 3.3 14 3.3 20 0" fill="none" stroke="#8a6cc2" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
