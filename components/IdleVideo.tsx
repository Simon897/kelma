"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/site";

const MOBILE_QUERY = "(max-width: 767px)";
/** Bump when the media files are replaced, so cached copies aren't reused. */
const MEDIA_VERSION = "?v=2";

/**
 * The idle animation below the fold. Decorative, so aria-hidden.
 * - The poster <img> is always underneath, so it's never a blank box
 *   (reduced motion, blocked autoplay, iOS Low Power Mode, slow network).
 * - The <video> only mounts once the page is loaded and the section is near
 *   the viewport, and it pauses when off-screen.
 * - The top edge fades into the page background with a mask, so there's no seam.
 */
export function IdleVideo() {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [mobile, setMobile] = useState<boolean | null>(null);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      setReduced(rm.matches);
      setMobile(mq.matches);
    };
    sync();
    rm.addEventListener("change", sync);
    mq.addEventListener("change", sync);

    const ready = () => setPageReady(true);
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });

    const el = wrap.current;
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "300px 0px" });
    const visObs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    if (el) {
      nearObs.observe(el);
      visObs.observe(el);
    }
    return () => {
      rm.removeEventListener("change", sync);
      mq.removeEventListener("change", sync);
      window.removeEventListener("load", ready);
      nearObs.disconnect();
      visObs.disconnect();
    };
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (visible) v.play().catch(() => {}); // blocked autoplay: the poster stays
    else v.pause();
  }, [visible, mobile, near]);

  const src = mobile ? asset(`/media/kelma-idle-mobile.mp4${MEDIA_VERSION}`) : asset(`/media/kelma-idle-desktop.mp4${MEDIA_VERSION}`);
  const poster = mobile ? asset(`/media/kelma-idle-mobile.png${MEDIA_VERSION}`) : asset(`/media/kelma-idle-desktop.png${MEDIA_VERSION}`);
  const playVideo = !reduced && near && pageReady && mobile !== null;

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className="relative aspect-square w-full overflow-hidden md:aspect-[1920/720] [mask-image:linear-gradient(to_bottom,transparent,black_9%)]"
    >
      <picture>
        <source media={MOBILE_QUERY} srcSet={asset(`/media/kelma-idle-mobile.png${MEDIA_VERSION}`)} />
        <img
          src={asset(`/media/kelma-idle-desktop.png${MEDIA_VERSION}`)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
      {playVideo && (
        <video
          key={src}
          ref={video}
          className="absolute inset-0 size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          disablePictureInPicture
          tabIndex={-1}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
