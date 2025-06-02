"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import { getPiece } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

const PIECES_STYLE = "governer";

const INITIAL_BOARD = [
  ["BR", "BN", "BB", "BQ", "BK", "BB", "BN", "BR"],
  ["BP", "BP", "BP", "BP", "BP", "BP", "BP", "BP"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["WP", "WP", "WP", "WP", "WP", "WP", "WP", "WP"],
  ["WR", "WN", "WB", "WQ", "WK", "WB", "WN", "WR"],
];

const MOVES = [
  { move: "e4", player: "White" },
  { move: "e5", player: "Black" },
  { move: "Nf3", player: "White" },
  { move: "Nc6", player: "Black" },
  { move: "Bb5", player: "White" },
];

const PLAYER_WHITE = {
  name: "Alice",
  avatar: "/avatars/01.png",
};
const PLAYER_BLACK = {
  name: "Bob",
  avatar: "/avatars/02.png",
};

export default function ApplicationPage() {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [draggedPiece, setDraggedPiece] = useState<{
    i: number;
    j: number;
    piece: string;
  } | null>(null);

  const handleDragStart = (i: number, j: number, piece: string) => {
    setDraggedPiece({ i, j, piece });
  };

  const handleDrop = (i: number, j: number) => {
    if (!draggedPiece) return;
    // Only allow dropping on empty squares for now
    if (board[i][j] !== "") return;
    const newBoard = board.map((row) => [...row]);
    newBoard[draggedPiece.i][draggedPiece.j] = "";
    newBoard[i][j] = draggedPiece.piece;
    setBoard(newBoard);
    setDraggedPiece(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-[80vh] gap-8 p-4">
      {/* Chess Board and Players */}
      <Card className="p-6 flex flex-col items-center shadow-xl bg-background/80">
        {/* Top Player */}
        <div className="flex flex-col items-center mb-4">
          <Avatar className="h-14 w-14 mb-2">
            <AvatarImage src={PLAYER_BLACK.avatar} alt={PLAYER_BLACK.name} />
            <AvatarFallback>BK</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-lg text-muted-foreground">
            {PLAYER_BLACK.name}
          </span>
        </div>
        {/* Chess Board */}
        <div className="grid grid-cols-8 grid-rows-8 gap-0.5 border-2 border-border rounded-lg overflow-hidden shadow-lg">
          {board.map((row, i) =>
            row.map((piece, j) => {
              const isLight = (i + j) % 2 === 1;
              const pieceImage = getPiece(PIECES_STYLE, piece);
              return (
                <div
                  key={`${i}-${j}`}
                  className={`flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 font-bold text-lg select-none transition-colors
                    ${isLight ? "bg-muted" : "bg-black"}
                    ${isLight ? "text-primary" : "text-muted-foreground"}
                  `}
                  onDrop={() => handleDrop(i, j)}
                  onDragOver={handleDragOver}
                >
                  {pieceImage && (
                    <Image
                      src={pieceImage}
                      alt={piece}
                      width={50}
                      height={50}
                      draggable
                      onDragStart={() => handleDragStart(i, j, piece)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        {/* Bottom Player */}
        <div className="flex flex-col items-center mt-4">
          <Avatar className="h-14 w-14 mb-2">
            <AvatarImage src={PLAYER_WHITE.avatar} alt={PLAYER_WHITE.name} />
            <AvatarFallback>WK</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-lg text-muted-foreground">
            {PLAYER_WHITE.name}
          </span>
        </div>
      </Card>
      {/* Move List */}
      <Card className="w-full max-w-xs md:max-w-sm shadow-xl bg-background/80">
        <CardHeader>
          <CardTitle className="text-xl">Move List</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Move</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOVES.map((m, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{m.player}</TableCell>
                  <TableCell>{m.move}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
