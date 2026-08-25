import './culinary-theme.css';

export * from './lib/utils';
export * from './components/Button';
export * from './components/Card';
export * from './components/Badge';
export * from './components/Input';
export * from './components/Label';
export * from './components/Dialog';
export * from './components/Tabs';
export * from './components/Table';
export * from './components/Separator';
export * from './components/Skeleton';
export * from './components/FloorMap3D';

// Selective & aliased Lucide icon exports to avoid collision with UI Table and Badge
export {
  LayoutGrid,
  Box,
  Users,
  DollarSign,
  Plus,
  Minus,
  UtensilsCrossed,
  CheckCircle2,
  Bookmark,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  X,
  Check,
  CreditCard,
  QrCode,
  Smartphone,
  Flame,
  ChefHat,
  TrendingUp,
  Package,
  Trash2,
  Layers,
  Settings,
  LogOut,
  Lock,
  Unlock,
  Store,
  ShieldCheck,
  ShoppingBag,
  Receipt,
  Printer,
  Bell,
  Table as TableIcon,
  Badge as BadgeIcon,
} from 'lucide-react';

// Legacy / stitch components compatibility
export * from './CulinaryHeader';
export * from './CulinaryCard';
export * from './CulinaryButton';
export * from './CulinaryBadge';
export * from './ErrorBoundary';
