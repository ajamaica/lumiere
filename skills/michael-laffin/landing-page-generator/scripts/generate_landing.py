#!/usr/bin/env python3
"""
Landing Page Generator - Generate high-converting landing pages.
"""

import argparse
from datetime import datetime
from typing import List


def generate_html_landing_page(
    page_type: str,
    headline: str,
    product: str = None,
    price: str = None,
    benefits: List[str] = None,
    features: List[str] = None,
    testimonials: int = 3,
    cta: str = "Get Started Now",
    guarantee: str = None,
    urgency: str = None,
    subheadline: str = None
) -> str:
    """Generate HTML landing page."""

    # Generate meta title
    meta_title = f"{product} - {headline}" if product else headline

    # Generate benefits HTML
    benefits_html = ""
    if benefits:
        benefits_html = "<ul>\n"
        for benefit in benefits:
            benefits_html += f"      <li>{benefit}</li>\n"
        benefits_html += "    </ul>"

    # Generate features HTML
    features_html = ""
    if features:
        features_html = "<div class=\"feature-grid\">\n"
        for feature in features:
            features_html += f"      <div class=\"feature-card\">\n"
            features_html += f"        <h3>{feature}</h3>\n"
            features_html += "        <p>Feature description</p>\n"
            features_html += "      </div>\n"
        features_html += "    </div>"

    # Generate testimonials HTML
    testimonials_html = "<div class=\"testimonials\">\n"
    for i in range(testimonials):
        testimonials_html += f"      <div class=\"testimonial-card\">\n"
        testimonials_html += f"        <p>\"Amazing results! {product} exceeded my expectations.\"\n"
        testimonials_html += f"        <cite>- {f'Satisfied customer {i+1}'}</cite>\n"
        testimonials_html += "      </div>\n"
    testimonials_html += "    </div>"

    # Generate guarantee HTML
    guarantee_html = ""
    if guarantee:
        guarantee_html = f"    <h2>{guarantee}</h2>\n"
        guarantee_html += "    <p>Risk-free purchase with our satisfaction guarantee.</p>\n"

    # Generate urgency HTML
    urgency_html = ""
    if urgency:
        urgency_html = f"    <p class=\"urgency\">⚠️ {urgency}</p>\n"

    # Generate HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{meta_title}</title>
    <meta name="description" content="{headline}. Transform your results today.">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 1200px; margin: 0 auto; padding: 0 20px; }}
        .hero {{ text-align: center; padding: 80px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }}
        .hero h1 {{ font-size: 3em; margin-bottom: 20px; }}
        .hero p {{ font-size: 1.2em; margin-bottom: 30px; opacity: 0.95; }}
        .cta {{ display: inline-block; padding: 15px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; }}
        .cta:hover {{ background: #ee5a5a; }}
        .section {{ padding: 60px 0; }}
        .section h2 {{ text-align: center; margin-bottom: 40px; }}
        ul {{ max-width: 600px; margin: 0 auto; }}
        li {{ font-size: 1.1em; margin-bottom: 15px; }}
        .feature-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; max-width: 1000px; margin: 0 auto; }}
        .feature-card {{ background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; }}
        .testimonial-card {{ background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }}
        .urgency {{ color: #e74c3c; font-weight: bold; text-align: center; margin-top: 20px; }}
        @media (max-width: 768px) {{ .hero h1 {{ font-size: 2em; }} .feature-grid {{ grid-template-columns: 1fr; }} }}
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <h1>{headline}</h1>
            {f'<p>{subheadline}</p>' if subheadline else ''}
            <a href="#" class="cta">{cta}</a>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <h2>Why Choose {product or 'This'}?</h2>
            {benefits_html}
        </div>
    </section>

    <section class="section">
        <div class="container">
            <h2>What You'll Get</h2>
            {features_html}
        </div>
    </section>

    <section class="section" style="background: #f8f9fa;">
        <div class="container">
            <h2>What People Are Saying</h2>
            {testimonials_html}
        </div>
    </section>

    {f'<section class="section">\n    <div class="container">\n' + guarantee_html + '    </div>\n</section>' if guarantee_html else ''}

    <section class="section">
        <div class="container" style="text-align: center;">
            <a href="#" class="cta" style="font-size: 1.3em; padding: 20px 40px;">{cta}</a>
            {urgency_html}
            {f'<p style="margin-top: 20px; font-size: 1.5em;">${price}</p>' if price else ''}
        </div>
    </section>

    <footer style="text-align: center; padding: 40px 0; background: #333; color: white;">
        <p>&copy; 2026 {product or 'Your Brand'}. All rights reserved.</p>
    </footer>
</body>
</html>"""

    return html


def main():
    parser = argparse.ArgumentParser(description="Generate landing page")
    parser.add_argument("--type", choices=["product-launch", "squeeze", "webinar", "digital-product", "service", "affiliate-review", "comparison", "thank-you"], default="product-launch", help="Page type")
    parser.add_argument("--headline", required=True, help="Main headline")
    parser.add_argument("--subheadline", help="Supporting subheadline")
    parser.add_argument("--product", help="Product/service name")
    parser.add_argument("--price", help="Price")
    parser.add_argument("--benefits", help="Comma-separated benefits")
    parser.add_argument("--features", help="Comma-separated features")
    parser.add_argument("--testimonials", type=int, default=3, help="Number of testimonials")
    parser.add_argument("--cta", default="Get Started Now", help="Call-to-action")
    parser.add_argument("--guarantee", help="Guarantee text")
    parser.add_argument("--urgency", help="Urgency message")
    parser.add_argument("--output", default="landing.html", help="Output file")

    args = parser.parse_args()

    # Parse benefits and features
    benefits = [b.strip() for b in args.benefits.split(",")] if args.benefits else []
    features = [f.strip() for f in args.features.split(",")] if args.features else []

    # Generate landing page
    html = generate_html_landing_page(
        args.type,
        args.headline,
        args.product,
        args.price,
        benefits,
        features,
        args.testimonials,
        args.cta,
        args.guarantee,
        args.urgency,
        args.subheadline
    )

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ Landing page generated: {args.output}")
    print(f"   Type: {args.type}")
    print(f"   Headline: {args.headline}")


if __name__ == "__main__":
    main()
