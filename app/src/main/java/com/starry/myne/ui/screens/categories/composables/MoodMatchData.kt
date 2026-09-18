package com.starry.myne.ui.screens.categories.composables

import kotlin.math.max

enum class MoodOption {
    Calm,
    Emotional,
    Thoughtful,
    Light,
    Inspiring,
    SurpriseMe
}

enum class MoodFollowUpOption {
    QuietEscape,
    HumanConnection,
    BigIdeas,
    PlayfulTurn
}

enum class ReadingEnergyOption {
    TenMinutes,
    TwentyMinutes,
    ShortRead,
    SinkIn
}

data class MoodMatchBook(
    val id: Int,
    val title: String,
    val author: String,
    val coverUrl: String,
    val moods: Set<MoodOption>,
    val followUps: Set<MoodFollowUpOption>,
    val energies: Set<ReadingEnergyOption>
)

data class MoodMatchSelection(
    val mood: MoodOption,
    val followUp: MoodFollowUpOption,
    val readingEnergy: ReadingEnergyOption
)

object MoodMatchEngine {
    private val curatedBooks = listOf(
        MoodMatchBook(
            id = 12242,
            title = "Leaves of Grass",
            author = "Walt Whitman",
            coverUrl = "https://www.gutenberg.org/cache/epub/12242/pg12242.cover.medium.jpg",
            moods = setOf(MoodOption.Calm, MoodOption.Inspiring),
            followUps = setOf(MoodFollowUpOption.QuietEscape, MoodFollowUpOption.BigIdeas),
            energies = setOf(ReadingEnergyOption.TwentyMinutes, ReadingEnergyOption.SinkIn)
        ),
        MoodMatchBook(
            id = 5740,
            title = "The Importance of Being Earnest",
            author = "Oscar Wilde",
            coverUrl = "https://www.gutenberg.org/cache/epub/5740/pg5740.cover.medium.jpg",
            moods = setOf(MoodOption.Light, MoodOption.SurpriseMe),
            followUps = setOf(MoodFollowUpOption.PlayfulTurn, MoodFollowUpOption.HumanConnection),
            energies = setOf(ReadingEnergyOption.TenMinutes, ReadingEnergyOption.ShortRead)
        ),
        MoodMatchBook(
            id = 55,
            title = "The Wonderful Wizard of Oz",
            author = "L. Frank Baum",
            coverUrl = "https://www.gutenberg.org/cache/epub/55/pg55.cover.medium.jpg",
            moods = setOf(MoodOption.Light, MoodOption.Inspiring),
            followUps = setOf(MoodFollowUpOption.PlayfulTurn, MoodFollowUpOption.QuietEscape),
            energies = setOf(ReadingEnergyOption.TenMinutes, ReadingEnergyOption.TwentyMinutes)
        ),
        MoodMatchBook(
            id = 1661,
            title = "The Adventures of Sherlock Holmes",
            author = "Arthur Conan Doyle",
            coverUrl = "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
            moods = setOf(MoodOption.Light, MoodOption.Thoughtful),
            followUps = setOf(MoodFollowUpOption.PlayfulTurn, MoodFollowUpOption.BigIdeas),
            energies = setOf(ReadingEnergyOption.ShortRead, ReadingEnergyOption.TwentyMinutes)
        ),
        MoodMatchBook(
            id = 1342,
            title = "Pride and Prejudice",
            author = "Jane Austen",
            coverUrl = "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
            moods = setOf(MoodOption.Emotional, MoodOption.Light),
            followUps = setOf(MoodFollowUpOption.HumanConnection, MoodFollowUpOption.PlayfulTurn),
            energies = setOf(ReadingEnergyOption.TwentyMinutes, ReadingEnergyOption.SinkIn)
        ),
        MoodMatchBook(
            id = 67979,
            title = "The Blue Castle",
            author = "L. M. Montgomery",
            coverUrl = "https://www.gutenberg.org/cache/epub/67979/pg67979.cover.medium.jpg",
            moods = setOf(MoodOption.Emotional, MoodOption.Inspiring),
            followUps = setOf(MoodFollowUpOption.HumanConnection, MoodFollowUpOption.QuietEscape),
            energies = setOf(ReadingEnergyOption.ShortRead, ReadingEnergyOption.SinkIn)
        ),
        MoodMatchBook(
            id = 7370,
            title = "Second Treatise of Government",
            author = "John Locke",
            coverUrl = "https://www.gutenberg.org/cache/epub/7370/pg7370.cover.medium.jpg",
            moods = setOf(MoodOption.Thoughtful, MoodOption.Inspiring),
            followUps = setOf(MoodFollowUpOption.BigIdeas),
            energies = setOf(ReadingEnergyOption.TwentyMinutes, ReadingEnergyOption.SinkIn)
        ),
        MoodMatchBook(
            id = 3207,
            title = "Leviathan",
            author = "Thomas Hobbes",
            coverUrl = "https://www.gutenberg.org/cache/epub/3207/pg3207.cover.medium.jpg",
            moods = setOf(MoodOption.Thoughtful),
            followUps = setOf(MoodFollowUpOption.BigIdeas),
            energies = setOf(ReadingEnergyOption.SinkIn)
        ),
        MoodMatchBook(
            id = 2680,
            title = "Meditations",
            author = "Marcus Aurelius",
            coverUrl = "https://www.gutenberg.org/cache/epub/2680/pg2680.cover.medium.jpg",
            moods = setOf(MoodOption.Calm, MoodOption.Thoughtful, MoodOption.Inspiring),
            followUps = setOf(MoodFollowUpOption.QuietEscape, MoodFollowUpOption.BigIdeas),
            energies = setOf(ReadingEnergyOption.TenMinutes, ReadingEnergyOption.ShortRead)
        ),
        MoodMatchBook(
            id = 1250,
            title = "Anthem",
            author = "Ayn Rand",
            coverUrl = "https://www.gutenberg.org/cache/epub/1250/pg1250.cover.medium.jpg",
            moods = setOf(MoodOption.Inspiring, MoodOption.Thoughtful),
            followUps = setOf(MoodFollowUpOption.BigIdeas, MoodFollowUpOption.QuietEscape),
            energies = setOf(ReadingEnergyOption.ShortRead, ReadingEnergyOption.TwentyMinutes)
        )
    )

    fun nextMatch(selection: MoodMatchSelection, offset: Int): MoodMatchBook {
        val rankedMatches = curatedBooks
            .map { book -> book to scoreBook(book, selection) }
            .filter { (_, score) -> score > 0 }
            .sortedWith(
                compareByDescending<Pair<MoodMatchBook, Int>> { it.second }
                    .thenBy { it.first.title }
            )
            .map { it.first }
            .ifEmpty { curatedBooks }

        val safeOffset = max(offset, 0)
        return rankedMatches[safeOffset % rankedMatches.size]
    }

    fun buildReason(selection: MoodMatchSelection, book: MoodMatchBook): String {
        val moodReason = when (selection.mood) {
            MoodOption.Calm -> "A gentle, reflective pick for a calmer reading mood."
            MoodOption.Emotional -> "This leans into feeling, relationships, and heart."
            MoodOption.Thoughtful -> "It gives you ideas to sit with, not just pages to pass."
            MoodOption.Light -> "An easy, lively match when you want reading to feel breezy."
            MoodOption.Inspiring -> "This one has an uplifting, forward-moving energy."
            MoodOption.SurpriseMe -> "A hand-picked wildcard that still fits the moment."
        }

        val energyReason = when (selection.readingEnergy) {
            ReadingEnergyOption.TenMinutes -> "It works well even if you only have a few minutes."
            ReadingEnergyOption.TwentyMinutes -> "It fits a focused but manageable reading window."
            ReadingEnergyOption.ShortRead -> "It should feel satisfying without asking too much from you."
            ReadingEnergyOption.SinkIn -> "It rewards settling in and staying with it a while."
        }

        return if (book.energies.contains(selection.readingEnergy)) {
            "$moodReason $energyReason"
        } else {
            moodReason
        }
    }

    private fun scoreBook(book: MoodMatchBook, selection: MoodMatchSelection): Int {
        if (selection.mood == MoodOption.SurpriseMe) {
            return 1 +
                if (book.followUps.contains(selection.followUp)) 2 else 0 +
                if (book.energies.contains(selection.readingEnergy)) 2 else 0
        }

        var score = 0
        if (book.moods.contains(selection.mood)) score += 5
        if (book.followUps.contains(selection.followUp)) score += 2
        if (book.energies.contains(selection.readingEnergy)) score += 2
        return score
    }
}
