import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Extract YAML frontmatter from a skill file.
 * Current format:
 * ---
 * name: skill-name
 * description: Use when [condition] - [what it does]
 * ---
 *
 * @param {string} filePath - Path to SKILL.md file
 * @returns {{name: string, description: string}}
 */
function extractFrontmatter(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        let inFrontmatter = false;
        let name = '';
        let description = '';

        for (const line of lines) {
            if (line.trim() === '---') {
                if (inFrontmatter) break;
                inFrontmatter = true;
                continue;
            }

            if (inFrontmatter) {
                const match = line.match(/^(\w+):\s*(.*)$/);
                if (match) {
                    const [, key, value] = match;
                    switch (key) {
                        case 'name':
                            name = value.trim();
                            break;
                        case 'description':
                            description = value.trim();
                            break;
                    }
                }
            }
        }

        return { name, description };
    } catch (error) {
        return { name: '', description: '' };
    }
}

/**
 * Find all SKILL.md files in a directory recursively.
 *
 * @param {string} dir - Directory to search
 * @param {string} sourceType - 'personal' or 'flutter-craft' for namespacing
 * @param {number} maxDepth - Maximum recursion depth (default: 3)
 * @returns {Array<{path: string, name: string, description: string, sourceType: string}>}
 */
function findSkillsInDir(dir, sourceType, maxDepth = 3) {
    const skills = [];

    if (!fs.existsSync(dir)) return skills;

    function recurse(currentDir, depth) {
        if (depth > maxDepth) return;

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                // Check for SKILL.md in this directory
                const skillFile = path.join(fullPath, 'SKILL.md');
                if (fs.existsSync(skillFile)) {
                    const { name, description } = extractFrontmatter(skillFile);
                    skills.push({
                        path: fullPath,
                        skillFile: skillFile,
                        name: name || entry.name,
                        description: description || '',
                        sourceType: sourceType
                    });
                }

                // Recurse into subdirectories
                recurse(fullPath, depth + 1);
            }
        }
    }

    recurse(dir, 0);
    return skills;
}

/**
 * Resolve a skill name to its file path, handling shadowing
 * (personal skills override flutter-craft skills).
 *
 * @param {string} skillName - Name like "flutter-craft:flutter-brainstorming" or "my-skill"
 * @param {string} flutterCraftDir - Path to flutter-craft skills directory
 * @param {string} personalDir - Path to personal skills directory
 * @returns {{skillFile: string, sourceType: string, skillPath: string} | null}
 */
function resolveSkillPath(skillName, flutterCraftDir, personalDir) {
    // Strip flutter-craft: prefix if present
    const forceFlutterCraft = skillName.startsWith('flutter-craft:');
    const actualSkillName = forceFlutterCraft ? skillName.replace(/^flutter-craft:/, '') : skillName;

    // Try personal skills first (unless explicitly flutter-craft:)
    if (!forceFlutterCraft && personalDir) {
        const personalPath = path.join(personalDir, actualSkillName);
        const personalSkillFile = path.join(personalPath, 'SKILL.md');
        if (fs.existsSync(personalSkillFile)) {
            return {
                skillFile: personalSkillFile,
                sourceType: 'personal',
                skillPath: actualSkillName
            };
        }
    }

    // Try flutter-craft skills
    if (flutterCraftDir) {
        const flutterCraftPath = path.join(flutterCraftDir, actualSkillName);
        const flutterCraftSkillFile = path.join(flutterCraftPath, 'SKILL.md');
        if (fs.existsSync(flutterCraftSkillFile)) {
            return {
                skillFile: flutterCraftSkillFile,
                sourceType: 'flutter-craft',
                skillPath: actualSkillName
            };
        }
    }

    return null;
}

/**
 * Check if a git repository has updates available.
 *
 * @param {string} repoDir - Path to git repository
 * @returns {boolean} - True if updates are available
 */
function checkForUpdates(repoDir) {
    try {
        // Quick check with 3 second timeout to avoid delays if network is down
        const output = execSync('git fetch origin && git status --porcelain=v1 --branch', {
            cwd: repoDir,
            timeout: 3000,
            encoding: 'utf8',
            stdio: 'pipe'
        });

        // Parse git status output to see if we're behind
        const statusLines = output.split('\n');
        for (const line of statusLines) {
            if (line.startsWith('## ') && line.includes('[behind ')) {
                return true; // We're behind remote
            }
        }
        return false; // Up to date
    } catch (error) {
        // Network down, git error, timeout, etc. - don't block bootstrap
        return false;
    }
}

/**
 * Strip YAML frontmatter from skill content, returning just the content.
 *
 * @param {string} content - Full content including frontmatter
 * @returns {string} - Content without frontmatter
 */
function stripFrontmatter(content) {
    const lines = content.split('\n');
    let inFrontmatter = false;
    let frontmatterEnded = false;
    const contentLines = [];

    for (const line of lines) {
        if (line.trim() === '---') {
            if (inFrontmatter) {
                frontmatterEnded = true;
                continue;
            }
            inFrontmatter = true;
            continue;
        }

        if (frontmatterEnded || !inFrontmatter) {
            contentLines.push(line);
        }
    }

    return contentLines.join('\n').trim();
}

/**
 * Detect if current directory is a Flutter project.
 *
 * @param {string} dir - Directory to check
 * @returns {boolean} - True if Flutter project detected
 */
function isFlutterProject(dir) {
    const pubspecPath = path.join(dir, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) return false;

    try {
        const content = fs.readFileSync(pubspecPath, 'utf8');
        return content.includes('flutter:') || content.includes('flutter_test:');
    } catch (error) {
        return false;
    }
}

/**
 * Get Flutter project info from pubspec.yaml.
 *
 * @param {string} dir - Directory containing pubspec.yaml
 * @returns {{name: string, version: string, description: string} | null}
 */
function getFlutterProjectInfo(dir) {
    const pubspecPath = path.join(dir, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) return null;

    try {
        const content = fs.readFileSync(pubspecPath, 'utf8');
        const lines = content.split('\n');

        let name = '';
        let version = '';
        let description = '';

        for (const line of lines) {
            const nameMatch = line.match(/^name:\s*(.+)$/);
            const versionMatch = line.match(/^version:\s*(.+)$/);
            const descMatch = line.match(/^description:\s*(.+)$/);

            if (nameMatch) name = nameMatch[1].trim();
            if (versionMatch) version = versionMatch[1].trim();
            if (descMatch) description = descMatch[1].trim();
        }

        return { name, version, description };
    } catch (error) {
        return null;
    }
}

export {
    extractFrontmatter,
    findSkillsInDir,
    resolveSkillPath,
    checkForUpdates,
    stripFrontmatter,
    isFlutterProject,
    getFlutterProjectInfo
};
