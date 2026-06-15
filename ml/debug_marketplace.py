"""Debug marketplace module"""
import asyncio
from marketplace import fetch_shopee_prices, fetch_lazada_prices


async def test():
    try:
        print("Testing Shopee API...")
        shopee_prices = await fetch_shopee_prices("Samsung Galaxy A54 screen replacement", limit=3)
        print(f"Shopee: Found {len(shopee_prices)} results")
        for item in shopee_prices[:2]:
            print(f"  - {item.get('title')}: PHP {item.get('price')}")
    except Exception as e:
        print(f"Shopee error: {e}")
    
    try:
        print("\nTesting Lazada web scraping...")
        lazada_prices = await fetch_lazada_prices("Samsung Galaxy A54 screen replacement", limit=3)
        print(f"Lazada: Found {len(lazada_prices)} results")
        for item in lazada_prices[:2]:
            print(f"  - {item.get('title')}: PHP {item.get('price')}")
    except Exception as e:
        print(f"Lazada error: {e}")


asyncio.run(test())
