# QR Code Setup Instructions

## What I've Created

1. **makerworld-printer-instructions.md** - Complete documentation for the makerworld-printer skill
2. **makerworld-print-qr.png** - QR code (currently with placeholder URL)
3. **generate_qr.py** - Python script to regenerate the QR code

## To Complete the Setup

### Step 1: Upload to Google Drive

1. Go to [drive.google.com](https://drive.google.com)
2. Upload `makerworld-printer-instructions.md`
3. (Optional) Create a folder and organize related files

### Step 2: Get Shareable Link

1. Right-click the uploaded file/folder
2. Select "Share" or "Get link"
3. Set permissions to "Anyone with the link can view"
4. Copy the shareable URL
   - It will look like: `https://drive.google.com/file/d/[FILE_ID]/view`
   - Or: `https://drive.google.com/drive/folders/[FOLDER_ID]`

### Step 3: Update QR Code

Open `generate_qr.py` and replace the placeholder URL:

```python
# Change this line:
GOOGLE_DRIVE_URL = "https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE"

# To your actual link:
GOOGLE_DRIVE_URL = "https://drive.google.com/file/d/1AbCdEf1234567890/view"
```

### Step 4: Regenerate QR Code

```bash
python3 generate_qr.py
```

The QR code will be updated with your Google Drive link.

## Testing

After updating, scan the QR code with your phone to verify it opens the correct Google Drive content.

## Quick Reference

The QR code file `makerworld-print-qr.png` is ready to:

- Print and display near your 3D printer
- Share with others who use the makerworld-printer skill
- Include in documentation or tutorials
