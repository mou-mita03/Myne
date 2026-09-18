/** The discovery shelves shown in the catalogue.  Each value is also a valid
 * Gutendex topic, so selecting a shelf continues to use the live catalogue. */
export const categories = [
  "fiction", "romance", "mystery", "science fiction", "fantasy", "biography",
  "history", "education", "technology", "self development", "poetry",
  "children", "classics", "crime", "geography", "literature", "music",
  "psychology", "philosophy", "religion", "science"
];
// Android passes these same category keywords to Gutendex's topic filter.
export const categoryTopic = (category: string) => category;
