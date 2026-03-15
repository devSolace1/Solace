// V7 Self-Host Installer UI
// Web-based installation interface

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/Select';
import { Checkbox } from '@components/ui/Checkbox';
import { Progress } from '@components/ui/Progress';
import { Alert, AlertDescription } from '@components/ui/Alert';
import { CheckCircle, AlertCircle, Database, Settings, User, Rocket } from 'lucide-react';

interface InstallStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  current: boolean;
}

interface DatabaseConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface PlatformConfig {
  name: string;
  features: string[];
}

const AVAILABLE_FEATURES = [
  { id: 'anonymous_chat', label: 'Anonymous Chat Support', description: 'Allow users to chat anonymously' },
  { id: 'counselor_matching', label: 'Counselor Matching', description: 'Match users with available counselors' },
  { id: 'panic_button', label: 'Panic Button', description: 'Emergency alert system' },
  { id: 'mood_tracking', label: 'Mood Tracking', description: 'Daily mood check-ins and trends' },
  { id: 'support_circles', label: 'Support Circles', description: 'Group support sessions' },
  { id: 'analytics', label: 'Analytics Dashboard', description: 'Admin analytics and reporting' },
  { id: 'journal', label: 'Journaling', description: 'Private journaling feature' },
  { id: 'moderation', label: 'Content Moderation', description: 'Report and moderate content' }
];

export default function InstallerPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Configuration state
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'solace',
    username: 'solace',
    password: ''
  });

  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>({
    name: 'Solace',
    features: AVAILABLE_FEATURES.map(f => f.id)
  });

  const [adminEmail, setAdminEmail] = useState('');
  const [generateAdminToken, setGenerateAdminToken] = useState(true);

  const steps: InstallStep[] = [
    {
      id: 'prerequisites',
      title: 'Prerequisites Check',
      description: 'Verify system requirements',
      icon: CheckCircle,
      completed: false,
      current: currentStep === 0
    },
    {
      id: 'database',
      title: 'Database Setup',
      description: 'Configure database connection',
      icon: Database,
      completed: false,
      current: currentStep === 1
    },
    {
      id: 'platform',
      title: 'Platform Configuration',
      description: 'Set up platform settings',
      icon: Settings,
      completed: false,
      current: currentStep === 2
    },
    {
      id: 'admin',
      title: 'Admin Access',
      description: 'Create admin credentials',
      icon: User,
      completed: false,
      current: currentStep === 3
    },
    {
      id: 'install',
      title: 'Installation',
      description: 'Run automated installation',
      icon: Rocket,
      completed: false,
      current: currentStep === 4
    }
  ];

  const addLog = (message: string) => {
    setInstallLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallProgress(0);
    setError(null);
    setInstallLog([]);

    try {
      addLog('Starting installation...');

      // Step 1: Check prerequisites
      setInstallProgress(10);
      addLog('Checking prerequisites...');
      await checkPrerequisites();

      // Step 2: Test database connection
      setInstallProgress(25);
      addLog('Testing database connection...');
      await testDatabaseConnection();

      // Step 3: Configure platform
      setInstallProgress(40);
      addLog('Configuring platform...');
      await configurePlatform();

      // Step 4: Run installation
      setInstallProgress(60);
      addLog('Running database migrations...');
      await runInstallation();

      // Step 5: Generate admin access
      setInstallProgress(80);
      addLog('Creating admin access...');
      await createAdminAccess();

      // Step 6: Finalize
      setInstallProgress(100);
      addLog('Installation completed successfully!');

      // Redirect to success page
      setTimeout(() => {
        window.location.href = '/install/success';
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const checkPrerequisites = async () => {
    // Check Node.js version
    const response = await fetch('/api/install/check-prerequisites');
    if (!response.ok) {
      throw new Error('Prerequisites check failed');
    }
  };

  const testDatabaseConnection = async () => {
    const response = await fetch('/api/install/test-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Database connection failed: ${error}`);
    }
  };

  const configurePlatform = async () => {
    const response = await fetch('/api/install/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbConfig, platformConfig })
    });

    if (!response.ok) {
      throw new Error('Platform configuration failed');
    }
  };

  const runInstallation = async () => {
    const response = await fetch('/api/install/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbConfig, platformConfig, adminEmail, generateAdminToken })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Installation failed: ${error}`);
    }
  };

  const createAdminAccess = async () => {
    const response = await fetch('/api/install/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, generateToken: generateAdminToken })
    });

    if (!response.ok) {
      throw new Error('Admin access creation failed');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Prerequisites Check</h3>
            <p className="text-muted-foreground">
              We'll verify that your system meets the requirements for running Solace V7.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Node.js 18.0.0 or higher</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Database server (PostgreSQL or MySQL)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Write permissions for configuration files</span>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Database Configuration</h3>
            <p className="text-muted-foreground">
              Configure your database connection. Solace V7 supports PostgreSQL and MySQL.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="db-type">Database Type</Label>
                <Select value={dbConfig.type} onValueChange={(value: 'postgresql' | 'mysql') =>
                  setDbConfig(prev => ({ ...prev, type: value, port: value === 'postgresql' ? 5432 : 3306 }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-host">Host</Label>
                <Input
                  id="db-host"
                  value={dbConfig.host}
                  onChange={(e) => setDbConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="localhost"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-port">Port</Label>
                <Input
                  id="db-port"
                  type="number"
                  value={dbConfig.port}
                  onChange={(e) => setDbConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-name">Database Name</Label>
                <Input
                  id="db-name"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="solace"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-username">Username</Label>
                <Input
                  id="db-username"
                  value={dbConfig.username}
                  onChange={(e) => setDbConfig(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="solace"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-password">Password</Label>
                <Input
                  id="db-password"
                  type="password"
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Platform Configuration</h3>
            <p className="text-muted-foreground">
              Customize your Solace platform settings and features.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input
                  id="platform-name"
                  value={platformConfig.name}
                  onChange={(e) => setPlatformConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Solace"
                />
              </div>

              <div className="space-y-2">
                <Label>Features to Enable</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_FEATURES.map(feature => (
                    <div key={feature.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={feature.id}
                        checked={platformConfig.features.includes(feature.id)}
                        onCheckedChange={(checked) => {
                          setPlatformConfig(prev => ({
                            ...prev,
                            features: checked
                              ? [...prev.features, feature.id]
                              : prev.features.filter(f => f !== feature.id)
                          }));
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor={feature.id} className="text-sm font-medium">
                          {feature.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Admin Access Setup</h3>
            <p className="text-muted-foreground">
              Create admin credentials for managing your Solace platform.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email (Optional)</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@yourdomain.com"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-token"
                  checked={generateAdminToken}
                  onCheckedChange={setGenerateAdminToken}
                />
                <Label htmlFor="generate-token">
                  Generate admin access token
                </Label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The admin token provides full access to the platform. Keep it secure!
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Installation</h3>
            <p className="text-muted-foreground">
              Ready to install Solace V7. This will set up your database, configure the platform, and create admin access.
            </p>

            {isInstalling && (
              <div className="space-y-2">
                <Progress value={installProgress} />
                <p className="text-sm text-muted-foreground">
                  Installing... {installProgress}%
                </p>
              </div>
            )}

            {installLog.length > 0 && (
              <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono">
                  {installLog.join('\n')}
                </pre>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Solace V7 Installer</h1>
            <p className="text-muted-foreground mt-2">
              Self-host your mental health support platform
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Steps Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          step.current
                            ? 'bg-primary text-primary-foreground'
                            : step.completed
                            ? 'bg-green-100 text-green-800'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => !isInstalling && setCurrentStep(index)}
                      >
                        <step.icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="text-xs opacity-75">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-6">
                  {renderStepContent()}

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                      disabled={currentStep === 0 || isInstalling}
                    >
                      Previous
                    </Button>

                    {currentStep < steps.length - 1 ? (
                      <Button
                        onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                        disabled={isInstalling}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isInstalling ? 'Installing...' : 'Install Solace V7'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}