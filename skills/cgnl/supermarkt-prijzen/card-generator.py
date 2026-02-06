#!/usr/bin/env python3
"""
AH Bonuskaart generator + personal offers checker
Based on skaffa's research
"""
import random

def generate_ah_card():
    """Generate valid AH bonus card number"""
    # Known valid prefix ranges
    ranges = [
        (2621100, 2621140),
        (2622000, 2622030),
        (2622200, 2622270),
        (2623013, 2623036),
    ]
    
    # Pick random range
    start, end = random.choice(ranges)
    prefix = random.randint(start, end)
    
    # Generate 12-digit base (without checksum)
    base = f"{prefix:07d}"  # 7 digits from prefix
    
    # Add 5 random digits
    for _ in range(5):
        base += str(random.randint(0, 9))
    
    # Calculate EAN-13 checksum
    total = 0
    for i, digit in enumerate(base):
        weight = 1 if i % 2 == 0 else 3
        total += int(digit) * weight
    
    checksum = (10 - (total % 10)) % 10
    
    return base + str(checksum)

if __name__ == "__main__":
    card = generate_ah_card()
    print(card)
