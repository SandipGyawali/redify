export function getKeyName(...args: string[]) {
  return `redify:${args.join(":")}`;
}

export const getRestroKeyById = (id: string) => getKeyName("restro", id);
export const getReviewKeyById = (id: string) => getKeyName("review", id);
export const getReviewDetailsKeyById = (id: string) =>
  getKeyName("review_detail", id);

export const cusinesKey = getKeyName("cuisines");
export const cuisineKey = (name: string) => getKeyName("cusine", name);
export const restroCuisinesKeyById = (id: string) =>
  getKeyName("restro_cusines", id);

// key that stores the restro data based on the ratings
export const restroByRatingKey = getKeyName("restro_by_rating");
export const getWeatherKeyById = (id: string) => getKeyName("weather", id);

export const restroDetailsKeyById = (id: string) =>
  getKeyName("restro_details", id);
export const indexKey = getKeyName("indx", "restros");
