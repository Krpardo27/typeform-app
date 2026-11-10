"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoaderScreen, { type LoaderScreenVariant } from "./LoaderScreen";

type LoaderRedirectProps = {
  redirectTo: string;
  delayMs?: number;
  title: string;
  description: string;
  variant?: LoaderScreenVariant;
};

export default function LoaderRedirect({
  redirectTo,
  delayMs = 1000,
  title,
  description,
  variant = "default",
}: LoaderRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(redirectTo);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, redirectTo, router]);

  return <LoaderScreen title={title} description={description} variant={variant} />;
}
