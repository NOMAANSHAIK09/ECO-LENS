import requests

API_KEY = 

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
