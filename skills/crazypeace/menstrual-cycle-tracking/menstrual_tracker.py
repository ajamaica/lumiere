"""
Menstrual Cycle Tracker Module for OpenClaw
Provides functionality to record, store, and analyze menstrual cycle data.
"""

import json
import os
from datetime import datetime
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

class MenstrualTracker:
    def __init__(self, data_file="data/menstrual_data.json"):
        self.data_file = data_file
        self.ensure_data_directory()
        self.data = self.load_data()
    
    def ensure_data_directory(self):
        """Ensure the data directory exists."""
        directory = os.path.dirname(self.data_file)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
    
    def load_data(self):
        """Load existing menstrual data from JSON file."""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def save_data(self):
        """Save menstrual data to JSON file."""
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
    
    def add_entry(self, date, bleeding_level=None, pain_level=None, mood=None, cycle_event=None, notes=None):
        """
        Add a new entry to the menstrual cycle data.
        
        Args:
            date (str): Date in YYYY-MM-DD format
            bleeding_level (str): One of 'spotting', 'light', 'normal', 'medium', 'heavy'
            pain_level (int): Pain level from 0-10
            mood (list): List of mood descriptors
            cycle_event (str): Type of cycle event ('menstruation_start', 'tracking_note', etc.)
            notes (str): Additional notes
        """
        if mood is None:
            mood = []
        
        new_entry = {
            "timestamp": f"{date}T00:00:00.000Z",
            "structured_data": {
                "date": f"{date}T00:00:00.000Z",
                "cycle_event": cycle_event,
                "bleeding_level": bleeding_level,
                "pain_level": pain_level,
                "mood": mood,
                "notes": notes
            }
        }
        
        # Check if an entry for this date already exists
        for i, entry in enumerate(self.data):
            if entry['timestamp'].startswith(date):
                # Update existing entry
                self.data[i] = new_entry
                break
        else:
            # Add new entry
            self.data.append(new_entry)
        
        # Sort by date
        self.data.sort(key=lambda x: x['timestamp'])
        self.save_data()
    
    def get_analysis(self):
        """Generate statistical analysis of the menstrual data."""
        if not self.data:
            return "No data available for analysis."
        
        # Calculate average cycle length
        menstruation_starts = [
            entry for entry in self.data 
            if entry['structured_data']['cycle_event'] == 'menstruation_start'
        ]
        
        if len(menstruation_starts) < 2:
            cycle_info = "Not enough data to calculate average cycle length."
        else:
            # Calculate differences between consecutive periods
            dates = [datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00')) 
                    for entry in menstruation_starts]
            cycle_lengths = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_cycle_length = sum(cycle_lengths) / len(cycle_lengths) if cycle_lengths else 0
            
            cycle_info = f"Average cycle length: {avg_cycle_length:.1f} days ({len(cycle_lengths)} cycles)"
        
        # Calculate average pain level
        pain_values = [entry['structured_data']['pain_level'] 
                      for entry in self.data 
                      if entry['structured_data']['pain_level'] is not None]
        avg_pain = sum(pain_values) / len(pain_values) if pain_values else 0
        
        # Count bleeding levels
        bleeding_counts = {}
        for entry in self.data:
            level = entry['structured_data']['bleeding_level']
            if level:
                bleeding_counts[level] = bleeding_counts.get(level, 0) + 1
        
        # Analyze mood patterns
        all_moods = []
        for entry in self.data:
            all_moods.extend(entry['structured_data']['mood'])
        
        from collections import Counter
        mood_counts = Counter(all_moods)
        top_moods = mood_counts.most_common(5)
        
        analysis = {
            "cycle_info": cycle_info,
            "total_entries": len(self.data),
            "avg_pain_level": round(avg_pain, 1),
            "bleeding_distribution": bleeding_counts,
            "top_moods": top_moods
        }
        
        return analysis
    
    def generate_visualization(self, output_file="menstrual_analysis.png"):
        """Generate visualization of the menstrual data."""
        if not self.data:
            return "No data available for visualization."
        
        # Prepare data for visualization
        dates = []
        bleeding_levels = []
        pain_levels = []
        events = []
        
        for item in self.data:
            dates.append(datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00')))
            # Map bleeding level to numeric value
            bleeding_map = {'spotting': 0.5, 'light': 1, 'normal': 2, 'medium': 2, 'heavy': 3}
            bleeding_val = bleeding_map.get(item['structured_data']['bleeding_level'], 0)
            bleeding_levels.append(bleeding_val)
            
            pain_val = item['structured_data']['pain_level']
            pain_levels.append(pain_val if pain_val is not None else 0)
            
            event = item['structured_data']['cycle_event']
            events.append(event)
        
        df = pd.DataFrame({
            'date': dates,
            'bleeding_level': bleeding_levels,
            'pain_level': pain_levels,
            'event': events
        })
        
        # Create visualization
        fig, axes = plt.subplots(3, 1, figsize=(14, 12))
        fig.suptitle('Menstrual Cycle Health Analysis', fontsize=16)
        
        # Plot 1: Bleeding level
        axes[0].plot(df['date'], df['bleeding_level'], marker='o', color='red', alpha=0.7, label='Bleeding Level')
        axes[0].set_title('Bleeding Level Change')
        axes[0].set_ylabel('Bleeding Level')
        axes[0].grid(True, alpha=0.3)
        axes[0].set_ylim(-0.2, 3.5)
        
        # Mark menstruation start
        start_dates = df[df['event'] == 'menstruation_start']
        if len(start_dates) > 0:
            axes[0].scatter(
                start_dates['date'], 
                [0.5] * len(start_dates), 
                color='black', 
                s=100, 
                marker='^', 
                zorder=5, 
                label='Menstruation Start'
            )
            axes[0].legend()
        
        # Plot 2: Pain level
        axes[1].plot(df['date'], df['pain_level'], marker='s', color='orange', alpha=0.7, label='Pain Level')
        axes[1].set_title('Pain Level Change')
        axes[1].set_ylabel('Pain Level (0-10)')
        axes[1].grid(True, alpha=0.3)
        
        if len(start_dates) > 0:
            axes[1].scatter(
                start_dates['date'], 
                [max(df['pain_level']) * 0.9] * len(start_dates), 
                color='black', 
                s=100, 
                marker='^', 
                zorder=5, 
                label='Menstruation Start'
            )
            axes[1].legend()
        
        # Plot 3: Mood heatmap
        # Extract and count moods
        all_moods = [item['structured_data']['mood'] for item in self.data]
        unique_moods = list(set([mood for moods in all_moods for mood in moods]))
        
        if unique_moods:
            mood_matrix = np.zeros((len(unique_moods), len(dates)))
            for i, moods in enumerate(all_moods):
                for j, mood in enumerate(unique_moods):
                    if mood in moods:
                        mood_matrix[j][i] = 1
            
            # Show top moods
            mood_counts = [(mood, sum(row)) for mood, row in zip(unique_moods, mood_matrix)]
            top_moods = sorted(mood_counts, key=lambda x: x[1], reverse=True)[:10]
            top_mood_names = [x[0] for x in top_moods]
            
            if top_mood_names:
                top_mood_indices = [unique_moods.index(mood) for mood in top_mood_names]
                top_mood_matrix = mood_matrix[top_mood_indices]
                
                im = axes[2].imshow(top_mood_matrix, aspect='auto', cmap='YlOrRd', interpolation='none')
                axes[2].set_yticks(range(len(top_mood_names)))
                axes[2].set_yticklabels(top_mood_names)
                axes[2].set_title('Main Moods Heatmap')
                axes[2].set_xlabel('Date')
                plt.colorbar(im, ax=axes[2])
            else:
                axes[2].text(0.5, 0.5, 'No mood data to display', horizontalalignment='center', 
                             verticalalignment='center', transform=axes[2].transAxes)
        else:
            axes[2].text(0.5, 0.5, 'No mood data to display', horizontalalignment='center', 
                         verticalalignment='center', transform=axes[2].transAxes)
        
        plt.tight_layout()
        plt.savefig(output_file, dpi=150, bbox_inches='tight')
        plt.close()
        
        return f"Visualization saved to {output_file}"