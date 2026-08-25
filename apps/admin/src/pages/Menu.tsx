import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Search,
  RefreshCw,
  Flame,
  CheckCircle2,
  AlertCircle,
} from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  status: string;
  station: string;
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/admin/menu/items`, { headers: apiHeaders() });
      const body = await res.json();
      if (body.ok) {
        setItems(body.data?.items ?? []);
      } else {
        setMsg({ text: body.error?.message ?? 'Failed to load menu items', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Failed to connect to API server', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(item: MenuItem) {
    const next = item.status === 'available' ? '86' : 'available';
    try {
      const res = await fetch(`${API}/v1/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Update failed', type: 'error' });
        return;
      }
      setMsg({
        text: `Updated "${item.name}" availability to ${next === '86' ? "86'd (Unavailable)" : 'Available'}`,
        type: 'success',
      });
      void load();
    } catch {
      setMsg({ text: 'Network error updating item availability', type: 'error' });
    }
  }

  const stations = ['all', ...Array.from(new Set(items.map((i) => i.station).filter(Boolean)))];
  const availableCount = items.filter((i) => i.status === 'available').length;
  const eightySixCount = items.filter((i) => i.status === '86').length;

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(filterQuery.toLowerCase()));
    const matchesStation = selectedStation === 'all' || item.station === selectedStation;
    return matchesSearch && matchesStation;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
            Menu Catalog & 86 Editor
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Manage station routing, catalog pricing, and live 86 availability across POS and Web ordering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="px-2.5 py-1">
            {availableCount} Available
          </Badge>
          {eightySixCount > 0 && (
            <Badge variant="destructive" className="px-2.5 py-1">
              {eightySixCount} 86'd
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-bold hover:underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Menu Catalog Card */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4 mb-4">
          <div>
            <CardTitle>Menu Items Catalog</CardTitle>
            <CardDescription>Showing {filteredItems.length} of {items.length} items</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Station Filter */}
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              aria-label="Filter by station"
              className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground font-bold uppercase tracking-wider shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {stations.map((st) => (
                <option key={st} value={st}>
                  {st === 'all' ? 'All Stations' : st.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search items..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-8 w-48 font-bold"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span>Loading menu items from database…</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Details</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Quick Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isAvailable = item.status === 'available';
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-bold text-foreground text-sm">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 max-w-md line-clamp-2">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      {dollars(item.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="brand">
                        {item.station ? item.station.toUpperCase() : 'EXPO'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isAvailable ? 'success' : 'destructive'}>
                        {isAvailable ? 'AVAILABLE' : "86'D"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant={isAvailable ? 'destructive' : 'brand'}
                        size="sm"
                        onClick={() => void toggleStatus(item)}
                      >
                        {isAvailable ? "86 Item" : 'Make Available'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filteredItems.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    {items.length === 0 ? (
                      <div>
                        <p className="font-semibold text-foreground mb-1">No menu items found</p>
                        <p>
                          Seed demo menu items with <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">pnpm seed</code>.
                        </p>
                      </div>
                    ) : (
                      <p>No menu items matching your filter query.</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default MenuPage;
