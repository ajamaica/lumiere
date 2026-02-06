#!/usr/bin/env python3
"""
Generate content structure file from specifications.
Usage: python generate_content_structure.py <specs_file> <output_file>
"""

import sys
import json
from pathlib import Path

def generate_structure(specs_path, output_path):
    """Generate content structure markdown from specs."""
    with open(specs_path, 'r', encoding='utf-8') as f:
        specs = json.load(f)
    
    content = f"# Structure de Contenu - {specs.get('site_name', 'Site Web')}\n\n"
    content += f"**Niche** : {specs.get('niche', 'N/A')}\n"
    content += f"**Zone géographique** : {specs.get('zone', 'N/A')}\n"
    content += f"**Nombre de pages** : {specs.get('page_count', 0)}\n\n"
    content += "---\n\n"
    
    for i, page in enumerate(specs.get('pages', []), 1):
        content += f"## Page {i} : {page.get('name', 'Page')}\n\n"
        content += f"**URL** : {page.get('url', '/')}\n"
        content += f"**Type** : {page.get('type', 'Standard')}\n\n"
        
        if 'title' in page:
            content += f"### Title SEO\n{page['title']}\n\n"
        
        if 'description' in page:
            content += f"### Meta Description\n{page['description']}\n\n"
        
        if 'h1' in page:
            content += f"### H1\n{page['h1']}\n\n"
        
        if 'sections' in page:
            content += "### Sections\n"
            for section in page['sections']:
                content += f"- **{section.get('title', 'Section')}** : {section.get('content', '')}\n"
            content += "\n"
        
        content += "---\n\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Created content structure: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_content_structure.py <specs_file> <output_file>")
        sys.exit(1)
    
    specs_file = sys.argv[1]
    output_file = sys.argv[2]
    
    generate_structure(specs_file, output_file)
    print(f"\n✨ Content structure generated")
