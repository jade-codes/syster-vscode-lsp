#!/usr/bin/env node

/**
 * Downloads the syster-lsp binary from GitHub releases.
 * Supports Linux, macOS (x64/arm64), and Windows.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LSP_VERSION = '0.1.13-alpha';
const REPO = 'jade-codes/syster-lsp';
const SERVER_DIR = path.join(__dirname, '..', 'server');

/**
 * Map Node.js platform/arch to release artifact names
 */
function getArtifactName() {
    const platform = process.platform;
    const arch = process.arch;

    const mapping = {
        'linux-x64': 'syster-linux-x64',
        'linux-arm64': 'syster-linux-x64', // Fallback to x64 for now
        'darwin-x64': 'syster-darwin-x64',
        'darwin-arm64': 'syster-darwin-arm64',
        'win32-x64': 'syster-windows-x64',
    };

    const key = `${platform}-${arch}`;
    const artifact = mapping[key];

    if (!artifact) {
        throw new Error(`Unsupported platform: ${platform}-${arch}`);
    }

    return artifact;
}

/**
 * Get the expected binary name for the current platform (used by extension)
 */
function getBinaryName() {
    const platform = process.platform;
    const arch = process.arch;
    let name = `syster-lsp-${platform}-${arch}`;
    if (platform === 'win32') {
        name += '.exe';
    }
    return name;
}

/**
 * Download and extract the release asset
 */
async function downloadRelease() {
    const artifact = getArtifactName();
    const isWindows = process.platform === 'win32';
    const extension = isWindows ? 'zip' : 'tar.gz';
    const assetName = `${artifact}.${extension}`;

    console.log(`Downloading ${assetName} from ${REPO} v${LSP_VERSION}...`);

    // Get release assets
    const releaseUrl = `https://api.github.com/repos/${REPO}/releases/tags/v${LSP_VERSION}`;
    
    const releaseData = await fetchJson(releaseUrl);
    const asset = releaseData.assets?.find(a => a.name === assetName);

    if (!asset) {
        console.log(`Available assets: ${releaseData.assets?.map(a => a.name).join(', ') || 'none'}`);
        throw new Error(`Asset ${assetName} not found in release v${LSP_VERSION}`);
    }

    // Download the asset
    const tempFile = path.join(__dirname, '..', assetName);
    await downloadFile(asset.browser_download_url, tempFile);

    // Extract
    console.log('Extracting...');
    fs.mkdirSync(SERVER_DIR, { recursive: true });

    if (isWindows) {
        // Use PowerShell to extract zip on Windows
        execSync(`powershell -command "Expand-Archive -Force '${tempFile}' '${SERVER_DIR}'"`, { stdio: 'inherit' });
    } else {
        execSync(`tar -xzf "${tempFile}" -C "${SERVER_DIR}"`, { stdio: 'inherit' });
    }

    // Rename binary to platform-specific name expected by extension
    const binaryName = getBinaryName();
    const sourceBinary = path.join(SERVER_DIR, isWindows ? 'syster-lsp.exe' : 'syster-lsp');
    const destBinary = path.join(SERVER_DIR, binaryName);

    if (fs.existsSync(sourceBinary) && sourceBinary !== destBinary) {
        fs.renameSync(sourceBinary, destBinary);
    }

    // Make executable on Unix
    if (!isWindows && fs.existsSync(destBinary)) {
        fs.chmodSync(destBinary, 0o755);
    }

    // Clean up temp file
    fs.unlinkSync(tempFile);

    console.log(`✓ Server installed: ${destBinary}`);
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

/**
 * Fallback to cargo install if release binary not available
 */
async function fallbackCargoInstall() {
    console.log('Release binary not available, falling back to cargo install...');
    console.log('This requires Rust to be installed.');
    
    const binaryName = getBinaryName();
    const isWindows = process.platform === 'win32';
    
    try {
        execSync(`cargo install syster-lsp --version ${LSP_VERSION} --root ./server-install --force`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });

        fs.mkdirSync(SERVER_DIR, { recursive: true });
        
        const sourceBinary = path.join(__dirname, '..', 'server-install', 'bin', isWindows ? 'syster-lsp.exe' : 'syster-lsp');
        const destBinary = path.join(SERVER_DIR, binaryName);
        
        fs.copyFileSync(sourceBinary, destBinary);
        
        if (!isWindows) {
            fs.chmodSync(destBinary, 0o755);
        }

        // Clean up
        fs.rmSync(path.join(__dirname, '..', 'server-install'), { recursive: true, force: true });
        
        console.log(`✓ Server installed via cargo: ${destBinary}`);
    } catch (err) {
        throw new Error(`Failed to install via cargo: ${err.message}`);
    }
}

async function main() {
    try {
        await downloadRelease();
    } catch (err) {
        console.warn(`Warning: ${err.message}`);
        await fallbackCargoInstall();
    }
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
