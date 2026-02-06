#!/usr/bin/env python3
"""
Filter Engine - Filter and match skills by interests and categories
"""

import re
from typing import List, Dict, Any

class FilterEngine:
    """Filter skills by interests, categories, and keywords"""
    
    # Category mappings for fuzzy matching
    CATEGORY_ALIASES = {
        "3d-printing": ["3d", "printing", "3d-print", "cad"],
        "coding": ["code", "programming", "development", "dev", "script"],
        "automation": ["automate", "robot", "workflow", "task"],
        "data": ["data-processing", "data-analysis", "analytics", "machine-learning", "ml", "ai"],
        "media": ["image", "video", "audio", "photo", "video-processing"],
        "web": ["web-development", "http", "api", "website", "web-scraping"],
        "iot": ["internet-of-things", "sensors", "esp32", "arduino", "hardware"],
        "communication": ["telegram", "slack", "email", "messaging", "discord"],
        "security": ["security", "encryption", "password", "monitoring"],
        "utility": ["utility", "tool", "helper", "converter"],
    }
    
    def __init__(self):
        pass
    
    def filter_by_interests(
        self,
        skills: List[Dict[str, Any]],
        interests: List[str] = None,
        category: str = None
    ) -> List[Dict[str, Any]]:
        """
        Filter skills by interests and category.
        
        Args:
            skills: List of skill dicts
            interests: List of interest keywords (e.g., ["3D printing", "coding"])
            category: Specific category to filter by
        
        Returns:
            Filtered list of skills
        """
        if not interests and not category:
            return skills
        
        filtered = skills
        
        # Filter by category first
        if category:
            filtered = self._filter_by_category(filtered, category)
        
        # Filter by interests
        if interests:
            filtered = self._filter_by_keywords(filtered, interests)
        
        return filtered
    
    def _filter_by_category(self, skills: List[Dict[str, Any]], category: str) -> List[Dict[str, Any]]:
        """Filter skills by exact category match"""
        category_lower = category.lower().strip()
        
        result = []
        for skill in skills:
            skill_category = skill.get("category", "").lower()
            
            # Exact match
            if skill_category == category_lower:
                result.append(skill)
                continue
            
            # Check aliases
            if self._match_category_alias(category_lower, skill_category):
                result.append(skill)
        
        return result
    
    def _filter_by_keywords(self, skills: List[Dict[str, Any]], interests: List[str]) -> List[Dict[str, Any]]:
        """Filter skills by keyword matching in description, tags, category"""
        # Normalize interests
        keywords = [kw.strip().lower() for kw in interests]
        
        result = []
        for skill in skills:
            # Combine text to search
            search_text = " ".join([
                skill.get("name", ""),
                skill.get("description", ""),
                skill.get("category", ""),
                " ".join(skill.get("tags", [])),
                skill.get("author", "")
            ]).lower()
            
            # Check if any keyword matches
            if self._match_keywords(search_text, keywords):
                result.append(skill)
        
        return result
    
    def _match_keywords(self, text: str, keywords: List[str]) -> bool:
        """Check if any keyword matches in text with fuzzy matching"""
        for keyword in keywords:
            # Exact word match
            if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                return True
            
            # Substring match (for partial terms)
            if keyword in text:
                return True
            
            # Check for similar words (e.g., "3d" in "3d-printing")
            if self._fuzzy_match(keyword, text):
                return True
        
        return False
    
    def _fuzzy_match(self, keyword: str, text: str) -> bool:
        """Fuzzy match for related terms"""
        # Create variations
        variations = [
            keyword,
            keyword.replace("-", ""),
            keyword.replace("_", ""),
            keyword.replace(" ", "-"),
            keyword.replace(" ", "_"),
        ]
        
        for var in variations:
            if var in text:
                return True
        
        return False
    
    def _match_category_alias(self, requested: str, skill_category: str) -> bool:
        """Check if skill category matches requested category via aliases"""
        for main_cat, aliases in self.CATEGORY_ALIASES.items():
            # Check if requested matches main category
            if requested == main_cat:
                if skill_category == main_cat or skill_category in aliases:
                    return True
            
            # Check if requested matches any alias
            if requested in aliases:
                if skill_category == main_cat or skill_category in aliases:
                    return True
        
        return False
    
    def get_matching_interests(
        self,
        skill: Dict[str, Any],
        interests: List[str]
    ) -> List[str]:
        """Get which interests this skill matches"""
        search_text = " ".join([
            skill.get("name", ""),
            skill.get("description", ""),
            skill.get("category", ""),
            " ".join(skill.get("tags", [])),
        ]).lower()
        
        matches = []
        for interest in interests:
            if self._match_keywords(search_text, [interest.lower()]):
                matches.append(interest)
        
        return matches
