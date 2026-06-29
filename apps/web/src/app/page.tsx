"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";

export default function RootPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { current, isLoading: peladaLoading } = usePelada();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (peladaLoading) return;
    router.replace(current ? "/painel" : "/peladas");
  }, [authLoading, token, peladaLoading, current, router]);

  return null;
}
