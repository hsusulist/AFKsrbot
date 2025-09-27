import { useState, useEffect, useRef } from 'react';

interface UseAutosaveOptions {
  debounceMs?: number;
  onSave?: (data: any) => void;
}

export function useAutosave<T>(
  key: string,
  initialValue: T,
  options: UseAutosaveOptions = {}
) {
  const { debounceMs = 1000, onSave } = options;
  
  // Load initial value from localStorage
  const [data, setData] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save when data changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
        setLastSaved(new Date());
        onSave?.(data);
      } catch (error) {
        console.error('Failed to autosave:', error);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, key, debounceMs, onSave]);

  const reset = () => {
    try {
      localStorage.removeItem(`autosave_${key}`);
      setData(initialValue);
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to reset autosave:', error);
    }
  };

  const save = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    try {
      localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
      setLastSaved(new Date());
      onSave?.(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  return {
    data,
    setData,
    isLoading,
    lastSaved,
    reset,
    save
  };
}