# Solace V8 - Intelligent Global Support Network

A free, anonymous, and intelligent emotional support platform that can be deployed anywhere.

## 🚀 What's New in V8: INTELLIGENT GLOBAL SUPPORT NETWORK

Solace V8 transforms the platform into an **Intelligent Global Support Network** with advanced AI-driven features, distributed deployment capabilities, and comprehensive emotional intelligence systems.

### Key V8 Features

#### 🤖 Emotional Intelligence Suite
- **Emotional Reasoning Engine**: AI-powered user state classification (stable, recovering, distressed, high-risk)
- **Intelligent Counselor Routing**: Smart matching based on timezone, specialization, experience, and compatibility
- **Recovery Tracking System**: Progress indicators, milestone achievements, and personalized insights
- **AI Emotional Assistant**: Optional AI coping strategies when counselors are unavailable

#### 🌐 Global Network Features
- **Distributed Deployment**: Independent community nodes with federation capabilities
- **Platform Resilience**: Auto-reconnect, fallback queues, offline buffering, and graceful degradation
- **Global Analytics Dashboard**: Anonymous activity patterns and platform insights
- **Cross-Node User Migration**: Seamless user transitions between geographic regions

#### 🛡️ Enhanced Privacy & Security
- **Data Minimization**: Automatic cleanup of chat history and mood logs
- **Federated Architecture**: No single point of failure or data concentration
- **Anonymous Analytics**: Privacy-preserving activity monitoring
- **Circuit Breaker Protection**: Automatic service isolation during failures

#### 📊 Advanced Analytics
- **User Journey Analytics**: Retention rates, drop-off points, and engagement patterns
- **Emotional Health Metrics**: Mood trends, crisis frequency, and recovery success rates
- **Platform Performance**: Response times, system uptime, and load distribution
- **Real-time Alerting**: Automated notifications for critical issues

---

## 🌍 Vision

Mental health support should not be a luxury.

Solace V8 creates a global network where anyone can receive intelligent, personalized emotional support anonymously, safely, and freely - anywhere in the world.

---

## ✨ Core Principles

### 1. Free Access
Most emotional support platforms are expensive. Solace will always prioritize **free access**.

### 2. Anonymous by Design
Solace does not require real names, phone numbers, personal identity, or social media accounts.

### 3. Intelligent Support
V8 introduces AI-powered emotional intelligence while maintaining human counselors as the primary support mechanism.

### 4. Global Resilience
Distributed architecture ensures the platform remains available even during regional outages or high-demand periods.

### 5. Self-Hosted & Portable
V8 maintains complete self-hosting capabilities with no external service dependencies.

### 6. Open Source
Solace is open source and community-driven.

---

## 🏗️ Architecture Overview

### Core Systems

#### Emotional Reasoning Engine (`lib/emotional-reasoning-engine.ts`)
- Analyzes mood patterns, chat sentiment, panic usage, and session frequency
- Classifies users into emotional states with confidence scoring
- Provides real-time state updates for routing and support decisions

#### Intelligent Counselor Router (`lib/counselor-router.ts`)
- Matches users with optimal counselors based on multiple factors:
  - Timezone compatibility for real-time support
  - Specialization alignment (anxiety, depression, trauma, etc.)
  - Experience level and performance history
  - Current workload and availability
  - Language preferences

#### Community Support Network (`lib/community-network.ts`)
- Structured support rooms with topic-based channels
- Anonymous peer support with moderation
- Content guidelines and automated moderation
- Participant management and room federation

#### AI Emotional Assistant (`lib/ai-assistant.ts`)
- Provides coping strategies and breathing exercises
- Crisis detection and escalation to human counselors
- Resource recommendations based on user needs
- Safety protocols ensuring AI never replaces human support

#### Recovery Tracking System (`lib/recovery-tracker.ts`)
- Calculates recovery scores based on multiple indicators
- Tracks stability trends and activity patterns
- Milestone achievements and personalized insights
- Progress visualization in user dashboard

#### Platform Resilience Manager (`lib/resilience-manager.ts`)
- Auto-reconnect functionality for dropped connections
- Offline message buffering and retry mechanisms
- Circuit breaker pattern for service protection
- Fallback queues for critical operations

#### Distributed Manager (`lib/distributed-manager.ts`)
- Federation between independent community nodes
- User migration between geographic regions
- Counselor availability synchronization
- Emergency broadcast across the network

#### Analytics Manager (`lib/analytics-manager.ts`)
- Privacy-preserving activity aggregation
- User journey and retention analysis
- Emotional health trend monitoring
- Platform performance metrics and alerting

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+ or MySQL 8+
- 2GB RAM minimum (4GB recommended)
- 10GB storage minimum

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/solace.git
   cd solace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database setup**
   ```bash
   # PostgreSQL
   createdb solace_db
   psql solace_db < db/schema.sql

   # Or MySQL
   mysql -u root -p < db/schema.sql
   ```

4. **Environment configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database and configuration settings
   ```

5. **Start the platform**
   ```bash
   npm run dev
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t solace .
docker run -p 3000:3000 solace
```

---

## ⚙️ Configuration

### Environment Variables

#### Database Configuration
```env
DATABASE_TYPE=postgresql  # or mysql
DATABASE_URL=postgresql://user:pass@localhost:5432/solace_db
# Or for MySQL:
# DATABASE_URL=mysql://user:pass@localhost:3306/solace_db
```

#### Node Configuration (Distributed Deployment)
```env
NODE_ID=node-001
NODE_REGION=us-east
NODE_TIMEZONE=America/New_York
MAX_USERS=1000
MAX_COUNSELORS=50
MAX_ROOMS=100

# Federation settings
FEDERATION_ENABLED=true
TRUSTED_NODES=node-002,node-003
SYNC_INTERVAL=300000

# Data retention (days)
CHAT_RETENTION_DAYS=30
MOOD_RETENTION_DAYS=90
ANALYTICS_RETENTION_DAYS=365
```

#### Analytics Configuration
```env
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_AGGREGATION_INTERVAL=15
ANALYTICS_PRIVACY_ANONYMIZE_AFTER=24
ANALYTICS_PRIVACY_AGGREGATE_ONLY=true

# Alert thresholds
ALERT_HIGH_PANIC_RATE=10
ALERT_LOW_COUNSELOR_AVAILABILITY=0.2
ALERT_HIGH_SYSTEM_LOAD=0.8
```

#### Resilience Configuration
```env
RESILIENCE_MAX_RETRIES=3
RESILIENCE_RETRY_DELAY=1000
RESILIENCE_CIRCUIT_BREAKER_THRESHOLD=5
RESILIENCE_CIRCUIT_BREAKER_TIMEOUT=30000
RESILIENCE_OFFLINE_BUFFER_SIZE=100
RESILIENCE_HEALTH_CHECK_INTERVAL=30000
```

---

## 🎯 User Experience

### For Support Seekers

1. **Anonymous Registration**: No personal information required
2. **Emotional State Assessment**: Optional mood logging and AI-powered state detection
3. **Intelligent Matching**: Automatic connection to the best available counselor
4. **Community Support**: Join topic-based support rooms for peer support
5. **Recovery Tracking**: View personal progress and milestone achievements
6. **AI Assistance**: Get coping strategies when counselors are busy

### For Counselors

1. **Smart Routing**: Receive matches based on your specialization and availability
2. **Timezone Awareness**: Connect with users in compatible time zones
3. **Performance Analytics**: View your impact and success rates
4. **Community Moderation**: Help maintain safe support rooms
5. **Global Dashboard**: Access anonymous platform analytics

### For Administrators

1. **Global Analytics**: Monitor platform health and user trends
2. **Distributed Management**: Oversee multiple nodes in the federation
3. **Resilience Monitoring**: Track system health and automatic recovery
4. **Privacy Controls**: Configure data retention and anonymization
5. **Alert Management**: Respond to critical system issues

---

## 🔧 API Reference

### Analytics Dashboard

```typescript
GET /api/dashboard/admin-analytics
// Returns comprehensive platform analytics

POST /api/dashboard/admin-analytics
// Returns detailed metrics for specific analysis
```

### Emotional Intelligence

```typescript
GET /api/emotional/state
// Get current user's emotional state

POST /api/emotional/assess
// Trigger emotional state assessment
```

### Counselor Routing

```typescript
GET /api/counselor/match
// Find optimal counselor match

POST /api/counselor/availability
// Update counselor availability and specializations
```

### Community Network

```typescript
GET /api/community/rooms
// List available support rooms

POST /api/community/rooms
// Create new support room

POST /api/community/join/:roomId
// Join a support room
```

### Recovery Tracking

```typescript
GET /api/recovery/progress
// Get user's recovery metrics

GET /api/recovery/milestones
// Get achieved milestones
```

---

## 🔒 Security & Privacy

### Data Minimization
- Automatic deletion of chat history after 30 days
- Mood log cleanup after 90 days
- Analytics data anonymization after 24 hours
- No persistent storage of personal identifiers

### Anonymous Analytics
- All analytics data is aggregated and anonymized
- No individual user tracking
- Privacy-preserving activity patterns only
- Configurable retention policies

### Distributed Security
- No single point of data concentration
- Federation encryption for cross-node communication
- Circuit breaker protection against cascading failures
- Automatic service isolation during incidents

---

## 🌐 Federation & Scaling

### Node Types

#### Primary Nodes
- Full-featured community hubs
- Counselor coordination and routing
- Analytics aggregation and reporting

#### Secondary Nodes
- Community support rooms only
- Limited counselor availability
- Data synchronization with primary nodes

#### Edge Nodes
- AI assistance and basic support
- Offline-capable with sync when connected
- Minimal data retention for privacy

### Federation Features

- **User Migration**: Seamless movement between nodes
- **Counselor Sync**: Availability sharing across regions
- **Emergency Broadcast**: Cross-node crisis alerts
- **Room Federation**: Multi-node community rooms

---

## 📈 Monitoring & Maintenance

### Health Checks

```bash
# Platform health
GET /api/health

# Node status
GET /api/node/status

# Federation health
GET /api/federation/status
```

### Automated Tasks

- **Data Cleanup**: Daily removal of expired data
- **Analytics Aggregation**: 15-minute metric collection
- **Federation Sync**: 5-minute cross-node synchronization
- **Health Monitoring**: 30-second system checks

### Backup Strategy

```bash
# Automated backups
npm run backup

# Restore from backup
npm run restore -- backup-file.sql
```

---

## 🤝 Contributing

We welcome contributions to Solace V8! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/your-org/solace.git
cd solace
npm install
cp .env.example .env.local
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=emotional-reasoning

# E2E testing
npm run test:e2e
```

---

## 📄 License

Solace V8 is open source software licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Solace V8 builds upon the foundation of mental health support platforms worldwide. We are grateful to the counselors, developers, and communities who make accessible mental health support possible.

---

## 📞 Support

- **Documentation**: [docs.solaceplatform.com](https://docs.solaceplatform.com)
- **Community Forum**: [community.solaceplatform.com](https://community.solaceplatform.com)
- **Emergency Resources**: If you're in crisis, please contact your local emergency services or use the resources listed at [befrienders.org](https://www.befrienders.org)

---

*Solace V8: Because mental health support should be intelligent, accessible, and everywhere.*

## 📋 Prerequisites

Before deploying Solace V7, ensure you have:

- **Node.js 18.0.0 or higher**
- **Database server** (PostgreSQL 12+ or MySQL 8.0+)
- **4GB RAM** (recommended)
- **2GB storage** (minimum)

---

## 🚀 Quick Start Deployment

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/solace.git
   cd solace
   ```

2. **Start with Docker Compose**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit configuration
   nano .env

   # Start all services
   docker-compose up -d
   ```

3. **Run the installer**
   ```bash
   # Access the web installer
   open http://localhost:3001/install

   # Or use CLI installer
   npm run setup
   ```

4. **Access your platform**
   ```bash
   open http://localhost:3000
   ```

### Option 2: Manual Node.js Deployment

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start the application**
   ```bash
   npm run dev  # Development
   npm run build && npm start  # Production
   ```

### Option 3: VPS Deployment

For production VPS deployment, see our [VPS Deployment Guide](docs/vps-deployment.md).

---

## ⚙️ Configuration

Solace V7 uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

### Database Configuration
```env
# PostgreSQL (default)
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=solace
DATABASE_USERNAME=solace
DATABASE_PASSWORD=your_password

# MySQL (alternative)
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=solace
DATABASE_USERNAME=solace
DATABASE_PASSWORD=your_password
```

### Platform Configuration
```env
PLATFORM_NAME=Solace
PLATFORM_VERSION=7.0.0
ADMIN_TOKEN=your_generated_admin_token

# Feature flags
FEATURE_ANONYMOUS_CHAT=true
FEATURE_COUNSELOR_MATCHING=true
FEATURE_PANIC_BUTTON=true
FEATURE_MOOD_TRACKING=true
FEATURE_SUPPORT_CIRCLES=true
FEATURE_ANALYTICS=true
```

### Server Configuration
```env
NODE_ENV=production
PORT=3000

# Realtime server
REALTIME_PORT=8080
REALTIME_HOST=localhost
```

---

## 🗄️ Database Setup

### PostgreSQL Setup
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE solace;
CREATE USER solace WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE solace TO solace;
\q
```

### MySQL Setup
```bash
# Create database and user
mysql -u root -p
CREATE DATABASE solace;
CREATE USER 'solace'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON solace.* TO 'solace'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 🔧 Management Commands

### Backup & Restore
```bash
# Create backup
npm run backup create

# Create compressed backup
npm run backup create --compress

# List backups
npm run backup list

# Restore backup
npm run backup restore backups/solace-backup-2024-01-01

# Cleanup old backups (keep 30 days)
npm run backup cleanup
```

### Health Checks
```bash
# Quick health check
curl http://localhost:3000/api/health

# Detailed status
curl http://localhost:3000/api/status

# Run from npm
npm run health
```

### Database Operations
```bash
# Run migrations
npm run db:migrate

# Check database health
npm run db:health
```

---

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f solace

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Scale services
docker-compose up -d --scale solace=3
```

---

## 🔒 Security Considerations

### Production Deployment
- Use HTTPS with SSL certificates
- Set strong database passwords
- Configure firewall rules
- Use environment variables for secrets
- Regularly update dependencies
- Enable database backups

### Admin Access
- Generate strong admin tokens
- Use HTTPS for admin panel access
- Regularly rotate admin tokens
- Monitor admin access logs

---

## 📊 Monitoring & Maintenance

### Health Endpoints
- `/api/health` - Basic health check
- `/api/status` - Detailed system status

### Logs
- Application logs: `logs/app.log`
- Database logs: `logs/database.log`
- Backup logs: `logs/backup.log`

### Automated Tasks
```bash
# Daily backup (add to cron)
0 2 * * * /path/to/solace/scripts/backup.js create --compress

# Log rotation (add to cron)
0 3 * * * /path/to/solace/scripts/rotate-logs.sh

# Health monitoring
*/5 * * * * curl -f http://localhost:3000/api/health || systemctl restart solace
```

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database service
sudo systemctl status postgresql
sudo systemctl status mysql

# Test connection
psql -h localhost -U solace -d solace
mysql -h localhost -u solace -p solace
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :3000
lsof -i :8080

# Kill process
kill -9 <PID>
```

**Permission Errors**
```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/solace
chmod +x scripts/*.sh
```

### Getting Help
- Check [Troubleshooting Guide](docs/troubleshooting.md)
- View logs in `logs/` directory
- Use health endpoints for diagnostics
- Check GitHub Issues for known problems

---

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [API Documentation](docs/api.md)
- [Deployment Guides](docs/deployments/)
  - [VPS Deployment](docs/deployments/vps.md)
  - [Docker Deployment](docs/deployments/docker.md)
  - [Cloud Deployment](docs/deployments/cloud.md)
- [Backup & Recovery](docs/backup.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/your-org/solace.git
cd solace
npm install
cp .env.example .env
npm run dev
```

---

## 📄 License

Solace is open source software licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Solace was built with the mission to make mental health support accessible to everyone. We thank all our contributors and the open source community for making this possible.

**Everyone deserves someone who listens.**

Users can speak freely without fear of being judged or exposed.

---

### 3. Safe Environment

The platform includes multiple systems to prevent misuse such as:

- anti-dating policy
- conversation monitoring tools for counselors
- abuse reporting
- safety guidelines

The goal is to protect both users and counselors.

---

### 4. Academic Collaboration

Solace aims to collaborate with:

- universities
- psychology departments
- mental health communities

Counselors can be trained psychology students or volunteers supervised by professionals.

Anonymous behavioral data may be used for academic research while strictly preserving user privacy.

---

## 🧠 Key Features

### Anonymous Login

Users can enter the platform instantly without email or registration.

Accounts are generated using anonymous tokens.

---

### Random Counselor Matching

Users can start conversations with randomly assigned counselors.

If they feel comfortable, they can request the counselor as a **preferred counselor**.

---

### Daily Emotional Check-In

Users answer a short daily quiz to help track their emotional condition.

This helps counselors understand patterns such as:

- stress
- sadness
- emotional triggers

---

### Emotional Journal

Users can write private emotional notes to track their healing journey.

---

### Panic Button

A prominent **panic button** is available if a user suddenly experiences intense emotional distress.

---

## 🚀 Getting Started (Local Development)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file with the following values (example):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Security:** Never commit `.env.local` to source control. The service role key provides full access to your Supabase project.

### 3) Prepare the database schema

Run the SQL script in `db/schema.sql` against your Supabase database, or use Supabase migrations.

### 4) Run the development server

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## 📦 Deployment

This project is designed to deploy on **Vercel**.

1. Create a new project on Vercel and connect this repository.
2. Set the same environment variables in Vercel.
3. Deploy.

---

## 🧩 Project Structure (Overview)

- `/app` - Next.js App Router pages and API routes.
- `/components` - UI components separated by domain.
- `/lib` - Client/server helpers, Supabase clients, session management.
- `/db` - Database schema & migration scripts.

---

## 🔐 Security & Privacy Notes

- No personal identifiers are requested.
- Sessions are stored locally and tied to an anonymous user ID.
- Recovery keys allow restoring sessions without exposing identity.
- Messages and journals are stored in Postgres and can be encrypted in the future.

---

## 🎓 Research & Insights

The platform stores anonymized behavioral data (mood trends, match history, session patterns) for potential academic research, while keeping individual identities hidden.


Pressing the button will prioritize the user and connect them to an available counselor immediately.

---

### Counselor Insights

Counselors can view anonymous behavioral patterns to better support users.

Examples:

- mood trends
- emotional triggers
- session frequency

No personal identity information is collected.

---

## 🔒 Privacy & Safety

Privacy is a core value.

Solace does not collect:

- real identities
- phone numbers
- personal addresses
- government IDs

All conversations remain private and encrypted.

---

## 🛠 Technology Stack

The platform is designed to be lightweight, scalable, and accessible.

Proposed stack:

Frontend
- Next.js
- TypeScript
- TailwindCSS

Backend
- Supabase
- PostgreSQL

Infrastructure
- Vercel
- Edge Functions

Real-time Communication
- WebSocket / Realtime API

---

## 🚀 Project Goals

Short term goals:

- Build MVP anonymous counseling platform
- Implement secure anonymous sessions
- Enable real-time chat
- Launch emotional tracking tools

Long term goals:

- Collaborate with universities
- Expand counselor network
- Support multiple languages
- Scale globally

---

## 🤝 Contributing

This project welcomes contributors who care about mental health accessibility.

We are especially looking for:

- developers
- UI/UX designers
- psychologists
- researchers
- volunteers

If you want to help build a safer emotional support platform, feel free to contribute.

---

## 📜 Ethical Commitment

Solace is not a replacement for professional therapy or emergency services.

If a user is in immediate danger or crisis, they should contact local emergency services or professional mental health support.

Solace aims to provide **supportive listening and emotional guidance**, not clinical treatment.

---

## ❤️ Why This Project Exists

Many people suffer in silence.

Sometimes they don't need a diagnosis.

They just need someone who listens.

Solace exists to make sure that no one has to face their emotions alone.

---

## 🚀 Deployment

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (recommended)

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Setup

1. Create a new Supabase project
2. Run the schema from `db/schema.sql` in the SQL editor
3. Update your environment variables

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Local Development

```bash
npm install
npm run dev
```

### Admin Setup

To create admin/moderator accounts:

1. Insert into users table with role='moderator'
2. They can log in via `/counselor` with their user ID (for now, or add admin login later)

Counselors log in via `/counselor` with their counselor_code.

---

## License

Open source (MIT License)
