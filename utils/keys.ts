export function getKeyName(...args: string[]) {
  return `redify:${args.join(":")}`;
}

export const getRestroKeyById = (id: string) => getKeyName("restro", id);
export const getReviewKeyById = (id: string) => getKeyName("review", id);
export const getReviewDetailsKeyById = (id: string) =>
  getKeyName("review_detail", id);
