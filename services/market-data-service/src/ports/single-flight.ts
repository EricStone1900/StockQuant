export interface SingleFlightPort {
  tryAcquire(): Promise<(() => Promise<void>) | null>;
}
