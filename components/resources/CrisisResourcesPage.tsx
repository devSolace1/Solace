'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { Input } from '@components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/Select';
import { Textarea } from '@components/ui/Textarea';
import { BookOpen, Heart, Search, Plus, ExternalLink, ThumbsUp } from 'lucide-react';

interface CrisisResource {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  contentType: string;
  contentUrl?: string;
  isFeatured: boolean;
  helpfulnessScore: number;
  viewCount: number;
  createdAt: string;
}

export default function CrisisResourcesPage() {
  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: '',
    contentType: 'article',
    contentUrl: '',
    tags: ''
  });

  useEffect(() => {
    loadResources();
  }, [selectedCategory]);

  const loadResources = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/crisis/resources?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error loading crisis resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async () => {
    try {
      const tags = createForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await fetch('/api/crisis/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          tags
        })
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setCreateForm({
          title: '',
          description: '',
          category: '',
          contentType: 'article',
          contentUrl: '',
          tags: ''
        });
        loadResources();
      }
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };

  const handleHelpfulClick = async (resourceId: string) => {
    // In a real implementation, this would call an API to track helpfulness
    console.log('Marked resource as helpful:', resourceId);
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = [
    'all', 'breathing-exercises', 'grounding-techniques', 'crisis-hotlines',
    'coping-strategies', 'mindfulness', 'support-groups', 'professional-help'
  ];

  const contentTypes = [
    { value: 'article', label: 'Article' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio/Podcast' },
    { value: 'exercise', label: 'Interactive Exercise' },
    { value: 'hotline', label: 'Hotline/Contact' }
  ];

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crisis Resources</h1>
          <p className="text-gray-600 mt-2">Evidence-based tools and information for crisis situations</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Crisis Resource</DialogTitle>
              <DialogDescription>
                Add a new educational resource or coping tool
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                  placeholder="e.g., 4-7-8 Breathing Technique"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  placeholder="Brief description of the resource and how it helps"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={createForm.category} onValueChange={(value) => setCreateForm({...createForm, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map(category => (
                        <SelectItem key={category} value={category}>
                          {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Content Type</label>
                  <Select value={createForm.contentType} onValueChange={(value) => setCreateForm({...createForm, contentType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Content URL (optional)</label>
                <Input
                  value={createForm.contentUrl}
                  onChange={(e) => setCreateForm({...createForm, contentUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={createForm.tags}
                  onChange={(e) => setCreateForm({...createForm, tags: e.target.value})}
                  placeholder="e.g., breathing, anxiety, quick-relief"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateResource}>
                  Add Resource
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' :
                 category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured Resources */}
      {filteredResources.some(r => r.isFeatured) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Featured Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.filter(r => r.isFeatured).map((resource) => (
              <Card key={resource.id} className="border-red-200 bg-red-50 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <Badge className="bg-red-100 text-red-800">Featured</Badge>
                  </div>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="secondary">{resource.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Badge>
                      <span className="text-gray-500">{resource.contentType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={() => handleHelpfulClick(resource.id)}>
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Helpful ({resource.helpfulnessScore})
                      </Button>
                      {resource.contentUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={resource.contentUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Resources */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          All Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{resource.title}</CardTitle>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="secondary">{resource.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Badge>
                    <span className="text-gray-500">{resource.contentType}</span>
                  </div>

                  {resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{resource.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => handleHelpfulClick(resource.id)}>
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Helpful ({resource.helpfulnessScore})
                    </Button>
                    {resource.contentUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={resource.contentUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Help build our resource library by adding the first item'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Resource
            </Button>
          )}
        </div>
      )}
    </div>
  );
}