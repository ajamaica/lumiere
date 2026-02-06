#!/usr/bin/env node
/**
 * Run Reminder Script
 * Deterministic wrapper for habit reminder cron jobs.
 * Checks if a habit was already completed today and outputs
 * either a reminder message or a no_reply action.
 */

import { Command } from 'commander';

import { getDailyCompletion } from '../src/daily-completion.js';
import { loadHabits, loadLogs } from '../src/storage.js';

const program = new Command();

program
  .name('run_reminder')
  .description('Check habit completion and output reminder if needed')
  .requiredOption('--habit-id <id>', 'Habit ID to check')
  .action(async (options) => {
    try {
      const data = await loadHabits();
      const habit = data.habits.find(h => h.id === options.habitId);

      if (!habit) {
        console.log(JSON.stringify({
          action: 'no_reply',
          reason: `Habit ${options.habitId} not found`
        }));
        return;
      }

      // Check today's completion
      const year = new Date().getFullYear();
      const logs = await loadLogs(habit.id, year);
      const today = new Date().toISOString().split('T')[0];
      const todayCompletion = getDailyCompletion(logs, today);

      if (todayCompletion && todayCompletion.isCompleted) {
        // Already completed today - no reminder needed
        console.log(JSON.stringify({
          action: 'no_reply',
          reason: 'Habit already completed today'
        }));
        return;
      }

      // Build reminder message
      const customMessage = habit.reminderSettings?.message;
      const message = customMessage
        || `Reminder: Time for your ${habit.name}\n\nTarget: ${habit.targetCount} ${habit.targetUnit || 'session'}\n\nQuick log: Reply 'done', 'skipped', or 'missed'`;

      console.log(JSON.stringify({
        action: 'send',
        message
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
