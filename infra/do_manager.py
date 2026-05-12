import os
import time
import requests
from worker_payload import generate_bash_script

# Get this from your DigitalOcean Dashboard (API -> Generate New Token)
DO_TOKEN = os.getenv("DO_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {DO_TOKEN}",
    "Content-Type": "application/json"
}

def create_worker_droplet(job_id: str, user_data_script: str):
    """Creates a Droplet and injects the worker script to run on boot."""
    print(f"Provisioning Droplet for Job {job_id}...")
    
    data = {
        "name": f"trainops-worker-{job_id}",
        "region": "nyc3", 
        "size": "s-2vcpu-4gb", 
        "image": "ubuntu-22-04-x64",
        "user_data": user_data_script,
        "tags": ["trainops-demo"]
    }
    
    response = requests.post("https://api.digitalocean.com/v2/droplets", json=data, headers=HEADERS)
    
    if response.status_code == 202:
        droplet_id = response.json()["droplet"]["id"]
        print(f"Droplet {droplet_id} created successfully!")
        return droplet_id
    else:
        raise Exception(f"Failed to create Droplet: {response.text}")

def destroy_droplet(droplet_id: str):
    """Nukes the Droplet to stop billing."""
    print(f"Destroying Droplet {droplet_id}...")
    response = requests.delete(f"https://api.digitalocean.com/v2/droplets/{droplet_id}", headers=HEADERS)
    
    if response.status_code == 204:
        print("Droplet destroyed successfully.")
        return True
    else:
        print(f"Failed to destroy Droplet: {response.text}")
        return False

if __name__ == "__main__":
    job_id = "hackathon-test-99"
    mock_backend_url = "https://webhook.site/a44245eb-7154-40c9-8272-9f5d5f72d63f" 
    
    script = generate_bash_script(job_id, mock_backend_url)
    
    # 1. Create the Droplet
    did = create_worker_droplet(job_id, script)
    
    # 2. Wait for it to do its job. 
    print("Droplet created. Waiting 180 seconds for the cloud-init script to run and fire the webhook...")
    time.sleep(180)
    
    # 3. Clean up
    destroy_droplet(did)
