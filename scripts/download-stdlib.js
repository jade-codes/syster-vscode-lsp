#!/usr/bin/env node

/**
 * Downloads the SysML standard library from the syster-base GitHub release.
 * Places it in server/sysml.library so it's discovered by the LSP server.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STDLIB_VERSION = '0.1.12-alpha';
const STDLIB_REPO = 'jade-codes/syster-base';
const STDLIB_DIR = path.join(__dirname, '..', 'server', 'sysml.library');

/**
 * Download a file from a URL, following redirects
 */
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, {
            headers: {
                'User-Agent': 'syster-vscode-lsp',
                'Accept': 'application/octet-stream'
            }
        }, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
                const redirectUrl = response.headers.location;
                console.log(`Following redirect to: ${redirectUrl}`);
                downloadFile(redirectUrl, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
            file.on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        });

        request.on('error', reject);
    });
}

/**
 * Extract a tar.gz archive
 */
function extractTarGz(archive, dest) {
    // Ensure destination exists
    fs.mkdirSync(dest, { recursive: true });
    
    // Use tar command (available on Linux, macOS, and Windows with Git Bash/WSL)
    try {
        execSync(`tar -xzf "${archive}" -C "${dest}"`, { stdio: 'inherit' });
    } catch (error) {
        throw new Error(`Failed to extract archive: ${error.message}`);
    }
}

/**
 * Clone/copy stdlib from GitHub using sparse checkout
 */
async function cloneStdlib() {
    const tempDir = path.join(__dirname, '..', '.stdlib-temp');
    
    // Clean up any existing temp directory
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }

    console.log(`Cloning sysml.library from ${STDLIB_REPO}...`);
    
    try {
        // Clone with sparse checkout to only get sysml.library
        execSync(`git clone --depth 1 --filter=blob:none --sparse https://github.com/${STDLIB_REPO}.git "${tempDir}"`, {
            stdio: 'inherit'
        });
        
        // Set sparse checkout to only include sysml.library
        execSync('git sparse-checkout set sysml.library', {
            cwd: tempDir,
            stdio: 'inherit'
        });
        
        // Remove old stdlib if exists
        if (fs.existsSync(STDLIB_DIR)) {
            fs.rmSync(STDLIB_DIR, { recursive: true });
        }
        
        // Ensure server directory exists
        fs.mkdirSync(path.dirname(STDLIB_DIR), { recursive: true });
        
        // Move the stdlib to server directory
        const srcDir = path.join(tempDir, 'sysml.library');
        if (fs.existsSync(srcDir)) {
            fs.renameSync(srcDir, STDLIB_DIR);
            console.log(`✓ Stdlib installed to ${STDLIB_DIR}`);
        } else {
            throw new Error('sysml.library not found in cloned repo');
        }
    } finally {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    }
}

async function main() {
    console.log(`Downloading SysML standard library v${STDLIB_VERSION}...`);
    
    // Check if stdlib already exists
    if (fs.existsSync(STDLIB_DIR)) {
        console.log(`Stdlib already exists at ${STDLIB_DIR}`);
        console.log('Removing old version...');
        fs.rmSync(STDLIB_DIR, { recursive: true });
    }
    
    await cloneStdlib();
    
    // Verify the stdlib was downloaded correctly
    const kernelLib = path.join(STDLIB_DIR, 'Kernel Libraries');
    const domainLib = path.join(STDLIB_DIR, 'Domain Libraries');
    
    if (!fs.existsSync(kernelLib) || !fs.existsSync(domainLib)) {
        throw new Error('Stdlib download verification failed - missing expected directories');
    }
    
    console.log('✓ SysML standard library downloaded successfully');
}

main().catch((error) => {
    console.error('Error downloading stdlib:', error.message);
    process.exit(1);
});
