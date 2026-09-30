#!/usr/bin/env python3
"""Check that the installed Gaia payload is present in this checkout."""
from project import validate_assets

if __name__ == "__main__":
    print(f"Gaia: {validate_assets()} applications available in assets/webapps")
