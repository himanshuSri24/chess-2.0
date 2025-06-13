import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  Timestamp,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { User } from "firebase/auth";

export interface GameState {
  id?: string;
  gameCode: string;
  fen: string; // Current board position
  moves: string[]; // Array of moves in algebraic notation
  whitePlayer: {
    uid: string;
    displayName: string;
    email: string;
  } | null;
  blackPlayer: {
    uid: string;
    displayName: string;
    email: string;
  } | null;
  currentTurn: "white" | "black";
  status: "waiting" | "active" | "completed" | "abandoned";
  result?: "white-wins" | "black-wins" | "draw" | "abandoned";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  invinciblePieces?: Array<{ color: "w" | "b"; type: string }>;
}

export const createGame = async (
  firestore: any,
  user: User,
  color: "white" | "black"
): Promise<string> => {
  const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const gameData: Omit<GameState, "id"> = {
    gameCode,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Starting position
    moves: [],
    whitePlayer:
      color === "white"
        ? {
            uid: user.uid,
            displayName: user.displayName || "Anonymous",
            email: user.email || "",
          }
        : null,
    blackPlayer:
      color === "black"
        ? {
            uid: user.uid,
            displayName: user.displayName || "Anonymous",
            email: user.email || "",
          }
        : null,
    currentTurn: "white",
    status: "waiting",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(firestore, "games"), gameData);
  return gameCode;
};

export const joinGame = async (
  firestore: any,
  user: User,
  gameCode: string
): Promise<{ success: boolean; gameId?: string; error?: string }> => {
  try {
    const gamesRef = collection(firestore, "games");
    const q = query(
      gamesRef,
      where("gameCode", "==", gameCode.toUpperCase()),
      where("status", "in", ["waiting", "active"]),
      limit(1)
    );

    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot: QuerySnapshot<DocumentData>) => {
          unsubscribe(); // Unsubscribe immediately

          if (querySnapshot.empty) {
            resolve({
              success: false,
              error: "Game not found or already full",
            });
            return;
          }

          const gameDoc = querySnapshot.docs[0];
          const gameData = gameDoc.data() as GameState;

          // Check if user is already in the game - if so, allow them to rejoin
          if (
            gameData.whitePlayer?.uid === user.uid ||
            gameData.blackPlayer?.uid === user.uid
          ) {
            resolve({ success: true, gameId: gameDoc.id });
            return;
          }

          // Determine which color to assign
          const playerData = {
            uid: user.uid,
            displayName: user.displayName || "Anonymous",
            email: user.email || "",
          };

          let updateData: Partial<GameState>;
          if (!gameData.whitePlayer) {
            updateData = {
              whitePlayer: playerData,
              status: "active",
              updatedAt: Timestamp.now(),
            };
          } else if (!gameData.blackPlayer) {
            updateData = {
              blackPlayer: playerData,
              status: "active",
              updatedAt: Timestamp.now(),
            };
          } else {
            resolve({ success: false, error: "Game is already full" });
            return;
          }

          try {
            await updateDoc(doc(firestore, "games", gameDoc.id), updateData);
            resolve({ success: true, gameId: gameDoc.id });
          } catch (error) {
            resolve({ success: false, error: "Failed to join game" });
          }
        }
      );
    });
  } catch (error) {
    return { success: false, error: "Failed to join game" };
  }
};

export const getGame = async (
  firestore: any,
  gameId: string
): Promise<GameState | null> => {
  try {
    const docRef = doc(firestore, "games", gameId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as GameState;
    }
    return null;
  } catch (error) {
    console.error("Error getting game:", error);
    return null;
  }
};

export const getGameByCode = async (
  firestore: any,
  gameCode: string
): Promise<GameState | null> => {
  try {
    const gamesRef = collection(firestore, "games");
    const q = query(
      gamesRef,
      where("gameCode", "==", gameCode.toUpperCase()),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const gameDoc = querySnapshot.docs[0];
      return { id: gameDoc.id, ...gameDoc.data() } as GameState;
    }
    return null;
  } catch (error) {
    console.error("Error getting game by code:", error);
    return null;
  }
};

export const subscribeToGame = (
  firestore: any,
  gameId: string,
  callback: (game: GameState | null) => void
) => {
  const docRef = doc(firestore, "games", gameId);

  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as GameState);
    } else {
      callback(null);
    }
  });
};

export const makeMove = async (
  firestore: any,
  gameId: string,
  move: string,
  newFen: string,
  user: User
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameDoc = await getGame(firestore, gameId);
    if (!gameDoc) {
      return { success: false, error: "Game not found" };
    }

    // Verify it's the user's turn
    const isWhiteMove = gameDoc.currentTurn === "white";
    const isUsersTurn =
      (isWhiteMove && gameDoc.whitePlayer?.uid === user.uid) ||
      (!isWhiteMove && gameDoc.blackPlayer?.uid === user.uid);

    if (!isUsersTurn) {
      return { success: false, error: "Not your turn" };
    }

    const updatedMoves = [...gameDoc.moves, move];
    const nextTurn = gameDoc.currentTurn === "white" ? "black" : "white";

    await updateDoc(doc(firestore, "games", gameId), {
      moves: updatedMoves,
      fen: newFen,
      currentTurn: nextTurn,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to make move" };
  }
};

export const updateInvinciblePieces = async (
  firestore: any,
  gameId: string,
  invinciblePieces: Array<{ color: "w" | "b"; type: string }>
): Promise<{ success: boolean; error?: string }> => {
  try {
    await updateDoc(doc(firestore, "games", gameId), {
      invinciblePieces,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update invincible pieces" };
  }
};

export const updateGameStatus = async (
  firestore: any,
  gameId: string,
  status: "active" | "completed",
  result: "white-wins" | "black-wins" | "draw" | "abandoned"
): Promise<{ success: boolean; error?: string }> => {
  try {
    await updateDoc(doc(firestore, "games", gameId), {
      status,
      result,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update game status" };
  }
};
