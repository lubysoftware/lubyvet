/** Porta do tempo (004/T002): ninguém chama new Date() fora do adaptador; os testes controlam a data. */
export interface Clock {
  now(): Date;
}
export const CLOCK = Symbol('Clock');

export class FixedClock implements Clock {
  private constructor(private current: Date) {}
  static at(iso: string): FixedClock {
    return new FixedClock(new Date(iso));
  }
  now(): Date {
    return new Date(this.current.getTime());
  }
  set(iso: string): void {
    this.current = new Date(iso);
  }
}
