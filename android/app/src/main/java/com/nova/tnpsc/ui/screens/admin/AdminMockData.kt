package com.nova.tnpsc.ui.screens.admin

/**
 * Design-preview data for sections that aren't wired to a real backend --
 * same situation as the web Admin Portal (.nova-zip-ui/src/data/mockAdminData.ts):
 * most sections there are local/mock too, disclosed with the same banner
 * this screen shows. Dashboard and Learners mirror the web's actual seed
 * values so both platforms show the same preview content.
 */

data class AdminStat(val label: String, val value: String)

val DASHBOARD_STATS = listOf(
    AdminStat("Active learners", "1"),
    AdminStat("Lessons published", "42"),
    AdminStat("Questions in bank", "1,860"),
    AdminStat("Tests this week", "6"),
)

data class AdminLearnerRow(val name: String, val handle: String, val phase: Int, val status: String)

val MOCK_LEARNERS = listOf(
    AdminLearnerRow("Yashika", "@yashika_tnpsc", 2, "ACTIVE"),
    AdminLearnerRow("Arun Kumar", "@arun_k", 1, "ACTIVE"),
    AdminLearnerRow("Priya S", "@priya_s", 3, "INACTIVE"),
)

data class AdminGenericRow(val title: String, val subtitle: String)

/** A handful of plausible rows per section so every slug renders something, same spirit as web's GenericAdminViews.tsx. */
val MOCK_SECTION_ROWS: Map<String, List<AdminGenericRow>> = mapOf(
    "exams" to listOf(AdminGenericRow("TNPSC Group 2 & 2A", "CCSE-II · Combined"), AdminGenericRow("TNPSC Group 4", "CCSE-IV")),
    "subjects" to listOf(AdminGenericRow("General Studies", "9 chapters"), AdminGenericRow("Aptitude & Mental Ability", "6 chapters")),
    "curriculum" to listOf(AdminGenericRow("Phase 1 · Foundations", "Weeks 1-4"), AdminGenericRow("Phase 2 · Core Subjects", "Weeks 5-12")),
    "phases" to listOf(AdminGenericRow("Phase 1", "Foundations"), AdminGenericRow("Phase 2", "Core Subjects")),
    "weeks" to listOf(AdminGenericRow("Week 1", "Orientation"), AdminGenericRow("Week 2", "Indian Polity basics")),
    "days" to listOf(AdminGenericRow("Day 1", "Diagnostic"), AdminGenericRow("Day 2", "Polity · Constitution origins")),
    "topics" to listOf(AdminGenericRow("Fractions", "Aptitude"), AdminGenericRow("Indian Polity · Constitution", "General Studies")),
    "concepts" to listOf(AdminGenericRow("LCM & HCF", "Aptitude"), AdminGenericRow("Fundamental Rights", "Polity")),
    "lessons" to listOf(AdminGenericRow("Intro to Fractions", "PUBLISHED"), AdminGenericRow("The Preamble", "DRAFT")),
    "lesson-resources" to listOf(AdminGenericRow("fractions-worksheet.pdf", "480 KB"), AdminGenericRow("polity-notes.pdf", "1.2 MB")),
    "questions" to listOf(AdminGenericRow("1,860 questions in bank", "across 11 subjects"), AdminGenericRow("128 pending review", "")),
    "pyqs" to listOf(AdminGenericRow("2024 Group 2 Prelims", "100 questions"), AdminGenericRow("2023 Group 4", "100 questions")),
    "question-review" to listOf(AdminGenericRow("42 awaiting review", "Submitted by Content Admin")),
    "content-upload" to listOf(AdminGenericRow("Upload a PDF or document", "AI extracts questions/lessons")),
    "ai-content-review" to listOf(AdminGenericRow("9 AI-generated proposals", "Awaiting approval")),
    "tests" to listOf(AdminGenericRow("Weekly Mock #6", "100 Q · 90 min"), AdminGenericRow("Group 4 Full Mock", "100 Q · 90 min")),
    "test-sections" to listOf(AdminGenericRow("General Studies", "75 marks"), AdminGenericRow("Aptitude", "25 marks")),
    "test-questions" to listOf(AdminGenericRow("100 questions mapped", "Weekly Mock #6")),
    "test-attempts" to listOf(AdminGenericRow("Yashika · Weekly Mock #5", "Score 68/100")),
    "proctoring" to listOf(AdminGenericRow("Default policy", "Camera required, screen optional")),
    "proctoring-hub" to listOf(AdminGenericRow("Yashika · Weekly Mock #5", "No flagged events")),
    "adaptive-rules" to listOf(AdminGenericRow("3 wrong in a row → remediation", "ACTIVE")),
    "milestones" to listOf(AdminGenericRow("7-day streak", "Unlocked by 1 learner")),
    "notifications" to listOf(AdminGenericRow("Daily study reminder", "11:00 AM IST via SMS")),
    "audit-logs" to listOf(AdminGenericRow("ADMIN published lesson", "2 hours ago")),
    "acceptance-tests" to listOf(AdminGenericRow("Smoke suite", "38/38 passing")),
)
