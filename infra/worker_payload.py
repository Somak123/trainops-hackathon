def generate_bash_script(job_id: str, backend_url: str) -> str:
    """
    Generates the cloud-init bash script that runs inside the Droplet on boot.
    We use a heredoc (cat << 'EOF') to write a Python script inside the bash script.
    """
    return f"""#!/bin/bash
# 1. System logs for debugging (saves to /var/log/cloud-init-output.log)
exec > >(tee /var/log/trainops_worker.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting TrainOps Worker for Job: {job_id}"

# 2. Install minimal dependencies
apt-get update
apt-get install -y python3 python3-pip curl
pip3 install boto3

# 3. Write the Mock AI Training Python Script
cat << 'EOF' > /root/train.py
import time
import os
import boto3

job_id = "{job_id}"
ACCESS_KEY = "DO00EMCJ4UYTNPT6JL3N"
SECRET_KEY = "XAfL2GhuCp5CTFopbzl4bd93AdzImWUIQSdf4YMn7mI"
REGION = "sfo3"
BUCKET = "trainops-demo"
ENDPOINT = f"https://{{REGION}}.digitaloceanspaces.com"

print("Downloading dataset from DO Spaces...")
time.sleep(5)

print("Initializing Base Model (TinyLlama-1.1B)...")
time.sleep(3)

print("Starting training loop...")
for epoch in range(1, 11):
    # Faking the math to look cool for the demo
    loss = 2.5 / epoch 
    print(f"Epoch {{epoch}}/10 | Loss: {{loss:.4f}} | Step: {{epoch*100}}")
    time.sleep(2)

print("Training complete! Generating dummy safetensors file...")
time.sleep(2)

weights_path = "/root/adapter_model.safetensors"
with open(weights_path, "wb") as f:
    f.write(os.urandom(1024 * 1024 * 5)) # 5MB dummy weights file

print("Uploading final model to DO Spaces...")
object_name = f"weights/{{job_id}}/adapter_model.safetensors"

session = boto3.session.Session()
client = session.client('s3',
                        region_name=REGION,
                        endpoint_url=ENDPOINT,
                        aws_access_key_id=ACCESS_KEY,
                        aws_secret_access_key=SECRET_KEY)

client.upload_file(weights_path, BUCKET, object_name, ExtraArgs={{'ACL': 'public-read'}})

public_url = f"https://{{BUCKET}}.{{REGION}}.digitaloceanspaces.com/{{object_name}}"
with open("/root/weights_url.txt", "w") as f:
    f.write(public_url)

print("Upload complete! URL:", public_url)
EOF

# 4. Execute the Python script
python3 /root/train.py

# 5. Extract the uploaded URL
WEIGHTS_URL=$(cat /root/weights_url.txt)

# 6. Notify Dev 2's Backend that we are done!
# We send a POST request so Dev 2 knows to update the UI to "Completed" and destroy this droplet.
curl -X POST {backend_url}/webhook/complete \\
     -H "Content-Type: application/json" \\
     -d '{{"job_id": "{job_id}", "status": "success", "weights_url": "'"$WEIGHTS_URL"'"}}'

echo "Worker script finished. Awaiting self-destruction."
"""
