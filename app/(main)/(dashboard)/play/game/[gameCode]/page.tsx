"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useFirestore } from "reactfire";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Copy, Users, Clock } from "lucide-react";
import { GameState, getGame, subscribeToGame } from "@/lib/firebase-game";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const gameCode = params.gameCode as string;

  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameCode || !auth.currentUser) {
      setLoading(false);
      return;
    }

    // Find the game by game code
    const gamesRef = collection(firestore, "games");
    const q = query(gamesRef, where("gameCode", "==", gameCode.toUpperCase()));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        setError("Game not found");
        setLoading(false);
        return;
      }

      const gameDoc = querySnapshot.docs[0];
      const gameData = { id: gameDoc.id, ...gameDoc.data() } as GameState;

      // Check if user is part of this game
      const isPlayerInGame =
        gameData.whitePlayer?.uid === auth.currentUser?.uid ||
        gameData.blackPlayer?.uid === auth.currentUser?.uid;

      if (!isPlayerInGame) {
        setError("You are not part of this game");
        setLoading(false);
        return;
      }

      setGame(gameData);
      setLoading(false);

      // If game is active, redirect to the chess board
      if (
        gameData.status === "active" &&
        gameData.whitePlayer &&
        gameData.blackPlayer
      ) {
        const userColor =
          gameData.whitePlayer.uid === auth.currentUser?.uid
            ? "white"
            : "black";
        router.push(`/play/board?gameId=${gameDoc.id}&color=${userColor}`);
      }
    });

    return () => unsubscribe();
  }, [gameCode, auth.currentUser, firestore, router]);

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode);
    toast({
      title: "Game code copied!",
      description: "Share this code with your opponent.",
    });
  };

  const getUserColor = () => {
    if (!game || !auth.currentUser) return null;
    if (game.whitePlayer?.uid === auth.currentUser.uid) return "white";
    if (game.blackPlayer?.uid === auth.currentUser.uid) return "black";
    return null;
  };

  const getOpponentName = () => {
    if (!game || !auth.currentUser) return null;
    const userColor = getUserColor();
    if (userColor === "white")
      return game.blackPlayer?.displayName || "Opponent";
    if (userColor === "black")
      return game.whitePlayer?.displayName || "Opponent";
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <h2 className="text-2xl font-bold text-destructive">{error}</h2>
        <Button onClick={() => router.push("/play")}>Back to Play</Button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <h2 className="text-2xl font-bold">Game not found</h2>
        <Button onClick={() => router.push("/play")}>Back to Play</Button>
      </div>
    );
  }

  const userColor = getUserColor();
  const opponentName = getOpponentName();
  const isWaiting = game.status === "waiting";

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Chess Game
            </CardTitle>
            <CardDescription>
              Game Code:{" "}
              <span className="font-mono font-bold text-lg">{gameCode}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={copyGameCode}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Game Code
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your Color:</span>
                <Badge
                  variant={userColor === "white" ? "default" : "secondary"}
                >
                  {userColor === "white" ? "White" : "Black"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={isWaiting ? "outline" : "default"}>
                  {isWaiting ? "Waiting for opponent" : "Ready to play"}
                </Badge>
              </div>

              {!isWaiting && opponentName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Opponent:</span>
                  <span className="text-sm">{opponentName}</span>
                </div>
              )}
            </div>

            {isWaiting ? (
              <div className="text-center space-y-3 pt-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span>Waiting for opponent to join...</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share the game code with your opponent
                </p>
              </div>
            ) : (
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Both players have joined! Redirecting to game...
                </p>
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" onClick={() => router.push("/play")}>
        Back to Play
      </Button>
    </div>
  );
}
