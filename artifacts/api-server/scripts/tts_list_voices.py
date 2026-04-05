#!/usr/bin/env python3
"""
EdgeTTS script: lists all available English voices as JSON.
"""
import asyncio
import json
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    english_voices = [v for v in voices if v["Locale"].startswith("en-")]
    print(json.dumps([{
        "name": v["FriendlyName"],
        "shortName": v["ShortName"],
        "gender": v["Gender"],
        "locale": v["Locale"]
    } for v in english_voices]))

asyncio.run(main())
