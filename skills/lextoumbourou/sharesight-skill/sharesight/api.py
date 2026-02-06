"""Sharesight API endpoint methods."""

from typing import Any, Optional

from .client import SharesightClient


class SharesightAPI:
    """High-level API for Sharesight operations."""

    def __init__(self, client: Optional[SharesightClient] = None):
        self._client = client or SharesightClient()
        self._owns_client = client is None

    def close(self) -> None:
        """Close the API client if we own it."""
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "SharesightAPI":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    # -------------------------------------------------------------------------
    # Portfolios
    # -------------------------------------------------------------------------

    def list_portfolios(self, consolidated: bool = False) -> dict[str, Any]:
        """List all portfolios for the authenticated user.

        Args:
            consolidated: Set to True to see consolidated portfolio views.

        Returns:
            API response with portfolios list.
        """
        params = {}
        if consolidated:
            params["consolidated"] = "true"
        return self._client.get("/portfolios", params=params if params else None)

    def get_portfolio(self, portfolio_id: int, consolidated: bool = False) -> dict[str, Any]:
        """Get a specific portfolio by ID.

        Args:
            portfolio_id: The portfolio ID.
            consolidated: Set to True if the portfolio is consolidated.

        Returns:
            API response with portfolio details.
        """
        params = {}
        if consolidated:
            params["consolidated"] = "true"
        return self._client.get(f"/portfolios/{portfolio_id}", params=params if params else None)

    def list_portfolio_holdings(self, portfolio_id: int, consolidated: bool = False) -> dict[str, Any]:
        """List holdings for a specific portfolio.

        Args:
            portfolio_id: The portfolio ID.
            consolidated: True if a consolidated view is requested.

        Returns:
            API response with holdings list.
        """
        params = {}
        if consolidated:
            params["consolidated"] = "true"
        return self._client.get(f"/portfolios/{portfolio_id}/holdings", params=params if params else None)

    def get_portfolio_performance(
        self,
        portfolio_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        consolidated: bool = False,
        include_sales: bool = False,
        grouping: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get performance report for a portfolio.

        Args:
            portfolio_id: The portfolio ID.
            start_date: Start date in YYYY-MM-DD format.
            end_date: End date in YYYY-MM-DD format.
            consolidated: Set to True for consolidated portfolio views.
            include_sales: Pass True to include sales.
            grouping: Group by attribute (country, currency, market, etc.).

        Returns:
            API response with performance report.
        """
        params = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if consolidated:
            params["consolidated"] = "true"
        if include_sales:
            params["include_sales"] = "true"
        if grouping:
            params["grouping"] = grouping
        return self._client.get(f"/portfolios/{portfolio_id}/performance", params=params if params else None)

    def get_portfolio_performance_chart(
        self,
        portfolio_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        consolidated: bool = False,
        grouping: Optional[str] = None,
        benchmark_code: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get performance index chart data for a portfolio.

        Args:
            portfolio_id: The portfolio ID.
            start_date: Start date in YYYY-MM-DD format.
            end_date: End date in YYYY-MM-DD format.
            consolidated: True if a consolidated view is requested.
            grouping: Group by attribute (country, currency, market, etc.).
            benchmark_code: Benchmark code and market (e.g., SPY.NYSE).

        Returns:
            API response with chart data.
        """
        params = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if consolidated:
            params["consolidated"] = "true"
        if grouping:
            params["grouping"] = grouping
        if benchmark_code:
            params["benchmark_code"] = benchmark_code
        return self._client.get(
            f"/portfolios/{portfolio_id}/performance_index_chart", params=params if params else None
        )

    # -------------------------------------------------------------------------
    # Holdings
    # -------------------------------------------------------------------------

    def list_holdings(self) -> dict[str, Any]:
        """List all holdings across all portfolios.

        Returns:
            API response with holdings list.
        """
        return self._client.get("/holdings")

    def get_holding(
        self,
        holding_id: int,
        average_purchase_price: bool = False,
        cost_base: bool = False,
        values_over_time: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get a specific holding by ID.

        Args:
            holding_id: The holding ID.
            average_purchase_price: Include average purchase price.
            cost_base: Include cost base.
            values_over_time: 'true' for values from inception, or a date string.

        Returns:
            API response with holding details.
        """
        params = {}
        if average_purchase_price:
            params["average_purchase_price"] = "true"
        if cost_base:
            params["cost_base"] = "true"
        if values_over_time:
            params["values_over_time"] = values_over_time
        return self._client.get(f"/holdings/{holding_id}", params=params if params else None)

    def update_holding(
        self,
        holding_id: int,
        enable_drp: Optional[bool] = None,
        drp_mode_setting: Optional[str] = None,
    ) -> dict[str, Any]:
        """Update a holding's DRP settings.

        Args:
            holding_id: The holding ID.
            enable_drp: Set to True to enable DRP, False to disable.
            drp_mode_setting: DRP mode: 'up', 'down', 'half', 'down_track'.

        Returns:
            API response with updated holding.
        """
        data = {}
        if enable_drp is not None:
            data["enable_drp"] = enable_drp
        if drp_mode_setting:
            data["drp_mode_setting"] = drp_mode_setting
        return self._client.put(f"/holdings/{holding_id}", json_data=data if data else None)

    def delete_holding(self, holding_id: int) -> dict[str, Any]:
        """Delete a holding.

        Args:
            holding_id: The holding ID.

        Returns:
            API response confirming deletion.
        """
        return self._client.delete(f"/holdings/{holding_id}")

    # -------------------------------------------------------------------------
    # Custom Investments
    # -------------------------------------------------------------------------

    def list_custom_investments(self, portfolio_id: Optional[int] = None) -> dict[str, Any]:
        """List custom investments.

        Args:
            portfolio_id: Optional portfolio ID to filter by.

        Returns:
            API response with custom investments list.
        """
        params = {}
        if portfolio_id:
            params["portfolio_id"] = str(portfolio_id)
        return self._client.get("/custom_investments", params=params if params else None)

    def get_custom_investment(self, investment_id: int) -> dict[str, Any]:
        """Get a specific custom investment.

        Args:
            investment_id: The custom investment ID.

        Returns:
            API response with custom investment details.
        """
        return self._client.get(f"/custom_investments/{investment_id}")

    def create_custom_investment(
        self,
        code: str,
        name: str,
        country_code: str,
        investment_type: str,
        portfolio_id: Optional[int] = None,
        face_value: Optional[float] = None,
        interest_rate: Optional[float] = None,
        income_type: Optional[str] = None,
        payment_frequency: Optional[str] = None,
        first_payment_date: Optional[str] = None,
        maturity_date: Optional[str] = None,
        auto_calc_income: bool = False,
    ) -> dict[str, Any]:
        """Create a custom investment.

        Args:
            code: Investment code.
            name: Investment name.
            country_code: ISO country code (e.g., 'AU', 'NZ').
            investment_type: Type: ORDINARY, WARRANT, SHAREFUND, PROPFUND, PREFERENCE,
                           STAPLEDSEC, OPTIONS, RIGHTS, MANAGED_FUND, FIXED_INTEREST, PIE.
            portfolio_id: Optional portfolio ID to associate with.
            face_value: Face value per unit (FIXED_INTEREST only).
            interest_rate: Initial interest rate (FIXED_INTEREST only).
            income_type: 'DIVIDEND' or 'INTEREST' (FIXED_INTEREST only).
            payment_frequency: ON_MATURITY, YEARLY, TWICE_YEARLY, QUARTERLY, MONTHLY.
            first_payment_date: First payment date YYYY-MM-DD (FIXED_INTEREST only).
            maturity_date: Maturity date YYYY-MM-DD (FIXED_INTEREST only).
            auto_calc_income: Auto-calculate income payments (FIXED_INTEREST only).

        Returns:
            API response with created custom investment.
        """
        data: dict[str, Any] = {
            "code": code,
            "name": name,
            "country_code": country_code,
            "investment_type": investment_type,
        }
        if portfolio_id:
            data["portfolio_id"] = portfolio_id
        if face_value is not None:
            data["face_value"] = face_value
        if interest_rate is not None:
            data["interest_rate"] = interest_rate
        if income_type:
            data["income_type"] = income_type
        if payment_frequency:
            data["payment_frequency"] = payment_frequency
        if first_payment_date:
            data["first_payment_date"] = first_payment_date
        if maturity_date:
            data["maturity_date"] = maturity_date
        if auto_calc_income:
            data["auto_calc_income"] = auto_calc_income
        return self._client.post("/custom_investments", json_data=data)

    def update_custom_investment(
        self,
        investment_id: int,
        code: Optional[str] = None,
        name: Optional[str] = None,
        portfolio_id: Optional[int] = None,
        face_value: Optional[float] = None,
        interest_rate: Optional[float] = None,
        income_type: Optional[str] = None,
        payment_frequency: Optional[str] = None,
        first_payment_date: Optional[str] = None,
        maturity_date: Optional[str] = None,
        auto_calc_income: Optional[bool] = None,
    ) -> dict[str, Any]:
        """Update a custom investment.

        Args:
            investment_id: The custom investment ID.
            code: Investment code.
            name: Investment name.
            portfolio_id: Portfolio ID to associate with.
            face_value: Face value per unit (FIXED_INTEREST only).
            interest_rate: Interest rate (FIXED_INTEREST only).
            income_type: 'DIVIDEND' or 'INTEREST' (FIXED_INTEREST only).
            payment_frequency: ON_MATURITY, YEARLY, TWICE_YEARLY, QUARTERLY, MONTHLY.
            first_payment_date: First payment date YYYY-MM-DD.
            maturity_date: Maturity date YYYY-MM-DD.
            auto_calc_income: Auto-calculate income payments.

        Returns:
            API response with updated custom investment.
        """
        data: dict[str, Any] = {}
        if code:
            data["code"] = code
        if name:
            data["name"] = name
        if portfolio_id:
            data["portfolio_id"] = portfolio_id
        if face_value is not None:
            data["face_value"] = face_value
        if interest_rate is not None:
            data["interest_rate"] = interest_rate
        if income_type:
            data["income_type"] = income_type
        if payment_frequency:
            data["payment_frequency"] = payment_frequency
        if first_payment_date:
            data["first_payment_date"] = first_payment_date
        if maturity_date:
            data["maturity_date"] = maturity_date
        if auto_calc_income is not None:
            data["auto_calc_income"] = auto_calc_income
        return self._client.put(f"/custom_investments/{investment_id}", json_data=data if data else None)

    def delete_custom_investment(self, investment_id: int) -> dict[str, Any]:
        """Delete a custom investment.

        Args:
            investment_id: The custom investment ID.

        Returns:
            API response confirming deletion.
        """
        return self._client.delete(f"/custom_investments/{investment_id}")

    # -------------------------------------------------------------------------
    # Custom Investment Prices
    # -------------------------------------------------------------------------

    def list_prices(
        self,
        instrument_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> dict[str, Any]:
        """List prices for a custom investment.

        Args:
            instrument_id: The custom investment instrument ID.
            start_date: Start date YYYY-MM-DD.
            end_date: End date YYYY-MM-DD.
            page: Pagination cursor.
            per_page: Items per page (max 100).

        Returns:
            API response with prices list.
        """
        params: dict[str, Any] = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if page:
            params["page"] = page
        if per_page:
            params["per_page"] = str(per_page)
        return self._client.get(f"/custom_investment/{instrument_id}/prices.json", params=params if params else None)

    def create_price(
        self,
        instrument_id: int,
        price: float,
        date: str,
    ) -> dict[str, Any]:
        """Create a price entry for a custom investment.

        Args:
            instrument_id: The custom investment instrument ID.
            price: The price in instrument currency.
            date: Price date YYYY-MM-DD.

        Returns:
            API response with created price.
        """
        data = {
            "last_traded_price": price,
            "last_traded_on": date,
        }
        return self._client.post(f"/custom_investment/{instrument_id}/prices.json", json_data=data)

    def update_price(
        self,
        price_id: int,
        price: Optional[float] = None,
        date: Optional[str] = None,
    ) -> dict[str, Any]:
        """Update a price entry.

        Args:
            price_id: The price ID.
            price: The price in instrument currency.
            date: Price date YYYY-MM-DD.

        Returns:
            API response with updated price.
        """
        data: dict[str, Any] = {}
        if price is not None:
            data["last_traded_price"] = price
        if date:
            data["last_traded_on"] = date
        return self._client.put(f"/prices/{price_id}.json", json_data=data if data else None)

    def delete_price(self, price_id: int) -> dict[str, Any]:
        """Delete a price entry.

        Args:
            price_id: The price ID.

        Returns:
            API response confirming deletion.
        """
        return self._client.delete(f"/prices/{price_id}.json")

    # -------------------------------------------------------------------------
    # Coupon Rates
    # -------------------------------------------------------------------------

    def list_coupon_rates(
        self,
        instrument_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> dict[str, Any]:
        """List coupon rates for a fixed interest custom investment.

        Args:
            instrument_id: The custom investment instrument ID.
            start_date: Start date YYYY-MM-DD.
            end_date: End date YYYY-MM-DD.
            page: Pagination cursor.
            per_page: Items per page (max 100).

        Returns:
            API response with coupon rates list.
        """
        params: dict[str, Any] = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if page:
            params["page"] = page
        if per_page:
            params["per_page"] = str(per_page)
        return self._client.get(
            f"/custom_investments/{instrument_id}/coupon_rates", params=params if params else None
        )

    def create_coupon_rate(
        self,
        instrument_id: int,
        interest_rate: float,
        date: str,
    ) -> dict[str, Any]:
        """Create a coupon rate for a fixed interest custom investment.

        Args:
            instrument_id: The custom investment instrument ID.
            interest_rate: Interest rate as percentage.
            date: Date from which rate applies YYYY-MM-DD.

        Returns:
            API response with created coupon rate.
        """
        data = {
            "coupon_rate": {
                "interest_rate": interest_rate,
                "date": date,
            }
        }
        return self._client.post(f"/custom_investments/{instrument_id}/coupon_rates", json_data=data)

    def update_coupon_rate(
        self,
        coupon_rate_id: int,
        interest_rate: Optional[float] = None,
        date: Optional[str] = None,
    ) -> dict[str, Any]:
        """Update a coupon rate.

        Args:
            coupon_rate_id: The coupon rate ID.
            interest_rate: Interest rate as percentage.
            date: Date from which rate applies YYYY-MM-DD.

        Returns:
            API response with updated coupon rate.
        """
        coupon_rate: dict[str, Any] = {}
        if interest_rate is not None:
            coupon_rate["interest_rate"] = interest_rate
        if date:
            coupon_rate["date"] = date
        data = {"coupon_rate": coupon_rate} if coupon_rate else None
        return self._client.put(f"/coupon_rates/{coupon_rate_id}", json_data=data)

    def delete_coupon_rate(self, coupon_rate_id: int) -> dict[str, Any]:
        """Delete a coupon rate.

        Args:
            coupon_rate_id: The coupon rate ID.

        Returns:
            API response confirming deletion.
        """
        return self._client.delete(f"/coupon_rates/{coupon_rate_id}")

    # -------------------------------------------------------------------------
    # Trades
    # -------------------------------------------------------------------------

    def create_trade(
        self,
        portfolio_id: int,
        symbol: str,
        market: str,
        transaction_date: str,
        quantity: float,
        price: float,
        transaction_type: str = "BUY",
        exchange_rate: Optional[float] = None,
        brokerage: Optional[float] = None,
        brokerage_currency_code: Optional[str] = None,
        comments: Optional[str] = None,
        unique_identifier: Optional[str] = None,
        holding_id: Optional[int] = None,
    ) -> dict[str, Any]:
        """Create a trade in a portfolio (uses v2 API).

        Args:
            portfolio_id: The portfolio ID.
            symbol: Instrument symbol/code.
            market: Market code (e.g., 'NYSE', 'ASX').
            transaction_date: Trade date YYYY-MM-DD.
            quantity: Number of units.
            price: Price per unit in instrument currency.
            transaction_type: 'BUY', 'SELL', 'SPLIT', 'BONUS', etc.
            exchange_rate: Exchange rate if different from market rate.
            brokerage: Brokerage/commission amount.
            brokerage_currency_code: Currency for brokerage.
            comments: Optional comments.
            unique_identifier: Unique ID for idempotency.
            holding_id: Optional holding ID (alternative to symbol/market).

        Returns:
            API response with created trade.
        """
        data: dict[str, Any] = {
            "portfolio_id": portfolio_id,
            "transaction_date": transaction_date,
            "quantity": quantity,
            "price": price,
            "transaction_type": transaction_type,
        }
        if holding_id:
            data["holding_id"] = holding_id
        else:
            data["symbol"] = symbol
            data["market"] = market
        if exchange_rate is not None:
            data["exchange_rate"] = exchange_rate
        if brokerage is not None:
            data["brokerage"] = brokerage
        if brokerage_currency_code:
            data["brokerage_currency_code"] = brokerage_currency_code
        if comments:
            data["comments"] = comments
        if unique_identifier:
            data["unique_identifier"] = unique_identifier
        # Trades use v2 API
        return self._client.post_v2("/trades.json", json_data={"trade": data})

    def get_trade(self, trade_id: int) -> dict[str, Any]:
        """Get a specific trade.

        Args:
            trade_id: The trade ID.

        Returns:
            API response with trade details.
        """
        return self._client.get(f"/trades/{trade_id}.json")

    def update_trade(
        self,
        trade_id: int,
        trade_date: Optional[str] = None,
        quantity: Optional[float] = None,
        price: Optional[float] = None,
        exchange_rate: Optional[float] = None,
        brokerage: Optional[float] = None,
        comments: Optional[str] = None,
    ) -> dict[str, Any]:
        """Update a trade.

        Args:
            trade_id: The trade ID.
            trade_date: Trade date YYYY-MM-DD.
            quantity: Number of units.
            price: Price per unit.
            exchange_rate: Exchange rate.
            brokerage: Brokerage amount.
            comments: Comments.

        Returns:
            API response with updated trade.
        """
        data: dict[str, Any] = {}
        if trade_date:
            data["trade_date"] = trade_date
        if quantity is not None:
            data["quantity"] = quantity
        if price is not None:
            data["price"] = price
        if exchange_rate is not None:
            data["exchange_rate"] = exchange_rate
        if brokerage is not None:
            data["brokerage"] = brokerage
        if comments is not None:
            data["comments"] = comments
        return self._client.put(f"/trades/{trade_id}.json", json_data={"trade": data} if data else None)

    def delete_trade(self, trade_id: int) -> dict[str, Any]:
        """Delete a trade.

        Args:
            trade_id: The trade ID.

        Returns:
            API response confirming deletion.
        """
        return self._client.delete(f"/trades/{trade_id}.json")

    # -------------------------------------------------------------------------
    # Reference Data
    # -------------------------------------------------------------------------

    def list_countries(self, supported: Optional[bool] = None) -> dict[str, Any]:
        """Get list of country definitions.

        Args:
            supported: Filter by supported status if specified.

        Returns:
            API response with countries list.
        """
        params = {}
        if supported is not None:
            params["supported"] = "true" if supported else "false"
        return self._client.get("/countries", params=params if params else None)
