#!/usr/bin/env bash
set -euo pipefail

# Sample Flutter Project Scaffold
# Creates the directory structure for testing flutter-craft skills

echo "Creating sample Flutter project structure..."

# Create feature directories
mkdir -p lib/features/auth/domain/entities
mkdir -p lib/features/auth/domain/repositories
mkdir -p lib/features/auth/data/models
mkdir -p lib/features/auth/data/datasources
mkdir -p lib/features/auth/data/repositories
mkdir -p lib/features/auth/presentation/bloc
mkdir -p lib/features/auth/presentation/screens
mkdir -p lib/features/auth/presentation/widgets

# Create test directories
mkdir -p test/features/auth/data/repositories
mkdir -p test/features/auth/presentation/bloc

# Create docs directory
mkdir -p docs/plans

echo "Directory structure created!"
echo ""
echo "Structure:"
echo "lib/features/auth/"
echo "├── domain/"
echo "│   ├── entities/"
echo "│   └── repositories/"
echo "├── data/"
echo "│   ├── models/"
echo "│   ├── datasources/"
echo "│   └── repositories/"
echo "└── presentation/"
echo "    ├── bloc/"
echo "    ├── screens/"
echo "    └── widgets/"
echo ""
echo "test/features/auth/"
echo "├── data/repositories/"
echo "└── presentation/bloc/"
echo ""
echo "docs/plans/"
echo ""
echo "Next steps:"
echo "1. Copy design.md to docs/plans/"
echo "2. Copy plan.md to docs/plans/"
echo "3. Use flutter-craft:flutter-executing to implement"
