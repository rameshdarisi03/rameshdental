"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LocateUsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/#locate-us");
  }, [router]);
  return null;
}
