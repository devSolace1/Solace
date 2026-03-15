'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { AlertTriangle, Users, Activity, Shield, TrendingUp, AlertCircle } from 'lucide-react';

interface CrisisAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  createdAt: string;
  assignedCounselorId?: string;
}

interface PlatformMetrics {
  totalUsers: number;
  activeSessions: number;
  crisisAlerts: number;
  supportRooms: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load crisis alerts
      const alertsResponse = await fetch('/api/crisis/alerts?status=active&limit=10');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      // Load platform metrics
      const metricsResponse = await fetch('/api/monitoring/platform?type=metrics&timeframe=24h');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'escalated': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          V4 Platform
        </Badge>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Current active chats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crisis Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics?.crisisAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics?.systemHealth === 'healthy' ? 'text-green-600' :
              metrics?.systemHealth === 'degraded' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics?.systemHealth || 'unknown'}
            </div>
            <p className="text-xs text-muted-foreground">Platform status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Crisis Alerts</TabsTrigger>
          <TabsTrigger value="monitoring">Platform Monitoring</TabsTrigger>
          <TabsTrigger value="research">Research Data</TabsTrigger>
          <TabsTrigger value="resources">Crisis Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Crisis Alerts
              </CardTitle>
              <CardDescription>
                Monitor and manage crisis situations requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active crisis alerts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                        <div>
                          <p className="font-medium">{alert.alertType}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(alert.status)}>
                          {alert.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Platform Monitoring
              </CardTitle>
              <CardDescription>
                Real-time metrics and system performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">System Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Database Health</span>
                      <Badge variant="outline" className="text-green-600">Healthy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>API Response Time</span>
                      <span className="text-sm text-gray-600">245ms avg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage</span>
                      <span className="text-sm text-gray-600">67%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Recent Activity</h3>
                  <div className="space-y-2 text-sm">
                    <p>• 12 new user registrations today</p>
                    <p>• 8 crisis alerts resolved</p>
                    <p>• 15 support rooms active</p>
                    <p>• 95% uptime this month</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Research Data Export</CardTitle>
              <CardDescription>
                Export anonymized data for academic research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <span className="font-medium">JSON Export</span>
                    <span className="text-sm text-gray-500">Structured data</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <span className="font-medium">CSV Export</span>
                    <span className="text-sm text-gray-500">Spreadsheet format</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <span className="font-medium">Analytics Dashboard</span>
                    <span className="text-sm text-gray-500">Real-time insights</span>
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>• All data is fully anonymized before export</p>
                  <p>• Exports include mood trends, session patterns, and resource usage</p>
                  <p>• Available in multiple formats for different analysis tools</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crisis Resources Management</CardTitle>
              <CardDescription>
                Manage educational content and coping resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total resources: 24</span>
                  <Button>Add New Resource</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Breathing Exercises</h4>
                    <p className="text-sm text-gray-600">4 techniques available</p>
                    <Badge variant="outline" className="mt-2">High Usage</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Crisis Hotlines</h4>
                    <p className="text-sm text-gray-600">Regional contacts</p>
                    <Badge variant="outline" className="mt-2">Essential</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Grounding Techniques</h4>
                    <p className="text-sm text-gray-600">6 methods</p>
                    <Badge variant="outline" className="mt-2">Popular</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}