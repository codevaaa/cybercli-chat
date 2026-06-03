import {
  Menu, Plus, Send, Square, Mic, Search, Folder, Settings as SettingsIcon,
  MessageSquare, Copy, Check, Share2, RotateCcw, Volume2, VolumeX,
  Image as ImageIcon, Camera, Paperclip, X, ChevronRight, ChevronDown,
  Trash2, Pencil, Brain, Globe, Sparkles, ArrowUp, Key, Cloud,
  Moon, Sun, Type, FileText, LogOut, User, Plus as PlusIcon,
  PenLine, Code2, Lightbulb, ArrowLeft, MoreVertical, StopCircle,
  Zap, Layers, BookOpen, Mail, Shield, Info, Database, ChevronUp,
  type LucideIcon,
} from 'lucide-react-native'

/**
 * Centralized professional icon set (Lucide — same family used by
 * production apps). No emojis. Consistent stroke, theme-aware color.
 */
export const Icons = {
  menu: Menu,
  plus: Plus,
  send: ArrowUp,
  stop: StopCircle,
  mic: Mic,
  search: Search,
  folder: Folder,
  settings: SettingsIcon,
  chat: MessageSquare,
  copy: Copy,
  check: Check,
  share: Share2,
  regenerate: RotateCcwSafe(),
  speak: Volume2,
  mute: VolumeX,
  image: ImageIcon,
  camera: Camera,
  attach: Paperclip,
  close: X,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  trash: Trash2,
  edit: Pencil,
  brain: Brain,
  globe: Globe,
  sparkles: Sparkles,
  arrowUp: ArrowUp,
  arrowLeft: ArrowLeft,
  key: Key,
  cloud: Cloud,
  moon: Moon,
  sun: Sun,
  type: Type,
  file: FileText,
  logout: LogOut,
  user: User,
  newChat: PenLine,
  code: Code2,
  idea: Lightbulb,
  more: MoreVertical,
  zap: Zap,
  layers: Layers,
  book: BookOpen,
  mail: Mail,
  shield: Shield,
  info: Info,
  database: Database,
}

function RotateCcwSafe(): LucideIcon {
  return RotateCcw
}

export type IconName = keyof typeof Icons

interface Props {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, color = '#E8E4DE', strokeWidth = 2 }: Props) {
  const Cmp = Icons[name]
  if (!Cmp) return null
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />
}
