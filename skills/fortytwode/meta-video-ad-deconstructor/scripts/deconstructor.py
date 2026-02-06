"""
Video Ad Deconstructor - Analyze video ad creatives for marketing dimensions.

Extracts hooks, social proof, urgency, emotional triggers, target audience,
and other marketing patterns using Gemini AI.
"""
import json
import logging
import time
from typing import Dict, Any, Optional, Callable, List

from .models import ExtractedVideoContent
from .prompt_manager import PromptManager

logger = logging.getLogger(__name__)


class DeconstructionResult:
    """Holds the structured deconstruction analysis data."""

    def __init__(self, dimensions: Dict[str, Any]):
        self.dimensions = dimensions

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {'dimensions': self.dimensions}

    def get_dimension(self, name: str) -> Optional[Dict]:
        """Get a specific dimension's analysis."""
        return self.dimensions.get(name)

    def get_salient_dimensions(self, min_score: float = 0.5) -> Dict[str, Any]:
        """Get only dimensions with salience score above threshold."""
        salient = {}
        for name, data in self.dimensions.items():
            if isinstance(data, dict) and data.get('salience_score', 0) >= min_score:
                salient[name] = data
        return salient


class AdDeconstructor:
    """
    Deconstructs video ad creatives into marketing dimensions.

    Main entry point: deconstruct(extracted_content, summary)
    """

    # Marketing dimensions to analyze
    DIMENSIONS = [
        'problem',
        'aspiration_transformation',
        'credibility',
        'urgency',
        'emotion',
        'target_audience',
        'hooks_spoken',
        'hooks_visual',
        'hooks_text',
        'narrative_flow',
        'visual_format',
    ]

    def __init__(self, gemini_model=None, prompts_dir: str = None):
        """
        Initialize AdDeconstructor.

        Args:
            gemini_model: Initialized Gemini GenerativeModel instance
            prompts_dir: Optional path to prompts directory
        """
        self.gemini_model = gemini_model
        self.prompt_manager = PromptManager(prompts_dir)

    def _get_cleaned_json(self, response_text: str) -> Dict[str, Any]:
        """Extract and decode JSON from AI response, handling markdown blocks."""
        try:
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.rfind("```")
                json_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.rfind("```")
                json_text = response_text[start:end].strip()
            else:
                json_text = response_text

            return json.loads(json_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON Decode Error: {e}")
            return {"error": "Failed to decode JSON from AI response."}

    def generate_summary(self, transcript: str, scenes: str = "",
                        text_overlays: str = "") -> str:
        """
        Generate structured summary of ad content.

        Args:
            transcript: Spoken content from the ad
            scenes: Formatted scene descriptions
            text_overlays: Formatted text overlay timeline

        Returns:
            Structured summary string
        """
        if not self.gemini_model:
            return ""

        try:
            context_parts = []
            if scenes:
                context_parts.append(f"Visual Scenes:\n{scenes}")
            if text_overlays:
                context_parts.append(f"Text Overlays:\n{text_overlays}")
            if transcript:
                context_parts.append(f"Spoken Content:\n{transcript[:2000]}")

            if not context_parts:
                return "No content available for summary."

            context = "\n\n".join(context_parts)

            prompt = f"""Analyze this video ad content and provide a structured summary:

{context}

Format your response as PLAIN TEXT with these section headers:

Product/App: [The specific product or app showcased]

Key Features: [List each feature on a new line]
Feature name: Description of the feature
Another feature: Description

Target Audience: [Who this video is for]

Call to Action: [What viewers are asked to do]

Be specific about actual content shown. Keep it concise."""

            response = self.gemini_model.generate_content(prompt)
            return response.text

        except Exception as e:
            logger.error(f"Error during summary generation: {e}")
            return "Error generating summary."

    def _format_text_timeline(self, text_timeline: List) -> str:
        """Format text timeline entries into readable string."""
        formatted_entries = []

        for entry in text_timeline:
            timestamp = entry.get('at', 0)
            if 'text' in entry:
                if isinstance(entry['text'], list):
                    text_value = ", ".join([t.strip() for t in entry['text'] if t and t.strip()])
                else:
                    text_value = str(entry['text']).strip()

                if text_value:
                    formatted_entries.append(f"At {timestamp:.2f}s: {text_value}")

        return "\n".join(formatted_entries)

    def _format_scenes(self, scene_timeline: List) -> str:
        """Format scene timeline as JSON string."""
        scene_descriptions = []
        for scene in scene_timeline:
            if 'timestamp' in scene and 'description' in scene:
                scene_descriptions.append({
                    "time": scene['timestamp'],
                    "description": scene['description']
                })
        return json.dumps(scene_descriptions)

    def deconstruct(self, extracted_content: ExtractedVideoContent,
                    summary: str, is_gaming: bool = False,
                    on_progress: Callable[[float, str], None] = None) -> DeconstructionResult:
        """
        Deconstruct ad content into marketing dimensions.

        Args:
            extracted_content: The extracted video content
            summary: Generated summary of the content
            is_gaming: Whether this is gaming content (uses different prompts)
            on_progress: Optional callback(fraction, dimension_name) for progress

        Returns:
            DeconstructionResult with all analyzed dimensions
        """
        logger.info("Deconstructing ad into marketing dimensions...")

        transcript = extracted_content.transcript or ""
        text_timeline_formatted = self._format_text_timeline(extracted_content.text_timeline)
        scenes_formatted = self._format_scenes(extracted_content.scene_timeline)

        # Extract early words for hooks analysis
        early_words = ' '.join(transcript.split()[:15]) if transcript else ""
        frame_count = len(extracted_content.scene_timeline) if extracted_content.scene_timeline else 0

        all_dimensions = {}
        total_dimensions = len(self.DIMENSIONS)

        for i, dimension_name in enumerate(self.DIMENSIONS):
            logger.info(f"Analyzing dimension {i+1}/{total_dimensions}: {dimension_name}")

            # Get formatted prompt with variables
            full_prompt = self.prompt_manager.get_prompt(dimension_name, {
                'transcript': transcript,
                'summary': summary,
                'text_timeline': text_timeline_formatted,
                'scenes': scenes_formatted,
                'early_words': early_words,
                'frame_count': str(frame_count)
            })

            try:
                if not self.gemini_model:
                    raise ValueError("Gemini model is not initialized.")

                # Retry with exponential backoff for rate limits
                max_retries = 3
                response = None

                for attempt in range(max_retries):
                    try:
                        response = self.gemini_model.generate_content(full_prompt)
                        break
                    except Exception as api_error:
                        error_msg = str(api_error)
                        is_rate_limit = '429' in error_msg or 'Resource exhausted' in error_msg

                        if is_rate_limit and attempt < max_retries - 1:
                            wait_time = (2 ** attempt) * 1
                            logger.warning(f"Rate limit hit, retrying in {wait_time}s...")
                            time.sleep(wait_time)
                        else:
                            raise

                # Parse response
                dimension_result = self._get_cleaned_json(response.text)

                # Normalize elements to always be an array
                if 'elements' in dimension_result and isinstance(dimension_result['elements'], dict):
                    dimension_result['elements'] = [dimension_result['elements']]

                all_dimensions[dimension_name] = dimension_result

            except Exception as e:
                logger.error(f"Error analyzing dimension '{dimension_name}': {e}")
                all_dimensions[dimension_name] = {'error': str(e)}

            # Report progress
            if on_progress and total_dimensions > 0:
                fraction = (i + 1) / total_dimensions
                try:
                    on_progress(fraction, dimension_name)
                except Exception as cb_error:
                    logger.warning(f"Progress callback error: {cb_error}")

        return DeconstructionResult(dimensions=all_dimensions)

    def deconstruct_quick(self, extracted_content: ExtractedVideoContent,
                          dimensions: List[str] = None) -> DeconstructionResult:
        """
        Quick deconstruction analyzing only specified dimensions.

        Args:
            extracted_content: The extracted video content
            dimensions: List of dimension names to analyze (default: hooks only)

        Returns:
            DeconstructionResult with analyzed dimensions
        """
        if dimensions is None:
            dimensions = ['hooks_spoken', 'hooks_visual', 'hooks_text']

        # Generate quick summary
        transcript = extracted_content.transcript or ""
        scenes = self._format_scenes(extracted_content.scene_timeline)
        text_overlays = self._format_text_timeline(extracted_content.text_timeline)
        summary = self.generate_summary(transcript, scenes, text_overlays)

        # Temporarily override dimensions list
        original_dimensions = self.DIMENSIONS
        self.DIMENSIONS = [d for d in dimensions if d in original_dimensions]

        try:
            result = self.deconstruct(extracted_content, summary)
        finally:
            self.DIMENSIONS = original_dimensions

        return result


# CLI interface
if __name__ == '__main__':
    import sys

    print("Video Ad Deconstructor")
    print("=" * 50)
    print("\nUsage:")
    print("  from scripts.deconstructor import AdDeconstructor")
    print("  from scripts.models import ExtractedVideoContent")
    print("")
    print("  deconstructor = AdDeconstructor(gemini_model=model)")
    print("  result = deconstructor.deconstruct(content, summary)")
    print("")
    print("Available dimensions:")
    for dim in AdDeconstructor.DIMENSIONS:
        print(f"  - {dim}")
