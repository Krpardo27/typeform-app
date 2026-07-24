"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoaderScreen from "./LoaderScreen";

type LoaderRedirectProps = {
  redirectTo: string;
  delayMs?: number;
  title: string;
  description: string;
};

export default function LoaderRedirect({
  redirectTo,
  delayMs = 1000,
  title,
  description,
}: LoaderRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(redirectTo);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, redirectTo, router]);

  return <LoaderScreen title={title} description={description} badgeText="Verificando" />;
}
