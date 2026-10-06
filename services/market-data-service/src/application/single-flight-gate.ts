/** A process-local fallback gate for non-persistent/test deployments. */
export class SingleFlightGate {
  private held = false;

  tryAcquire(): (() => void) | null {
    if (this.held) return null;
    this.held = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.held = false;
    };
  }
}
