"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Wifi, WifiOff } from "lucide-react";
import { GameState } from "@/lib/firebase-game";

interface GameStatusProps {
  gameState: GameState | null;
  isOnlineGame: boolean;
  isPlayerTurn: boolean;
  userColor: "white" | "black";
  isConnected?: boolean;
}

export function GameStatus({
  gameState,
  isOnlineGame,
  isPlayerTurn,
  userColor,
  isConnected = true,
}: GameStatusProps) {
  if (!isOnlineGame) {
    return null; // Don't show status for local games
  }

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <Badge variant={isPlayerTurn ? "default" : "outline"}>
              {isPlayerTurn ? "Your turn" : "Opponent's turn"}
            </Badge>
          </div>
        </div>

        {gameState && (
          <div className="mt-2 text-xs text-muted-foreground">
            Game: {gameState.gameCode} • Playing as {userColor}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
