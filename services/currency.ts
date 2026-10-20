// Payment amounts are stored in USD; JOD is derived at this fixed rate
// (1 USD = 0.708 JOD).
export const JOD_PER_USD = 0.708;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const usdToJod = (usd: number) => round2(usd * JOD_PER_USD);
export const jodToUsd = (jod: number) => round2(jod / JOD_PER_USD);
