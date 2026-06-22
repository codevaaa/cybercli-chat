import urllib.request, json

API_KEY = 'AtuMz0O5crIuU4rIAbsilCYLVKwFBfGegBt4Y4vDeWmjYT76sy96caM3k4TsaiIgA5B+BlyFF6InxIEQJnJo9Zl4af+R0Y+KlP5Lnlq+Fhi6LccqUzAdH09X0V7yB0n8GvSv0trro96k18fL1x5O'
models_to_test = ['gpt-5.5', 'claude-fable-5', 'gemini-3.1-pro', 'qwen3', 'qwen3-235b']

for model in models_to_test:
    data = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': 'Say hi'}]}).encode('utf-8')
    req = urllib.request.Request(
        'https://api.llm7.io/v1/chat/completions', 
        data=data, 
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
    )
    
    try:
        res = urllib.request.urlopen(req)
        output = json.loads(res.read().decode('utf-8'))
        content = output.get("choices", [{}])[0].get("message", {}).get("content", "").replace('\n', ' ')
        print(f'{model}: SUCCESS -> {content}')
    except Exception as e:
        if hasattr(e, 'read'):
            err = e.read().decode('utf-8', errors='ignore')
            print(f'{model}: FAILED -> {e.code} {e.reason} - {err}')
        else:
            print(f'{model}: FAILED -> {str(e)}')
