'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { Input } from '@components/ui/Input';
import { Textarea } from '@components/ui/Textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/Select';
import { Users, MessageCircle, Plus, Search, Filter } from 'lucide-react';

interface SupportRoom {
  id: string;
  name: string;
  description: string;
  category: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
  tags: string[];
  status: string;
  createdAt: string;
}

export default function SupportCirclesPage() {
  const [rooms, setRooms] = useState<SupportRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: '',
    maxParticipants: 20,
    isPrivate: false,
    tags: ''
  });

  useEffect(() => {
    loadSupportRooms();
  }, [selectedCategory]);

  const loadSupportRooms = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/support-circles/rooms?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Error loading support rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const tags = createForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await fetch('/api/support-circles/rooms', {
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
          name: '',
          description: '',
          category: '',
          maxParticipants: 20,
          isPrivate: false,
          tags: ''
        });
        loadSupportRooms();
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      const response = await fetch('/api/support-circles/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, action: 'join' })
      });

      if (response.ok) {
        loadSupportRooms(); // Refresh to show updated participant count
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = ['all', 'anxiety', 'depression', 'stress', 'relationships', 'grief', 'addiction', 'general'];

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
          <h1 className="text-3xl font-bold text-gray-900">Support Circles</h1>
          <p className="text-gray-600 mt-2">Connect with others in moderated support communities</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Circle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Support Circle</DialogTitle>
              <DialogDescription>
                Create a new moderated support circle for community discussion
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Circle Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  placeholder="e.g., Anxiety Support Group"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  placeholder="Describe the purpose and focus of this circle"
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
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Max Participants</label>
                  <Input
                    type="number"
                    value={createForm.maxParticipants}
                    onChange={(e) => setCreateForm({...createForm, maxParticipants: parseInt(e.target.value)})}
                    min={5}
                    max={50}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={createForm.tags}
                  onChange={(e) => setCreateForm({...createForm, tags: e.target.value})}
                  placeholder="e.g., anxiety, coping, support"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={createForm.isPrivate}
                  onChange={(e) => setCreateForm({...createForm, isPrivate: e.target.checked})}
                />
                <label htmlFor="isPrivate" className="text-sm">Private circle (invite only)</label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRoom}>
                  Create Circle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search circles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Support Circles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <Card key={room.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <CardDescription className="mt-1">{room.description}</CardDescription>
                </div>
                {room.isPrivate && (
                  <Badge variant="outline" className="ml-2">Private</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {room.currentParticipants}/{room.maxParticipants}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {room.category}
                    </Badge>
                  </div>
                </div>

                {room.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {room.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{room.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.currentParticipants >= room.maxParticipants}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {room.currentParticipants >= room.maxParticipants ? 'Full' : 'Join Circle'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No support circles found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Be the first to create a support circle for your community'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Circle
            </Button>
          )}
        </div>
      )}
    </div>
  );
}