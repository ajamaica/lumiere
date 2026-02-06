#!/usr/bin/env python3
"""
Generate robots.txt and sitemap.xml for a website.
Usage: python create_seo_files.py <domain> <pages_json> <output_dir>
"""

import sys
import json
from pathlib import Path
from datetime import datetime

def create_robots_txt(domain, output_dir):
    """Create robots.txt file."""
    content = f"""User-agent: *
Allow: /
Sitemap: https://{domain}/sitemap.xml
"""
    output_file = Path(output_dir) / "robots.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Created {output_file}")

def create_sitemap_xml(domain, pages, output_dir):
    """Create sitemap.xml file."""
    xml_header = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_header += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    urls = []
    for page in pages:
        url = page.get('url', '/')
        priority = page.get('priority', '0.5')
        urls.append(f'  <url><loc>https://{domain}{url}</loc><priority>{priority}</priority></url>')
    
    xml_footer = '</urlset>'
    
    content = xml_header + '\n'.join(urls) + '\n' + xml_footer
    
    output_file = Path(output_dir) / "sitemap.xml"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Created {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python create_seo_files.py <domain> <pages_json> <output_dir>")
        sys.exit(1)
    
    domain = sys.argv[1]
    pages_json = sys.argv[2]
    output_dir = sys.argv[3]
    
    with open(pages_json, 'r', encoding='utf-8') as f:
        pages = json.load(f)
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    create_robots_txt(domain, output_dir)
    create_sitemap_xml(domain, pages, output_dir)
    
    print(f"\n✨ SEO files created for {domain}")
