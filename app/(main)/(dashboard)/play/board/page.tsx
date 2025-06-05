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
import { useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import { useSearchParams } from "next/navigation";
import { useUser } from "reactfire";

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

export default function ChessBoardPage() {
  const searchParams = useSearchParams();
  const { data: user } = useUser();
  const color = searchParams?.get("color") === "black" ? "black" : "white";
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
  const [validMoves, setValidMoves] = useState<Square[]>([]);

  // If black, flip the board
  const displayBoard =
    color === "black"
      ? [...board].reverse().map((row) => [...row].reverse())
      : board;

  // For ranks and files display
  const ranks =
    color === "black" ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files =
    color === "black"
      ? ["h", "g", "f", "e", "d", "c", "b", "a"]
      : ["a", "b", "c", "d", "e", "f", "g", "h"];

  const handleDragStart = (i: number, j: number, piece: string) => {
    // If black, flip indices
    const row = color === "black" ? 7 - i : i;
    const col = color === "black" ? 7 - j : j;
    const from = getSquare(row, col);
    setDragged({ from, piece });
    // Get valid moves for this piece
    const moves = chessRef.current.moves({ square: from, verbose: true }) as {
      to: Square;
    }[];
    setValidMoves(moves.map((m) => m.to));
  };

  const handleDrop = (i: number, j: number) => {
    if (!dragged) return;
    const row = color === "black" ? 7 - i : i;
    const col = color === "black" ? 7 - j : j;
    const to = getSquare(row, col);
    if (dragged.from === to) return;
    if (!validMoves.includes(to)) {
      setDragged(null);
      setValidMoves([]);
      return;
    }
    const move = chessRef.current.move({ from: dragged.from, to });
    if (move) {
      setBoard(chessRef.current.board());
      setMoveHistory(chessRef.current.history({ verbose: true }));
      setVersion((v) => v + 1); // force re-render
    }
    setDragged(null);
    setValidMoves([]);
  };

  const handleDragEnd = () => {
    setDragged(null);
    setValidMoves([]);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    i: number,
    j: number
  ) => {
    const row = color === "black" ? 7 - i : i;
    const col = color === "black" ? 7 - j : j;
    const to = getSquare(row, col);
    if (validMoves.includes(to)) {
      e.preventDefault();
    }
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
        {/* Chess Board with ranks and files */}
        <div className="relative">
          <div className="flex">
            {/* Ranks (left) */}
            <div className="flex flex-col justify-between w-6 sm:w-8 select-none">
              {ranks.map((rank) => (
                <div
                  key={rank}
                  className="h-10 sm:h-14 flex items-center justify-center text-xs text-muted-foreground font-bold"
                  style={{ height: "3.5rem" }}
                >
                  {rank}
                </div>
              ))}
            </div>
            {/* Board */}
            <div className="grid grid-cols-8 grid-rows-8 gap-0.5 border-2 border-border rounded-lg overflow-hidden shadow-lg">
              {displayBoard.map((row, i) =>
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
                        ${
                          validMoves.includes(
                            getSquare(
                              color === "black" ? 7 - i : i,
                              color === "black" ? 7 - j : j
                            )
                          )
                            ? `shadow-[4px_4px_12px_0_rgba(0,0,0,0.35)] relative`
                            : ""
                        }
                        ${
                          validMoves.includes(
                            getSquare(
                              color === "black" ? 7 - i : i,
                              color === "black" ? 7 - j : j
                            )
                          ) &&
                          chessRef.current
                            .moves({ square: dragged?.from, verbose: true })
                            ?.some(
                              (m) =>
                                m.to ===
                                  getSquare(
                                    color === "black" ? 7 - i : i,
                                    color === "black" ? 7 - j : j
                                  ) && m.captured
                            )
                            ? "bg-red-200"
                            : ""
                        }
                        ${
                          // Highlight king in check
                          (() => {
                            const chess = chessRef.current;
                            if (!chess.inCheck()) return "";
                            // Find the king's square for the side to move
                            const turn = chess.turn();
                            for (let row = 0; row < 8; row++) {
                              for (let col = 0; col < 8; col++) {
                                const sq = chess.board()[row][col];
                                if (
                                  sq &&
                                  sq.type === "k" &&
                                  sq.color === turn
                                ) {
                                  if (
                                    getSquare(row, col) ===
                                    getSquare(
                                      color === "black" ? 7 - i : i,
                                      color === "black" ? 7 - j : j
                                    )
                                  ) {
                                    return "bg-red-200";
                                  }
                                }
                              }
                            }
                            return "";
                          })()
                        }
                      `}
                      onDrop={() => handleDrop(i, j)}
                      onDragOver={(e) => handleDragOver(e, i, j)}
                    >
                      {validMoves.includes(
                        getSquare(
                          color === "black" ? 7 - i : i,
                          color === "black" ? 7 - j : j
                        )
                      ) &&
                        !pieceImage && (
                          <span
                            className={`absolute w-3 h-3 rounded-full z-30 opacity-90 pointer-events-none
                        ${isLight ? "bg-black" : "bg-white"}
                      `}
                            style={{
                              left: "50%",
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              boxShadow: "0 2px 6px 0 rgba(0,0,0,0.25)",
                            }}
                          />
                        )}
                      {pieceImage && (
                        <Image
                          src={pieceImage}
                          alt={piece}
                          width={50}
                          height={50}
                          draggable
                          onDragStart={() => handleDragStart(i, j, piece)}
                          onDragEnd={handleDragEnd}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Files (bottom) */}
          <div className="flex gap-0.5 mt-1">
            {/* Spacer for rank numbers */}
            <div className="w-6 sm:w-8" />
            {files.map((file) => (
              <div
                key={file}
                className="w-10 sm:w-14 flex items-center justify-center text-xs text-muted-foreground font-bold"
                style={{ width: "3.5rem" }}
              >
                {file}
              </div>
            ))}
          </div>
        </div>
        {/* Bottom Player */}
        <div className="flex flex-col items-center mt-4">
          <Avatar className="h-14 w-14 mb-2">
            <AvatarImage
              src={user?.photoURL || "/avatars/01.png"}
              alt={user?.displayName || ""}
            />
            <AvatarFallback>
              {user?.displayName?.split(" ")[0]?.slice(0, 1) ?? ""}
              {user?.displayName?.split(" ")[1]?.slice(0, 1) ?? ""}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-lg text-muted-foreground">
            {user?.displayName?.split(" ")[0] || "White Player"}
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
