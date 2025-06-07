"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "reactfire";
import { joinGame } from "@/lib/firebase-game";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function JoinGameModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [gameCode, setGameCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const handleJoinGame = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a game.",
        variant: "destructive",
      });
      return;
    }

    if (!gameCode.trim()) {
      toast({
        title: "Game code required",
        description: "Please enter a game code to join.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinGame(
        firestore,
        auth.currentUser,
        gameCode.trim()
      );

      if (result.success && result.gameId) {
        toast({
          title: "Joined game!",
          description: "You have successfully joined the game.",
        });

        // Navigate to the game
        router.push(`/play/game/${gameCode.toUpperCase()}`);
        setIsOpen(false);
        setGameCode("");
      } else {
        toast({
          title: "Failed to join game",
          description:
            result.error || "An error occurred while joining the game.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isJoining) {
      handleJoinGame();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="px-8 py-4 text-lg">
          Join Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join Game</DialogTitle>
          <DialogDescription>
            Enter the game code provided by your opponent to join their game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="gameCode" className="text-base font-medium">
              Game Code
            </Label>
            <Input
              id="gameCode"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter 6-character game code"
              className="text-center text-lg font-mono tracking-wider"
              maxLength={6}
              autoComplete="off"
              disabled={isJoining}
            />
            <p className="text-sm text-muted-foreground">
              Game codes are 6 characters long (e.g., ABC123)
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setGameCode("");
            }}
            disabled={isJoining}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinGame}
            disabled={isJoining || !gameCode.trim()}
            className="min-w-[100px]"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Game"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
