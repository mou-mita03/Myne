export type Mood = "Calm" | "Emotional" | "Thoughtful" | "Light" | "Inspiring" | "SurpriseMe";
export type FollowUp = "QuietEscape" | "HumanConnection" | "BigIdeas" | "PlayfulTurn";
export type Energy = "TenMinutes" | "TwentyMinutes" | "ShortRead" | "SinkIn";
type Pick = { id: number; title: string; author: string; moods: Mood[]; followUps: FollowUp[]; energies: Energy[] };
const picks: Pick[] = [
  { id: 12242, title: "Leaves of Grass", author: "Walt Whitman", moods: ["Calm", "Inspiring"], followUps: ["QuietEscape", "BigIdeas"], energies: ["TwentyMinutes", "SinkIn"] },
  { id: 5740, title: "The Importance of Being Earnest", author: "Oscar Wilde", moods: ["Light", "SurpriseMe"], followUps: ["PlayfulTurn", "HumanConnection"], energies: ["TenMinutes", "ShortRead"] },
  { id: 55, title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", moods: ["Light", "Inspiring"], followUps: ["PlayfulTurn", "QuietEscape"], energies: ["TenMinutes", "TwentyMinutes"] },
  { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", moods: ["Light", "Thoughtful"], followUps: ["PlayfulTurn", "BigIdeas"], energies: ["ShortRead", "TwentyMinutes"] },
  { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", moods: ["Emotional", "Light"], followUps: ["HumanConnection", "PlayfulTurn"], energies: ["TwentyMinutes", "SinkIn"] },
  { id: 67979, title: "The Blue Castle", author: "L. M. Montgomery", moods: ["Emotional", "Inspiring"], followUps: ["HumanConnection", "QuietEscape"], energies: ["ShortRead", "SinkIn"] },
  { id: 7370, title: "Second Treatise of Government", author: "John Locke", moods: ["Thoughtful", "Inspiring"], followUps: ["BigIdeas"], energies: ["TwentyMinutes", "SinkIn"] },
  { id: 3207, title: "Leviathan", author: "Thomas Hobbes", moods: ["Thoughtful"], followUps: ["BigIdeas"], energies: ["SinkIn"] },
  { id: 2680, title: "Meditations", author: "Marcus Aurelius", moods: ["Calm", "Thoughtful", "Inspiring"], followUps: ["QuietEscape", "BigIdeas"], energies: ["TenMinutes", "ShortRead"] },
  { id: 1250, title: "Anthem", author: "Ayn Rand", moods: ["Inspiring", "Thoughtful"], followUps: ["BigIdeas", "QuietEscape"], energies: ["ShortRead", "TwentyMinutes"] }
];
export function moodMatch(mood: Mood, followUp: FollowUp, energy: Energy, offset = 0) { const ranked = picks.map((book) => ({ book, score: (mood === "SurpriseMe" ? 1 : book.moods.includes(mood) ? 5 : 0) + (book.followUps.includes(followUp) ? 2 : 0) + (book.energies.includes(energy) ? 2 : 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title)); return (ranked.length ? ranked : picks.map((book) => ({ book, score: 0 })))[offset % (ranked.length || picks.length)].book; }
