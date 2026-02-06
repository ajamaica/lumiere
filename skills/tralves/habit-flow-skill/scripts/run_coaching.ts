#!/usr/bin/env node
/**
 * Run Coaching Script
 * Deterministic wrapper for coaching cron jobs.
 * Runs the appropriate coaching analysis and outputs ready-to-deliver
 * messages or a no_reply action.
 */

import { Command } from 'commander';

import {
  CoachingMessage,
  generateInsightMessage,
  generateMilestoneMessage,
  generateRiskWarning,
  generateWeeklyCheckin,
  WeeklyStats
} from '../src/coaching-engine.js';
import { getLastLogPerDay } from '../src/daily-completion.js';
import { assessRisk, detectMilestone, detectPatterns } from '../src/pattern-analyzer.js';
import { loadConfig,loadHabits, loadLogs } from '../src/storage.js';
import { calculateStreak } from '../src/streak-calculation.js';

const program = new Command();

program
  .name('run_coaching')
  .description('Run coaching check and output messages for delivery')
  .requiredOption('--type <type>', 'Coaching type: daily, weekly, or insights')
  .action(async (options) => {
    try {
      const data = await loadHabits();
      const habits = data.habits.filter(h => h.isActive);

      if (habits.length === 0) {
        console.log(JSON.stringify({ action: 'no_reply', reason: 'No active habits' }));
        return;
      }

      const messages: CoachingMessage[] = [];

      for (const habit of habits) {
        const year = new Date().getFullYear();
        const logs = await loadLogs(habit.id, year);

        // Update streak info
        const streakInfo = calculateStreak(habit, logs);
        habit.currentStreak = streakInfo.currentStreak;
        habit.longestStreak = streakInfo.longestStreak;

        switch (options.type) {
          case 'daily': {
            // Check milestones
            const milestone = detectMilestone(habit);
            if (milestone) {
              const message = await generateMilestoneMessage(habit, milestone);
              messages.push(message);
            }
            // Check risks
            const risk = assessRisk(habit, logs);
            if (risk.riskScore >= 60) {
              const message = await generateRiskWarning(habit, risk);
              if (message) messages.push(message);
            }
            break;
          }
          case 'weekly': {
            const weeklyStats = calculateWeeklyStats(logs);
            const message = await generateWeeklyCheckin(habit, weeklyStats);
            messages.push(message);
            break;
          }
          case 'insights': {
            const insights = detectPatterns(habit, logs);
            for (const insight of insights) {
              const message = await generateInsightMessage(habit, insight);
              messages.push(message);
            }
            break;
          }
          default:
            throw new Error(`Unknown coaching type: ${options.type}. Use daily, weekly, or insights.`);
        }
      }

      if (messages.length === 0) {
        console.log(JSON.stringify({ action: 'no_reply', reason: 'No coaching messages to send' }));
        return;
      }

      console.log(JSON.stringify({
        action: 'send',
        messages: messages.map(m => ({
          subject: m.subject,
          body: m.body,
          type: m.messageType,
          priority: m.priority,
          habitId: m.habitId,
          attachments: m.attachments ? m.attachments.filter(a => a) : []
        }))
      }));
    } catch (error: any) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }));
      process.exit(1);
    }
  });

program.parse();

function calculateWeeklyStats(logs: any[]): WeeklyStats {
  const dailyCompletions = getLastLogPerDay(logs);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = dailyCompletions.filter(d => new Date(d.date) >= weekAgo);
  const lastWeek = dailyCompletions.filter(d => {
    const date = new Date(d.date);
    return date >= twoWeeksAgo && date < weekAgo;
  });

  const thisWeekCompleted = thisWeek.filter(d => d.isCompleted).length;
  const lastWeekCompleted = lastWeek.filter(d => d.isCompleted).length;

  const completionRate = Math.round((thisWeekCompleted / 7) * 100);
  const lastWeekRate = lastWeek.length > 0 ? Math.round((lastWeekCompleted / lastWeek.length) * 100) : 0;

  return {
    daysCompleted: thisWeekCompleted,
    completionRate,
    trend: completionRate - lastWeekRate
  };
}
