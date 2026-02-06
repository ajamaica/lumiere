#!/usr/bin/env python3
import os
import sys
import json
import argparse
import requests

# Base Configuration
BASE_URL = "https://echodecks.com/api/apps/68bc0769be6e58e1c8385b2b/functions/externalApi"

def get_api_key():
    api_key = os.environ.get("ECHODECKS_API_KEY")
    if not api_key:
        print(json.dumps({"error": "Missing ECHODECKS_API_KEY environment variable."}))
        sys.exit(1)
    return api_key

def make_request(method, resource, action=None, params=None, data=None):
    headers = {
        "X-API-KEY": get_api_key(),
        "Content-Type": "application/json"
    }
    
    url = f"{BASE_URL}?resource={resource}"
    if action:
        url += f"&action={action}"
    
    if params:
        for key, value in params.items():
            if value is not None:
                url += f"&{key}={value}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            return {"error": f"Unsupported method: {method}"}
            
        response.raise_for_status()
        
        try:
            return response.json()
        except json.JSONDecodeError:
            return {"status": "success", "message": response.text}
            
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if hasattr(e.response, 'text') and e.response.text:
             try:
                 api_err = json.loads(e.response.text)
                 error_msg = api_err.get('message', error_msg)
             except:
                 error_msg = e.response.text
        return {"error": error_msg}

# --- Command Handlers ---

def handle_list_decks(args):
    return make_request("GET", "decks", params={"id": args.id})

def handle_create_deck(args):
    return make_request("POST", "decks", data={"name": args.title, "description": args.description})

def handle_list_cards(args):
    return make_request("GET", "cards", params={"deck_id": args.deck_id, "id": args.card_id})

def handle_submit_review(args):
    return make_request("POST", "study", action="submit", data={
        "card_id": args.card_id,
        "quality": args.quality
    })

def handle_generate_cards(args):
    data = {"deck_id": args.deck_id}
    if args.topic:
        data["topic"] = args.topic
    if args.text:
        data["text"] = args.text
    return make_request("POST", "generate", action="cards", data=data)

def handle_generate_podcast(args):
    return make_request("POST", "podcasts", action="generate", data={
        "deck_id": args.deck_id,
        "style": args.style
    })

def handle_get_podcast_status(args):
    return make_request("GET", "podcasts", action="status", params={"id": args.id})

def handle_get_study_link(args):
    return make_request("GET", "study", action="link", params={"deck_id": args.deck_id})

def handle_get_user(args):
    return make_request("GET", "user")

# --- Main CLI ---

def main():
    parser = argparse.ArgumentParser(description="EchoDecks API Client")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # User
    subparsers.add_parser("get-user", help="Get user info")

    # Decks
    p_decks = subparsers.add_parser("list-decks", help="List decks")
    p_decks.add_argument("--id", help="Deck ID")
    
    p_create_deck = subparsers.add_parser("create-deck", help="Create a deck")
    p_create_deck.add_argument("--title", required=True)
    p_create_deck.add_argument("--description")

    # Cards
    p_cards = subparsers.add_parser("list-cards", help="List cards")
    p_cards.add_argument("--deck-id", required=True)
    p_cards.add_argument("--card-id", help="Card ID")

    # Study
    p_link = subparsers.add_parser("get-study-link", help="Get web study link")
    p_link.add_argument("--deck-id", required=True)

    p_review = subparsers.add_parser("submit-review", help="Submit review")
    p_review.add_argument("--card-id", required=True)
    p_review.add_argument("--quality", type=int, required=True, choices=[0, 1, 2, 3])

    # Generate
    p_gen_cards = subparsers.add_parser("generate-cards", help="AI generate cards")
    p_gen_cards.add_argument("--topic")
    p_gen_cards.add_argument("--text")
    p_gen_cards.add_argument("--deck-id", required=True)

    p_gen_pod = subparsers.add_parser("generate-podcast", help="AI generate podcast")
    p_gen_pod.add_argument("--deck-id", required=True)
    p_gen_pod.add_argument("--style", default="summary")

    p_pod_status = subparsers.add_parser("podcast-status", help="Check podcast status")
    p_pod_status.add_argument("--id", required=True)

    args = parser.parse_active_recall = parser.parse_args()

    commands = {
        "get-user": handle_get_user,
        "list-decks": handle_list_decks,
        "create-deck": handle_create_deck,
        "list-cards": handle_list_cards,
        "get-study-link": handle_get_study_link,
        "submit-review": handle_submit_review,
        "generate-cards": handle_generate_cards,
        "generate-podcast": handle_generate_podcast,
        "podcast-status": handle_get_podcast_status
    }

    if args.command in commands:
        result = commands[args.command](args)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
