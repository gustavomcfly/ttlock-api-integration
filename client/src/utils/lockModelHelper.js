// Identifies the lock model and corresponding image based on the TTLock lockName.

export function getLockDetails(lockName) {
  if (!lockName) return { model: "Modelo Desconhecido", img: "fd-500.png" };

  const name = lockName.toUpperCase();

  if (name.startsWith("M302")) return { model: "FDE-250", img: "fde-250.png" };
  if (name.startsWith("LL609") || name.startsWith("LL02"))
    return { model: "FDE-300W", img: "fde-300w.png" };
  if (name.startsWith("LL476"))
    return { model: "FDE-600W", img: "fde-600w.png" };
  if (name.startsWith("TT400"))
    return { model: "FDE-800 Vision", img: "fde-800.png" };
  if (name.startsWith("G200T")) return { model: "FDV-201", img: "fdv-201.png" };
  if (name.startsWith("LOCK_")) return { model: "FD-500", img: "fd-500.png" };

  return { model: "Fechadura Padrão", img: "fde-250.png" }; // Fallback
}

export function getImageUrl(imageName) {
  return new URL(`../assets/${imageName}`, import.meta.url).href;
}
