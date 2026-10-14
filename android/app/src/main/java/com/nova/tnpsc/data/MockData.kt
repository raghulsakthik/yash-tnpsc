package com.nova.tnpsc.data

// Static mock data mirroring src/app/proto/_data/mock.js on the web prototype.
// No network calls, nothing persists — this is a visual-only native prototype.

data class Learner(
    val name: String,
    val exam: String,
    val streak: Int,
    val level: Int,
    val xp: Int,
)

val learner = Learner(name = "Yash", exam = "TNPSC Group 2 · CCSE-II", streak = 12, level = 12, xp = 1420)

data class Subject(
    val slug: String,
    val name: String,
    val topics: Int,
    val mastered: Int,
    val mastery: Int,
    val status: String,
    val revisionDue: Int = 0,
)

val subjects = listOf(
    Subject("mathematics", "Mathematics", 19, 4, 68, "learning", revisionDue = 2),
    Subject("aptitude", "Aptitude & Mental Ability", 14, 2, 41, "improving"),
    Subject("general-tamil", "General Tamil", 22, 9, 74, "near-mastery"),
    Subject("science", "Science", 18, 5, 61, "revision-due", revisionDue = 1),
    Subject("polity", "Polity", 16, 2, 48, "practising"),
    Subject("history", "History", 20, 3, 35, "learning"),
    Subject("geography", "Geography", 15, 1, 12, "not-started"),
    Subject("economics", "Economics", 12, 0, 0, "not-started"),
    Subject("general-studies", "General Studies", 24, 6, 57, "retained"),
)

data class PathTopic(
    val n: Int,
    val slug: String,
    val name: String,
    val state: String,
    val note: String,
)

val mathematicsPath = listOf(
    PathTopic(1, "number-system", "Number System", "mastered", "Mastered · retained at 30 days"),
    PathTopic(2, "basic-operations", "Basic Operations", "mastered", "Mastered"),
    PathTopic(3, "bodmas", "BODMAS", "mastered", "Mastered"),
    PathTopic(4, "factors-multiples", "Factors & Multiples", "mastered", "Mastered"),
    PathTopic(5, "hcf-lcm", "HCF and LCM", "revision-due", "Revision due · Memory Echo ready"),
    PathTopic(6, "fractions", "Fractions", "in-progress", "In progress · 72% · lesson 3 of 8"),
    PathTopic(7, "decimals", "Decimals", "locked", "Opens when Fractions reaches 80%"),
    PathTopic(8, "percentages", "Percentages", "locked", "Needs Fractions and Decimals"),
)

data class MasteryDimension(val label: String, val value: Int, val weak: Boolean = false)

val fractionsDimensions = listOf(
    MasteryDimension("Concept understanding", 84),
    MasteryDimension("Accuracy", 81),
    MasteryDimension("Speed", 63, weak = true),
    MasteryDimension("Retention", 72),
    MasteryDimension("Consistency", 88),
)

data class Option(val letter: String, val text: String)

data class PracticeQuestion(
    val topic: String,
    val index: Int,
    val total: Int,
    val difficulty: String,
    val question: String,
    val options: List<Option>,
    val correctLetter: String,
    val steps: List<Pair<String, String>>,
    val answer: String,
)

val practiceQuestion = PracticeQuestion(
    topic = "Percentage",
    index = 4,
    total = 10,
    difficulty = "Easy",
    question = "What is 25% of 200?",
    options = listOf(Option("A", "25"), Option("B", "40"), Option("C", "50"), Option("D", "75")),
    correctLetter = "C",
    steps = listOf(
        "Per cent just means \"out of a hundred\"." to "25% = 25/100",
        "Of means multiply." to "25/100 × 200",
        "Simplify before multiplying." to "1/4 × 200 = 50",
    ),
    answer = "50",
)

data class RevisionItem(val name: String, val badge: String, val progress: Int, val note: String, val highlight: Boolean = false)

val revisionDue = listOf(
    RevisionItem("Percentage", "Third review", 74, "Last studied 6 days ago. Retention is predicted to drop below 70% in about two days."),
    RevisionItem("Indian Constitution", "Second review", 58, "Last studied 12 days ago. Two articles were missed on the previous attempt."),
    RevisionItem("HCF and LCM", "Memory Echo", 41, "Three weeks untouched, and it sits underneath Fractions.", highlight = true),
)

data class QuickLabMode(val slug: String, val name: String, val desc: String, val stat: String, val recommended: Boolean = false)

val quickLabModes = listOf(
    QuickLabMode("quick-math", "Quick Math", "Addition, subtraction, multiplication and division rushes.", "Best 41 correct · 6.2s average"),
    QuickLabMode("number-rush", "Number Rush", "Timed number challenges that climb in difficulty while your combo holds.", "Best combo 34"),
    QuickLabMode("percentage-rush", "Percentage Rush", "Of, increase, decrease, and reverse — the four shapes TNPSC keeps asking for.", "Best 92% · recommended today", recommended = true),
    QuickLabMode("fraction-lab", "Fraction Lab", "Compare, simplify, convert. Shown as shapes first, numbers second.", "New · no score yet"),
)

data class JourneyOrbitPoint(val name: String, val ring: String, val angleDeg: Float)

val journeyOrbit = listOf(
    JourneyOrbitPoint("Fractions", "learning", 90f),
    JourneyOrbitPoint("Number system", "mastered", 70f),
    JourneyOrbitPoint("BODMAS", "mastered", 260f),
    JourneyOrbitPoint("HCF / LCM", "drifting", 300f),
    JourneyOrbitPoint("Percentage", "struggling", 250f),
    JourneyOrbitPoint("Decimals", "unmet", 50f),
    JourneyOrbitPoint("Ratio", "unmet", 150f),
    JourneyOrbitPoint("Time & Work", "unmet", 20f),
)

data class PersonalRecord(val label: String, val value: String)

val personalRecords = listOf(
    PersonalRecord("Longest streak", "14 days"),
    PersonalRecord("Highest test score", "84%"),
    PersonalRecord("Fastest correct answer", "3.2s"),
    PersonalRecord("Most improved topic", "Fractions"),
    PersonalRecord("Best retained", "BODMAS"),
)
