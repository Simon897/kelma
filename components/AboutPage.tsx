"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CatNap } from "./about/CatNap";
import { CatLogo } from "./CatLogo";

/**
 * The about page: one version, in English. The email is put together in the browser, so the
 * address isn't sitting in the page's HTML for scrapers; people see and use it as normal.
 */
const USER = "simonmifsud9";
const DOMAIN = "gmail.com";

function Email() {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => setAddress(`${USER}@${DOMAIN}`), []);
  if (!address) return <span className="font-bold">{`${USER} [at] ${DOMAIN}`}</span>;
  return (
    <a href={`mailto:${address}`} className="font-bold text-sea-deep underline underline-offset-2 hover:text-ink">
      {address}
    </a>
  );
}

export function AboutPage() {
  return (
    <div className="min-h-svh" lang="en">
      <header className="mx-auto flex h-16 max-w-[40rem] items-center px-4">
        <Link href="/" aria-label="Back to Kelma" className="inline-flex min-h-11 items-center gap-2">
          <CatLogo className="size-10" />
          <span className="display-caps text-lg">Kelma</span>
        </Link>
      </header>
      <main className="mx-auto max-w-[40rem] px-4 pb-16 pt-4">
        <h1 className="display-caps text-4xl">About</h1>
        {/* the text, with the napping cat quietly beside it */}
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:gap-8">
          <div className="space-y-4 text-lg leading-relaxed">
            <p>
              Kelma is a personal hobby project. The dictionary used for the puzzles is not a complete Maltese dictionary, if you have feedback or suggestions
              please send me an email.
            </p>
            <p>
              <Email />
            </p>
            <p lang="mt" className="display-caps pt-2 text-2xl">
              Grazzi!
            </p>
          </div>
          <CatNap className="w-[clamp(6.5rem,30vw,11rem)]" />
        </div>
      </main>
    </div>
  );
}
