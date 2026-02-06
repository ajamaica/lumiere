"""
Crypton eSIM Skill for OpenClaw
Purchase anonymous eSIMs with card, Bitcoin, or Monero.

API: https://crypton.sh/api/v1/guest/esim
No authentication required.
"""

import requests
import json
from typing import Optional, Dict, Any, List

# Configuration
API_BASE_URL = "https://crypton.sh/api/v1/guest/esim"
DEFAULT_PAYMENT_METHOD = "btc"  # btc, xmr, or stripe


class CryptonEsimSkill:
    """OpenClaw skill for purchasing eSIMs from Crypton."""
    
    def __init__(self, api_base_url: str = API_BASE_URL):
        self.api_base_url = api_base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    # =========================================================================
    # API Methods
    # =========================================================================
    
    def get_countries(self) -> Dict[str, Any]:
        """Get list of available countries with eSIM plans."""
        response = self.session.get(f"{self.api_base_url}/countries")
        return response.json()
    
    def get_plans(self, country_code: Optional[str] = None) -> Dict[str, Any]:
        """Get available eSIM plans, optionally filtered by country."""
        params = {}
        if country_code:
            params['country_code'] = country_code.upper()
        response = self.session.get(f"{self.api_base_url}/plans", params=params)
        return response.json()
    
    def create_checkout(
        self, 
        package_id: str, 
        payment_method: str = DEFAULT_PAYMENT_METHOD,
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a checkout for an eSIM purchase."""
        payload = {
            'package_id': package_id,
            'payment_method': payment_method
        }
        if email:
            payload['email'] = email
        
        response = self.session.post(
            f"{self.api_base_url}/checkout",
            json=payload
        )
        return response.json()
    
    def get_order_status(self, order_uuid: str) -> Dict[str, Any]:
        """Check the status of an order."""
        response = self.session.get(f"{self.api_base_url}/order/{order_uuid}")
        return response.json()
    
    def refresh_usage(self, esim_uuid: str) -> Dict[str, Any]:
        """Refresh usage data for an eSIM."""
        response = self.session.post(f"{self.api_base_url}/refresh/{esim_uuid}")
        return response.json()
    
    # =========================================================================
    # Message Handlers
    # =========================================================================
    
    def handle_message(self, message: str, user_id: str = None) -> str:
        """
        Main entry point for handling user messages.
        
        Examples:
            "esim" or "list countries" -> list_countries()
            "esim germany" or "plans for DE" -> list_plans("DE")
            "buy DE_1_7 with btc" -> create_purchase()
            "status abc-123-def" -> check_status()
        """
        message_lower = message.lower().strip()
        
        # List countries
        if message_lower in ['esim', 'esims', 'countries', 'list countries', 'list esim']:
            return self.format_countries_response()
        
        # Check order status
        if 'status' in message_lower:
            uuid = self._extract_uuid(message)
            if uuid:
                return self.format_status_response(uuid)
            return "Please provide an order UUID. Example: `status abc12345-1234-1234-1234-123456789abc`"
        
        # Buy/purchase command
        if any(word in message_lower for word in ['buy', 'purchase', 'order', 'checkout']):
            return self._handle_purchase(message)
        
        # Plans for specific country
        country_code = self._extract_country_code(message)
        if country_code:
            return self.format_plans_response(country_code)
        
        # Default: show help
        return self.format_help()
    
    def _handle_purchase(self, message: str) -> str:
        """Handle purchase requests."""
        # Extract package ID
        package_id = self._extract_package_id(message)
        if not package_id:
            return (
                "Please specify a package ID.\n\n"
                "Example: `buy DE_1_7 with btc`\n\n"
                "Use `/esim [country]` to see available packages."
            )
        
        # Extract payment method
        payment_method = DEFAULT_PAYMENT_METHOD
        if 'stripe' in message.lower() or 'card' in message.lower():
            payment_method = 'stripe'
        elif 'xmr' in message.lower() or 'monero' in message.lower():
            payment_method = 'xmr'
        elif 'btc' in message.lower() or 'bitcoin' in message.lower():
            payment_method = 'btc'
        
        return self.format_checkout_response(package_id, payment_method)
    
    # =========================================================================
    # Response Formatters
    # =========================================================================
    
    def format_help(self) -> str:
        """Format help message."""
        return """**Crypton eSIM** - Anonymous mobile data

**Commands:**
• `esim` - List available countries
• `esim [country]` - Show plans for a country
• `buy [package_id] with [btc/xmr/card]` - Purchase an eSIM
• `status [order_uuid]` - Check order status

**Payment Methods:**
• `btc` - Bitcoin
• `xmr` - Monero  
• `card` / `stripe` - Credit/Debit Card

**Example:**
```
esim germany
buy DE_1_7 with btc
status abc12345-...
```"""
    
    def format_countries_response(self) -> str:
        """Format countries list response."""
        data = self.get_countries()
        
        if not data.get('success'):
            return f"Error: {data.get('message', 'Failed to fetch countries')}"
        
        countries = data.get('countries', [])[:20]  # Top 20
        
        lines = ["**Available eSIM Destinations**\n"]
        for c in countries:
            lines.append(
                f"• **{c['country_name']}** (`{c['country_code']}`) - "
                f"from €{c['price_from_eur']:.2f} ({c['plans_available']} plans)"
            )
        
        lines.append(f"\n_Showing 20 of {data.get('count', 0)} countries_")
        lines.append("\nSay `esim [country]` to see plans.")
        
        return "\n".join(lines)
    
    def format_plans_response(self, country_code: str) -> str:
        """Format plans list response."""
        data = self.get_plans(country_code)
        
        if not data.get('success'):
            return f"Error: {data.get('message', 'Failed to fetch plans')}"
        
        plans = data.get('plans', [])
        if not plans:
            return f"No plans found for `{country_code.upper()}`"
        
        country_name = plans[0].get('country_name', country_code)
        
        lines = [f"**eSIM Plans for {country_name}**\n"]
        
        for plan in plans[:10]:  # Top 10 plans
            lines.append(
                f"• **{plan['data_amount_formatted']}** / {plan['validity_days']} days - "
                f"€{plan['price_eur']:.2f}\n"
                f"  `{plan['package_id']}`"
            )
        
        if len(plans) > 10:
            lines.append(f"\n_Showing 10 of {len(plans)} plans_")
        
        lines.append("\n**To purchase:**")
        lines.append(f"`buy {plans[0]['package_id']} with btc`")
        
        return "\n".join(lines)
    
    def format_checkout_response(self, package_id: str, payment_method: str) -> str:
        """Format checkout/purchase response."""
        data = self.create_checkout(package_id, payment_method)
        
        if not data.get('success'):
            error = data.get('error', 'unknown')
            message = data.get('message', 'Checkout failed')
            
            if error == 'plan_not_found':
                return f"Plan `{package_id}` not found. Use `esim [country]` to see available plans."
            elif error == 'out_of_stock':
                return f"Plan `{package_id}` is currently out of stock."
            elif error == 'rate_limited':
                return "Too many requests. Please wait a moment and try again."
            
            return f"Error: {message}"
        
        order = data.get('order', {})
        payment = data.get('payment', {})
        
        lines = [
            f"**Order Created**\n",
            f"**Plan:** {order.get('plan_name')}",
            f"**Data:** {order.get('data_amount')}",
            f"**Validity:** {order.get('validity_days')} days",
            f"**Price:** €{order.get('price_eur', 0):.2f}\n",
        ]
        
        if payment_method == 'stripe':
            lines.extend([
                "**Payment Method:** Card (Stripe)\n",
                f"**Payment Link:**\n{payment.get('payment_url')}\n",
                f"**Order ID:** `{data.get('session_uuid')}`",
            ])
        elif payment_method == 'btc':
            lines.extend([
                "**Payment Method:** Bitcoin\n",
                f"**Amount:** `{payment.get('amount_btc')} BTC`",
                f"**Address:**\n`{payment.get('address')}`\n",
                f"**Order ID:** `{data.get('order_uuid')}`",
                f"**Expires:** {payment.get('expires_at')}",
            ])
        elif payment_method == 'xmr':
            lines.extend([
                "**Payment Method:** Monero\n",
                f"**Amount:** `{payment.get('amount_xmr'):.12f} XMR`",
                f"**Address:**\n`{payment.get('address')}`\n",
                f"**Order ID:** `{data.get('order_uuid')}`",
                f"**Expires:** {payment.get('expires_at')}",
            ])
        
        lines.append(f"\nCheck status: `status {data.get('order_uuid') or data.get('session_uuid')}`")
        
        return "\n".join(lines)
    
    def format_status_response(self, order_uuid: str) -> str:
        """Format order status response."""
        data = self.get_order_status(order_uuid)
        
        if not data.get('success'):
            error = data.get('error', 'unknown')
            if error == 'not_found':
                return f"Order `{order_uuid}` not found."
            return f"Error: {data.get('message', 'Failed to fetch status')}"
        
        status = data.get('status', 'unknown')
        order_type = data.get('type', 'unknown')
        
        # Payment still pending
        if status in ['new', 'pending', 'awaiting_payment']:
            payment = data.get('payment', {})
            lines = [
                f"**Order Status:** ⏳ Awaiting Payment\n",
                f"**Order ID:** `{order_uuid}`",
            ]
            
            if payment.get('address'):
                lines.extend([
                    f"\n**Send payment to:**",
                    f"`{payment.get('address')}`",
                    f"**Amount:** `{payment.get('amount_btc') or payment.get('amount_xmr')}`",
                ])
            
            if payment.get('expires_at'):
                lines.append(f"**Expires:** {payment.get('expires_at')}")
            
            return "\n".join(lines)
        
        # Payment expired
        if status == 'expired':
            return f"**Order Status:** ❌ Expired\n\nOrder `{order_uuid}` has expired. Please create a new order."
        
        # eSIM ready
        if order_type == 'esim_order' and 'esim' in data:
            esim = data.get('esim', {})
            order_info = data.get('order', {})
            
            lines = [
                f"**Order Status:** ✅ Complete\n",
                f"**Plan:** {order_info.get('plan_name')}",
                f"**Data:** {order_info.get('data_remaining_mb', 0)} MB remaining",
                f"**Status:** {status.title()}\n",
                f"**ICCID:** `{esim.get('iccid')}`\n",
                f"**Activation Code:**",
                f"```\n{esim.get('activation_code')}\n```",
                "\nScan the QR code or enter the activation code in your phone's eSIM settings.",
            ]
            
            return "\n".join(lines)
        
        # Generic status
        return f"**Order Status:** {status.title()}\n\n{data.get('message', '')}"
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    def _extract_country_code(self, message: str) -> Optional[str]:
        """Extract country code or name from message."""
        # Common country mappings
        country_map = {
            'germany': 'DE', 'deutschland': 'DE',
            'france': 'FR', 'francia': 'FR',
            'spain': 'ES', 'espana': 'ES', 'españa': 'ES',
            'italy': 'IT', 'italia': 'IT',
            'uk': 'GB', 'united kingdom': 'GB', 'britain': 'GB', 'england': 'GB',
            'usa': 'US', 'united states': 'US', 'america': 'US',
            'canada': 'CA',
            'australia': 'AU',
            'japan': 'JP',
            'korea': 'KR', 'south korea': 'KR',
            'china': 'CN',
            'thailand': 'TH',
            'singapore': 'SG',
            'poland': 'PL', 'polska': 'PL',
            'netherlands': 'NL', 'holland': 'NL',
            'switzerland': 'CH', 'schweiz': 'CH',
            'austria': 'AT', 'österreich': 'AT',
            'portugal': 'PT',
            'greece': 'GR',
            'turkey': 'TR', 'türkiye': 'TR',
            'mexico': 'MX',
            'brazil': 'BR', 'brasil': 'BR',
        }
        
        message_lower = message.lower()
        
        # Check for country names
        for name, code in country_map.items():
            if name in message_lower:
                return code
        
        # Check for 2-letter country codes
        import re
        codes = re.findall(r'\b([A-Z]{2})\b', message.upper())
        if codes:
            return codes[0]
        
        return None
    
    def _extract_package_id(self, message: str) -> Optional[str]:
        """Extract package ID from message."""
        import re
        # Package IDs look like: DE_1_7, US_5_30, EU-30_1_Daily, etc.
        matches = re.findall(r'[A-Z]{2,}[-_][0-9]+[-_][0-9A-Za-z_]+', message.upper())
        if matches:
            return matches[0]
        
        # Also try lowercase
        matches = re.findall(r'[a-zA-Z]{2,}[-_][0-9]+[-_][0-9a-zA-Z_]+', message)
        if matches:
            return matches[0]
        
        return None
    
    def _extract_uuid(self, message: str) -> Optional[str]:
        """Extract UUID from message."""
        import re
        # UUID pattern
        matches = re.findall(
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            message.lower()
        )
        return matches[0] if matches else None


# =============================================================================
# OpenClaw Integration
# =============================================================================

# Singleton instance
_skill = None

def get_skill() -> CryptonEsimSkill:
    """Get or create the skill instance."""
    global _skill
    if _skill is None:
        _skill = CryptonEsimSkill()
    return _skill


def handle(message: str, user_id: str = None, **kwargs) -> str:
    """
    OpenClaw entry point.
    
    Args:
        message: The user's message
        user_id: Optional user identifier
        **kwargs: Additional context from OpenClaw
    
    Returns:
        Response message string
    """
    skill = get_skill()
    return skill.handle_message(message, user_id)


# =============================================================================
# CLI for Testing
# =============================================================================

if __name__ == "__main__":
    import sys
    
    skill = CryptonEsimSkill()
    
    if len(sys.argv) > 1:
        message = " ".join(sys.argv[1:])
        print(skill.handle_message(message))
    else:
        # Interactive mode
        print("Crypton eSIM Skill - Interactive Mode")
        print("Type 'quit' to exit\n")
        print(skill.format_help())
        print()
        
        while True:
            try:
                user_input = input("> ").strip()
                if user_input.lower() in ['quit', 'exit', 'q']:
                    break
                if user_input:
                    print()
                    print(skill.handle_message(user_input))
                    print()
            except (EOFError, KeyboardInterrupt):
                break
