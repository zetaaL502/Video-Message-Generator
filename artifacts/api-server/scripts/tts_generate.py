#!/usr/bin/env python3
"""
EdgeTTS script: generates speech for a single line.
Usage: python3 tts_generate.py <voice> <output_file> <text>
"""
import sys
import asyncio
import edge_tts

async def main():
    if len(sys.argv) < 4:
        print("Usage: tts_generate.py <voice> <output_file> <text>", file=sys.stderr)
        sys.exit(1)

    voice = sys.argv[1]
    output_file = sys.argv[2]
    text = " ".join(sys.argv[3:])

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

asyncio.run(main())
