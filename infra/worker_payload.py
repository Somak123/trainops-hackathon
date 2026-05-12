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
apt-get install -y python3 curl

# 3. Write the Mock AI Training Python Script
cat << 'EOF' > /root/train.py
import time

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

print("Training complete! Exporting safetensors...")
time.sleep(4)

print("Uploading final model to DO Spaces...")
time.sleep(3)
EOF

# 4. Execute the Python script
python3 /root/train.py

# 5. Notify Dev 2's Backend that we are done!
# We send a POST request so Dev 2 knows to update the UI to "Completed" and destroy this droplet.
curl -X POST {backend_url}/webhook/complete \\
     -H "Content-Type: application/json" \\
     -d '{{"job_id": "{job_id}", "status": "success"}}'

echo "Worker script finished. Awaiting self-destruction."
"""
