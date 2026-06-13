"""Test component-specific marketplace search"""
import asyncio
from marketplace import get_market_prices


async def test():
    # Test screen search
    print("Testing screen search...")
    prices = await get_market_prices("Samsung", "Galaxy A54", component="screen")
    print(f"Found {len(prices)} results for screen")
    for price in prices[:2]:
        print(f"  - {price.get('source')}: {price.get('title')} - PHP {price.get('price')}")
    
    # Test battery search
    print("\nTesting battery search...")
    prices = await get_market_prices("Samsung", "Galaxy A54", component="battery")
    print(f"Found {len(prices)} results for battery")
    for price in prices[:2]:
        print(f"  - {price.get('source')}: {price.get('title')} - PHP {price.get('price')}")
    
    # Test default (no component)
    print("\nTesting default search (no component specified)...")
    prices = await get_market_prices("Samsung", "Galaxy A54")
    print(f"Found {len(prices)} results for default search")
    for price in prices[:2]:
        print(f"  - {price.get('source')}: {price.get('title')} - PHP {price.get('price')}")


asyncio.run(test())
