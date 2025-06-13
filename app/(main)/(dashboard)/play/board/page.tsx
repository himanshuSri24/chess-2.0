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
import { Chess, Square, Move } from "chess.js";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser, useAuth, useFirestore } from "reactfire";
import {
  GameState,
  subscribeToGame,
  makeMove,
  updateInvinciblePieces,
  updateGameStatus,
} from "@/lib/firebase-game";
import { useEffect } from "react";
import { GameStatus } from "@/components/game/game-status";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

// Add helper to check for checkmate respecting invincible pieces
function isCheckmateRespectingInvincible(
  chess: Chess,
  invinciblePieces: Array<{ color: "w" | "b"; type: string }>
) {
  if (!chess.inCheck()) return false;
  const moves = chess.moves({ verbose: true }) as Move[];
  if (invinciblePieces.length === 0) return chess.isCheckmate();
  // Find all invincible squares
  const board = chess.board();
  let invincibleSquares: Square[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (
        sq &&
        invinciblePieces.some((p) => p.type === sq.type && p.color === sq.color)
      ) {
        invincibleSquares.push(getSquare(r, c));
      }
    }
  }
  // Only allow moves that do not capture invincible pieces
  const legalMoves = moves.filter((m) => !invincibleSquares.includes(m.to));
  // If no legal moves and in check, it's checkmate
  return legalMoves.length === 0;
}

export default function ChessBoardPage() {
  const searchParams = useSearchParams();
  const { data: user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const gameId = searchParams?.get("gameId");
  const color = searchParams?.get("color") === "black" ? "black" : "white";
  const isOnlineGame = !!gameId;

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
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  // Invincibility feature state
  const [invincibleDialogOpen, setInvincibleDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [invinciblePieces, setInvinciblePieces] = useState<
    Array<{ color: "w" | "b"; type: string }>
  >([]);
  const INVINCIBLE_PASSWORD = "nikshu";
  // Add promotion UI state
  const [promotionDialog, setPromotionDialog] = useState<null | {
    from: Square;
    to: Square;
  }>(null);
  const [promotionChoice, setPromotionChoice] = useState<"q" | "r" | "b" | "n">(
    "q"
  );
  const [gameOverDialog, setGameOverDialog] = useState<{
    winner: string | null;
    result: string | null;
  } | null>(null);

  // Subscribe to Firebase game if it's an online game
  useEffect(() => {
    if (!isOnlineGame || !gameId || !auth.currentUser) {
      setIsPlayerTurn(true); // Local game - always player's turn
      return;
    }

    const unsubscribe = subscribeToGame(firestore, gameId, (game) => {
      if (game) {
        setGameState(game);
        // Show game over dialog if game is completed
        if (game.status === "completed") {
          let winner = null;
          let result: "white-wins" | "black-wins" | "draw" | "abandoned" =
            "draw";
          if (game.result === "white-wins") {
            winner = game.whitePlayer?.displayName || "White";
            result = "white-wins";
          }
          if (game.result === "black-wins") {
            winner = game.blackPlayer?.displayName || "Black";
            result = "black-wins";
          }
          if (game.result === "draw") {
            result = "draw";
          }
          if (game.result === "abandoned") {
            result = "abandoned";
          }
          setGameOverDialog({ winner, result });
        } else {
          setGameOverDialog(null);
        }
        // Update chess board with current position
        chessRef.current.load(game.fen);
        setBoard(chessRef.current.board());

        // For Firebase games, we need to reconstruct the game to get proper move history
        // Create a new Chess instance and replay all moves
        const tempChess = new Chess();
        for (const move of game.moves) {
          tempChess.move(move);
        }
        const reconstructedHistory = tempChess.history({ verbose: true });
        console.log("Firebase game moves:", game.moves);
        console.log("Reconstructed history:", reconstructedHistory);
        setMoveHistory(reconstructedHistory);
        setVersion((v) => v + 1);

        // Sync invinciblePieces from Firestore
        setInvinciblePieces(game.invinciblePieces || []);

        // Determine if it's the player's turn
        const userColor =
          game.whitePlayer?.uid === auth.currentUser?.uid ? "white" : "black";
        const newIsPlayerTurn = game.currentTurn === userColor;

        // Show toast notification when it becomes the player's turn
        if (newIsPlayerTurn && !isPlayerTurn && gameState) {
          toast({
            title: "Your turn!",
            description: "Make your move on the chess board.",
          });
        }

        setIsPlayerTurn(newIsPlayerTurn);
      }
    });

    return () => unsubscribe();
  }, [isOnlineGame, gameId, auth.currentUser, firestore]);

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

  const handleToggleInvincible = async (color: "w" | "b", type: string) => {
    let newInvinciblePieces: Array<{ color: "w" | "b"; type: string }>;
    const exists = invinciblePieces.some(
      (p) => p.color === color && p.type === type
    );
    if (exists) {
      newInvinciblePieces = invinciblePieces.filter(
        (p) => !(p.color === color && p.type === type)
      );
    } else {
      newInvinciblePieces = [...invinciblePieces, { color, type }];
    }
    setInvinciblePieces(newInvinciblePieces);
    // If online game, update Firestore
    if (isOnlineGame && gameId) {
      await updateInvinciblePieces(firestore, gameId, newInvinciblePieces);
    }
  };

  const handleDragStart = (i: number, j: number, piece: string) => {
    // For online games, check if it's the player's turn
    if (isOnlineGame && !isPlayerTurn) {
      return;
    }

    // If black, flip indices
    const row = color === "black" ? 7 - i : i;
    const col = color === "black" ? 7 - j : j;
    const from = getSquare(row, col);
    setDragged({ from, piece });
    // Get valid moves for this piece
    let moves = chessRef.current.moves({ square: from, verbose: true }) as {
      to: Square;
      captured?: string;
    }[];

    // --- Invincibility Rule (multi) ---
    if (invinciblePieces.length > 0) {
      const board = chessRef.current.board();
      let invincibleSquares: Square[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c];
          if (
            sq &&
            invinciblePieces.some(
              (p) => p.type === sq.type && p.color === sq.color
            )
          ) {
            invincibleSquares.push(getSquare(r, c));
          }
        }
      }
      moves = moves.filter((m) => !invincibleSquares.includes(m.to));
    }
    // --- End Invincibility Rule ---

    setValidMoves(moves.map((m) => m.to));
  };

  const handleDrop = async (i: number, j: number) => {
    if (!dragged) return;
    // Prevent moves if game is over
    if (gameState && gameState.status === "completed") {
      setDragged(null);
      setValidMoves([]);
      return;
    }
    // For online games, check if it's the player's turn
    if (isOnlineGame && !isPlayerTurn) {
      setDragged(null);
      setValidMoves([]);
      return;
    }

    const row = color === "black" ? 7 - i : i;
    const col = color === "black" ? 7 - j : j;
    const to = getSquare(row, col);
    if (dragged.from === to) return;
    if (!validMoves.includes(to)) {
      setDragged(null);
      setValidMoves([]);
      return;
    }

    // --- Promotion fix: block promotion if destination is invincible ---
    const piece = chessRef.current.get(dragged.from);
    if (piece && piece.type === "p" && (to.endsWith("8") || to.endsWith("1"))) {
      // Only allow promotion if destination is not invincible
      const board = chessRef.current.board();
      let invincibleSquares: Square[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c];
          if (
            sq &&
            invinciblePieces.some(
              (p) => p.type === sq.type && p.color === sq.color
            )
          ) {
            invincibleSquares.push(getSquare(r, c));
          }
        }
      }
      if (invincibleSquares.includes(to)) {
        toast({
          title: "Promotion blocked",
          description: "Cannot promote to a square with an invincible piece.",
        });
        setDragged(null);
        setValidMoves([]);
        return;
      }
      // Show promotion dialog
      setPromotionDialog({ from: dragged.from, to });
      setDragged(null);
      setValidMoves([]);
      return;
    }

    const move = chessRef.current.move({ from: dragged.from, to });
    if (move) {
      if (isOnlineGame && gameId && auth.currentUser) {
        // Make move in Firebase
        const newFen = chessRef.current.fen();
        const result = await makeMove(
          firestore,
          gameId,
          move.san,
          newFen,
          auth.currentUser
        );
        if (!result.success) {
          // Revert the move if Firebase update failed
          chessRef.current.undo();
          console.error("Failed to make move:", result.error);
        }
      } else {
        // Local game - update immediately
        setBoard(chessRef.current.board());
        setMoveHistory(chessRef.current.history({ verbose: true }));
        setVersion((v) => v + 1); // force re-render
      }
      // --- Custom checkmate logic ---
      if (isCheckmateRespectingInvincible(chessRef.current, invinciblePieces)) {
        let winner = chessRef.current.turn() === "w" ? "Black" : "White";
        let resultKey: "white-wins" | "black-wins" =
          chessRef.current.turn() === "w" ? "black-wins" : "white-wins";
        setGameOverDialog({ winner, result: resultKey });
        if (isOnlineGame && gameId) {
          await updateGameStatus(firestore, gameId, "completed", resultKey);
        }
      }
      // --- End custom checkmate logic ---
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 p-4">
      {/* Game Status for Online Games */}
      {isOnlineGame && (
        <div className="w-full max-w-2xl">
          <GameStatus
            gameState={gameState}
            isOnlineGame={isOnlineGame}
            isPlayerTurn={isPlayerTurn}
            userColor={color}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row items-stretch justify-center gap-8">
        {/* Chess Board and Players */}
        <Card className="p-6 flex flex-col items-center shadow-xl bg-background/80">
          {/* Top Player */}
          <div className="flex flex-col items-center mb-4">
            <Avatar className="h-14 w-14 mb-2">
              <AvatarImage
                src={
                  isOnlineGame && gameState
                    ? color === "white"
                      ? gameState.blackPlayer?.email
                      : gameState.whitePlayer?.email
                    : PLAYER_BLACK.avatar
                }
                alt={
                  isOnlineGame && gameState
                    ? (color === "white"
                        ? gameState.blackPlayer?.displayName
                        : gameState.whitePlayer?.displayName) || "Opponent"
                    : PLAYER_BLACK.name
                }
              />
              <AvatarFallback>
                {isOnlineGame && gameState
                  ? (color === "white"
                      ? gameState.blackPlayer?.displayName
                      : gameState.whitePlayer?.displayName
                    )
                      ?.slice(0, 2)
                      .toUpperCase() || "OP"
                  : "BK"}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-lg text-muted-foreground">
              {isOnlineGame && gameState
                ? (color === "white"
                    ? gameState.blackPlayer?.displayName
                    : gameState.whitePlayer?.displayName) || "Opponent"
                : PLAYER_BLACK.name}
            </span>
            {isOnlineGame && !isPlayerTurn && (
              <span className="text-xs text-green-600 font-medium">
                Their turn
              </span>
            )}
          </div>
          {/* Chess Board with ranks and files */}
          <div className="relative">
            <div className="flex">
              {/* Ranks (left) */}
              <div className="flex flex-col justify-between w-6 sm:w-8 select-none">
                {ranks.map((rank) => (
                  <div
                    key={rank}
                    className="h-12 sm:h-14 md:h-16 flex items-center justify-center text-xs text-muted-foreground font-bold"
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
                        className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 font-bold text-lg select-none transition-colors
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
                  className="w-12 sm:w-14 md:w-16 flex items-center justify-center text-xs text-muted-foreground font-bold"
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
              {user?.displayName?.split(" ")[0] || "You"}
            </span>
            {isOnlineGame && isPlayerTurn && (
              <span className="text-xs text-blue-600 font-medium">
                Your turn
              </span>
            )}
          </div>
        </Card>
        {/* Move List */}
        <Card className="w-full md:w-[400px] lg:w-[500px] max-w-lg shadow-xl bg-background/80">
          {/* Invincibility Button and Dialog */}
          <div className="w-full flex justify-end max-w-2xl">
            <Dialog
              open={invincibleDialogOpen}
              onOpenChange={setInvincibleDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ width: "100%" }}
                  onClick={() => setInvincibleDialogOpen(true)}
                >
                  Special Options
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Special Options</DialogTitle>
                  <DialogDescription>
                    {isAdmin
                      ? "Select pieces to make invincible for this game."
                      : "Enter password to access special options."}
                  </DialogDescription>
                </DialogHeader>
                {!isAdmin ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (password === INVINCIBLE_PASSWORD) {
                        setIsAdmin(true);
                      } else {
                        alert("Incorrect password");
                      }
                    }}
                    className="space-y-4"
                  >
                    <Label htmlFor="invincible-password">Password</Label>
                    <Input
                      id="invincible-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                    />
                    <DialogFooter>
                      <Button type="submit">Submit</Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Label>Toggle Invincibility</Label>
                      <div className="flex flex-col gap-2">
                        {["w", "b"].map((color) => (
                          <div key={color} className="flex flex-col gap-1">
                            <span className="font-semibold text-sm mb-1">
                              {color === "w" ? "White" : "Black"}
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { label: "King", value: "k" },
                                { label: "Queen", value: "q" },
                                { label: "Rook", value: "r" },
                                { label: "Bishop", value: "b" },
                                { label: "Knight", value: "n" },
                                { label: "Pawn", value: "p" },
                              ].map((opt) => {
                                const isOn = invinciblePieces.some(
                                  (p) =>
                                    p.color === color && p.type === opt.value
                                );
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                      isOn
                                        ? "bg-green-600 text-white border-green-700"
                                        : "bg-background text-foreground border-input hover:bg-accent"
                                    }`}
                                    onClick={() =>
                                      handleToggleInvincible(
                                        color as "w" | "b",
                                        opt.value
                                      )
                                    }
                                  >
                                    {opt.label}{" "}
                                    {isOn ? "(Invincible)" : "(Vulnerable)"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
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
      {promotionDialog && (
        <Dialog open={true} onOpenChange={() => setPromotionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose Promotion</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 justify-center my-4">
              {[
                { label: "Queen", value: "q" },
                { label: "Rook", value: "r" },
                { label: "Bishop", value: "b" },
                { label: "Knight", value: "n" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={
                    promotionChoice === opt.value ? "default" : "outline"
                  }
                  onClick={() => setPromotionChoice(opt.value as any)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={async () => {
                  if (!promotionDialog) return;
                  const { from, to } = promotionDialog;
                  // Only allow promotion if destination is not invincible (double check)
                  const board = chessRef.current.board();
                  let invincibleSquares: Square[] = [];
                  for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                      const sq = board[r][c];
                      if (
                        sq &&
                        invinciblePieces.some(
                          (p) => p.type === sq.type && p.color === sq.color
                        )
                      ) {
                        invincibleSquares.push(getSquare(r, c));
                      }
                    }
                  }
                  if (invincibleSquares.includes(to)) {
                    toast({
                      title: "Promotion blocked",
                      description:
                        "Cannot promote to a square with an invincible piece.",
                    });
                    setPromotionDialog(null);
                    return;
                  }
                  const move = chessRef.current.move({
                    from,
                    to,
                    promotion: promotionChoice,
                  });
                  if (move) {
                    if (isOnlineGame && gameId && auth.currentUser) {
                      const newFen = chessRef.current.fen();
                      const result = await makeMove(
                        firestore,
                        gameId,
                        move.san,
                        newFen,
                        auth.currentUser
                      );
                      if (!result.success) {
                        chessRef.current.undo();
                        console.error("Failed to make move:", result.error);
                      }
                    } else {
                      setBoard(chessRef.current.board());
                      setMoveHistory(
                        chessRef.current.history({ verbose: true })
                      );
                      setVersion((v) => v + 1);
                    }
                    if (
                      isCheckmateRespectingInvincible(
                        chessRef.current,
                        invinciblePieces
                      )
                    ) {
                      toast({ title: "Checkmate!", description: "Game over." });
                      if (isOnlineGame && gameId) {
                        await updateInvinciblePieces(
                          firestore,
                          gameId,
                          invinciblePieces
                        );
                      }
                    }
                  }
                  setPromotionDialog(null);
                }}
              >
                Promote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {gameOverDialog && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Game Over</DialogTitle>
            </DialogHeader>
            <div className="text-center my-4">
              {gameOverDialog.result === "draw" ? (
                <span className="text-lg font-bold">It's a draw!</span>
              ) : (
                <span className="text-lg font-bold">
                  {gameOverDialog.winner} wins by checkmate!
                </span>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => router.push("/")}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
