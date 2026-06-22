import urllib.request
import json
import os

API_KEY = 'AtuMz0O5crIuU4rIAbsilCYLVKwFBfGegBt4Y4vDeWmjYT76sy96caM3k4TsaiIgA5B+BlyFF6InxIEQJnJo9Zl4af+R0Y+KlP5Lnlq+Fhi6LccqUzAdH09X0V7yB0n8GvSv0trro96k18fL1x5O'

prompt = """
Write a very short, highly motivational message (in Hinglish) for a developer who is training an advanced AI model named 'Brahma-v1' on Kaggle for their platform 'Codeva'. Make it sound incredibly epic, like a cyberpunk movie dialogue.
"""

data = json.dumps({
    'model': 'claude-fable-5',
    'messages': [{'role': 'user', 'content': prompt}]
}).encode('utf-8')

req = urllib.request.Request(
    'https://api.llm7.io/v1/chat/completions', 
    data=data, 
    headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
)

try:
    res = urllib.request.urlopen(req)
    output = json.loads(res.read().decode('utf-8'))
    content = output.get("choices", [{}])[0].get("message", {}).get("content", "")
    
    with open("claude_output.txt", "w", encoding="utf-8") as f:
        f.write(content)
        
    print("SUCCESS: Claude's response has been saved to claude_output.txt")
except Exception as e:
    if hasattr(e, 'read'):
        err = e.read().decode('utf-8', errors='ignore')
        print(f'FAILED: {e.code} {e.reason} - {err}')
    else:
        print(f'FAILED: {str(e)}')
