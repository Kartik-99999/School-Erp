import requests
import json

url = "http://localhost:8000/api/v1/academics/periods"
headers = {"Host": "dcmc.localhost:8000"} # Assuming no token is needed? Wait, tenant context needs token or just host?
# Actually deps.set_tenant_context needs just host.
response = requests.get(url, headers=headers)
print(response.status_code)
print(response.text)
