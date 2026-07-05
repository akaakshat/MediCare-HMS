import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';

interface MDMSearchProps {
  onSearch: (filters: {
    query: string;
    isActive?: boolean;
    code?: string;
  }) => void;
  placeholder?: string;
  showActiveFilter?: boolean;
  showCodeFilter?: boolean;
}

/**
 * MDM Search Component
 * Provides advanced filtering capabilities for master data searches.
 * Used in admin panels and list views for quick filtering.
 */
export function MDMSearch({
  onSearch,
  placeholder = 'Search by name or code...',
  showActiveFilter = true,
  showCodeFilter = false,
}: MDMSearchProps) {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState<string | undefined>(undefined);
  const [code, setCode] = useState('');

  const handleSearch = () => {
    onSearch({
      query: query.trim(),
      isActive: isActive ? isActive === 'active' : undefined,
      code: code.trim(),
    });
  };

  const handleReset = () => {
    setQuery('');
    setIsActive(undefined);
    setCode('');
    onSearch({
      query: '',
      isActive: undefined,
      code: '',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full space-y-4 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Search Query */}
        <div className="space-y-2">
          <Label htmlFor="search-query" className="text-sm font-medium">
            Search
          </Label>
          <div className="relative">
            <Input
              id="search-query"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Active Status Filter */}
        {showActiveFilter && (
          <div className="space-y-2">
            <Label htmlFor="active-filter" className="text-sm font-medium">
              Status
            </Label>
            <Select value={isActive || ''} onValueChange={setIsActive}>
              <SelectTrigger id="active-filter">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Code Filter */}
        {showCodeFilter && (
          <div className="space-y-2">
            <Label htmlFor="code-filter" className="text-sm font-medium">
              Code
            </Label>
            <Input
              id="code-filter"
              placeholder="Filter by code..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <X className="h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleSearch} className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
    </div>
  );
}
