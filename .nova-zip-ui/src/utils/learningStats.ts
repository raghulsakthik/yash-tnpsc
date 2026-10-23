import { ActivityDay, Course } from '../types';

/**
 * Calculates current streak length in consecutive days up to today
 */
export function calculateStreak(activities: ActivityDay[]): number {
  if (!activities || activities.length === 0) return 0;

  // Filter only days that have activity > 0
  const activeDates = new Set(
    activities.filter((a) => a.count > 0).map((a) => a.date)
  );

  let streak = 0;
  // Starting from the latest date in the set
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  
  for (const day of sorted) {
    if (activeDates.has(day.date)) {
      streak++;
    } else {
      // If we hit a day with 0 activity after finding consecutive active days, streak breaks
      if (streak > 0) break;
    }
  }

  return streak;
}

/**
 * Calculate user tier based on total XP
 */
export function getUserLevelInfo(xp: number): {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  currentLevelXp: number;
  targetLevelXp: number;
  percentage: number;
} {
  if (xp < 2000) {
    return {
      level: 'Beginner',
      currentLevelXp: xp,
      targetLevelXp: 2000,
      percentage: Math.min(100, Math.round((xp / 2000) * 100)),
    };
  } else if (xp < 5000) {
    return {
      level: 'Intermediate',
      currentLevelXp: xp - 2000,
      targetLevelXp: 3000,
      percentage: Math.min(100, Math.round(((xp - 2000) / 3000) * 100)),
    };
  } else {
    return {
      level: 'Advanced',
      currentLevelXp: xp - 5000,
      targetLevelXp: 5000,
      percentage: Math.min(100, Math.round(((xp - 5000) / 5000) * 100)),
    };
  }
}

/**
 * Recalculates course progress given updated lessons
 */
export function calculateCourseProgress(lessons: Course['lessons']): number {
  if (!lessons || lessons.length === 0) return 0;
  const completedCount = lessons.filter((l) => l.completed).length;
  return Math.round((completedCount / lessons.length) * 100);
}

/**
 * Formats dynamic greeting based on hour of day
 */
export function getGreeting(userName: string, hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) {
    return `Good Morning, ${userName}`;
  } else if (hour >= 12 && hour < 17) {
    return `Good Afternoon, ${userName}`;
  } else if (hour >= 17 && hour < 22) {
    return `Good Evening, ${userName}`;
  } else {
    return `Good Night, ${userName}`;
  }
}

/**
 * Generates sample 365-day activity map matching GitHub/LeetCode style
 */
export function generateYearActivityData(seedLength = 365): ActivityDay[] {
  const result: ActivityDay[] = [];
  const today = new Date('2026-10-22'); // Anchored to environment time
  
  for (let i = seedLength - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Deterministic distribution for nice heatmap visuals matching Image 2
    const pseudoRandom = Math.sin(i * 13.37 + 5) * 10000;
    const val = pseudoRandom - Math.floor(pseudoRandom);
    
    let level = 0;
    let count = 0;
    
    if (val > 0.78) {
      level = 4;
      count = 5 + Math.floor(val * 4);
    } else if (val > 0.55) {
      level = 3;
      count = 3 + Math.floor(val * 2);
    } else if (val > 0.35) {
      level = 2;
      count = 2;
    } else if (val > 0.18) {
      level = 1;
      count = 1;
    } else {
      level = 0;
      count = 0;
    }

    // Ensure recent days are active for streak
    if (i < 14) {
      level = Math.max(1, (i % 4) + 1);
      count = level * 2;
    }

    result.push({
      date: dateStr,
      count,
      level,
    });
  }

  return result;
}

/**
 * Calculates progress towards daily learning goal
 */
export function calculateDailyGoalProgress(current: number, target: number): {
  percentage: number;
  isCompleted: boolean;
  remaining: number;
} {
  if (target <= 0) return { percentage: 0, isCompleted: false, remaining: 0 };
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const isCompleted = current >= target;
  const remaining = Math.max(0, Math.round((target - current) * 10) / 10);
  return { percentage, isCompleted, remaining };
}

