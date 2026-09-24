import {
  BadgeCheck, BarChart3, Bell, BellRing, Boxes, Briefcase, Building, Building2, CalendarCheck, CalendarDays, CalendarX, ClipboardList,
  Code2, Coins, Columns3, CreditCard, FileBarChart, FolderOpen, Gift, GitBranch, Heart, HelpCircle, History, Home, Images, Info,
  KeyRound, Layers, LayoutDashboard, LayoutGrid, LineChart, ListChecks, Mail, Map, MapPin, MessageSquare, MessagesSquare, Newspaper,
  Package, Palette, Paperclip, PlayCircle, Plug, Quote, Repeat, Rocket, Route, Send, Share2, ShieldCheck, ShoppingBag, ShoppingCart,
  SlidersHorizontal, Smartphone, Sparkles, Star, Store, Tags, TicketPercent, Timer, Truck, UserRound, Users, View, Wallet, Wand2,
  WifiOff, Circle, type LucideIcon,
} from 'lucide-react';

/** Curated icons that workflow content (steps & options) may reference by name. */
export const ICONS: Record<string, LucideIcon> = {
  BadgeCheck, BarChart3, Bell, BellRing, Boxes, Briefcase, Building, Building2, CalendarCheck, CalendarDays, CalendarX, ClipboardList,
  Code2, Coins, Columns3, CreditCard, FileBarChart, FolderOpen, Gift, GitBranch, Heart, HelpCircle, History, Home, Images, Info,
  KeyRound, Layers, LayoutDashboard, LayoutGrid, LineChart, ListChecks, Mail, Map, MapPin, MessageSquare, MessagesSquare, Newspaper,
  Package, Palette, Paperclip, PlayCircle, Plug, Quote, Repeat, Rocket, Route, Send, Share2, ShieldCheck, ShoppingBag, ShoppingCart,
  SlidersHorizontal, Smartphone, Sparkles, Star, Store, Tags, TicketPercent, Timer, Truck, UserRound, Users, View, Wallet, Wand2, WifiOff,
};

export const ICON_NAMES = Object.keys(ICONS).sort();

export function DynamicIcon({ name, className, strokeWidth }: { name?: string | null; className?: string; strokeWidth?: number }) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
