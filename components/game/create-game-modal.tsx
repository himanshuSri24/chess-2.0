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
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "reactfire";
import { createGame } from "@/lib/firebase-game";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function CreateGameModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<"white" | "black">(
    "white"
  );
  const [isCreating, setIsCreating] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const handleCreateGame = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a game.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const gameCode = await createGame(
        firestore,
        auth.currentUser,
        selectedColor
      );
      toast({
        title: "Game created!",
        description: `Game code: ${gameCode}. Share this code with your opponent.`,
      });

      // Navigate to a waiting room or game management page
      router.push(`/play/game/${gameCode}`);
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="px-8 py-4 text-lg">Create Game</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Game</DialogTitle>
          <DialogDescription>
            Choose your color and create a game for an opponent to join.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-3">
            <Label htmlFor="color" className="text-base font-medium">
              Choose your color:
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedColor === "white" ? "default" : "outline"}
                onClick={() => setSelectedColor("white")}
                className="h-12"
              >
                Play as White
              </Button>
              <Button
                variant={selectedColor === "black" ? "default" : "outline"}
                onClick={() => setSelectedColor("black")}
                className="h-12"
              >
                Play as Black
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGame}
            disabled={isCreating}
            className="min-w-[100px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Game"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
