"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyStatementRedirect() {
  const { cid, sid } = useParams<{ id: string; cid: string; sid: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/contracts/${cid}/statements/${sid}`);
  }, [cid, sid, router]);

  return <div className="p-8 text-muted-foreground text-sm">در حال انتقال...</div>;
}
