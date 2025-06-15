
import { useState, useEffect, useCallback } from 'react';

type NotificationPermission = 'default' | 'denied' | 'granted';

export const useNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }
        // Set initial permission status
        setPermission(Notification.permission);
    }, []);

    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }

        const status = await Notification.requestPermission();
        setPermission(status);
    }, []);

    const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }

        if (Notification.permission === 'granted') {
            new Notification(title, options);
        }
    }, []);

    return { permission, requestNotificationPermission, sendNotification };
};
