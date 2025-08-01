export function unimplemented(): never {
  throw new Error('Unimplemented');
}

export function todo(..._args: unknown[]): never {
  throw new Error('TODO');
}
