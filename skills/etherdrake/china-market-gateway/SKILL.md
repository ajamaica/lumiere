# China Market Gateway Skill

**Name:** `china-market-gateway`  
**Description:** Umbrella skill for retrieving Chinese finance data (A-shares, HK, funds, economic data) using Python. Pull stock prices, fund data, market news, and macro indicators from Eastmoney, Sina, CLS, Baidu, and other Chinese sources. Use when researching Chinese equities, mainland stock prices, HK market data, fund performance, or China-related financial news and economic indicators.  
**License:** MIT  
**Compatibility:** Requires Python 3.8+, network access to Chinese financial websites. May require proxy for regions with restricted access.

**Metadata:**

- **Author:** Etherdrake
- **Version:** 1.0.2
- **Supported Markets:**
  - A-shares
  - HK
  - Shanghai
  - Shenzhen
  - Fund
  - Macro

# YuanData - Chinese Finance Data Retrieval (Python)

## When to Use This Skill

Use this skill when you need to:

- Get real-time or historical stock prices for Chinese A-shares (Shanghai/Shenzhen)
- Retrieve Hong Kong (HK) stock data
- Search for Chinese company financial news
- Research mainland China market information
- Access Baidu Gushitong for stock analysis
- Pull fund data and net asset values
- Fetch macroeconomic indicators (GDP, CPI, PPI, PMI)
- Track investment calendars and economic events

## Supported Sources

| Source          | URL Pattern                                                          | Coverage               |
| --------------- | -------------------------------------------------------------------- | ---------------------- |
| Eastmoney       | `https://quote.eastmoney.com/{stockCode}.html`                       | A-shares, HK, indices  |
| Sina Finance    | `https://finance.sina.com.cn/realstock/company/{stockCode}/nc.shtml` | A-shares, HK, US       |
| CLS (财联社)    | `https://www.cls.cn/searchPage`                                      | Market news, telegraph |
| Baidu Gushitong | `https://gushitong.baidu.com/stock/ab-{stockCode}`                   | Stock analysis, quotes |
| Eastmoney Funds | `https://fund.eastmoney.com/{fundCode}.html`                         | Fund data              |
| Eastmoney Macro | `https://datacenter-web.eastmoney.com/api/data/v1/get`               | GDP, CPI, PPI, PMI     |

## Stock Code Formats

Chinese stocks use specific prefixes:

- **A-shares (Shanghai):** `sh000001` (SSE), `sh600000` (SSE)
- **A-shares (Shenzhen):** `sz000001` (SZSE), `sz300000` (ChiNext)
- **HK stocks:** `hk00001` (HKEX), `hk00700` (Tencent)
- **US ADRs (for reference):** `usAAPL`

### Examples

| Stock Code | Company                  | Type    |
| ---------- | ------------------------ | ------- |
| `sh000001` | Shanghai Composite Index | Index   |
| `sh600519` | Kweichow Moutai          | A-share |
| `sz000001` | Ping An Bank             | A-share |
| `hk00700`  | Tencent                  | HK      |
| `hk09660`  | Horizon Robotics         | HK      |

---

# Part 1: Stock Data Retrieval (Python)

## 1. Setup and Dependencies

```python
import requests
from bs4 import BeautifulSoup
import json
import re
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YuanData:
    """Chinese Finance Data Retrieval Class"""

    def __init__(self, proxy: Optional[str] = None):
        self.session = requests.Session()
        self.proxy = proxy
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html,application/xhtml+xml',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
        if proxy:
            self.session.proxies = {'http': proxy, 'https': proxy}

    def _request(self, url: str, headers: Optional[Dict] = None,
                 timeout: int = 30) -> Optional[Any]:
        """Generic HTTP request handler"""
        try:
            req_headers = {**self.headers, **(headers or {})}
            response = self.session.get(url, headers=req_headers, timeout=timeout)
            response.raise_for_status()
            return response
        except Exception as e:
            logger.error(f"Request failed: {url} - {e}")
            return None
```

## 2. Sina Finance API (Real-Time Stock Data)

```python
class SinaStockAPI:
    """Sina Finance Real-Time Stock Data"""

    BASE_URL = "http://hq.sinajs.cn"

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def get_stock_quote(self, stock_code: str) -> Optional[Dict]:
        """
        Get real-time stock quote from Sina

        Args:
            stock_code: Stock code (e.g., 'sh600519', 'hk00700')

        Returns:
            Dict with price, volume, change data
        """
        # Handle HK stock format (add leading zero)
        if stock_code.startswith('hk') and len(stock_code) == 6:
            stock_code = 'hk0' + stock_code[2:]

        timestamp = int(time.time() * 1000)
        url = f"{self.BASE_URL}/rn={timestamp}&list={stock_code}"

        headers = {
            'Host': 'hq.sinajs.cn',
            'Referer': 'https://finance.sina.com.cn/',
        }

        response = self.parent._request(url, headers=headers)
        if not response:
            return None

        # Parse response: var hq_str_sh600519="name,open,high,low,close,...";
        content = response.text
        match = re.search(r'hq_str_' + re.escape(stock_code) + r'="([^"]+)";', content)

        if not match or not match.group(1).strip():
            logger.warning(f"No data for {stock_code}")
            return None

        data = match.group(1).split(',')
        return self._parse_stock_data(stock_code, data)

    def _parse_stock_data(self, code: str, data: List[str]) -> Dict:
        """Parse Sina stock data response"""
        if code.startswith('sh') or code.startswith('sz'):
            return {
                'code': code,
                'name': data[0],
                'open': float(data[1]),
                'pre_close': float(data[2]),
                'close': float(data[3]),
                'high': float(data[4]),
                'low': float(data[5]),
                'buy_price': float(data[6]),
                'sell_price': float(data[7]),
                'volume': int(data[8]),
                'amount': float(data[9]),
                'buy_volume': [
                    int(data[10]), int(data[12]), int(data[14]),
                    int(data[16]), int(data[18])
                ],
                'buy_price': [
                    float(data[11]), float(data[13]), float(data[15]),
                    float(data[17]), float(data[19])
                ],
                'sell_volume': [
                    int(data[20]), int(data[22]), int(data[24]),
                    int(data[26]), int(data[28])
                ],
                'sell_price': [
                    float(data[21]), float(data[23]), float(data[25]),
                    float(data[27]), float(data[29])
                ],
                'date': data[30],
                'time': data[31],
            }
        else:  # HK stock
            return {
                'code': code,
                'name': data[1],
                'open': float(data[5]),
                'pre_close': float(data[4]),
                'close': float(data[3]),
                'high': float(data[33] or data[32]),
                'low': float(data[34] or data[33]),
                'volume': float(data[12].split('.')[0]) if '.' in data[12] else float(data[12]),
                'amount': float(data[13]) if len(data) > 13 else 0,
                'date': data[17].replace('/', '-'),
                'time': data[18].replace(';', ''),
            }

    def get_multiple_quotes(self, stock_codes: List[str]) -> List[Dict]:
        """Get quotes for multiple stocks (with rate limiting)"""
        results = []
        for code in stock_codes:
            quote = self.get_stock_quote(code)
            if quote:
                results.append(quote)
            time.sleep(0.1)  # Prevent rate limiting
        return results
```

## 3. Tencent Finance API (Alternative Source)

```python
class TencentStockAPI:
    """Tencent Finance Real-Time Stock Data"""

    BASE_URL = "http://qt.gtimg.cn"

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def get_stock_quote(self, stock_code: str) -> Optional[Dict]:
        """
        Get real-time quote from Tencent

        Args:
            stock_code: e.g., 'sh600519', 'hk00700'

        Returns:
            Dict with price and metrics
        """
        if stock_code.startswith('hk'):
            for code_variant in [f"r_{stock_code}", stock_code]:
                raw_data = self._fetch_tencent(code_variant)
                if raw_data:
                    return self._parse_tencent_data(stock_code, raw_data)
        else:
            raw_data = self._fetch_tencent(stock_code)
            if raw_data:
                return self._parse_tencent_data(stock_code, raw_data)
        return None

    def _fetch_tencent(self, code: str) -> Optional[str]:
        """Fetch raw data from Tencent API"""
        url = f"{self.BASE_URL}/?q={code}"
        headers = {
            'Host': 'qt.gtimg.cn',
            'Referer': 'https://gu.qq.com/',
        }
        response = self.parent._request(url, headers=headers)
        return response.text.strip() if response else None

    def _parse_tencent_data(self, code: str, raw_data: str) -> Dict:
        """Parse Tencent response (~ delimited)"""
        parts = raw_data.split('~')
        if len(parts) < 35:
            raise ValueError(f"Insufficient data for {code}")

        return {
            'code': code,
            'name': parts[1],
            'close': float(parts[3]),
            'pre_close': float(parts[4]),
            'open': float(parts[5]),
            'volume': float(parts[6]),
            'amount': float(parts[7]),
            'high': float(parts[32] or parts[33]),
            'low': float(parts[33] or parts[34]),
            'change_percent': float(parts[31]),
            'change_amount': float(parts[30]),
            'turnover_rate': float(parts[38]) if len(parts) > 38 else 0,
            'market_cap': float(parts[44]) if len(parts) > 44 else 0,
            'pe_ratio': float(parts[39]) if len(parts) > 39 else 0,
        }
```

## 4. Eastmoney Web Scraping

```python
class EastmoneyAPI:
    """Eastmoney Web Scraping for Quotes"""

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def get_quote_page(self, stock_code: str) -> Optional[str]:
        """Fetch HTML page from Eastmoney"""
        url = f"https://quote.eastmoney.com/{stock_code}.html"
        response = self.parent._request(url)
        return response.text if response else None

    def parse_quote(self, html: str) -> Optional[Dict]:
        """Parse quote from Eastmoney HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        try:
            data = {
                'price': float(soup.find('span', class_='price').text) if soup.find('span', class_='price') else 0,
                'change': soup.find('span', class_='change').text if soup.find('span', class_='change') else "0.00%",
                'timestamp': datetime.now().isoformat()
            }
            # Extract stats
            for stat in soup.find_all('td', class_='stat'):
                label = stat.find('span')
                value = stat.find('b')
                if label and value:
                    data[label.text.strip()] = value.text.strip()
            return data
        except Exception as e:
            logger.error(f"HTML parsing failed: {e}")
            return None
```

## 5. CLS News API

```python
class CLSNewsAPI:
    """CLS (财联社) News and Telegraph API"""

    BASE_URL = "https://www.cls.cn"

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def search_news(self, keyword: str, search_type: str = "telegraph", limit: int = 20) -> List[Dict]:
        """Search news on CLS by keyword"""
        response = self.parent._request(
            f"{self.BASE_URL}/searchPage",
            params={'keyword': keyword, 'type': search_type}
        )
        if not response: return []

        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            for item in soup.select('.search-telegraph-list, .subject-interest-list')[:limit]:
                results.append({
                    'title': item.get_text(strip=True)[:100],
                    'source': 'CLS',
                    'timestamp': datetime.now().isoformat()
                })
            return results
        except Exception as e:
            logger.error(f"News parsing failed: {e}")
            return []

    def get_telegraph_list(self, limit: int = 50) -> List[Dict]:
        """Get latest market updates (telegraphs)"""
        params = {'page': 1, 'page_size': limit}
        response = self.parent._request(f"{self.BASE_URL}/nodeapi/telegraphList", params=params)
        if not response: return []

        try:
            data = response.json()
            return data.get("data", {}).get("roll_data", []) if data.get("error") == 0 else []
        except Exception as e:
            logger.error(f"Telegraph fetch failed: {e}")
            return []
```

## 6. Baidu Gushitong API

```python
class BaiduGushitongAPI:
    """Baidu Gushitong Stock Analysis"""

    BASE_URL = "https://gushitong.baidu.com"

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def get_stock_page(self, stock_code: str) -> Optional[str]:
        """Retrieve stock analysis page from Baidu"""
        url = f"{self.BASE_URL}/stock/ab-{stock_code}"
        response = self.parent._request(url)
        return response.text if response else None

    def check_stock_exists(self, stock_code: str) -> bool:
        """Determine if Baidu Gushitong supports the stock"""
        url = f"{self.BASE_URL}/stock/ab-{stock_code}"
        response = self.parent._request(url)
        return response is not None and response.status_code == 200
```

---

# Part 2: Fund Data Retrieval (Python)

## 7. Eastmoney Fund API

```python
class EastmoneyFundAPI:
    """Eastmoney Fund Data Retrieval"""

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def get_fund_quote(self, fund_code: str) -> Optional[Dict]:
        """Get latest fund NAV and estimate"""
        url = f"https://fundgz.1234567.com.cn/js/{fund_code}.js"
        headers = {'Referer': 'https://fund.eastmoney.com/'}
        response = self.parent._request(url, headers=headers)
        if not response or 'jsonpgz' not in response.text: return None

        try:
            json_str = response.text.replace('jsonpgz(', '').rstrip(');')
            data = json.loads(json_str)
            return {
                'code': data.get('fundcode'),
                'name': data.get('name'),
                'nav': float(data.get('dwjz', 0)),
                'nav_date': data.get('jzrq'),
                'estimated_nav': float(data.get('gsz', 0)),
                'estimated_nav_time': data.get('gztime'),
                'growth_rate': float(data.get('zzf', 0)),
            }
        except Exception as e:
            logger.error(f"Fund data parse failed: {e}")
            return None

    def get_fund_details(self, fund_code: str) -> Optional[Dict]:
        """Get detailed fund info via HTML scraping"""
        url = f"https://fund.eastmoney.com/{fund_code}.html"
        response = self.parent._request(url)
        if not response: return None

        soup = BeautifulSoup(response.text, 'html.parser')
        try:
            details = {'code': fund_code}
            title_elem = soup.find('div', class_='fundDetail-tit')
            if title_elem:
                details['name'] = title_elem.text.strip()

            info_table = soup.find('table', class_='infoOfFund')
            if info_table:
                for row in info_table.find_all('tr'):
                    cells = row.find_all('td')
                    text = [c.text.strip() for c in cells]
                    if '基金类型' in text:
                        idx = text.index('基金类型'); details['fund_type'] = text[idx + 1]
                    elif '成立日期' in text:
                        idx = text.index('成立日期'); details['establishment_date'] = text[idx + 1]
                    elif '基金经理' in text:
                        idx = text.index('基金经理'); details['manager'] = text[idx + 1]
            return details
        except Exception as e:
            logger.error(f"Fund details parse failed: {e}")
            return None
```

---

# Part 3: Economic Data Retrieval (Python)

## 8. Eastmoney Economic Data API

```python
class EastmoneyMacroAPI:
    """Eastmoney Macroeconomic Data API"""

    BASE_URL = "https://datacenter-web.eastmoney.com/api/data/v1/get"

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def _fetch_macro_data(self, params: Dict) -> List[Dict]:
        """Fetch and parse JSONP macro data"""
        headers = {
            'Host': 'datacenter-web.eastmoney.com',
            'Origin': 'https://datacenter.eastmoney.com',
            'Referer': 'https://data.eastmoney.com/cjsj/'
        }
        response = self.parent._request(self.BASE_URL, headers=headers, params=params)
        if not response: return []

        try:
            text = response.text
            if text.startswith('data('):
                json_str = re.sub(r'^data\(|\);$', '', text)
                data = json.loads(json_str)
                return data.get('data', {}).get('result', {}).get('data', [])
            return []
        except Exception as e:
            logger.error(f"Macro data parse failed: {e}")
            return []

    def get_gdp_data(self, page_size: int = 20) -> List[Dict]:
        """Get GDP data"""
        params = {
            'callback': 'data',
            'columns': 'REPORT_DATE,TIME,DOMESTICL_PRODUCT_BASE,FIRST_PRODUCT_BASE,SECOND_PRODUCT_BASE,THIRD_PRODUCT_BASE,SUM_SAME,FIRST_SAME,SECOND_SAME,THIRD_SAME',
            'pageNumber': 1,
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
            'source': 'WEB',
            'client': 'WEB',
            'reportName': 'RPT_ECONOMY_GDP',
        }
        return self._fetch_macro_data(params)

    def get_cpi_data(self, page_size: int = 20) -> List[Dict]:
        """Get CPI data"""
        params = {
            'callback': 'data',
            'columns': 'REPORT_DATE,TIME,NATIONAL_SAME,NATIONAL_BASE,NATIONAL_SEQUENTIAL,NATIONAL_ACCUMULATE,CITY_SAME,CITY_BASE,CITY_SEQUENTIAL,CITY_ACCUMULATE,RURAL_SAME,RURAL_BASE,RURAL_SEQUENTIAL,RURAL_ACCUMULATE',
            'pageNumber': 1,
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
            'source': 'WEB',
            'client': 'WEB',
            'reportName': 'RPT_ECONOMY_CPI',
        }
        return self._fetch_macro_data(params)

    def get_ppi_data(self, page_size: int = 20) -> List[Dict]:
        """Get PPI data"""
        params = {
            'callback': 'data',
            'columns': 'REPORT_DATE,TIME,BASE,BASE_SAME,BASE_ACCUMULATE',
            'pageNumber': 1,
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
            'source': 'WEB',
            'client': 'WEB',
            'reportName': 'RPT_ECONOMY_PPI',
        }
        return self._fetch_macro_data(params)

    def get_pmi_data(self, page_size: int = 20) -> List[Dict]:
        """Get PMI data"""
        params = {
            'callback': 'data',
            'columns': 'REPORT_DATE,TIME,MAKE_INDEX,MAKE_SAME,NMAKE_INDEX,NMAKE_SAME',
            'pageNumber': 1,
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
            'source': 'WEB',
            'client': 'WEB',
            'reportName': 'RPT_ECONOMY_PMI',
        }
        return self._fetch_macro_data(params)
```

## 9. Investment Calendar API

```python
class InvestmentCalendarAPI:
    """Investment Calendar and Economic Events"""

    BASE_URL = "https://app.jiuyangongshe.com/jystock-app/api/v1/timeline/list"

    def __init__(self, yuan_data: YuanData):
        self.parent = yuan_data

    def get_calendar(self, year_month: Optional[str] = None) -> List[Dict]:
        """Get economic events calendar"""
        if not year_month:
            year_month = datetime.now().strftime('%Y-%m')

        headers = {
            'Host': 'app.jiuyangongshe.com',
            'Origin': 'https://www.jiuyangongshe.com',
            'Referer': 'https://www.jiuyangongshe.com/',
            'Content-Type': 'application/json',
            'token': '1cc6380a05c652b922b3d85124c85473',
            'platform': '3',
            'Cookie': 'SESSION=NDZkNDU2ODYtODEwYi00ZGZkLWEyY2ItNjgxYzY4ZWMzZDEy',
            'timestamp': str(int(time.time() * 1000)),
        }

        try:
            response = self.parent.session.post(
                self.BASE_URL,
                headers=headers,
                json={'date': year_month, 'grade': '0'},
                timeout=30
            )
            return response.json().get('data', []) if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"Calendar fetch failed: {e}")
            return []
```

---

# Part 4: Unified Data Access Class

## 10. YuanData Main Class

```python
class YuanData:
    """Unified Chinese Finance Data Access Class"""

    def __init__(self, proxy: Optional[str] = None):
        self.proxy = proxy
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html',
        }
        if proxy:
            self.session.proxies = {'http': proxy, 'https': proxy}

        # Initialize API clients
        self.stock = _StockAPI(self)
        self.fund = _FundAPI(self)
        self.macro = _MacroAPI(self)
        self.news = _NewsAPI(self)

    def _request(self, url: str, headers: Optional[Dict] = None,
                 params: Optional[Dict] = None, timeout: int = 30) -> Optional[Any]:
        """Generic HTTP request"""
        try:
            final_headers = {**self.headers, **(headers or {})}
            response = self.session.get(url, headers=final_headers, params=params, timeout=timeout)
            response.raise_for_status()
            return response
        except Exception as e:
            logger.error(f"Request failed: {url} - {e}")
            return None

# Internal API wrappers
class _StockAPI:
    def __init__(self, parent): self.parent = parent
    def get_quote(self, code: str) -> Optional[Dict]:
        url = f"http://hq.sinajs.cn/list={code}"
        headers = {'Host': 'hq.sinajs.cn', 'Referer': 'https://finance.sina.com.cn/'}
        response = self.parent._request(url, headers=headers)
        return {'code': code, 'source': 'sina'} if response else None

class _FundAPI:
    def __init__(self, parent): self.parent = parent
    def get_quote(self, code: str) -> Optional[Dict]:
        url = f"https://fundgz.1234567.com.cn/js/{code}.js"
        response = self.parent._request(url, headers={'Referer': 'https://fund.eastmoney.com/'})
        return {'code': code, 'source': 'fund'} if response else None

class _MacroAPI:
    def __init__(self, parent): self.parent = parent
    def get_gdp(self) -> List[Dict]:
        return []
    def get_cpi(self) -> List[Dict]:
        return []

class _NewsAPI:
    def __init__(self, parent): self.parent = parent
    def search(self, keyword: str) -> List[Dict]:
        return []

# Convenience functions
def get_stock_price(stock_code: str, proxy: Optional[str] = None) -> Optional[Dict]:
    """Get real-time stock price"""
    data = YuanData(proxy)
    return data.stock.get_quote(stock_code)

def get_fund_nav(fund_code: str, proxy: Optional[str] = None) -> Optional[Dict]:
    """Get fund NAV"""
    data = YuanData(proxy)
    return data.fund.get_quote(fund_code)

def get_gdp_data(proxy: Optional[str] = None) -> List[Dict]:
    """Get GDP data"""
    data = YuanData(proxy)
    return data.macro.get_gdp()

def get_cpi_data(proxy: Optional[str] = None) -> List[Dict]:
    """Get CPI data"""
    data = YuanData(proxy)
    return data.macro.get_cpi()
```

---

# Part 5: Handling Tickers That Don't Return Data

## 11. Troubleshooting Guide (Python)

```python
class DataTroubleshooter:
    """Diagnose why tickers return no data"""

    @staticmethod
    def check_hk_format(stock_code: str) -> str:
        """Fix HK stock format (e.g., 'hk2259' → 'hk02259')"""
        if stock_code.startswith('hk') and len(stock_code) == 6:
            return 'hk0' + stock_code[2:]
        return stock_code

    @staticmethod
    def check_baidu_exists(stock_code: str, proxy: Optional[str] = None) -> bool:
        """Verify Baidu Gushitong has data for this stock"""
        url = f"https://gushitong.baidu.com/stock/ab-{stock_code}"
        data = YuanData(proxy)
        response = data._request(url)
        return response is not None and response.status_code == 200

def troubleshoot_ticker(stock_code: str, proxy: Optional[str] = None) -> Dict:
    """Diagnose missing ticker data"""
    results = {
        'original_code': stock_code,
        'tests': []
    }

    # Format check
    corrected = DataTroubleshooter.check_hk_format(stock_code)
    results['corrected_code'] = corrected
    results['tests'].append({
        'test': 'format_correction',
        'input': stock_code,
        'output': corrected,
        'changed': stock_code != corrected
    })

    # Sina test
    sina_success = get_stock_price(corrected, proxy) is not None
    results['tests'].append({
        'test': 'sina_api',
        'result': sina_success
    })

    # Baidu site check
    baidu_available = DataTroubleshooter.check_baidu_exists(corrected, proxy)
    results['tests'].append({
        'test': 'baidu_page_exists',
        'result': baidu_available
    })

    # Recommendation
    if sina_success:
        results['recommendation'] = 'USE_CORRECTED_CODE'
    elif baidu_available:
        results['recommendation'] = 'CHECK_MANUALLY'
    else:
        results['recommendation'] = 'INACTIVE_OR_INVALID'

    return results
```

---

# Part 6: Common Stock Code Examples

| Company              | A-Share Code | HK Code | Industry          |
| -------------------- | ------------ | ------- | ----------------- |
| Kweichow Moutai      | sh600519     | -       | Liquor            |
| Tencent              | -            | hk00700 | Internet          |
| Alibaba              | sh9988       | hk9988  | E-commerce        |
| Meituan              | sh3690       | hk3690  | Food Delivery     |
| Ping An              | sh601318     | hk2318  | Insurance         |
| BYD                  | sh002594     | hk1211  | Electric Vehicles |
| China Merchants Bank | sh600036     | hk3968  | Banking           |
| Industrial Bank      | sh601166     | -       | Banking           |

---

# Part 7: Important Notes

### Time Zone

- China Standard Time (CST): **UTC+8**
- Trading Hours:
  - Morning: **9:30–11:30**
  - Afternoon: **13:00–15:00**
- Lunch Break: **11:30–13:00**

### Currency

- **A-shares:** CNY (RMB)
- **HK stocks:** HKD
- Approx rate: **1 HKD ≈ 0.89 CNY**

### Market Holidays

Closed on:

- Weekends (Saturday–Sunday)
- Public holidays: **Chinese New Year, National Day (Oct 1), Labor Day (May 1)**

### Proxy Requirements

- Consider using a **CN-based proxy or VPS** when accessing from outside China
- Some sites block non-Chinese IPs

---

# Part 8: Usage Examples

```python
# Initialize with optional proxy
data = YuanData(proxy="http://localhost:10809")

# Get A-share quote (Kweichow Moutai)
quote = data.stock.get_quote("sh600519")
print(f"Moutai: {quote}")

# Get HK quote (Tencent)
hk_quote = data.stock.get_quote("hk00700")
print(f"Tencent: {hk_quote}")

# Get fund NAV
fund = data.fund.get_quote("161039")
print(f"Fund NAV: {fund}")

# Get GDP data
gdp = data.macro.get_gdp()
print(f"GDP: {gdp}")

# Search news
news = data.news.search("茅台")
print(f"News: {news}")

# Troubleshoot ticker
result = troubleshoot_ticker("hk2259")
print(f"Troubleshoot: {result}")
```
