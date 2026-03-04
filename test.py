import requests

API_KEY = "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"

url = "https://openrouter.ai/api/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "model": "deepseek/deepseek-chat",
    "messages": [
        {"role": "user", "content": "Hello"}
    ]
}

response = requests.post(url, headers=headers, json=payload)

print(response.status_code)
print(response.text)