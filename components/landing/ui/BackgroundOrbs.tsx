/**
 * Fixed, very-soft warm colour blobs behind all content, distributed top-to-bottom so every
 * section has colour behind its cards. They give the frosted .glass cards something textured
 * to blur over, so the signature Liquid-Glass effect reads (STYLE_GUIDE.md §1/§4).
 * Purely decorative, warm brand/teal hues only, never neon.
 */
export function BackgroundOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -left-40 top-[6%] h-[26rem] w-[26rem] rounded-full bg-brand-300/35 blur-3xl" />
      <div className="absolute -right-32 top-[1%] h-80 w-80 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="absolute left-1/2 top-[40%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="absolute -left-24 top-[66%] h-[24rem] w-[24rem] rounded-full bg-teal-200/35 blur-3xl" />
      <div className="absolute -right-24 bottom-[5%] h-[24rem] w-[24rem] rounded-full bg-brand-300/30 blur-3xl" />
    </div>
  );
}
