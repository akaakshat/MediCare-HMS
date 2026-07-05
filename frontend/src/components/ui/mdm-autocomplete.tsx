import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { ApiClient } from '../../utils/api';
import { Alert, AlertDescription } from './alert';

export interface MDMOption {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

interface MDMAutocompleteProps {
  label?: string;
  placeholder?: string;
  masterType: string;
  value?: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  error?: string;
  helperText?: string;
  minChars?: number;
}

/**
 * MDM Autocomplete Component
 * Provides type-ahead search for master data with filtering.
 * Supports single select and multi-select modes.
 */
export function MDMAutocomplete({
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
  minChars = 1,
}: MDMAutocompleteProps) {
  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState<MDMOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedValue = multiple ? (value as string[]) : value;
  const selectedArray = multiple
    ? (value as string[])
    : value
      ? [value as string]
      : [];

  // Search when text changes
  useEffect(() => {
    if (!searchText || searchText.length < minChars) {
      setOptions([]);
      return;
    }

    const searchOptions = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const response = await ApiClient.searchMDM(masterType, searchText);
        setOptions(response?.data || response || []);
      } catch (err: any) {
        console.error(`Error searching ${masterType}:`, err);
        setApiError(err.message || `Failed to search ${masterType}`);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchOptions, 300);
    return () => clearTimeout(timer);
  }, [searchText, masterType, minChars]);

  const handleSelect = (option: MDMOption) => {
    if (multiple) {
      const newValue = selectedArray.includes(option._id)
        ? selectedArray.filter((id) => id !== option._id)
        : [...selectedArray, option._id];
      onChange(newValue.length > 0 ? newValue : null);
    } else {
      onChange(option._id);
      setSearchText('');
      setIsOpen(false);
    }
  };

  const handleRemove = (id: string) => {
    if (multiple) {
      const newValue = selectedArray.filter((item) => item !== id);
      onChange(newValue.length > 0 ? newValue : null);
    } else {
      onChange(null);
    }
  };

  const getSelectedLabels = () => {
    return selectedArray.map((id) => {
      const option = options.find((opt) => opt._id === id);
      return option?.name || id;
    });
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
          <AlertDescription className="text-xs">{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <div
          className={cn(
            'w-full min-h-10 px-3 py-2 border border-input rounded-md bg-background flex items-center gap-2 flex-wrap',
            error && 'border-red-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedArray.length > 0 && multiple ? (
            selectedArray.map((id) => {
              const option = options.find((opt) => opt._id === id);
              return (
                <div
                  key={id}
                  className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm flex items-center gap-1"
                >
                  {option?.name || id}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(id);
                    }}
                    className="hover:opacity-75"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          ) : selectedArray.length > 0 && !multiple ? (
            <span className="text-sm">
              {options.find((opt) => opt._id === selectedArray[0])?.name || selectedArray[0]}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder || 'Search...'}</span>
          )}
          <div className="ml-auto">
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-md z-50">
            <Input
              placeholder={`Search ${masterType || 'options'}...`}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border-0 border-b rounded-none"
              disabled={disabled}
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Searching...</span>
                </div>
              ) : options.length === 0 && searchText ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No results found
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option._id}
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2',
                      selectedArray.includes(option._id) && 'bg-accent'
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    {multiple && (
                      <div
                        className={cn(
                          'w-4 h-4 border border-primary rounded',
                          selectedArray.includes(option._id) && 'bg-primary'
                        )}
                      >
                        {selectedArray.includes(option._id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">{option.name}</div>
                      {option.code && (
                        <div className="text-xs text-muted-foreground">{option.code}</div>
                      )}
                      {option.description && (
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}
