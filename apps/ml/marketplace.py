import asyncio
import re
import urllib.parse
from typing import Any

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

SHOPEE_SEARCH_URL = 'https://shopee.ph/api/v4/search/search_items'
LAZADA_SEARCH_URL = 'https://www.lazada.com.ph/catalog/'


def _normalize_price(price: float) -> float:
    return round(price, 2)


def _parse_price_text(text: str) -> float | None:
    match = re.search(r'₱\s*([0-9,.]+)', text)
    if not match:
        return None
    price_text = match.group(1).replace(',', '')
    try:
        return float(price_text)
    except ValueError:
        return None


async def fetch_shopee_prices(query: str, limit: int = 5) -> list[dict[str, Any]]:
    params = {
        'by': 'relevancy',
        'keyword': query,
        'limit': limit,
        'newest': 0,
        'order': 'desc',
        'page_type': 'search',
    }

    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
        response = await client.get(SHOPEE_SEARCH_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    items = payload.get('items', [])
    prices = []
    for item in items:
        basic = item.get('item_basic', {})
        if not basic:
            continue
        price_min = basic.get('price_min')
        price_max = basic.get('price_max')
        if price_min is None or price_max is None:
            continue
        # Shopee API returns price in 100000 units.
        price = _normalize_price(((price_min + price_max) / 2) / 100000)
        title = basic.get('name', query)
        item_url_name = urllib.parse.quote_plus(basic.get('name', '') or query)
        prices.append({
            'source': 'Shopee',
            'title': title,
            'price': price,
            'currency': 'PHP',
            'url': f"https://shopee.ph/{item_url_name}-i.{basic.get('shopid')}.{basic.get('itemid')}",
        })
    return prices


async def fetch_lazada_prices(query: str, limit: int = 5) -> list[dict[str, Any]]:
    params = {'q': query}
    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
        response = await client.get(LAZADA_SEARCH_URL, params=params)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, 'lxml')
    price_texts = []
    for text in soup.stripped_strings:
        if '₱' in text:
            price = _parse_price_text(text)
            if price is not None:
                price_texts.append(price)
    prices = []
    for price in sorted(set(price_texts))[:limit]:
        prices.append({
            'source': 'Lazada',
            'title': f'{query} screen part',
            'price': _normalize_price(price),
            'currency': 'PHP',
            'url': f'https://www.lazada.com.ph/catalog/?q={query.replace(" ", "+")}',
        })
    return prices


async def get_market_prices(brand: str, model: str) -> list[dict[str, Any]]:
    query = f'{brand} {model} screen replacement'
    try:
        shopee_prices, lazada_prices = await asyncio.gather(
            fetch_shopee_prices(query),
            fetch_lazada_prices(query),
        )
    except Exception:
        shopee_prices = []
        lazada_prices = []

    return shopee_prices + lazada_prices
