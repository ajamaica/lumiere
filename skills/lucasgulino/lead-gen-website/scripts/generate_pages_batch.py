#!/usr/bin/env python3
"""
Generate multiple similar pages in batch (e.g., service pages, blog articles).
Usage: python generate_pages_batch.py <template_file> <data_file> <output_dir>
"""

import sys
import json
from pathlib import Path

def generate_pages(template_path, data_path, output_dir):
    """Generate pages from template and data."""
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    
    with open(data_path, 'r', encoding='utf-8') as f:
        pages_data = json.load(f)
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    for page in pages_data:
        content = template
        for key, value in page.items():
            placeholder = f"{{{{{key}}}}}"
            content = content.replace(placeholder, str(value))
        
        filename = page.get('filename', f"{page.get('component_name', 'Page')}.tsx")
        output_file = output_path / filename
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Created {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python generate_pages_batch.py <template_file> <data_file> <output_dir>")
        sys.exit(1)
    
    template_file = sys.argv[1]
    data_file = sys.argv[2]
    output_dir = sys.argv[3]
    
    generate_pages(template_file, data_file, output_dir)
    print(f"\n✨ Generated {len(json.load(open(data_file)))} pages")
