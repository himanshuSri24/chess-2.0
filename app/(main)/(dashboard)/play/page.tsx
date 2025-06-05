"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PlayColorSelector() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 p-4">
      <h2 className="text-2xl font-bold mb-6">Choose your color</h2>
      <div className="flex gap-8">
        <Button
          className="px-8 py-4 text-lg"
          onClick={() => router.push("/play/board?color=white")}
        >
          Play as White
        </Button>
        <Button
          className="px-8 py-4 text-lg"
          variant="secondary"
          onClick={() => router.push("/play/board?color=black")}
        >
          Play as Black
        </Button>
      </div>
    </div>
  );
}
