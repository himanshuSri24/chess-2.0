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
import { useEffect, useRef, useState } from "react";
import { Chess, Square, PieceSymbol, Color } from "chess.js";

const PIECES_STYLE = "governer";

const PLAYER_WHITE = {
  name: "Alice",
  avatar: "/avatars/01.png",
};
const PLAYER_BLACK = {
  name: "Bob",
  avatar: "/avatars/02.png",
};

function getSquare(i: number, j: number) {
  // i: row (0-7), j: col (0-7), 0,0 is top left (a8)
  const file = String.fromCharCode("a".charCodeAt(0) + j);
  const rank = 8 - i;
  return `${file}${rank}` as Square;
}

export default function ApplicationPage() {
  const chessRef = useRef(new Chess());
  const [board, setBoard] = useState(chessRef.current.board());
  const [moveHistory, setMoveHistory] = useState(
    chessRef.current.history({ verbose: true })
  );
  const [dragged, setDragged] = useState<{
    from: Square;
    piece: string;
  } | null>(null);
  const [, setVersion] = useState(0); // dummy state to force re-render

  const handleDragStart = (i: number, j: number, piece: string) => {
    setDragged({ from: getSquare(i, j), piece });
  };

  const handleDrop = (i: number, j: number) => {
    if (!dragged) return;
    const to = getSquare(i, j);
    if (dragged.from === to) return;
    const move = chessRef.current.move({ from: dragged.from, to });
    if (move) {
      setBoard(chessRef.current.board());
      setMoveHistory(chessRef.current.history({ verbose: true }));
      setVersion((v) => v + 1); // force re-render
    }
    setDragged(null);
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
            row.map((square, j) => {
              const isLight = (i + j) % 2 === 1;
              const piece = square
                ? `${square.color.toUpperCase()}${square.type.toUpperCase()}`
                : "";
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
                <TableHead>White</TableHead>
                <TableHead>Black</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const rows = [];
                for (let i = 0; i < moveHistory.length; i += 2) {
                  rows.push(
                    <TableRow key={i / 2}>
                      <TableCell>{i / 2 + 1}</TableCell>
                      <TableCell>{moveHistory[i]?.san || ""}</TableCell>
                      <TableCell>{moveHistory[i + 1]?.san || ""}</TableCell>
                    </TableRow>
                  );
                }
                return rows;
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
