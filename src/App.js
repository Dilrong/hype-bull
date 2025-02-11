import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import "./App.css";

const TradingGame = () => {
  const [entryPrice, setEntryPrice] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [previousPrice, setPreviousPrice] = useState(0);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [resultMessage, setResultMessage] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tokenDetails",
            tokenId: "0x0d01dc56dcaaca66ad901c959b4011ec",
          }),
        });
        const data = await response.json();
        setPreviousPrice(currentPrice);
        setCurrentPrice(parseFloat(data.markPx));
        if (!isRolling) setDisplayPrice(parseFloat(data.markPx));
      } catch (error) {
        console.error("🔥 ERROR FETCHING PRICE:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [currentPrice, isRolling]);

  useEffect(() => {
    const q = query(
      collection(db, "trading_records"),
      orderBy("score", "desc"),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topScores = snapshot.docs.map((doc) => doc.data());
      setLeaderboard(topScores);
    });

    return () => unsubscribe();
  }, []);

  const placeBet = async (choice) => {
    if (!gameActive || entryPrice !== null) return;

    setEntryPrice(currentPrice);
    setResultMessage("🎰 Rolling...");
    setIsRolling(true);

    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDisplayPrice(
        (
          Math.random() * (currentPrice * 1.1 - currentPrice * 0.9) +
          currentPrice * 0.9
        ).toFixed(2)
      );
      rollCount++;
      if (rollCount > 15) {
        clearInterval(rollInterval);
        setIsRolling(false);
        finalizeResult(choice);
      }
    }, 100);
  };

  const finalizeResult = async (choice) => {
    setDisplayPrice(currentPrice);
    const priceDifference = (currentPrice - entryPrice).toFixed(2);
    const isWin =
      (choice === "LONG" && currentPrice > entryPrice) ||
      (choice === "SHORT" && currentPrice < entryPrice);

    if (isWin) {
      const points = Math.abs(priceDifference * 100);
      setScore((prevScore) => prevScore + points);
      setResultMessage(`🔥 WIN! +${points} POINTS!`);
      setEntryPrice(null);
    } else {
      setResultMessage(`💀 YOU LOST! TOTAL SCORE: ${score} PTS`);
      setGameActive(false);

      // 🔥 Save FINAL total score to Firestore (only when losing)
      await addDoc(collection(db, "trading_records"), {
        totalScore: score,
        timestamp: new Date(),
      });
    }
  };

  const resetGame = () => {
    setGameActive(true);
    setEntryPrice(null);
    setScore(0);
    setResultMessage("");
  };

  return (
    <div className="game-container">
      <h1 className="glitch">HYPEBULL🎰🤑</h1>
      <h2></h2>
      <div className="container">
        <p>Entry Price: {entryPrice !== null ? entryPrice.toFixed(2) : "🚫"}</p>
        <p id="current-price">
          Current Price:{" "}
          <span
            className={previousPrice < currentPrice ? "price-up" : "price-down"}
          >
            {displayPrice}
          </span>
        </p>

        {/* 🎰 Slot Machine Visuals */}
        <div className="game-graphic">
          {isRolling
            ? "🎰💰"
            : previousPrice < currentPrice
            ? "🚀🔥"
            : previousPrice > currentPrice
            ? "📉💀"
            : "🔵"}
        </div>

        <p>{resultMessage}</p>
        <p>Score: {score}</p>

        {gameActive ? (
          <>
            <button className="long-btn" onClick={() => placeBet("LONG")}>
              📈 LONG (MOON!)
            </button>
            <button className="short-btn" onClick={() => placeBet("SHORT")}>
              📉 SHORT (DUMP!)
            </button>
          </>
        ) : (
          <>
            <button className="quick-restart-btn" onClick={resetGame}>
              ⚡ TRY AGAIN!
            </button>
          </>
        )}
      </div>

      {/* 🔥 Leaderboard Section */}
      <div className="leaderboard">
        <h2>🏆 TOP TRADERS 🏆</h2>
        <ul>
          {leaderboard.map((player, index) => (
            <li key={index} className={`rank rank-${index + 1}`}>
              #{index + 1} - {player.totalScore} PTS
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TradingGame;
