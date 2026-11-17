import { asset } from "@/lib/site";

/**
 * The Kelma cat: Daisy's head in felt and cut paper, the same art as the home page's street and
 * the Dizzjunarju invite. The favicon and app icons are cut from the same picture.
 * public/media/kelma-cat.webp is 192×192 with a transparent background.
 */
export function CatLogo({ className, title }: { className?: string; title?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimiser
    <img
      src={asset("/media/kelma-cat.webp")}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={192}
      height={192}
      draggable={false}
      className={`select-none object-contain ${className ?? ""}`}
    />
  );
}
