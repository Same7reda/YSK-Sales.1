import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/AuthContext';
import type { AuditLogEntry } from '../types';

type ActionType = AuditLogEntry['actionType'];
type EntityType = string;

export const useAuditLog = () => {
    const { currentUser } = useAuth();
    const { setAuditLog } = useData();

    const logAction = useCallback((
        actionType: ActionType, 
        entityType: EntityType, 
        entityId?: string, 
        details?: string
    ) => {
        if (!currentUser) return;

        const newLogEntry: AuditLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.fullName,
            actionType,
            entityType,
            entityId,
            details: details || `${actionType} on ${entityType}`
        };

        setAuditLog(prevLogs => [newLogEntry, ...prevLogs]);

    }, [currentUser, setAuditLog]);

    return { logAction };
};
