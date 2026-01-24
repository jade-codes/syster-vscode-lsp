#!/usr/bin/env node

/**
 * Downloads ALL syster-lsp binaries from GitHub releases.
 * Bundles Linux, macOS (x64/arm64), and Windows binaries for universal extension.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const LSP_VERSION = '0.2.1-alpha';
const REPO = 'jade-codes/syster-lsp';
const SERVER_DIR = path.join(__dirname, '..', 'server');

/**
 * All supported platforms and their release artifacts
 */
const PLATFORMS = [
    { artifact: 'syster-linux-x64', binary: 'syster-lsp-linux-x64', extension: 'tar.gz', isWindows: false },
    { artifact: 'syster-darwin-x64', binary: 'syster-lsp-darwin-x64', extension: 'tar.gz', isWindows: false },
    { artifact: 'syster-darwin-arm64', binary: 'syster-lsp-darwin-arm64', extension: 'tar.gz', isWindows: false },
    { artifact: 'syster-windows-x64', binary: 'syster-lsp-win32-x64.exe', extension: 'zip', isWindows: true },
];

/**
 * Download and extract all platform binaries
 */
async function downloadAllPlatforms() {
    console.log(`Downloading syster-lsp binaries from ${REPO} v${LSP_VERSION}...`);
    
    // Get release assets
    const releaseUrl = `https://api.github.com/repos/${REPO}/releases/tags/v${LSP_VERSION}`;
    const releaseData = await fetchJson(releaseUrl);
    
    if (!releaseData.assets || releaseData.assets.length === 0) {
        throw new Error(`No assets found in release v${LSP_VERSION}`);
    }

    console.log(`Found ${releaseData.assets.length} assets`);
    fs.mkdirSync(SERVER_DIR, { recursive: true });

    // Track if we've copied sysml.library already
    let stdlibCopied = false;

    for (const platform of PLATFORMS) {
        const assetName = `${platform.artifact}.${platform.extension}`;
        const asset = releaseData.assets.find(a => a.name === assetName);

        if (!asset) {
            console.warn(`  ⚠ ${assetName} not found, skipping...`);
            continue;
        }

        console.log(`  Downloading ${assetName}...`);
        
        // Download to temp location
        const tempFile = path.join(os.tmpdir(), assetName);
        await downloadFile(asset.browser_download_url, tempFile);

        // Extract to temp directory
        const tempDir = path.join(os.tmpdir(), `syster-extract-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        try {
            if (platform.extension === 'zip') {
                // Use unzip on Unix, PowerShell on Windows
                if (process.platform === 'win32') {
                    execSync(`powershell -command "Expand-Archive -Force '${tempFile}' '${tempDir}'"`, { stdio: 'pipe' });
                } else {
                    execSync(`unzip -q -o "${tempFile}" -d "${tempDir}"`, { stdio: 'pipe' });
                }
            } else {
                execSync(`tar -xzf "${tempFile}" -C "${tempDir}"`, { stdio: 'pipe' });
            }

            // Copy binary with platform-specific name
            const sourceBinary = path.join(tempDir, platform.isWindows ? 'syster-lsp.exe' : 'syster-lsp');
            const destBinary = path.join(SERVER_DIR, platform.binary);

            if (fs.existsSync(sourceBinary)) {
                fs.copyFileSync(sourceBinary, destBinary);
                if (!platform.isWindows) {
                    fs.chmodSync(destBinary, 0o755);
                }
                console.log(`  ✓ ${platform.binary}`);
            } else {
                console.warn(`  ⚠ Binary not found in archive: ${sourceBinary}`);
            }

            // Copy sysml.library once (it's the same in all packages)
            if (!stdlibCopied) {
                const sourceStdlib = path.join(tempDir, 'sysml.library');
                const destStdlib = path.join(SERVER_DIR, 'sysml.library');
                if (fs.existsSync(sourceStdlib)) {
                    // Remove existing if present
                    if (fs.existsSync(destStdlib)) {
                        fs.rmSync(destStdlib, { recursive: true, force: true });
                    }
                    copyDirSync(sourceStdlib, destStdlib);
                    stdlibCopied = true;
                    console.log(`  ✓ sysml.library`);
                }
            }
        } finally {
            // Cleanup temp files
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.unlinkSync(tempFile);
        }
    }

    console.log(`\n✓ All binaries installed to ${SERVER_DIR}`);
}

/**
 * Recursively copy a directory
 */
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Fetch JSON from URL
 */
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'syster-vscode-lsp',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                fetchJson(res.headers.location).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data.substring(0, 200)}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Download file from URL
 */
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'syster-vscode-lsp',
                'Accept': 'application/octet-stream'
            }
        };

        const request = https.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                downloadFile(res.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`Download failed: HTTP ${res.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(dest);
            res.pipe(file);
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

async function main() {
    try {
        await downloadAllPlatforms();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
