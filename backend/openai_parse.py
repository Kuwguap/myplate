"""
Parse free-form vehicle/owner text into the expected JSON structure using OpenAI.
Use OPENAI_API_KEY env var; if unset, parsing is skipped.
"""
import json
import os
import re
from typing import Dict, Any, Optional

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

# Expected JSON keys (user-facing) that we map to form fields in the bot
EXPECTED_KEYS = [
    'first_name', 'last_name', 'address', 'city', 'state', 'zip',
    'vin', 'year', 'make', 'model', 'body', 'color',
    'ins_company', 'policy_number'
]

SYSTEM_PROMPT = """You are a strict data extractor. Extract vehicle transfer document fields from the user's message.
Output ONLY a valid JSON object with these keys (use empty string "" for missing): first_name, last_name, address, city, state, zip, vin, year, make, model, body, color, ins_company, policy_number.
Rules:
- first_name, last_name: owner names (uppercase or normalize to uppercase).
- address, city, state, zip: full address. state must be 2 letters (e.g. NY).
- zip: 5 digits or 5+4 (e.g. 10312 or 10312-1234).
- vin: 17 characters, alphanumeric (A-HJ-NPR-Z0-9). If missing or invalid use "AAAAAAAAAAAAAAAAA".
- year: 4-digit year.
- make, model, body, color: vehicle info. body can be e.g. "Sedan 4DR", "Coupe 2DR", or custom.
- ins_company, policy_number: insurance (optional).
Output nothing else—no markdown, no explanation, only the JSON object."""


def parse_text_to_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Send raw text to OpenAI and return a dict with the expected keys, or None if disabled/failed.
    """
    if not OPENAI_API_KEY or not raw_text or not raw_text.strip():
        return None
    text = raw_text.strip()
    # Skip if it looks like JSON already
    if (text.startswith('{') and '}' in text) or (text.startswith('[') and ']' in text):
        return None
    try:
        payload = {
            'model': 'gpt-4o-mini',
            'messages': [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': text}
            ],
            'temperature': 0.1,
            'max_tokens': 500
        }
        headers = {
            'Authorization': f'Bearer {OPENAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        import requests
        r = requests.post(OPENAI_API_URL, json=payload, headers=headers, timeout=25)
        if not r.ok:
            print(f'OpenAI API error: {r.status_code} {r.text}')
            return None
        data = r.json()
        choice = (data.get('choices') or [{}])[0]
        content = (choice.get('message') or {}).get('content') or ''
        content = content.strip()
        # Strip markdown code block if present
        if content.startswith('```'):
            content = re.sub(r'^```\w*\n?', '', content)
            content = re.sub(r'\n?```\s*$', '', content)
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            # Ensure expected keys exist
            out = {}
            for k in EXPECTED_KEYS:
                out[k] = parsed.get(k, '') if isinstance(parsed.get(k), str) else str(parsed.get(k) or '')
            return out
        return None
    except json.JSONDecodeError as e:
        print(f'OpenAI JSON decode error: {e}')
        return None
    except Exception as e:
        print(f'OpenAI parse error: {e}')
        return None
