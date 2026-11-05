/** Adds one to the count of games finished by anyone. Best effort: a lost count never affects a game. */
export function reportGamePlayed() {
  void fetch("/api/plays", { method: "POST", keepalive: true }).catch(() => {});
}
