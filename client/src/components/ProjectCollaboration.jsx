import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Video, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '../shadcn/ui/button';
import { Badge } from '../shadcn/ui/badge';

const ProjectCollaboration = ({ projectId, participants }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [sharedCursor, setSharedCursor] = useState({});
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_collaboration', { projectId });

    socket.on('active_users', (users) => {
      setActiveUsers(users);
    });

    socket.on('cursor_move', ({ userId, position }) => {
      setSharedCursor(prev => ({ ...prev, [userId]: position }));
    });

    return () => {
      socket.emit('leave_collaboration', { projectId });
    };
  }, [socket, projectId]);

  const startVideoCall = () => {
    window.open(`/video-call/${projectId}`, '_blank');
  };

  const shareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia();
      socket.emit('start_screen_share', { projectId, streamId: stream.id });
    } catch (error) {
      console.error('Screen share failed:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-900/50 border-gray-700">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Live Collaboration</h3>
          <div className="flex items-center space-x-2">
            {activeUsers.map(user => (
              <img key={user.id} src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-green-500" />
            ))}
            <Badge variant="outline" className="text-green-400 border-green-400/50">{activeUsers.length} online</Badge>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button size="sm" onClick={startVideoCall}>
            <Video className="mr-2 h-4 w-4" /> Start Video Call
          </Button>
          <Button size="sm" variant="outline" onClick={shareScreen}>
            <Share2 className="mr-2 h-4 w-4" /> Share Screen
          </Button>
        </div>

        <div className="relative h-48 bg-gray-800 rounded-md">
          {Object.entries(sharedCursor).map(([userId, position]) => (
            <div
              key={userId}
              className="absolute w-2 h-2 bg-blue-500 rounded-full transition-all duration-100"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectCollaboration; 