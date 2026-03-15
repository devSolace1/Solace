import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X, Bell, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import type { Notification, NotificationType } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  onClose: (id: string) => void;
  onMarkRead: (id: string) => void;
}

const notificationIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  counselor_connected: CheckCircle,
  new_message: Info,
  session_reminder: Bell,
  daily_checkin: Bell,
  panic_response: AlertTriangle,
  new_user_waiting: Bell,
  panic_alert: AlertCircle,
  session_assignment: CheckCircle,
  abuse_report: AlertTriangle,
  crisis_alert: AlertCircle,
  system_issue: AlertTriangle
};

const priorityColors = {
  low: 'bg-gray-50 border-gray-200',
  medium: 'bg-blue-50 border-blue-200',
  high: 'bg-yellow-50 border-yellow-200',
  urgent: 'bg-red-50 border-red-200'
};

export function NotificationItem({ notification, onClose, onMarkRead }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={clsx(
        'flex items-start p-4 border rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow',
        priorityColors[notification.priority],
        !notification.isRead && 'ring-2 ring-blue-200'
      )}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <Icon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0 text-gray-600" />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{notification.title}</h4>
        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(notification.createdAt).toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(notification.id);
        }}
        className="ml-3 flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
      >
        <X className="h-4 w-4 text-gray-400" />
      </button>
    </motion.div>
  );
}

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  className?: string;
}

export default function NotificationCenter({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  className
}: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-lg shadow-lg', className)}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClose={onClose}
                  onMarkRead={onMarkRead}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}