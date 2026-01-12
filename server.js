/**
 * BRIDGE SCRIPT
 * This file exists because you are running 'node server.js' from this folder.
 * The actual server code is inside the 'backend' folder.
 * This script will automatically find it and run it for you.
 */

console.log('🚀 Redirecting to the actual server in the backend folder...');
const path = require('path');

// Define paths
const backendDir = path.join(__dirname, 'backend');
const serverFile = path.join(backendDir, 'server.js');

// Change working directory so .env and modules are found correctly
process.chdir(backendDir);

// Start the actual server
try {
    require(serverFile);
} catch (error) {
    console.error("❌ Failed to start server:", error.message);
}
