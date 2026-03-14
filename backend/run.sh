#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Create venv if missing
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3.12 -m venv venv
fi

source venv/bin/activate

# Install deps if needed
pip install -q -r requirements.txt

# Check .env
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found. Create one with:"
    echo "  DATABASE_URL=postgresql://localhost/conflictmap"
    echo "  GEMINI_API_KEY=your_key_here"
    exit 1
fi

# Check PostgreSQL
if ! pg_isready -q 2>/dev/null; then
    echo "Starting PostgreSQL..."
    brew services start postgresql@17
    sleep 2
fi

# Create database if it doesn't exist
if ! /opt/homebrew/opt/postgresql@17/bin/psql -lqt | grep -qw conflictmap; then
    echo "Creating database 'conflictmap'..."
    /opt/homebrew/opt/postgresql@17/bin/createdb conflictmap
fi

echo "Starting server at http://localhost:8000"
echo "Health check: http://localhost:8000/health"
echo "Events API:   http://localhost:8000/api/events"
uvicorn main:app --reload
