export function getKeyName(...args: string[]) {
  return `redify:${args.join(":")}`;
}

export const getRestroKeyById = (id: string) => getKeyName("restro", id);
