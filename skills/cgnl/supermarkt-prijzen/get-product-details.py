#!/usr/bin/env python3
"""
Get AH product details including ingredients and allergens
Uses Playwright for scraping (like LouayCoding's API)
"""
import sys
import json
import argparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

def scrape_product_details(product_id, headless=True):
    """Scrape product details from AH website"""
    
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=headless)
        
        # Create context with anti-detection
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='nl-NL',
            viewport={'width': 1920, 'height': 1080}
        )
        
        # Anti-detection: remove webdriver flag
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
        """)
        
        page = context.new_page()
        
        try:
            # Navigate to product page
            url = f'https://www.ah.nl/producten/product/{product_id}'
            print(f"Loading: {url}", file=sys.stderr)
            
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(3000)  # Wait for dynamic content
            
            # Extract product details
            details = page.evaluate("""() => {
                // Helper function
                const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : null;
                };
                
                const getAllText = (selector) => {
                    const elements = document.querySelectorAll(selector);
                    return Array.from(elements).map(el => el.textContent.trim());
                };
                
                // Product name
                const name = getText('h1') || 
                            getText('[data-testhook="product-title"]') ||
                            getText('.product-title');
                
                // Brand
                const brand = getText('[data-testhook="product-brand"]') ||
                             getText('.brand, [class*="Brand"]');
                
                // Price
                const price = getText('[data-testhook="price-amount"]') ||
                             getText('.price, [class*="Price"]');
                
                // Description
                const description = getText('[data-testhook="product-description"]') ||
                                   getText('.description, [class*="Description"]');
                
                // Ingredients (multiple possible selectors)
                let ingredients = getText('[data-testhook="product-ingredients"]') ||
                                 getText('.ingredients') ||
                                 getText('[class*="Ingredients"]');
                
                // Try to find in expandable sections
                if (!ingredients) {
                    const labels = getAllText('button, summary, .accordion-header, [class*="Accordion"]');
                    for (let i = 0; i < labels.length; i++) {
                        if (labels[i].toLowerCase().includes('ingrediënt')) {
                            // Found ingredients section, try to get content
                            const buttons = document.querySelectorAll('button, summary');
                            if (buttons[i]) {
                                // Try to find associated content
                                const parent = buttons[i].closest('details, [class*="Accordion"], div');
                                if (parent) {
                                    const content = parent.querySelector('p, div[class*="content"], [class*="Content"]');
                                    if (content) ingredients = content.textContent.trim();
                                }
                            }
                        }
                    }
                }
                
                // Allergens
                let allergens = getText('[data-testhook="product-allergens"]') ||
                               getText('.allergens') ||
                               getText('[class*="Allergen"]');
                
                if (!allergens) {
                    const labels = getAllText('button, summary, .accordion-header');
                    for (let i = 0; i < labels.length; i++) {
                        if (labels[i].toLowerCase().includes('allergeen')) {
                            const buttons = document.querySelectorAll('button, summary');
                            if (buttons[i]) {
                                const parent = buttons[i].closest('details, [class*="Accordion"], div');
                                if (parent) {
                                    const content = parent.querySelector('p, div[class*="content"]');
                                    if (content) allergens = content.textContent.trim();
                                }
                            }
                        }
                    }
                }
                
                // Nutrition table
                const nutritionTable = document.querySelector('[data-testhook="nutrition-table"], table[class*="Nutrition"]');
                let nutrition = null;
                if (nutritionTable) {
                    const rows = nutritionTable.querySelectorAll('tr');
                    nutrition = {};
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim();
                            const value = cells[1].textContent.trim();
                            if (key && value) nutrition[key] = value;
                        }
                    });
                }
                
                // Category
                const category = getText('[data-testhook="breadcrumb"]') ||
                                getText('.breadcrumb') ||
                                getText('nav[class*="Breadcrumb"]');
                
                // Images
                const images = getAllText('img[src*="product"], img[src*="dam"]').map(img => {
                    const el = document.querySelector(`img[alt="${img}"]`);
                    return el ? el.src : null;
                }).filter(Boolean);
                
                return {
                    id: window.location.pathname.split('/').pop(),
                    name,
                    brand,
                    price,
                    description,
                    ingredients,
                    allergens,
                    nutrition,
                    category,
                    images: images.length > 0 ? images : null,
                    url: window.location.href
                };
            }""")
            
            return details
            
        except PlaywrightTimeout as e:
            print(f"Timeout: {e}", file=sys.stderr)
            return {"error": "Page load timeout"}
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            return {"error": str(e)}
        finally:
            browser.close()

def main():
    parser = argparse.ArgumentParser(description="Get AH product details")
    parser.add_argument("--id", required=True, help="Product ID (e.g. wi441199)")
    parser.add_argument("--pretty", action="store_true", help="Pretty JSON")
    parser.add_argument("--visible", action="store_true", help="Show browser (debug)")
    
    args = parser.parse_args()
    
    # Scrape details
    details = scrape_product_details(args.id, headless=not args.visible)
    
    # Output
    json_str = json.dumps(details, indent=2 if args.pretty else None, ensure_ascii=False)
    print(json_str)

if __name__ == "__main__":
    main()
