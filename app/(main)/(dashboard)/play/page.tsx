"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CreateGameModal } from "@/components/game/create-game-modal";
import { JoinGameModal } from "@/components/game/join-game-modal";
import { Separator } from "@/components/ui/separator";

export default function PlayColorSelector() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 p-4">
      <h2 className="text-2xl font-bold mb-6">Choose how to play</h2>

      {/* Online Multiplayer Options */}
      <div className="flex flex-col items-center gap-6">
        <h3 className="text-lg font-semibold text-muted-foreground">
          Play Online
        </h3>
        <div className="flex gap-4">
          <CreateGameModal />
          <JoinGameModal />
        </div>
      </div>

      <Separator className="w-64" />

      {/* Local Play Options */}
      <div className="flex flex-col items-center gap-6">
        <h3 className="text-lg font-semibold text-muted-foreground">
          Play Locally
        </h3>
        <div className="flex gap-4">
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
    </div>
  );
}
