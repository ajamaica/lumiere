#!/usr/bin/env python3
"""
Output Formatter - Format skill reports in different formats
"""

import json
from datetime import datetime
from typing import Dict, List, Any

class Formatter:
    """Format skill reports as text, JSON, or markdown"""
    
    def __init__(self, format_type: str = "text"):
        self.format_type = format_type
    
    def format(self, report: Dict[str, Any]) -> str:
        """Format the entire report"""
        if self.format_type == "json":
            return self._format_json(report)
        elif self.format_type == "markdown":
            return self._format_markdown(report)
        else:
            return self._format_text(report)
    
    def _format_text(self, report: Dict[str, Any]) -> str:
        """Format as plain text with emojis and colors"""
        lines = []
        timestamp = report.get("timestamp", "")
        
        # Header
        lines.append("🔥 Trending Skills Report")
        lines.append("=" * 60)
        lines.append(f"📅 {timestamp}")
        lines.append("")
        
        # New Skills
        new_skills = report.get("new_skills", [])
        if new_skills:
            lines.append("✨ NEW RELEASES (Last 7 Days)")
            lines.append("-" * 60)
            for skill in new_skills[:10]:
                lines.append(self._format_skill_compact(skill, "new"))
            lines.append("")
        else:
            lines.append("✨ NEW RELEASES - No new skills found")
            lines.append("")
        
        # Trending Skills
        trending_skills = report.get("trending_skills", [])
        if trending_skills:
            lines.append("🔝 COMMUNITY FAVORITES (Most Installed)")
            lines.append("-" * 60)
            for i, skill in enumerate(trending_skills[:10], 1):
                lines.append(self._format_skill_ranked(skill, i))
            lines.append("")
        else:
            lines.append("🔝 COMMUNITY FAVORITES - No trending skills found")
            lines.append("")
        
        # Recently Updated
        updated_skills = report.get("updated_skills", [])
        if updated_skills:
            lines.append("🔄 RECENT UPDATES")
            lines.append("-" * 60)
            for skill in updated_skills[:5]:
                lines.append(self._format_skill_updated(skill))
            lines.append("")
        
        # Summary
        total = len(new_skills) + len(trending_skills)
        lines.append("=" * 60)
        lines.append(f"📊 Total skills: {total}")
        
        return "\n".join(lines)
    
    def _format_markdown(self, report: Dict[str, Any]) -> str:
        """Format as markdown"""
        lines = []
        timestamp = report.get("timestamp", "")
        
        lines.append("# 🔥 Trending Skills Report\n")
        lines.append(f"*{timestamp}*\n")
        
        # New Skills
        new_skills = report.get("new_skills", [])
        if new_skills:
            lines.append("## ✨ New Releases\n")
            for skill in new_skills[:10]:
                lines.append(self._format_skill_markdown_item(skill))
            lines.append("")
        
        # Trending
        trending_skills = report.get("trending_skills", [])
        if trending_skills:
            lines.append("## 🔝 Community Favorites\n")
            for i, skill in enumerate(trending_skills[:10], 1):
                lines.append(f"{i}. {self._format_skill_markdown_item(skill)}")
            lines.append("")
        
        # Updated
        updated_skills = report.get("updated_skills", [])
        if updated_skills:
            lines.append("## 🔄 Recently Updated\n")
            for skill in updated_skills[:5]:
                lines.append(self._format_skill_markdown_item(skill))
            lines.append("")
        
        return "\n".join(lines)
    
    def _format_json(self, report: Dict[str, Any]) -> str:
        """Format as JSON"""
        return json.dumps(report, indent=2, default=str)
    
    def _format_skill_compact(self, skill: Dict[str, Any], skill_type: str = "default") -> str:
        """Compact skill format for listing"""
        name = skill.get("name", "Unknown")
        downloads = skill.get("downloads", 0)
        description = skill.get("description", "")[:50]
        
        if not description:
            description = "(No description)"
        
        age_str = ""
        if skill_type == "new":
            created = skill.get("created_at", "")
            age_str = f" | Created: {created[:10]}"
        
        return f"  📦 {name}\n     Downloads: {downloads:,} | {description}...{age_str}"
    
    def _format_skill_ranked(self, skill: Dict[str, Any], rank: int) -> str:
        """Format skill with ranking"""
        name = skill.get("name", "Unknown")
        installs = skill.get("installs", 0)
        rating = skill.get("rating", 0)
        category = skill.get("category", "")
        
        medal = ["🥇", "🥈", "🥉"][min(rank - 1, 2)]
        
        return f"  {medal} #{rank}. {name}\n     📥 {installs:,} installs | ⭐ {rating:.1f} | 📁 {category}"
    
    def _format_skill_updated(self, skill: Dict[str, Any]) -> str:
        """Format skill with update info"""
        name = skill.get("name", "Unknown")
        version = skill.get("version", "1.0.0")
        updated = skill.get("updated_at", "")[:10]
        changelog = skill.get("changelog", "")[:50]
        
        return f"  🆕 {name} (v{version})\n     Updated: {updated} | {changelog}"
    
    def _format_skill_markdown_item(self, skill: Dict[str, Any]) -> str:
        """Markdown format for a single skill"""
        name = skill.get("name", "Unknown")
        description = skill.get("description", "No description")
        author = skill.get("author", "Unknown")
        downloads = skill.get("downloads", 0)
        installs = skill.get("installs", 0)
        rating = skill.get("rating", 0)
        version = skill.get("version", "1.0.0")
        
        return f"**{name}** (v{version}) by {author}  \n{description}  \n📥 {installs:,} installs | ⭐ {rating:.1f} | 📊 {downloads:,} downloads"
