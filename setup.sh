sk_cors
#!/bin/bash

# Update package lists
sudo apt update

# Install Node.js and npm (if not already installed)
if ! command -v node &> /dev/null
then
    echo "Installing Node.js and npm..."
    sudo apt install -y nodejs npm
fi

# Install Angular CLI
if ! command -v ng &> /dev/null
then
    echo "Installing Angular CLI..."
    npm install -g @angular/cli@16
fi

# Navigate to project directory
cd Progettone-main/crime-report-app2 || exit

# Install project dependencies
npm install

# Install Python dependencies
pip install pymongo flask flask_cors
