import requests
import json
import time
import random
import os
import re
import sys
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

# Configuration (use environment variables in production, e.g. on Render)
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
API_URL = (os.environ.get('API_URL') or 'http://localhost:3002/api').rstrip('/')
if not API_URL.endswith('/api'):
    API_URL = API_URL + '/api'
TELEGRAM_SERVER_URL = (os.environ.get('TELEGRAM_SERVER_URL') or os.environ.get('API_URL') or 'http://localhost:3003').rstrip('/')
if not TELEGRAM_SERVER_URL.endswith('/api'):
    TELEGRAM_SERVER_URL = TELEGRAM_SERVER_URL + '/api'
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
TELEGRAM_API = f'https://api.telegram.org/bot{BOT_TOKEN}' if BOT_TOKEN else ''
POLLING_TIMEOUT = 30  # seconds
DATA_FILE = 'user_preferences.json'

# Default headers for API requests
API_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
}

# Store user data in a single structure per chat
user_settings: Dict[int, Dict[str, Any]] = {}

# Increment ranges
PLATE_SLOT1_INCREMENT = (100, 500)
PLATE_SLOT2_INCREMENT = (100, 500)
CAR_INCREMENT_RANGE = (500, 2500)


def default_slot_settings() -> Dict[str, Any]:
    """Return default settings for a template slot."""
    return {
        'templateId': None,
        'templateName': None,
        'templateDescription': None,
        'plate': None,  # {'base': str, 'current': str}
        'car': None     # {'base': str, 'current': str}
    }


def ensure_chat_settings(chat_id: int) -> Dict[str, Any]:
    """Ensure chat settings exist and return them."""
    settings = user_settings.get(chat_id)
    if not settings:
        settings = {
            'selectionMode': 'auto',
            'lastUsedSlot': None,
            'slots': {
                '1': default_slot_settings(),
                '2': default_slot_settings()
            }
        }
        user_settings[chat_id] = settings
    else:
        # Normalize legacy structures if needed
        if 'slots' not in settings:
            settings['slots'] = {
                '1': default_slot_settings(),
                '2': default_slot_settings()
            }
        else:
            for slot_id in ('1', '2'):
                if slot_id not in settings['slots'] or not isinstance(settings['slots'][slot_id], dict):
                    settings['slots'][slot_id] = default_slot_settings()
        settings.setdefault('selectionMode', 'auto')
        settings.setdefault('lastUsedSlot', None)
    return settings


def ensure_slot(chat_id: int, slot_id: str) -> Dict[str, Any]:
    """Return the slot dict for the given chat and slot id."""
    settings = ensure_chat_settings(chat_id)
    slot = settings['slots'].get(slot_id)
    if slot is None:
        settings['slots'][slot_id] = default_slot_settings()
        slot = settings['slots'][slot_id]
    return slot

def normalize_slot_data(slot_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Normalize slot data loaded from disk."""
    slot = default_slot_settings()
    if isinstance(slot_data, dict):
        slot['templateId'] = slot_data.get('templateId')
        slot['templateName'] = slot_data.get('templateName')
        slot['templateDescription'] = slot_data.get('templateDescription')

        plate = slot_data.get('plate')
        if isinstance(plate, dict) and plate.get('base'):
            slot['plate'] = {
                'base': plate.get('base'),
                'current': plate.get('current') or plate.get('base')
            }

        car = slot_data.get('car')
        if isinstance(car, dict) and car.get('base'):
            slot['car'] = {
                'base': car.get('base'),
                'current': car.get('current') or car.get('base')
            }
    return slot


def normalize_chat_settings(raw_settings: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize chat-level settings loaded from disk."""
    slots = raw_settings.get('slots', {})
    selection_mode = raw_settings.get('selectionMode', 'auto')
    if selection_mode not in ('1', '2', 'auto'):
        selection_mode = 'auto'

    normalized = {
        'selectionMode': selection_mode,
        'lastUsedSlot': raw_settings.get('lastUsedSlot'),
        'slots': {
            '1': normalize_slot_data(slots.get('1')),
            '2': normalize_slot_data(slots.get('2'))
        }
    }
    return normalized


def migrate_legacy_preferences(data: Dict[str, Any]):
    """Migrate legacy preference files to the new structure."""
    global user_settings
    legacy_plate_numbers = data.get('plate_numbers', {})
    legacy_user_plates = data.get('user_plates', {})
    legacy_car_numbers = data.get('car_numbers', {})
    legacy_user_cars = data.get('user_cars', {})
    legacy_templates = data.get('user_templates', {})

    def normalize_keys(input_dict):
        normalized = {}
        if isinstance(input_dict, dict):
            for key, value in input_dict.items():
                try:
                    normalized[int(key)] = value
                except (ValueError, TypeError):
                    continue
        return normalized

    legacy_plate_numbers = normalize_keys(legacy_plate_numbers)
    legacy_user_plates = normalize_keys(legacy_user_plates)
    legacy_car_numbers = normalize_keys(legacy_car_numbers)
    legacy_user_cars = normalize_keys(legacy_user_cars)
    legacy_templates = normalize_keys(legacy_templates)

    all_chat_ids = set()
    for store in (legacy_plate_numbers, legacy_user_plates, legacy_car_numbers, legacy_user_cars, legacy_templates):
        all_chat_ids.update(store.keys())

    for chat_id in all_chat_ids:
        settings = ensure_chat_settings(chat_id)
        slot = settings['slots']['1']

        template_id = legacy_templates.get(chat_id)
        if template_id:
            slot['templateId'] = template_id

        base_plate = legacy_user_plates.get(chat_id)
        if base_plate:
            slot['plate'] = {
                'base': base_plate,
                'current': legacy_plate_numbers.get(chat_id, {}).get('current', base_plate)
                if isinstance(legacy_plate_numbers.get(chat_id), dict) else base_plate
            }

        base_car = legacy_user_cars.get(chat_id)
        if base_car:
            slot['car'] = {
                'base': base_car,
                'current': legacy_car_numbers.get(chat_id, {}).get('current', base_car)
                if isinstance(legacy_car_numbers.get(chat_id), dict) else base_car
            }

    print('Legacy user preferences migrated to new format')
    save_user_preferences()


def load_user_preferences():
    """Load user preferences from file"""
    global user_settings
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)

            if isinstance(data, dict) and 'user_settings' in data:
                loaded_settings = {}
                for chat_id_str, settings_data in data['user_settings'].items():
                    try:
                        chat_id = int(chat_id_str)
                    except (ValueError, TypeError):
                        continue
                    if isinstance(settings_data, dict):
                        loaded_settings[chat_id] = normalize_chat_settings(settings_data)
                user_settings = loaded_settings
                print('User preferences loaded successfully')
            else:
                # Attempt to migrate legacy structure
                migrate_legacy_preferences(data)
    except Exception as e:
        print(f'Error loading user preferences: {e}')


def serialize_slot(slot: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize slot data for JSON."""
    serialized = {
        'templateId': slot.get('templateId'),
        'templateName': slot.get('templateName'),
        'templateDescription': slot.get('templateDescription'),
        'plate': slot.get('plate'),
        'car': slot.get('car')
    }
    return serialized


def save_user_preferences():
    """Save user preferences to file"""
    try:
        data = {
            'user_settings': {
                str(chat_id): {
                    'selectionMode': settings.get('selectionMode', 'auto'),
                    'lastUsedSlot': settings.get('lastUsedSlot'),
                    'slots': {
                        '1': serialize_slot(settings['slots'].get('1', default_slot_settings())),
                        '2': serialize_slot(settings['slots'].get('2', default_slot_settings()))
                    }
                }
                for chat_id, settings in user_settings.items()
            }
        }
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print('User preferences saved successfully')
    except Exception as e:
        print(f'Error saving user preferences: {e}')


def increment_plate_suffix(value: str) -> str:
    """Increment plates that end with letters (Template 1)."""
    if not value:
        return value
    value = value.strip().upper()
    match = re.match(r'^(\d+)([A-Z]+)$', value)
    if not match:
        return value
    digits, suffix = match.groups()
    try:
        increment = random.randint(*PLATE_SLOT1_INCREMENT)
        new_number = int(digits) + increment
        new_digits = str(new_number).zfill(len(digits))
        return f"{new_digits}{suffix}"
    except ValueError:
        return value


def increment_plate_prefix(value: str) -> str:
    """Increment plates that start with letters (Template 2)."""
    if not value:
        return value
    value = value.strip().upper()
    match = re.match(r'^([A-Z]+)(\d+)$', value)
    if not match:
        return value
    prefix, digits = match.groups()
    try:
        increment = random.randint(*PLATE_SLOT2_INCREMENT)
        new_number = int(digits) + increment
        new_digits = str(new_number).zfill(len(digits))
        return f"{prefix}{new_digits}"
    except ValueError:
        return value


def increment_plate_value(slot_id: str, value: str) -> str:
    """Increment a plate value based on the template slot rules."""
    if slot_id == '1':
        return increment_plate_suffix(value)
    return increment_plate_prefix(value)


def increment_car_value(value: str) -> str:
    """Increment car number by 500-2500."""
    if not value:
        return value
    try:
        increment = random.randint(*CAR_INCREMENT_RANGE)
        new_number = int(value) + increment
        return str(new_number)
    except ValueError:
        return value


def generate_sequence_value(slot_id: str, slot: Dict[str, Any], key: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Generate next value for plate/car sequences.
    Returns tuple of (value_to_use_now, next_value).
    """
    seq = slot.get(key)
    if not seq or not seq.get('base'):
        return None, None

    current_value = seq.get('current') or seq['base']
    if key == 'plate':
        next_value = increment_plate_value(slot_id, current_value)
    else:
        next_value = increment_car_value(current_value)

    seq['current'] = next_value
    return current_value, next_value


def preview_sequence_value(slot_id: str, slot: Dict[str, Any], key: str) -> Tuple[Optional[str], Optional[str]]:
    """Preview the next queued value without altering state."""
    seq = slot.get(key)
    if not seq or not seq.get('base'):
        return None, None
    current_value = seq.get('current') or seq['base']
    return current_value, None


def format_template_label(slot_id: str, slot: Dict[str, Any]) -> str:
    """Return a human readable label for the assigned template."""
    if slot.get('templateName'):
        return f"{slot['templateName']} (ID: {slot.get('templateId')})"
    if slot.get('templateId'):
        return f"Template ID: {slot['templateId']}"
    return "Not assigned"

def get_user_settings(chat_id: int) -> str:
    """Get current user settings summary"""
    settings = ensure_chat_settings(chat_id)
    lines = [
        f"Selection Mode: {settings.get('selectionMode', 'auto').upper()}",
    ]

    if settings.get('selectionMode') == 'auto':
        lines.append("Auto mode will alternate between configured templates.")
    else:
        lines.append(f"Template {settings.get('selectionMode')} is prioritized.")

    for slot_id in ('1', '2'):
        slot = settings['slots'][slot_id]
        lines.append(f"\nTemplate Slot {slot_id}: {format_template_label(slot_id, slot)}")

        plate_preview = preview_sequence_value(slot_id, slot, 'plate')
        if plate_preview[0]:
            increment_desc = f"+{PLATE_SLOT1_INCREMENT[0]}-{PLATE_SLOT1_INCREMENT[1]}" if slot_id == '1' else f"+{PLATE_SLOT2_INCREMENT[0]}-{PLATE_SLOT2_INCREMENT[1]}"
            lines.append(f"  • Next plate: {plate_preview[0]} ({increment_desc})")
        else:
            lines.append(f"  • Plate not set. Use /setplate{slot_id}.")

        car_preview = preview_sequence_value(slot_id, slot, 'car')
        if car_preview[0]:
            lines.append(f"  • Next car #: {car_preview[0]} (+{CAR_INCREMENT_RANGE[0]}-{CAR_INCREMENT_RANGE[1]})")
        else:
            lines.append(f"  • Car number not set. Use /setcar{slot_id}.")

    return "Current Settings:\n" + "\n".join(lines)

def handle_settings_command(chat_id: int) -> None:
    """Handle /settings command to show current settings"""
    settings = get_user_settings(chat_id)
    send_message(chat_id, settings)

def get_updates(offset: int = None) -> Dict[str, Any]:
    """Get updates from Telegram Bot API"""
    params = {
        'timeout': POLLING_TIMEOUT,
        'allowed_updates': ['message']
    }
    if offset:
        params['offset'] = offset
    
    response = requests.get(f'{TELEGRAM_API}/getUpdates', params=params)
    return response.json()

def send_message(chat_id: int, text: str, parse_mode: str = 'HTML') -> None:
    """Send message to a Telegram chat"""
    data = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode
    }
    try:
        response = requests.post(f'{TELEGRAM_API}/sendMessage', json=data)
        if response.ok:
            print(f'Message sent to {chat_id}')
            print('Message content:', text)
        else:
            print(f'Failed to send message: {response.text}')
    except Exception as e:
        print(f'Error sending message: {e}')

def handle_setplate_command(chat_id: int, slot_id: str, text: str) -> None:
    """Handle /setplate{slot} commands."""
    try:
        parts = text.strip().split(maxsplit=1)
        if len(parts) != 2:
            send_message(chat_id, f'''❌ Error: Please provide a plate number after /setplate{slot_id}

Example:
/setplate{slot_id} 066284V''' if slot_id == '1' else f'''❌ Error: Please provide a plate number after /setplate{slot_id}

Example:
/setplate{slot_id} F219823''')
            return

        plate_value = parts[1].strip().upper()
        if slot_id == '1':
            if not re.match(r'^\d+[A-Z]+$', plate_value):
                send_message(chat_id, '❌ Error: Template 1 plates must be digits ending with letters (e.g., 066284V).')
                return
        else:
            if not re.match(r'^[A-Z]+\d+$', plate_value):
                send_message(chat_id, '❌ Error: Template 2 plates must start with letters followed by digits (e.g., F219823).')
                return

        slot = ensure_slot(chat_id, slot_id)
        slot['plate'] = {'base': plate_value, 'current': plate_value}
        preview_next = increment_plate_value(slot_id, plate_value)
        increment_range = PLATE_SLOT1_INCREMENT if slot_id == '1' else PLATE_SLOT2_INCREMENT

        send_message(chat_id, f'''✅ Template {slot_id} plate configured!

• Base plate: {plate_value}
• Next generation preview: {preview_next}

Plate numbers will automatically increment by {increment_range[0]}-{increment_range[1]} each document.
Use /settings to review your configuration.''')
        save_user_preferences()

    except Exception as e:
        print(f'Error handling setplate{slot_id} command: {e}')
        send_message(chat_id, '❌ Error: Could not update plate settings. Please try again.')


def handle_setcar_command(chat_id: int, slot_id: str, text: str) -> None:
    """Handle /setcar{slot} commands."""
    try:
        parts = text.strip().split(maxsplit=1)
        if len(parts) != 2:
            send_message(chat_id, f'''❌ Error: Please provide a numeric car number after /setcar{slot_id}

Example:
/setcar{slot_id} 2200198173''')
            return

        car_value = parts[1].strip()
        if not re.match(r'^\d+$', car_value):
            send_message(chat_id, '❌ Error: Car number must be numeric.')
            return

        slot = ensure_slot(chat_id, slot_id)
        slot['car'] = {'base': car_value, 'current': car_value}
        preview_next = increment_car_value(car_value)

        send_message(chat_id, f'''✅ Template {slot_id} car number configured!

• Base car number: {car_value}
• Next generation preview: {preview_next}

Car numbers will automatically increment by {CAR_INCREMENT_RANGE[0]}-{CAR_INCREMENT_RANGE[1]} for each document.''')
        save_user_preferences()

    except Exception as e:
        print(f'Error handling setcar{slot_id} command: {e}')
        send_message(chat_id, '❌ Error: Could not update car settings. Please try again.')


def format_template_assignments(chat_id: int) -> str:
    """Generate a status overview for template assignments."""
    settings = ensure_chat_settings(chat_id)
    templates = get_available_templates()

    available_templates = '\n'.join([
        f"• ID: {t.get('id')} – {t.get('name', 'Unnamed')} ({t.get('description', 'No description')})"
        for t in templates
    ]) or 'No templates available.'

    slot_lines = []
    for slot_id in ('1', '2'):
        slot = settings['slots'][slot_id]
        template_label = format_template_label(slot_id, slot)
        slot_lines.append(f"Template {slot_id}: {template_label}")

    slot_status = '\n'.join(slot_lines)

    return f'''📋 Template Assignments

{slot_status}

Selection mode: {settings.get('selectionMode', 'auto').upper()}

📄 Available Uploaded Templates:
{available_templates}

Commands:
• /usetemplate 1 TEMPLATE_ID – assign Template 1
• /usetemplate 2 TEMPLATE_ID – assign Template 2
• /usetemplate 1 – switch to Template 1
• /usetemplate 2 – switch to Template 2
• /usetemplate auto – enable automatic alternating'''


def handle_usetemplate_command(chat_id: int, text: str) -> None:
    """Handle /usetemplate commands for assignment and selection."""
    try:
        parts = text.strip().split()
        if len(parts) == 1:
            send_message(chat_id, format_template_assignments(chat_id))
            return

        subcommand = parts[1].lower()
        if subcommand == 'auto':
            settings = ensure_chat_settings(chat_id)
            settings['selectionMode'] = 'auto'
            save_user_preferences()
            send_message(chat_id, '✅ Auto template selection enabled.\nThe bot will alternate between configured templates.')
            return

        if subcommand not in ('1', '2'):
            send_message(chat_id, '❌ Error: Please specify template slot 1 or 2, or use /usetemplate auto.')
            return

        if len(parts) == 2:
            settings = ensure_chat_settings(chat_id)
            settings['selectionMode'] = subcommand
            settings['lastUsedSlot'] = subcommand
            save_user_preferences()
            send_message(chat_id, f'✅ Template slot {subcommand} selected for upcoming documents.')
            return

        template_id = parts[2].strip()
        templates = get_available_templates()
        template = next((t for t in templates if str(t.get('id')) == template_id), None)

        if not template:
            template_ids = ', '.join(str(t.get('id')) for t in templates) or 'None'
            send_message(chat_id, f'''❌ Error: Template ID {template_id} not found.

Available IDs: {template_ids}
Use /usetemplate to view details.''')
            return

        slot = ensure_slot(chat_id, subcommand)
        slot['templateId'] = str(template.get('id'))
        slot['templateName'] = template.get('name')
        slot['templateDescription'] = template.get('description')

        save_user_preferences()
        send_message(chat_id, f'''✅ Template assigned to slot {subcommand}!

• Name: {template.get('name', 'Unnamed')}
• ID: {template.get('id')}
• Description: {template.get('description', 'No description')}

Use /usetemplate {subcommand} to prioritize this template or /usetemplate auto to alternate.''')

    except Exception as e:
        print(f'Error handling usetemplate command: {e}')
        send_message(chat_id, '❌ Error: Could not update template settings. Please try again later.')

def handle_start_command(chat_id: int) -> None:
    """Handle /start command"""
    welcome_message = '''🚗 <b>Vehicle Transfer Document Generator</b> 🚗

Welcome! I can help you create vehicle transfer documents using your uploaded PDF templates.

<b>Template Setup</b>
• /usetemplate 1 TEMPLATE_ID – assign Template Slot 1
• /usetemplate 2 TEMPLATE_ID – assign Template Slot 2
• /usetemplate 1 – switch to Template 1
• /usetemplate 2 – switch to Template 2
• /usetemplate auto – alternate between slots
• /usetemplate – view assignments and available templates

<b>Plate & Car Numbers</b>
• /setplate1 066284V – digits ending with letters (adds 100-500)
• /setcar1 2200198173 – base car number (adds 500-2500)
• /setplate2 F219823 – letter prefix, digits after (adds 100-500)
• /setcar2 2200198173 – base car number

<b>General</b>
• /settings – View current configuration
• /start – Show this help

<b>How to Use</b>
1. Assign templates: /usetemplate 1 ID & /usetemplate 2 ID
2. Configure plate and car numbers for each slot
3. Send vehicle data in JSON format:
<pre>{
  "first_name": "MAURIZIO",
  "last_name": "BRUNO",
  "address": "89 BENNETT AVE",
  "city": "STATEN ISLAND",
  "state": "NY",
  "zip": "10312",
  "vin": "1G2PE37R6FP210824",
  "year": "1985",
  "make": "Pontiac",
  "model": "Mera",
  "body": "Coupe 2DR",
  "color": "RED",
  "ins_company": "STATE FARM",
  "policy_number": "3405491-F22-32"
}</pre>

<b>Notes</b>
• The optional <code>body</code> field improves accuracy.
• Template 1 plates end with letters; Template 2 plates start with letters.
• Car numbers increase automatically by 500-2500 per document.
• Dates and expirations are auto-filled.
• Web UI: https://0b37-154-38-170-95.ngrok-free.app
'''
    send_message(chat_id, welcome_message)


def determine_active_slot(chat_id: int) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """Determine which template slot should be used for this chat."""
    settings = ensure_chat_settings(chat_id)
    slots = settings['slots']

    def slot_ready(slot_key: str) -> bool:
        slot = slots.get(slot_key, {})
        return bool(slot.get('templateId'))

    mode = settings.get('selectionMode', 'auto')

    if mode in ('1', '2'):
        preferred = mode
        if slot_ready(preferred):
            settings['lastUsedSlot'] = preferred
            return preferred, slots[preferred]
        fallback = '2' if preferred == '1' else '1'
        if slot_ready(fallback):
            settings['lastUsedSlot'] = fallback
            return fallback, slots[fallback]
        return preferred, slots[preferred]

    ready_slots = [slot_id for slot_id in ('1', '2') if slot_ready(slot_id)]
    if not ready_slots:
        return None, None

    if len(ready_slots) == 1:
        slot_choice = ready_slots[0]
        settings['lastUsedSlot'] = slot_choice
        return slot_choice, slots[slot_choice]

    last_used = settings.get('lastUsedSlot')
    slot_choice = '2' if last_used == '1' else '1'
    if slot_choice not in ready_slots:
        slot_choice = ready_slots[0]

    settings['lastUsedSlot'] = slot_choice
    return slot_choice, slots[slot_choice]

def get_formatted_dates() -> Dict[str, str]:
    """Get current date and expiration date in the required format"""
    try:
        current_date = datetime.now()
        expiration_date = current_date + timedelta(days=30)
        
        # Format dates as MM/DD/YYYY
        current_formatted = current_date.strftime('%m/%d/%Y')
        expiration_formatted = expiration_date.strftime('%m/%d/%Y')
        
        # Format exp3 as MMM DD, YYYY with EXP prefix
        exp3_formatted = f"EXP {expiration_date.strftime('%b %d, %Y').upper()}"
        
        print(f"Current date formatted: {current_formatted}")
        print(f"Expiration date formatted: {expiration_formatted}")
        print(f"Exp3 formatted: {exp3_formatted}")
        
        return {
            'current': current_formatted,
            'expiration': expiration_formatted,
            'exp3': exp3_formatted
        }
    except Exception as e:
        print(f"Error formatting dates: {e}")
        current_date = datetime.now()
        expiration_date = current_date + timedelta(days=30)
        return {
            'current': current_date.strftime('%m/%d/%Y'),
            'expiration': expiration_date.strftime('%m/%d/%Y'),
            'exp3': f"EXP {expiration_date.strftime('%b %d, %Y').upper()}"
        }

def generate_vehicle_name(data: Dict[str, str]) -> str:
    """Generate vehicle name from year, make, model, and color"""
    year = data.get('year', '')
    make = data.get('make', '')
    model = data.get('model', '')
    color = data.get('color', '')
    
    # Combine components, only including non-empty values
    components = [comp for comp in [year, make, model] if comp]
    base_name = ' '.join(components)
    
    # Add color if available
    if color:
        return f"{base_name}, {color}"
    return base_name

def generate_document_name(data: Dict[str, str]) -> str:
    """Generate document name from first_name and last_name"""
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    
    if first_name and last_name:
        return f"{first_name} {last_name}"
    elif first_name:
        return first_name
    elif last_name:
        return last_name
    return "Untitled Document"

def get_available_templates() -> list:
    """Get list of available templates from the backend"""
    try:
        # Get templates from the backend API
        response = requests.get(
            f'{API_URL}/templates',
            headers=API_HEADERS,
        )
        print(f'Template API response: {response.text}')
        
        if response.ok:
            templates = response.json()
            if isinstance(templates, list):
                return templates
            elif isinstance(templates, dict) and 'templates' in templates:
                return templates['templates']
            elif isinstance(templates, dict) and 'data' in templates:
                return templates['data']
            print(f'Unexpected template response format: {templates}')
        else:
            print(f'Failed to get templates: {response.status_code} - {response.text}')
        return []
    except Exception as e:
        print(f'Error getting templates: {e}')
        return []

def send_document(chat_id: int, document_path: str, caption: str = '') -> bool:
    """Send a document to a Telegram chat"""
    try:
        with open(document_path, 'rb') as doc:
            files = {'document': doc}
            data = {
                'chat_id': chat_id,
                'caption': caption
            }
            response = requests.post(f'{TELEGRAM_API}/sendDocument', data=data, files=files)
            if response.ok:
                print(f'Document sent to {chat_id}')
                return True
            else:
                print(f'Failed to send document: {response.text}')
                return False
    except Exception as e:
        print(f'Error sending document: {e}')
        return False

def capitalize_name(text: str) -> str:
    """Convert text to uppercase"""
    if not text:
        return text
    return text.strip().upper()

def generate_pdf(form_data: dict, template_id: Optional[str] = None) -> Tuple[bool, str]:
    """Generate PDF using the backend API and return success status and file path"""
    try:
        # Capitalize specified fields
        form_data['first'] = capitalize_name(form_data.get('first', ''))
        form_data['last'] = capitalize_name(form_data.get('last', ''))
        form_data['address'] = capitalize_name(form_data.get('address', ''))
        form_data['city'] = capitalize_name(form_data.get('city', ''))
        form_data['state'] = capitalize_name(form_data.get('state', ''))
        form_data['vin'] = capitalize_name(form_data.get('vin', ''))
            
        # Add template ID if specified
        if template_id:
            form_data['templateId'] = template_id
            
        response = requests.post(
            f'{API_URL}/generate-pdf',
            json=form_data,
            headers=API_HEADERS
        )
        
        if response.ok:
            # Get first and last name from form data
            first_name = form_data.get('first', '').strip()
            last_name = form_data.get('last', '').strip()
            
            # Create filename with names
            if first_name or last_name:
                name_parts = [p for p in [first_name, last_name] if p]
                filename = f"{' '.join(name_parts)}.pdf"
            else:
                # Fallback if no name provided
                filename = "DOCUMENT.pdf"
                
            # Remove any invalid characters from filename
            filename = ''.join(c for c in filename if c.isalnum() or c in ' .')
            
            filepath = os.path.join('temp', filename)
            
            # Ensure temp directory exists
            os.makedirs('temp', exist_ok=True)
            
            # If file already exists, add a number
            base_path = filepath[:-4]  # Remove .pdf
            counter = 1
            while os.path.exists(filepath):
                filepath = f"{base_path} ({counter}).pdf"
                counter += 1
            
            # Save PDF content
            with open(filepath, 'wb') as f:
                f.write(response.content)
                
            return True, filepath
        else:
            print(f'PDF generation failed: {response.text}')
            return False, ''
            
    except Exception as e:
        print(f'Error generating PDF: {e}')
        return False, ''

def handle_json_data(chat_id: int, text: str) -> None:
    """Handle JSON data from user"""
    try:
        # Parse the JSON data
        data = json.loads(text)
        print(f'Received JSON data: {data}')
        
        # Get formatted dates
        dates = get_formatted_dates()
        print(f"Generated dates: {dates}")
        
        # Generate vehicle name and document name
        vehicle_name = generate_vehicle_name(data)
        document_name = generate_document_name(data)
        print(f"Generated vehicle name: {vehicle_name}")
        print(f"Generated document name: {document_name}")

        # Determine template slot and ensure template assignment
        slot_id, slot = determine_active_slot(chat_id)
        if not slot_id or not slot or not slot.get('templateId'):
            send_message(chat_id, '''❌ Error: No template assigned.

Use /usetemplate to assign templates to slot 1 or 2, then try again.''')
            return

        template_label = format_template_label(slot_id, slot)

        # Handle plate number generation using configured slot
        plate_value, next_plate_value = generate_sequence_value(slot_id, slot, 'plate')
        if plate_value:
            data['plate1'] = plate_value
            data['plate2'] = plate_value
            data['plate3'] = plate_value
            plate_info = f'''Template {slot_id} Plate: {plate_value}
Next queued plate: {next_plate_value or 'N/A'}'''
        else:
            plate_info = f"⚠️ Template {slot_id} plate not set. Use /setplate{slot_id}."

        # Handle car number generation
        car_value, next_car_value = generate_sequence_value(slot_id, slot, 'car')
        if car_value:
            data['car'] = car_value
            car_info = f'''Template {slot_id} Car #: {car_value}
Next queued car #: {next_car_value or 'N/A'}'''
        else:
            car_info = f"⚠️ Template {slot_id} car number not set. Use /setcar{slot_id}."
        
        # Transform the data to match form field names and validation requirements
        form_data = {
            # Required fields with validation
            'first': capitalize_name(data.get('first_name', '')).strip() or 'NO NAME PROVIDED',
            'last': capitalize_name(data.get('last_name', '')).strip() or 'NO NAME PROVIDED',
            'address': capitalize_name(data.get('address', '')).strip() or 'NO ADDRESS PROVIDED',
            'city': capitalize_name(data.get('city', '')).strip() or 'NO CITY PROVIDED',
            'state': capitalize_name(data.get('state', '')).strip() or 'XX',
            'zip': data.get('zip', '00000'),
            'plate1': data.get('plate1', '').strip() or 'NO PLATE',
            'vin1': (data.get('vin', '') or 'A' * 17).upper(),
            'make1': data.get('make', '').strip() or 'NO MAKE',
            'model1': data.get('model', '').strip() or 'NO MODEL',
            'year': data.get('year', '2024'),
            
            # Optional fields
            'documentName': document_name,
            'vehiclename': vehicle_name,
            'color': data.get('color', ''),
            'body': data.get('body', ''),
            'car': data.get('car', ''),
            'plate2': data.get('plate2', ''),
            'plate3': data.get('plate3', ''),
            'vin2': data.get('vin', ''),
            'vin3': data.get('vin', ''),
            'make2': data.get('make', ''),
            'model2': data.get('model', ''),
            'ins': data.get('ins_company', ''),
            'policy': data.get('policy_number', ''),
            'date1': dates['current'],
            'date2': dates['current'],
            'exp1': dates['expiration'],
            'exp2': dates['expiration'],
            'exp3': dates['exp3']
        }
        
        # Ensure VIN is exactly 17 characters and contains valid characters
        form_data['vin1'] = re.sub(r'[^A-HJ-NPR-Z0-9]', 'A', form_data['vin1'])[:17].ljust(17, 'A')
        if form_data['vin2']:
            form_data['vin2'] = re.sub(r'[^A-HJ-NPR-Z0-9]', 'A', form_data['vin2'])[:17].ljust(17, 'A')
        if form_data['vin3']:
            form_data['vin3'] = re.sub(r'[^A-HJ-NPR-Z0-9]', 'A', form_data['vin3'])[:17].ljust(17, 'A')
            
        # Ensure state is exactly 2 characters
        form_data['state'] = form_data['state'][:2].ljust(2, 'X')
        
        # Ensure ZIP code format
        if not re.match(r'^\d{5}(-\d{4})?$', form_data['zip']):
            form_data['zip'] = '00000'
            
        # Ensure year is 4 digits
        if not re.match(r'^\d{4}$', form_data['year']):
            form_data['year'] = '2024'
            
        print(f'Transformed form data: {json.dumps(form_data, indent=2)}')
        
        # Apply template assignment
        template_id = slot.get('templateId')
        if template_id:
            form_data['templateId'] = template_id
            form_data['templateSlot'] = slot_id

        # First, send data to telegram server for frontend sync
        webhook_data = {
            'message': {
                'chat': {'id': chat_id},
                'text': json.dumps(form_data),
                'meta': {
                    'templateSlot': slot_id,
                    'templateId': template_id
                }
            }
        }
        print(f'Sending webhook data: {json.dumps(webhook_data, indent=2)}')
        webhook_response = requests.post(f'{TELEGRAM_SERVER_URL}/telegram/webhook', json=webhook_data)
        print(f'Webhook response: {webhook_response.status_code} - {webhook_response.text}')
        
        if webhook_response.status_code != 200:
            print(f'Warning: Webhook request failed: {webhook_response.status_code} - {webhook_response.text}')
        
        # Then generate PDF using backend API
        success, pdf_path = generate_pdf(form_data, template_id)
        
        if not success:
            send_message(chat_id, '❌ Error: Could not generate PDF. Please try again later.')
            return
            
        # Send the PDF document
        caption = f'''📄 Document Details:
• Template: {template_label}
• Slot: {slot_id.upper()}
• Name: {document_name}
• Vehicle: {vehicle_name}
{plate_info}
{car_info}

🔗 View or edit in browser:
{FRONTEND_URL}?chat_id={chat_id}&slot={slot_id}

Note: Please wait a few seconds before opening the link to ensure data is synchronized.'''
        
        if send_document(chat_id, pdf_path, caption):
            # Clean up the temporary file
            try:
                os.remove(pdf_path)
            except:
                pass
            # Save updated numbers
            save_user_preferences()
        else:
            send_message(chat_id, '❌ Error: Could not send the document. Please try again later.')
            
    except json.JSONDecodeError:
        send_message(chat_id, '❌ Error: Invalid JSON format. Please send a properly formatted JSON message.\n\nSend /start to see an example.')
    except Exception as e:
        print(f'Error handling message: {e}')
        send_message(chat_id, '❌ Error: Something went wrong. Please try again later.')

def main():
    if not BOT_TOKEN:
        print('Error: TELEGRAM_BOT_TOKEN environment variable is not set.')
        sys.exit(1)
    print('Starting Telegram bot polling...')
    print(f'API URL: {API_URL}')
    print(f'Telegram server URL: {TELEGRAM_SERVER_URL}')
    print(f'Frontend URL: {FRONTEND_URL}')
    
    # Ensure temp directory exists
    os.makedirs('temp', exist_ok=True)
    
    # Load saved user preferences
    load_user_preferences()
    
    offset = None
    
    while True:
        try:
            updates = get_updates(offset)
            
            if not updates.get('ok'):
                print(f'Error getting updates: {updates}')
                time.sleep(5)
                continue
            
            for update in updates['result']:
                message = update.get('message', {})
                chat_id = message.get('chat', {}).get('id')
                text = message.get('text', '')
                
                if chat_id:
                    print(f'Received message from {chat_id}: {text}')
                    
                    lower_text = text.lower()
                    
                    if lower_text.startswith('/setplate1'):
                        handle_setplate_command(chat_id, '1', text)
                    elif lower_text.startswith('/setplate2'):
                        handle_setplate_command(chat_id, '2', text)
                    elif lower_text.startswith('/setplate'):
                        # Backwards compatibility for old command
                        handle_setplate_command(chat_id, '1', text)
                    elif lower_text.startswith('/setcar1'):
                        handle_setcar_command(chat_id, '1', text)
                    elif lower_text.startswith('/setcar2'):
                        handle_setcar_command(chat_id, '2', text)
                    elif lower_text.startswith('/setcar'):
                        handle_setcar_command(chat_id, '1', text)
                    elif lower_text.startswith('/usetemplate'):
                        handle_usetemplate_command(chat_id, text)
                    elif lower_text == '/settings':
                        handle_settings_command(chat_id)
                    elif lower_text == '/start':
                        handle_start_command(chat_id)
                    else:
                        handle_json_data(chat_id, text)
                
                # Update offset to acknowledge processed update
                offset = update['update_id'] + 1
        
        except Exception as e:
            print(f'Error in main loop: {e}')
            time.sleep(5)

if __name__ == '__main__':
    main() 