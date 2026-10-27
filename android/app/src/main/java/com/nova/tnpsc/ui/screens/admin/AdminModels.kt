package com.nova.tnpsc.ui.screens.admin

/**
 * Mirrors the web app's AdminRole (types/admin.ts). The real backend session
 * only ever carries the coarse 'ADMIN' / 'SUPER_ADMIN' role (see
 * src/app/api/auth/me/route.js) -- same as web, the finer-grained role here
 * is a local simulator seeded from that, not a real permission escalation.
 */
enum class AdminRole(val label: String) {
    SUPER_ADMIN("Super Admin"),
    ADMIN("Admin"),
    CONTENT_ADMIN("Content Admin"),
    SUBJECT_ADMIN("Subject Admin"),
    QUESTION_REVIEWER("Question Reviewer"),
    SUPPORT("Support"),
}

enum class AdminEntity { Subject, Learner, Admin, Exam, Chapter, Topic, Concept, Lesson, Resource, Question, PYQ, Test, TestAttempt, ProctoringPolicy, AdaptiveRule, Milestone, Notification, Audit, AIContent }

data class AdminNavSection(val slug: String, val title: String, val category: String, val icon: String, val requiredEntity: AdminEntity, val badge: String? = null)

/** Mirrors ALL_ADMIN_NAV_SECTIONS in .nova-zip-ui/src/utils/adminPermissions.ts -- same sections, same order. */
val ALL_ADMIN_NAV_SECTIONS: List<AdminNavSection> = listOf(
    AdminNavSection("dashboard", "Dashboard", "Core", "📊", AdminEntity.Subject),
    AdminNavSection("learners", "Learners", "Core", "🎓", AdminEntity.Learner),
    AdminNavSection("admins-roles", "Admins & Roles", "Core", "🛡️", AdminEntity.Admin, "Super Only"),

    AdminNavSection("exams", "Exams", "Curriculum", "🎯", AdminEntity.Exam),
    AdminNavSection("subjects", "Subjects", "Curriculum", "📘", AdminEntity.Subject),
    AdminNavSection("curriculum", "Curriculum Tree", "Curriculum", "🌳", AdminEntity.Chapter),
    AdminNavSection("phases", "Phases", "Curriculum", "🚩", AdminEntity.Chapter),
    AdminNavSection("weeks", "Weeks", "Curriculum", "🗓️", AdminEntity.Chapter),
    AdminNavSection("days", "Days", "Curriculum", "📅", AdminEntity.Chapter),
    AdminNavSection("topics", "Topics", "Curriculum", "🌿", AdminEntity.Topic),
    AdminNavSection("concepts", "Concepts", "Curriculum", "💡", AdminEntity.Concept),
    AdminNavSection("lessons", "Lessons", "Curriculum", "📖", AdminEntity.Lesson),
    AdminNavSection("lesson-resources", "Lesson Resources", "Curriculum", "📎", AdminEntity.Resource),

    AdminNavSection("questions", "Questions", "Questions", "❓", AdminEntity.Question),
    AdminNavSection("pyqs", "PYQs (2022-24)", "Questions", "🗄️", AdminEntity.PYQ),
    AdminNavSection("question-review", "Question Review", "Questions", "✅", AdminEntity.Question, "Review"),
    AdminNavSection("content-upload", "Content Upload", "Questions", "⬆️", AdminEntity.Resource),
    AdminNavSection("ai-content-review", "AI Content Review", "Questions", "✨", AdminEntity.Question, "AI Engine"),

    AdminNavSection("tests", "Tests & Mock Builder", "Assessments", "📝", AdminEntity.Test),
    AdminNavSection("test-sections", "Test Sections", "Assessments", "🧱", AdminEntity.Test),
    AdminNavSection("test-questions", "Test Questions", "Assessments", "☑️", AdminEntity.Test),
    AdminNavSection("test-attempts", "Test Attempts", "Assessments", "👤", AdminEntity.TestAttempt),
    AdminNavSection("proctoring", "Proctoring Policies", "Assessments", "👁️", AdminEntity.ProctoringPolicy),
    AdminNavSection("proctoring-hub", "Proctoring Hub", "Assessments", "🎥", AdminEntity.ProctoringPolicy, "Review"),

    AdminNavSection("adaptive-rules", "Adaptive Rules", "Growth", "🔁", AdminEntity.AdaptiveRule),
    AdminNavSection("milestones", "Milestones", "Growth", "🏆", AdminEntity.Milestone),
    AdminNavSection("notifications", "Notifications", "Growth", "🔔", AdminEntity.Notification),

    AdminNavSection("audit-logs", "Audit Logs", "Governance", "📜", AdminEntity.Audit),
    AdminNavSection("acceptance-tests", "Acceptance Tests", "Governance", "🧪", AdminEntity.Audit),
)

/** Simplified READ-visibility check -- mirrors checkPermission()'s entity gating in adminPermissions.ts, trimmed to what nav filtering needs. */
fun canView(role: AdminRole, entity: AdminEntity): Boolean {
    if (role == AdminRole.SUPER_ADMIN) return true
    if (entity == AdminEntity.Admin) return false // Admins & Roles: SUPER_ADMIN only
    return when (role) {
        AdminRole.ADMIN -> true
        AdminRole.CONTENT_ADMIN -> entity in setOf(
            AdminEntity.Subject, AdminEntity.Exam, AdminEntity.Chapter, AdminEntity.Topic, AdminEntity.Concept,
            AdminEntity.Lesson, AdminEntity.Resource, AdminEntity.Question, AdminEntity.PYQ,
        )
        AdminRole.SUBJECT_ADMIN -> entity in setOf(
            AdminEntity.Subject, AdminEntity.Chapter, AdminEntity.Topic, AdminEntity.Concept,
            AdminEntity.Lesson, AdminEntity.Question, AdminEntity.PYQ,
        )
        AdminRole.QUESTION_REVIEWER -> entity in setOf(AdminEntity.Question, AdminEntity.PYQ, AdminEntity.Lesson)
        AdminRole.SUPPORT -> entity == AdminEntity.Learner
        else -> false
    }
}

fun visibleSectionsFor(role: AdminRole): List<AdminNavSection> = ALL_ADMIN_NAV_SECTIONS.filter { canView(role, it.requiredEntity) }
