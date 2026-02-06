#!/usr/bin/env python3
"""Monitor Andreas' LinkedIn likes and return new ones since last check."""
import time, json, logging, os

from .browser import browser_session, is_logged_in

log = logging.getLogger("linkedin.like_monitor")

STATE_FILE = os.environ.get("LINKEDIN_LIKES_STATE", os.path.expanduser("~/.linkedin-likes-state.json"))


def _load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"seen_likes": []}


def _save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def scan_recent_likes(max_items=15):
    """Scan the user's recent reactions/likes activity page.
    
    Returns: {new_likes: [...], all_likes: [...]}
    Each like: {author, text, url, time}
    """
    with browser_session() as (ctx, page):
        if not is_logged_in(page):
            return {"success": False, "error": "Not logged in"}
        
        # Get profile slug
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        slug = page.evaluate("""() => {
            const links = document.querySelectorAll('a[href*="/in/"]');
            for (const l of links) {
                const h = l.getAttribute('href');
                if (h && h.includes('/in/') && !h.includes('miniProfile')) {
                    const m = h.match(/\\/in\\/([^/?]+)/);
                    return m ? m[1] : null;
                }
            }
            return null;
        }""")
        
        if not slug:
            return {"success": False, "error": "Could not find profile slug"}
        
        # Go to reactions activity page
        page.goto(f"https://www.linkedin.com/in/{slug}/recent-activity/reactions/",
                  wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)
        
        # Scroll a bit
        for _ in range(2):
            page.evaluate("window.scrollBy(0, 1500)")
            time.sleep(2)
        
        # Extract liked posts
        # The reactions page format is:
        # "Nummer des Feedbeitrags X"
        # "Andreas Kulpa gefällt das" / "Andreas Kulpa gefällt Xs Kommentar"
        # "Author Name"  (repeated twice — display name)
        # "   • 2." (connection degree)
        # "Job Title" (repeated)
        # "Time •"
        likes = page.evaluate(f"""() => {{
            const items = document.querySelectorAll('[data-view-name="feed-full-update"]');
            const results = [];
            const limit = {max_items};
            
            for (let i = 0; i < Math.min(items.length, limit); i++) {{
                const item = items[i];
                const text = item.innerText || '';
                const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
                
                let author = '';
                let postText = '';
                let postTime = '';
                let foundGefaellt = false;
                
                for (let j = 0; j < Math.min(lines.length, 20); j++) {{
                    const line = lines[j];
                    
                    // Skip metadata lines
                    if (line.startsWith('Nummer des')) continue;
                    if (line.includes('gefällt')) {{ foundGefaellt = true; continue; }}
                    if (!foundGefaellt) continue;
                    
                    // Skip UI elements
                    if (line === 'Folgen' || line.includes('Zur Website')) continue;
                    if (line.match(/^• \\d/) || line.match(/^(Premium|Verifiziert)/) || line.includes('Follower')) continue;
                    if (line.includes('Alle Mitglieder')) continue;
                    
                    // Time line
                    const timeMatch = line.match(/^(\\d+ (?:Tag|Std|Min|Woche|Monat|Sek).*?)(?:\\s*•|$)/);
                    if (timeMatch) {{ postTime = timeMatch[1].trim(); continue; }}
                    if (line.match(/^vor \\d+/)) continue; // "vor 2 Tagen" duplicate
                    if (line === 'Jetzt') {{ postTime = 'Jetzt'; continue; }}
                    
                    // Author: first name-like line (3-50 chars, not a title)
                    if (!author && line.length >= 3 && line.length < 50 && !line.includes('|') && !line.includes('@')) {{
                        author = line;
                        continue;
                    }}
                    // Skip duplicate author name
                    if (line === author) continue;
                    
                    // Post text: first substantial line after author
                    if (author && !postText && line.length > 30 && !line.includes('Head of') && !line.includes('CEO') && !line.includes('Founder')) {{
                        postText = line.substring(0, 300);
                        break;
                    }}
                }}
                
                if (author && author !== 'Andreas Kulpa') {{
                    const link = item.querySelector('a[href*="activity"]');
                    const url = link ? link.getAttribute('href') : '';
                    
                    results.push({{
                        author,
                        text: postText,
                        time: postTime,
                        url: url.startsWith('/') ? 'https://www.linkedin.com' + url : url
                    }});
                }}
            }}
            return results;
        }}""")
        
        # Compare with state to find NEW likes
        state = _load_state()
        seen = set(state.get("seen_likes", []))
        
        new_likes = []
        for like in likes:
            key = like["author"] + ":" + like["text"][:50]
            if key not in seen:
                new_likes.append(like)
                seen.add(key)
        
        # Update state
        # Keep only last 100 entries to prevent bloat
        state["seen_likes"] = list(seen)[-100:]
        state["last_check"] = int(time.time())
        _save_state(state)
        
        return {
            "success": True,
            "new_likes": new_likes,
            "total_scanned": len(likes),
            "new_count": len(new_likes),
        }
