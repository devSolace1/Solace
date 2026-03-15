// V7 Installation Success Page
// Post-installation information and next steps

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Alert, AlertDescription } from '@components/ui/Alert';
import { CheckCircle, Copy, ExternalLink, Key, Database, Settings } from 'lucide-react';
import { useToast } from '@components/ui/use-toast';

export default function InstallSuccessPage() {
  const [adminToken, setAdminToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get admin token from localStorage or API
    const token = localStorage.getItem('solace_admin_token');
    if (token) {
      setAdminToken(token);
    }
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Token copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy manually',
        variant: 'destructive',
      });
    }
  };

  const nextSteps = [
    {
      title: 'Start the Application',
      description: 'Run the application using the generated startup script',
      command: './start.sh',
      icon: Settings
    },
    {
      title: 'Access Admin Panel',
      description: 'Use your admin token to access the management interface',
      action: () => window.open('/admin', '_blank'),
      icon: Key
    },
    {
      title: 'Configure Environment',
      description: 'Review and customize your .env configuration file',
      file: '.env',
      icon: Database
    },
    {
      title: 'Set up Reverse Proxy',
      description: 'Configure nginx or Apache for production deployment',
      docs: '/docs/deployment',
      icon: ExternalLink
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600">Installation Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Solace V7 has been successfully installed and configured
            </p>
          </div>

          {/* Admin Token Alert */}
          {adminToken && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Save your admin access token securely. This token provides full administrative access to your platform.
                <div className="mt-2 p-3 bg-white rounded border font-mono text-sm break-all">
                  {adminToken}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(adminToken)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Token'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Installation Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Installation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Database</h4>
                  <p className="text-sm text-muted-foreground">
                    ✅ Database connection established<br/>
                    ✅ Tables created and migrated<br/>
                    ✅ Initial data seeded
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Platform</h4>
                  <p className="text-sm text-muted-foreground">
                    ✅ Configuration files generated<br/>
                    ✅ Admin access configured<br/>
                    ✅ Startup scripts created
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {step.description}
                      </p>
                      {step.command && (
                        <div className="bg-muted p-2 rounded font-mono text-sm">
                          {step.command}
                        </div>
                      )}
                      {step.file && (
                        <div className="bg-muted p-2 rounded font-mono text-sm">
                          {step.file}
                        </div>
                      )}
                      {step.action && (
                        <Button variant="outline" size="sm" onClick={step.action}>
                          Open Admin Panel
                        </Button>
                      )}
                      {step.docs && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={step.docs} target="_blank" rel="noopener noreferrer">
                            View Documentation
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => window.location.href = '/'}>
                  Go to Homepage
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/admin'}>
                  Admin Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/docs'}>
                  Documentation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://github.com/your-org/solace', '_blank')}
                >
                  GitHub Repository
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Support Information */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Need help? Check our{' '}
              <a href="/docs" className="text-primary hover:underline">
                documentation
              </a>{' '}
              or join our{' '}
              <a href="https://discord.gg/solace" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Discord community
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}