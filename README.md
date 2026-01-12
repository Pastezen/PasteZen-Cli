# Pastezen CLI

Command-line interface for [Pastezen](https://pastezen.com) - secure code sharing & secrets management.

## Installation

### Quick Install (recommended)
```bash
curl -fsSL https://backend.pastezen.com/install.sh | bash
```

### Via npm
```bash
npm install -g pastezen-cli
```

### From source
```bash
git clone https://github.com/Pastezen/PasteZen-Cli.git
cd PasteZen-Cli
npm install
npm link
```

## Quick Start

```bash
# Authenticate with your API token
pz auth token YOUR_API_TOKEN

# Push a file
pz push myfile.js

# List your pastes
pz list

# Create a Pastebox
pz pastebox create mybox
```

## Commands

### Authentication

```bash
pz auth token <TOKEN>   # Set API token
pz auth status          # Show auth status
pz auth logout          # Clear credentials
```

Get your API token from: https://pastezen.com/tokens

### Pastes

```bash
# Push files
pz push file.js                    # Single file
pz push file1.js file2.py          # Multiple files
pz push file.js --title "My Code"  # Custom title
pz push file.js --private          # Private paste
pz push file.js --password         # Password protect
pz push file.js --expire 1d        # Expire in 1 day

# Manage pastes
pz list                            # List your pastes
pz view <paste-id>                 # View content
pz pull <paste-id>                 # Download files
pz delete <paste-id>               # Delete paste
```

### Pasteboxes (Isolated Environments)

```bash
# Create and manage
pz pastebox create <name>                    # Create new Pastebox
pz pastebox create <name> --ssh-auth both    # With SSH key + password
pz pastebox list                             # List your Pasteboxes
pz pastebox inspect <id>                     # Show details
pz pastebox delete <id>                      # Delete Pastebox

# SSH Access
pz pastebox ssh <id>                         # Connect via SSH
pz pastebox ssh-info <id>                    # Show SSH details

# File Operations
pz pastebox files <id>                       # List files
pz pastebox upload <id> local.txt /remote/   # Upload file
pz pastebox download <id> /remote/file.txt . # Download file

# Secrets
pz pastebox secrets <id> --list              # List injected secrets
pz pastebox secrets <id> --set API_KEY=xxx   # Inject a secret
pz pastebox secrets <id> --env-file .env     # Import from .env
```

### Secrets Management

```bash
# Project management
pz secrets list                    # List projects
pz secrets create "My Project"     # Create private project
pz secrets create "Config" --public # Create public project
pz secrets delete <id>             # Delete project

# Key-value operations
pz secrets view <id>               # View all secrets
pz secrets set <id> API_KEY=xxx    # Set a value
pz secrets get <id> API_KEY        # Get a value

# Import/Export
pz secrets export <id> > .env      # Export to .env
pz secrets export <id> -o .env     # Export to file
pz secrets import <id> .env        # Import from .env
```

### Code Execution

```bash
pz run <paste-id>                  # Execute paste
pz run script.py --lang python     # Execute local file
```

### Configuration

```bash
pz config                          # Show config
pz config --set apiUrl=https://... # Change API URL
```

## Configuration

Config is stored in `~/.pastezen/config.json`:

```json
{
  "apiUrl": "https://backend.pastezen.com",
  "token": "your-api-token"
}
```

## Examples

### Quick code sharing
```bash
# Share a snippet quickly
echo 'console.log("Hello!")' | pz push -

# Share multiple files
pz push src/*.js --title "Source files"
```

### Pastebox workflow
```bash
# Create an isolated environment
pz pastebox create dev-env --ssh-auth password

# Upload your project
pz pastebox upload abc123 ./src/ /app/src/ --recursive

# Inject secrets
pz pastebox secrets abc123 --env-file .env.production

# Connect and run
pz pastebox ssh abc123
```

### Secrets workflow
```bash
# Create a project for your app
pz secrets create "MyApp Production"

# Add secrets
pz secrets set abc123 DATABASE_URL=postgres://...
pz secrets set abc123 API_KEY=sk_live_xxx

# Export for deployment
pz secrets export abc123 -o .env
```

## License

MIT
