#!/bin/bash
ROOT_DIR=$(pwd)
TABBY_AGENT_DIR="../tabby-agent" 
NODE_MODULES_DIR="./node_modules" 

cd "$TABBY_AGENT_DIR"

if [ $? -ne 0 ]; then
    echo "Failed to navigate to tabby-agent directory."
    exit 1
fi

echo "Building tabby-agent..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed."
    exit 1
fi

echo "Packing tabby-agent..."
TABBY_AGENT_PACKAGE=$(npm pack)

if [ $? -ne 0 ]; then
    echo "Packing failed."
    exit 1
fi

echo "Copying $TABBY_AGENT_PACKAGE to root Client direcotory."
cp "$TABBY_AGENT_PACKAGE" "../vsclient"

cd ../vsclient

echo "Installing $TABBY_AGENT_PACKAGE..."
npm install "$TABBY_AGENT_PACKAGE"

rm "$TABBY_AGENT_PACKAGE"

if [ $? -ne 0 ]; then
    echo "Installation failed."
    exit 1
fi

echo "tabby-agent successfully deployed to node_modules."