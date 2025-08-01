// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sequenceExecAll<E extends (...args: any[]) => Promise<any>>(
  execs: E[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<void> {
  for (const exec of execs) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await exec(...args);
  }
}
