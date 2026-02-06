#!/usr/bin/env python3
"""
Generate QR code for Makerworld Printer Skill instructions.
Note: Upload makerworld-printer-instructions.md to Google Drive first,
then update the URL below with your share link.
"""

import qrcode

# Placeholder URL - update this after uploading to Google Drive
GOOGLE_DRIVE_URL = "https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE"

# QR code settings
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)

qr.add_data(GOOGLE_DRIVE_URL)
qr.make(fit=True)

# Create QR code image
img = qr.make_image(fill_color="black", back_color="white")

# Save as PNG
img.save("makerworld-print-qr.png")
print("QR code saved as makerworld-print-qr.png")
print(f"Encoded URL: {GOOGLE_DRIVE_URL}")
print("\nTo update with actual Google Drive link:")
print("1. Upload makerworld-printer-instructions.md to Google Drive")
print("2. Get the shareable link")
print("3. Replace GOOGLE_DRIVE_URL in this script")
print("4. Run this script again")
