'use client';

import { useState, useEffect, useCallback } from 'react';
import { PanicService } from '../services/PanicService';
import type {
  CrisisAlert,
  CrisisResponder,
  CrisisResponse,
  EmergencyContact,
  CrisisResource,
  CrisisAssessment,
  CrisisStats,
  CrisisResult,
  CrisisAlertType,
  CrisisSeverity,
  CrisisLocation
} from '../types';

const panicService = new PanicService();

export function usePanic() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerCrisisAlert = useCallback(async (
    userId: string,
    alertType: CrisisAlertType,
    severity: CrisisSeverity = 'high',
    description?: string,
    location?: CrisisLocation
  ): Promise<CrisisResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await panicService.triggerCrisisAlert(
        userId,
        alertType,
        severity,
        description,
        location
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger crisis alert';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAssessment = useCallback(async (
    userId: string,
    assessmentType: string,
    responses: Record<string, any>,
    assessedBy?: string
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const assessmentId = await panicService.createCrisisAssessment(
        userId,
        assessmentType,
        responses,
        assessedBy
      );
      return assessmentId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assessment';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    triggerCrisisAlert,
    createAssessment,
    clearError: () => setError(null)
  };
}

export function useEmergencyContacts(userId: string | null) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await panicService.getEmergencyContacts(userId);
      setContacts(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load emergency contacts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const addContact = useCallback(async (
    name: string,
    relationship: string,
    phoneNumber: string,
    email?: string,
    isPrimary: boolean = false
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await panicService.addEmergencyContact(
        userId,
        name,
        relationship,
        phoneNumber,
        email,
        isPrimary
      );
      if (success) {
        await loadContacts(); // Reload contacts
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add emergency contact';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadContacts]);

  const updateContact = useCallback(async (
    contactId: string,
    updates: Partial<Omit<EmergencyContact, 'id' | 'user_id'>>
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await panicService.updateEmergencyContact(contactId, userId, updates);
      if (success) {
        await loadContacts(); // Reload contacts
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update emergency contact';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadContacts]);

  const removeContact = useCallback(async (contactId: string): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await panicService.removeEmergencyContact(contactId, userId);
      if (success) {
        setContacts(prev => prev.filter(c => c.id !== contactId));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove emergency contact';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return {
    contacts,
    isLoading,
    error,
    addContact,
    updateContact,
    removeContact,
    refetch: loadContacts
  };
}

export function useCrisisResources(category?: string, language?: string, available24_7: boolean = false) {
  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await panicService.getCrisisResources(category, language, available24_7);
      setResources(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load crisis resources';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [category, language, available24_7]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  return {
    resources,
    isLoading,
    error,
    refetch: loadResources
  };
}

export function useCrisisResponders(specialty?: string, language?: string) {
  const [responders, setResponders] = useState<CrisisResponder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResponders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await panicService.getAvailableResponders(specialty, language);
      setResponders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load crisis responders';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [specialty, language]);

  useEffect(() => {
    loadResponders();
  }, [loadResponders]);

  return {
    responders,
    isLoading,
    error,
    refetch: loadResponders
  };
}

export function useCrisisResponse() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startResponse = useCallback(async (
    alertId: string,
    responderId: string,
    responseType: string,
    contactMethod: string,
    message?: string
  ): Promise<CrisisResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await panicService.startCrisisResponse(
        alertId,
        responderId,
        responseType as any,
        contactMethod as any,
        message
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start crisis response';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeResponse = useCallback(async (
    responseId: string,
    alertId: string,
    notes?: string,
    followUpRequired: boolean = false
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await panicService.completeCrisisResponse(
        responseId,
        alertId,
        notes,
        followUpRequired
      );
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete crisis response';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    startResponse,
    completeResponse,
    clearError: () => setError(null)
  };
}

export function useCrisisHistory(userId: string | null) {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await panicService.getUserCrisisHistory(userId);
      setAlerts(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load crisis history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    alerts,
    isLoading,
    error,
    refetch: loadHistory
  };
}

export function useCrisisStats() {
  const [stats, setStats] = useState<CrisisStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await panicService.getCrisisStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load crisis stats';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats
  };
}

// Hook for panic button with location sharing
export function usePanicButton(userId: string | null) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [location, setLocation] = useState<CrisisLocation | null>(null);
  const { triggerCrisisAlert, isLoading, error } = usePanic();

  const getCurrentLocation = useCallback(async (): Promise<CrisisLocation | null> => {
    if (!navigator.geolocation) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            shared: true
          });
        },
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, []);

  const triggerPanic = useCallback(async (description?: string) => {
    if (!userId) return null;

    setIsTriggered(true);

    try {
      // Get location if available
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);

      const result = await triggerCrisisAlert(
        userId,
        'panic_button',
        'immediate',
        description || 'Panic button activated',
        currentLocation || undefined
      );

      return result;
    } catch (err) {
      console.error('Panic button failed:', err);
      return { success: false, error: 'Failed to trigger panic alert' };
    } finally {
      setIsTriggered(false);
    }
  }, [userId, triggerCrisisAlert, getCurrentLocation]);

  return {
    triggerPanic,
    isTriggered,
    isLoading,
    error,
    location
  };
}