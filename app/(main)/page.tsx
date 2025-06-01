"use client";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import React from "react";
import { ProviderLoginButtons } from "@/components/auth/provider-login-buttons";
import { useUser } from "reactfire";

export default function Home() {
  const { data, hasEmitted } = useUser();
  return (
    <>
      <div className="grow flex flex-col items-center justify-evenly">
        <section className="space-y-6">
          <div className="container flex flex-col items-center gap-8 text-center">
            <h1 className="max-w-4xl font-heading font-semibold text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter">
              Play Chess
            </h1>
            <p className="max-w-2xl leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              For friends, by friends.
            </p>
            <div>
              {hasEmitted && data ? (
                <Link href="/play" className="mb-4 inline-block">
                  <Button>Start Playing</Button>
                </Link>
              ) : (
                <ProviderLoginButtons />
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
