/**
 * Phase 25 — Weekly Assignment Engine. buildWeeklyPlan() (weeklyPlan.mjs,
 * Phase 16, unchanged) already builds the whole week; its Friday was
 * written honestly degraded (`available: false`) because no game engine
 * existed yet at the time. Phase 22 then built one. This module closes
 * exactly that gap, additively: given the plan Phase 16 already produced
 * and whatever real, active game (if any) Phase 22's engine has for
 * Friday's chosen topic, it returns the same plan with Friday's day
 * overlaid — never touching Monday through Thursday, Saturday or Sunday,
 * and never touching buildWeeklyPlan() itself.
 */

export function attachGameToWeeklyPlan(plan, gameMatch) {
  if (!gameMatch) return plan;

  return {
    ...plan,
    days: {
      ...plan.days,
      FRIDAY: {
        ...plan.days.FRIDAY,
        available: true,
        gameDefinitionId: gameMatch.id,
        gameName: gameMatch.name,
        reason: `a real, active game ("${gameMatch.name}") covers this topic`,
      },
    },
  };
}
