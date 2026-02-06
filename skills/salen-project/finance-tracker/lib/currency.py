"""
Finance Tracker — Multi-Currency Support
Convert between currencies with live rates
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, Tuple


class CurrencyConverter:
    """Handle multi-currency conversions with cached rates."""
    
    # Fallback rates (approximate, updated periodically)
    FALLBACK_RATES = {
        "USD": 1.0,
        "UZS": 12850.0,
        "EUR": 0.92,
        "RUB": 97.0,
        "GBP": 0.79,
        "CNY": 7.25,
        "JPY": 149.0,
        "KRW": 1350.0,
        "TRY": 32.0,
        "KZT": 450.0,
    }
    
    # Common currency symbols
    SYMBOLS = {
        "USD": "$",
        "UZS": "сум",
        "EUR": "€",
        "RUB": "₽",
        "GBP": "£",
        "CNY": "¥",
        "JPY": "¥",
        "KRW": "₩",
        "TRY": "₺",
        "KZT": "₸",
    }
    
    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path.home() / ".finance-tracker"
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.rates_file = self.data_dir / "exchange_rates.json"
        self.cache_hours = 6  # Refresh rates every 6 hours
    
    def _load_cached_rates(self) -> Optional[Dict[str, Any]]:
        """Load rates from cache if still valid."""
        if not self.rates_file.exists():
            return None
        
        try:
            with open(self.rates_file) as f:
                data = json.load(f)
            
            # Check if cache is still valid
            cached_at = datetime.fromisoformat(data["cached_at"])
            if datetime.now() - cached_at < timedelta(hours=self.cache_hours):
                return data["rates"]
        except:
            pass
        
        return None
    
    def _save_rates(self, rates: Dict[str, float]):
        """Save rates to cache."""
        with open(self.rates_file, 'w') as f:
            json.dump({
                "rates": rates,
                "cached_at": datetime.now().isoformat(),
                "base": "USD"
            }, f, indent=2)
    
    def _fetch_rates(self) -> Dict[str, float]:
        """Fetch current exchange rates from API."""
        try:
            # Using exchangerate-api.com (free, no API key needed for basic use)
            url = "https://open.er-api.com/v6/latest/USD"
            
            req = urllib.request.Request(url, headers={"User-Agent": "FinanceTracker/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
            
            if data.get("result") == "success":
                return data["rates"]
        except Exception as e:
            pass
        
        # Try backup API
        try:
            url = "https://api.exchangerate.host/latest?base=USD"
            req = urllib.request.Request(url, headers={"User-Agent": "FinanceTracker/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
            
            if data.get("success"):
                return data["rates"]
        except:
            pass
        
        return None
    
    def get_rates(self) -> Dict[str, float]:
        """Get current exchange rates (cached or fresh)."""
        # Try cache first
        rates = self._load_cached_rates()
        if rates:
            return rates
        
        # Fetch fresh rates
        rates = self._fetch_rates()
        if rates:
            self._save_rates(rates)
            return rates
        
        # Use fallback
        return self.FALLBACK_RATES
    
    def convert(
        self,
        amount: float,
        from_currency: str,
        to_currency: str
    ) -> Tuple[float, float]:
        """
        Convert amount between currencies.
        Returns (converted_amount, exchange_rate).
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        if from_currency == to_currency:
            return (amount, 1.0)
        
        rates = self.get_rates()
        
        # Get rates (relative to USD)
        from_rate = rates.get(from_currency, self.FALLBACK_RATES.get(from_currency, 1.0))
        to_rate = rates.get(to_currency, self.FALLBACK_RATES.get(to_currency, 1.0))
        
        # Convert: from_currency -> USD -> to_currency
        usd_amount = amount / from_rate
        converted = usd_amount * to_rate
        
        # Calculate direct exchange rate
        exchange_rate = to_rate / from_rate
        
        return (converted, exchange_rate)
    
    def format_amount(self, amount: float, currency: str) -> str:
        """Format amount with currency symbol."""
        currency = currency.upper()
        symbol = self.SYMBOLS.get(currency, currency)
        
        if currency in ["JPY", "KRW", "UZS", "KZT", "RUB"]:
            # No decimals for these currencies
            return f"{int(amount):,} {symbol}"
        else:
            return f"{symbol}{amount:,.2f}"
    
    def parse_amount(self, amount_str: str, default_currency: str = "UZS") -> Tuple[int, str]:
        """
        Parse amount string that might include currency.
        Returns (amount_in_default_currency, original_currency).
        
        Examples:
            "50000" -> (50000, "UZS")
            "$50" -> (converted_to_uzs, "USD")
            "50 USD" -> (converted_to_uzs, "USD")
            "€100" -> (converted_to_uzs, "EUR")
        """
        amount_str = amount_str.strip()
        original_currency = default_currency
        
        # Check for currency symbols at start
        symbol_to_currency = {v: k for k, v in self.SYMBOLS.items()}
        symbol_to_currency["$"] = "USD"
        symbol_to_currency["€"] = "EUR"
        symbol_to_currency["£"] = "GBP"
        symbol_to_currency["¥"] = "JPY"
        symbol_to_currency["₽"] = "RUB"
        
        for symbol, curr in symbol_to_currency.items():
            if amount_str.startswith(symbol):
                amount_str = amount_str[len(symbol):].strip()
                original_currency = curr
                break
        
        # Check for currency code at end
        for code in self.FALLBACK_RATES.keys():
            if amount_str.upper().endswith(code):
                amount_str = amount_str[:-len(code)].strip()
                original_currency = code
                break
        
        # Parse the number
        amount_str = amount_str.replace(",", "").replace(" ", "")
        amount_str = amount_str.replace("k", "000").replace("K", "000")
        
        try:
            amount = float(amount_str)
        except ValueError:
            return (0, default_currency)
        
        # Convert to default currency if different
        if original_currency != default_currency:
            converted, _ = self.convert(amount, original_currency, default_currency)
            return (int(converted), original_currency)
        
        return (int(amount), original_currency)
    
    def get_rate_info(self, currency: str = "USD") -> str:
        """Get formatted rate information."""
        rates = self.get_rates()
        currency = currency.upper()
        
        if currency not in rates and currency not in self.FALLBACK_RATES:
            return f"❌ Unknown currency: {currency}"
        
        rate = rates.get(currency, self.FALLBACK_RATES.get(currency))
        
        # Get UZS rate
        uzs_rate = rates.get("UZS", self.FALLBACK_RATES["UZS"])
        
        if currency == "USD":
            return f"💱 1 USD = {uzs_rate:,.0f} UZS"
        elif currency == "UZS":
            usd_per_uzs = 1 / uzs_rate
            return f"💱 1,000,000 UZS = ${1000000 * usd_per_uzs:,.2f} USD"
        else:
            # Convert to UZS
            uzs_per_unit, _ = self.convert(1, currency, "UZS")
            usd_per_unit, _ = self.convert(1, currency, "USD")
            return f"💱 1 {currency} = {uzs_per_unit:,.0f} UZS (${usd_per_unit:.2f})"
    
    def get_rates_report(self) -> str:
        """Generate a report of common exchange rates."""
        rates = self.get_rates()
        uzs_rate = rates.get("UZS", self.FALLBACK_RATES["UZS"])
        
        lines = [
            "💱 Exchange Rates",
            "━━━━━━━━━━━━━━━━━━━━━",
            f"📅 Base: 1 USD = {uzs_rate:,.0f} UZS",
            ""
        ]
        
        # Common currencies
        common = ["EUR", "RUB", "GBP", "CNY", "TRY", "KZT"]
        
        for curr in common:
            if curr in rates or curr in self.FALLBACK_RATES:
                uzs_per_unit, _ = self.convert(1, curr, "UZS")
                symbol = self.SYMBOLS.get(curr, curr)
                lines.append(f"   {symbol} 1 {curr} = {uzs_per_unit:,.0f} UZS")
        
        # Check cache status
        if self.rates_file.exists():
            try:
                with open(self.rates_file) as f:
                    data = json.load(f)
                cached_at = datetime.fromisoformat(data["cached_at"])
                age = datetime.now() - cached_at
                lines.append("")
                lines.append(f"⏰ Updated: {age.seconds // 3600}h {(age.seconds % 3600) // 60}m ago")
            except:
                pass
        
        return "\n".join(lines)


# Global instance
_converter: Optional[CurrencyConverter] = None

def get_converter(data_dir: Optional[Path] = None) -> CurrencyConverter:
    global _converter
    if _converter is None:
        _converter = CurrencyConverter(data_dir)
    return _converter
