export function simulateNetwork(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
