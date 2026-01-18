export type StdinWritableProcess = {
  write: (data: string) => void;
};

export const ESC = '\x1b';
export const ENTER = '\r';

export function sendEsc(process: StdinWritableProcess): void {
  process.write(ESC);
}

export function sendEnter(process: StdinWritableProcess): void {
  process.write(ENTER);
}
