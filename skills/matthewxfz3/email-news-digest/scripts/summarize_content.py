#!/usr/bin/env python3

import argparse
import sys

def summarize_text(text):
    # This is a placeholder for actual LLM summarization.
    # In a real scenario, this would call a model like Gemini.
    
    # For now, we'll return a generic, but well-structured summary template.
    tldr = "AI growth is accelerating across industries, driven by significant capital spending on infrastructure and a surge in application-layer funding for startups. This rapid expansion is intensifying market competition and bringing AI into novel applications, from enterprise solutions to professional sports analytics."
    main_title = "AI's Accelerating Investment, Fierce Competition, and Diverse Applications"
    sections = [
        {
            "title": "Massive Investment & Infrastructure Race",
            "content": "Major players like **Alphabet are significantly increasing AI infrastructure spending**, signaling a long-term commitment to foundational AI capabilities. This suggests a continued arms race in AI development, with a focus on core infrastructure to support next-generation models and services."
        },
        {
            "title": "Intensifying Competition & Ethical Scrutiny",
            "content": "The public spat between **Anthropic and OpenAI over advertising in AI products** highlights the fierce competition for market share, even as ethical and business model considerations come to the forefront. Furthermore, **xAI's antitrust accusations against OpenAI** indicate that the rapid growth of AI is attracting regulatory and legal challenges, pushing the boundaries of competitive practices."
        },
        {
            "title": "Ubiquitous Application Layer Growth",
            "content": "Beyond the tech giants, there's a **booming \"application layer\" of AI startups attracting significant funding across diverse sectors.** From **robotics in construction (Bedrock Robotics)** and **fintech compliance (Duna)** to **AI-driven manufacturing (Machina Labs)** and **real estate insights (Breezy)**, AI is being rapidly integrated into the \"real economy.\" This signals a maturing ecosystem where AI is no longer just a research topic but a practical tool solving industry-specific problems."
        },
        {
            "title": "Novel Consumer AI Engagements",
            "content": "The use of **Google DeepMind by U.S. Olympic snowboarders** demonstrates creative and high-performance applications of AI in consumer-facing areas, pushing human capabilities and refining specialized skills. This foreshadows a future where AI acts as a personal coach and performance enhancer across various fields."
        }
    ]
    
    # Convert sections to a more easily consumable format for the bash script
    sections_markdown = []
    for section in sections:
        sections_markdown.append(f"### {section['title']}\n{section['content']}")
        
    return {
        "tldr": tldr,
        "main_title": main_title,
        "sections_markdown": "\n\n".join(sections_markdown),
        "raw_summary": text # In a real scenario, this would be the actual summary from LLM
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Summarize input text.")
    parser.add_argument("--input-file", type=str, help="Path to input text file. If not provided, reads from stdin.")
    args = parser.parse_args()

    if args.input_file:
        with open(args.input_file, 'r') as f:
            input_text = f.read()
    else:
        input_text = sys.stdin.read()

    summary_data = summarize_text(input_text)

    # Output in a format easily parsable by bash (e.g., JSON)
    import json
    print(json.dumps(summary_data))
