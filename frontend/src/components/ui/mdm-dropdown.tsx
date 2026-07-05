import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Label } from './label';
import { Loader2, AlertCircle } from 'lucide-react';
import { ApiClient } from '../../utils/api';
import { Alert, AlertDescription } from './alert';

export interface MDMOption {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

interface MDMDropdownProps {
  label?: string;
  placeholder?: string;
  masterType: string;
  value?: string | null;
  onChange: (value: string | null, option?: MDMOption) => void;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  error?: string;
  helperText?: string;
}

/**
 * MDM Dropdown Component
 * Fetches master data from API and displays as a dropdown select.
 * Supports single select, with caching and loading states.
 */
export function MDMDropdown({
  label,
  placeholder,
  masterType,
  value,
  onChange,
  disabled = false,
  required = false,
  multiple = false,
  error,
  helperText,
}: MDMDropdownProps) {
  const [options, setOptions] = useState<MDMOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Built-in fallback options for common master types when backend has no data
  const fallbackMap: Record<string, MDMOption[]> = {
    gender: [
      { _id: 'fallback-M', name: 'Male', code: 'M' },
      { _id: 'fallback-F', name: 'Female', code: 'F' },
      { _id: 'fallback-O', name: 'Other', code: 'O' }
    ]
  };

  useEffect(() => {
    loadOptions();
  }, [masterType]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // Call the MDM dropdown API endpoint
      const response = await ApiClient.getMDMOptions(masterType);
      const fetched = response || [];
      // If backend returns no options, use known fallback when available
      if ((!fetched || fetched.length === 0) && fallbackMap[masterType]) {
        setOptions(fallbackMap[masterType]);
      } else {
        setOptions(fetched);
      }
    } catch (err: any) {
      console.error(`Error loading ${masterType}:`, err);
      setApiError(err.message || `Failed to load ${masterType}`);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedLabel = () => {
    if (!value) return placeholder || 'Select...';
    const selected = options.find(opt => opt._id === value) ||
      // if stored value is a code (legacy), try matching by code
      options.find(opt => String(opt.code).toLowerCase() === String(value).toLowerCase());
    return selected ? selected.name : placeholder || 'Select...';
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {apiError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{apiError}</AlertDescription>
        </Alert>
      )}

      <Select
        value={value || ''}
        onValueChange={(selectedValue) => {
          const selectedOption = options.find((opt) => opt._id === selectedValue);
          onChange(selectedValue || null, selectedOption);
        }}
        disabled={disabled || loading}
      >
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : options.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <SelectItem key={option._id} value={option._id}>
                {option.name}
                {option.code && <span className="text-gray-400 ml-2 text-xs">({option.code})</span>}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}
