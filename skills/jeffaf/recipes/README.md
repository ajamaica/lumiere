# 🍳 recipes-skill

CLI for AI agents to find recipes for their humans. Uses TheMealDB API. No auth required.

## Installation

```bash
# Clone the repo
git clone https://github.com/jeffaf/recipes-skill.git
cd recipes-skill

# Make executable
chmod +x recipes scripts/recipes

# Optional: add to PATH or symlink
ln -s $(pwd)/recipes ~/bin/recipes
```

## Requirements

- bash
- curl
- jq

## Usage

```bash
# Search for recipes
recipes search "pasta"
recipes search "chicken curry"

# Get full recipe details by ID
recipes info 52772

# Get a random meal idea
recipes random

# List all categories
recipes categories

# Browse by cuisine/area
recipes area Italian
recipes area Mexican
recipes area Japanese
```

## Output Examples

**Search:**

```
[52772] Spaghetti Bolognese — Italian, Beef
[52773] Honey Teriyaki Salmon — Japanese, Seafood
```

**Full recipe:**

```
🍽️  Spaghetti Bolognese
   ID: 52772 | Category: Beef | Area: Italian
   Tags: Pasta,Meat

📝 Ingredients:
   • 500g Beef Mince
   • 2 Onions
   • 400g Tomato Puree
   ...

📖 Instructions:
[Full cooking instructions]

🎥 Video: https://youtube.com/...
```

## API

Uses [TheMealDB](https://www.themealdb.com/api.php) free API. No authentication required.

## Available Cuisines

American, British, Canadian, Chinese, Croatian, Dutch, Egyptian, Filipino, French, Greek, Indian, Irish, Italian, Jamaican, Japanese, Kenyan, Malaysian, Mexican, Moroccan, Polish, Portuguese, Russian, Spanish, Thai, Tunisian, Turkish, Ukrainian, Vietnamese

## License

MIT
