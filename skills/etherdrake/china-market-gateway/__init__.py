"""
China Market Gateway - Chinese Finance Data Retrieval

Retrieve A-share, HK, fund, and macro data from Chinese financial sources.
"""

import requests
import re
import time
import json
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
        self.stock = StockAPI(self)
        self.fund = FundAPI(self)
        self.macro = MacroAPI(self)
        self.news = NewsAPI(self)
    
    def _request(self, url: str, headers: Optional[Dict] = None,
                 params: Optional[Dict] = None, timeout: int = 30) -> Optional[Any]:
        """Generic HTTP request handler"""
        try:
            req_headers = {**self.headers, **(headers or {})}
            if params:
                response = self.session.get(url, headers=req_headers, params=params, timeout=timeout)
            else:
                response = self.session.get(url, headers=req_headers, timeout=timeout)
            response.raise_for_status()
            return response
        except Exception as e:
            logger.error(f"Request failed: {url} - {e}")
            return None


class StockAPI:
    """Stock Data Retrieval from Sina/Tencent"""
    
    def __init__(self, parent: YuanData):
        self.parent = parent
    
    def get_quote(self, stock_code: str) -> Optional[Dict]:
        """Get real-time stock quote from Sina"""
        # Handle HK stock format
        code = stock_code
        if stock_code.startswith('hk') and len(stock_code) == 6:
            code = 'hk0' + stock_code[2:]
        
        timestamp = int(time.time() * 1000)
        url = f"http://hq.sinajs.cn/rn={timestamp}&list={code}"
        headers = {
            'Host': 'hq.sinajs.cn',
            'Referer': 'https://finance.sina.com.cn/',
        }
        
        response = self.parent._request(url, headers=headers)
        if not response:
            return None
        
        # Parse: var hq_str_sh600519="name,open,high,low,close,...";
        match = re.search(r'hq_str_' + re.escape(code) + r'="([^"]+)";', response.text)
        if not match:
            return None
        
        data = match.group(1).split(',')
        
        return {
            'code': stock_code,
            'name': data[0],
            'open': float(data[1]),
            'pre_close': float(data[2]),
            'close': float(data[3]),
            'high': float(data[4]),
            'low': float(data[5]),
            'volume': int(data[8]),
            'amount': float(data[9]),
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_quote_tencent(self, stock_code: str) -> Optional[Dict]:
        """Get quote from Tencent Finance"""
        url = f"http://qt.gtimg.cn/?_={int(time.time())}&q={stock_code}"
        headers = {
            'Host': 'qt.gtimg.cn',
            'Referer': 'https://gu.qq.com/',
        }
        
        response = self.parent._request(url, headers=headers)
        if not response or not response.text.strip():
            return None
        
        parts = response.text.strip().split('~')
        if len(parts) < 35:
            return None
        
        return {
            'code': stock_code,
            'name': parts[1],
            'close': float(parts[3]),
            'pre_close': float(parts[4]),
            'open': float(parts[5]),
            'high': float(parts[32] or parts[33]),
            'low': float(parts[33] or parts[34]),
            'change_percent': float(parts[31]),
            'volume': float(parts[6]),
        }


class FundAPI:
    """Fund Data Retrieval from Eastmoney"""
    
    def __init__(self, parent: YuanData):
        self.parent = parent
    
    def get_quote(self, fund_code: str) -> Optional[Dict]:
        """Get fund NAV from Eastmoney"""
        url = f"https://fundgz.1234567.com.cn/js/{fund_code}.js"
        headers = {'Referer': 'https://fund.eastmoney.com/'}
        
        response = self.parent._request(url, headers=headers)
        if not response or 'jsonpgz' not in response.text:
            return None
        
        try:
            json_str = response.text.replace('jsonpgz(', '').rstrip(');')
            data = json.loads(json_str)
            return {
                'code': data.get('fundcode'),
                'name': data.get('name'),
                'nav': float(data.get('dwjz', 0)),
                'nav_date': data.get('jzrq'),
                'estimated_nav': float(data.get('gsz', 0)),
                'growth_rate': float(data.get('zzf', 0)),
            }
        except Exception as e:
            logger.error(f"Failed to parse fund data: {e}")
            return None
    
    def get_details(self, fund_code: str) -> Optional[Dict]:
        """Get detailed fund information"""
        # Placeholder - would require HTML parsing
        return {'code': fund_code, 'note': 'Detailed parsing requires HTML scraping'}


class MacroAPI:
    """Macroeconomic Data from Eastmoney"""
    
    def __init__(self, parent: YuanData):
        self.parent = parent
        self.base_url = "https://datacenter-web.eastmoney.com/api/data/v1/get"
    
    def _fetch(self, params: Dict) -> List[Dict]:
        """Generic macro data fetcher"""
        headers = {
            'Host': 'datacenter-web.eastmoney.com',
            'Origin': 'https://datacenter.eastmoney.com',
            'Referer': 'https://data.eastmoney.com/cjsj/',
        }
        
        response = self.parent._request(self.base_url, headers=headers, params=params)
        if not response:
            return []
        
        try:
            text = response.text
            if 'data(' in text:
                json_str = re.sub(r'^data\(|\);$', '', text)
                data = json.loads(json_str)
                return data.get('data', {}).get('result', {}).get('data', [])
        except Exception as e:
            logger.error(f"Failed to parse macro data: {e}")
        return []
    
    def get_gdp(self, page_size: int = 20) -> List[Dict]:
        """Get GDP data"""
        params = {
            'callback': 'data',
            'reportName': 'RPT_ECONOMY_GDP',
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
        }
        return self._fetch(params)
    
    def get_cpi(self, page_size: int = 20) -> List[Dict]:
        """Get CPI data"""
        params = {
            'callback': 'data',
            'reportName': 'RPT_ECONOMY_CPI',
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
        }
        return self._fetch(params)
    
    def get_ppi(self, page_size: int = 20) -> List[Dict]:
        """Get PPI data"""
        params = {
            'callback': 'data',
            'reportName': 'RPT_ECONOMY_PPI',
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
        }
        return self._fetch(params)
    
    def get_pmi(self, page_size: int = 20) -> List[Dict]:
        """Get PMI data"""
        params = {
            'callback': 'data',
            'reportName': 'RPT_ECONOMY_PMI',
            'pageSize': page_size,
            'sortColumns': 'REPORT_DATE',
            'sortTypes': -1,
        }
        return self._fetch(params)


class NewsAPI:
    """News Retrieval from CLS (财联社)"""
    
    def __init__(self, parent: YuanData):
        self.parent = parent
    
    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """Search news on CLS"""
        # Placeholder - would require web scraping
        return [{'keyword': keyword, 'note': 'CLS search requires HTML parsing'}]
    
    def get_telegraph_list(self, limit: int = 50) -> List[Dict]:
        """Get latest market telegraphs"""
        url = "https://www.cls.cn/nodeapi/telegraphList"
        params = {'page': 1, 'page_size': limit}
        
        response = self.parent._request(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            if data.get('error') == 0:
                return data.get('data', {}).get('roll_data', [])
        except Exception as e:
            logger.error(f"Failed to parse telegraph list: {e}")
        return []


# Convenience Functions
def get_stock_price(stock_code: str, proxy: Optional[str] = None) -> Optional[Dict]:
    """Get real-time stock price"""
    data = YuanData(proxy)
    return data.stock.get_quote(stock_code)


def get_fund_nav(fund_code: str, proxy: Optional[str] = None) -> Optional[Dict]:
    """Get fund NAV and growth rate"""
    data = YuanData(proxy)
    return data.fund.get_quote(fund_code)


def troubleshoot_ticker(stock_code: str, proxy: Optional[str] = None) -> Dict:
    """Diagnose non-responsive tickers"""
    results = {
        'original_code': stock_code,
        'tests': [],
        'recommendation': None
    }
    
    # Check HK format
    corrected = stock_code
    if stock_code.startswith('hk') and len(stock_code) == 6:
        corrected = 'hk0' + stock_code[2:]
    
    results['corrected_code'] = corrected
    results['tests'].append({
        'test': 'format_check',
        'changed': stock_code != corrected
    })
    
    # Test Sina API
    data = YuanData(proxy)
    sina_result = data.stock.get_quote(corrected)
    results['tests'].append({
        'test': 'sina_api',
        'success': sina_result is not None
    })
    
    # Recommendation
    if sina_result:
        results['recommendation'] = 'USE_CORRECTED_CODE'
    else:
        results['recommendation'] = 'CHECK_MANUALLY'
    
    return results
