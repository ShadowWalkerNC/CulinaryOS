import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to manage localStorage mock tables
class LocalStorageMockTable {
  constructor(private tableName: string) {
    if (!localStorage.getItem(this.tableName)) {
      localStorage.setItem(this.tableName, JSON.stringify([]));
    }
  }

  getAll(): any[] {
    const data = localStorage.getItem(this.tableName);
    return data ? JSON.parse(data) : [];
  }

  saveAll(records: any[]) {
    localStorage.setItem(this.tableName, JSON.stringify(records));
  }

  insert(record: any) {
    const records = this.getAll();
    const newRecord = { id: Math.random().toString(36).substr(2, 9), ...record };
    records.push(newRecord);
    this.saveAll(records);
    return newRecord;
  }

  update(id: string, updates: any) {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      this.saveAll(records);
    }
  }
}

// Simple query builder mocking the Supabase JS client interface
class MockSupabaseQueryBuilder {
  private table: LocalStorageMockTable;
  private filterField: string | null = null;
  private filterValue: any = null;
  private sortField: string | null = null;
  private sortAscending = false;
  private updateData: any = null;

  constructor(tableName: string) {
    this.table = new LocalStorageMockTable(tableName);
  }

  insert(record: any) {
    const result = this.table.insert(record);
    return Promise.resolve({ data: result, error: null });
  }

  select(_fields?: string) {
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sortField = field;
    this.sortAscending = options?.ascending ?? false;
    return this;
  }

  eq(field: string, value: any) {
    this.filterField = field;
    this.filterValue = value;
    return this;
  }

  update(updates: any) {
    this.updateData = updates;
    return this;
  }

  private execute() {
    let records = this.table.getAll();

    // Handle updates if updateData is set
    if (this.updateData) {
      if (this.filterField === 'id') {
        this.table.update(this.filterValue, this.updateData);
      } else {
        // Fallback for general updates
        records = records.map(r => {
          if (!this.filterField || r[this.filterField] === this.filterValue) {
            return { ...r, ...this.updateData };
          }
          return r;
        });
        this.table.saveAll(records);
      }
      return { data: null, error: null };
    }

    // Handle filtering
    if (this.filterField) {
      records = records.filter(r => r[this.filterField!] === this.filterValue);
    }

    // Handle sorting
    if (this.sortField) {
      records.sort((a, b) => {
        const valA = a[this.sortField!];
        const valB = b[this.sortField!];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    return { data: records, error: null };
  }

  then(onfulfilled?: (value: { data: any[] | null; error: any }) => any) {
    const result = this.execute();
    return Promise.resolve(result).then(onfulfilled);
  }
}

// Seed the mock database for founding customers if empty
if (!supabaseUrl || !supabaseAnonKey) {
  const fcTable = new LocalStorageMockTable('founding_customers');
  if (fcTable.getAll().length === 0) {
    fcTable.saveAll([
      {
        customer_number: 1,
        public_name: "Northern Fixins",
        business_type: "Diner & Bakery",
        location: "Bangor, ME",
        converted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        public_permission: true
      },
      {
        customer_number: 2,
        public_name: "The Daily Grind",
        business_type: "Espresso Bar",
        location: "Portland, ME",
        converted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        public_permission: true
      }
    ]);
  }
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: (tableName: string) => new MockSupabaseQueryBuilder(tableName)
    } as any;
